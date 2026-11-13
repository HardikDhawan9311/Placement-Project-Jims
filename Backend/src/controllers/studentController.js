const db = require('../config/db');
const emailService = require('../services/emailService');
const importService = require('../services/importService');
const {
    normalizeStudentListRow,
    normalizePlacementRow,
    placementFromSpreadsheet,
} = require('../utils/placementNormalize');
const { normalizeGapsForProfile } = require('../utils/gapNormalize');
const XLSX = require('xlsx');

// @desc Get all students (with summary info for main list)
// @route GET /api/students
exports.getAllStudents = async (req, res) => {
    try {
        const { branch, name } = req.query;
        
        // Base query joins students with their academic records for filtering
        let sql = `
            SELECT 
                s.student_id, s.name, s.enrollment_no, s.course, s.student_email, s.primary_email, s.phone, s.gender, s.skills, s.pan_india, s.residence_type,
                a10.percentage as percentage_10th,
                a12.percentage as percentage_12th,
                aGrad.percentage as percentage_grad,
                aGrad.percentage as aggregate_percentage,
                sem.current_cgpa,
                p.company as placed_company,
                p.status as placement_status
            FROM students s
            LEFT JOIN academics a10 ON s.student_id = a10.student_id AND a10.level = '10th'
            LEFT JOIN academics a12 ON s.student_id = a12.student_id AND a12.level = '12th'
            LEFT JOIN academics aGrad ON s.student_id = aGrad.student_id AND aGrad.level = 'Graduation'
            LEFT JOIN (SELECT student_id, AVG(sgpa) as current_cgpa FROM academic_semesters GROUP BY student_id) sem ON s.student_id = sem.student_id
            LEFT JOIN placements p ON s.student_id = p.student_id
            WHERE 1=1
        `;
        const params = [];

        if (branch && branch !== 'all') {
            sql += ' AND s.course = ?';
            params.push(branch);
        }

        if (name) {
            sql += ' AND s.name LIKE ?';
            params.push(`%${name}%`);
        }

        const [rows] = await db.query(sql, params);
        res.json(rows.map(normalizeStudentListRow));
    } catch (err) {
        console.error('Error fetching all students:', err);
        res.status(500).json({ error: 'Server error' });
    }
};

// @desc Get a single student profile with full details from ALL tables
// @route GET /api/students/:id/full-profile
exports.getStudentAcademicHistory = async (req, res) => {
    try {
        const studentId = req.params.id;

        // 1. Get core student profile
        const [studentRows] = await db.query('SELECT * FROM students WHERE student_id = ?', [studentId]);
        if (studentRows.length === 0) {
            return res.status(404).json({ error: 'Student not found' });
        }
        const student = studentRows[0];

        // 2. Parallel fetch all related details
        const [
            [academics],
            [family],
            [addresses],
            [gaps],
            [experiences],
            [placements],
            [semesters]
        ] = await Promise.all([
            db.query('SELECT * FROM academics WHERE student_id = ?', [studentId]),
            db.query('SELECT * FROM family WHERE student_id = ?', [studentId]),
            db.query('SELECT * FROM addresses WHERE student_id = ?', [studentId]),
            db.query('SELECT * FROM gaps WHERE student_id = ?', [studentId]),
            db.query('SELECT * FROM experiences WHERE student_id = ?', [studentId]),
            db.query('SELECT * FROM placements WHERE student_id = ?', [studentId]),
            db.query('SELECT * FROM academic_semesters WHERE student_id = ?', [studentId])
        ]);

        // 3. Fetch nested CIE marks and Mock Tests in single batches to avoid N+1 queries
        let allCieMarks = [];
        let allMockTests = [];
        const semesterIds = semesters ? semesters.map(s => s.id).filter(id => id !== undefined && id !== null) : [];
        if (semesterIds.length > 0) {
            const placeholders = semesterIds.map(() => '?').join(',');
            
            [allCieMarks] = await db.query(`SELECT * FROM cie_marks WHERE semester_id IN (${placeholders})`, semesterIds);
            [allMockTests] = await db.query(`SELECT * FROM mock_tests WHERE semester_id IN (${placeholders})`, semesterIds);
        }

        const academicHistory = semesters.map((sem) => {
            return {
                ...sem,
                cieMarks: allCieMarks.filter(m => m.semester_id === sem.id),
                mockTests: allMockTests.filter(m => m.semester_id === sem.id)
            };
        });

        const placementRaw = placements[0] || null;
        res.json({
            student,
            details: {
                academics,
                family: family[0] || null,
                addresses,
                gaps: normalizeGapsForProfile(gaps[0] || null),
                experiences: experiences[0] || null,
                placement: placementRaw ? normalizePlacementRow(placementRaw) : null,
            },
            academicHistory
        });
    } catch (err) {
        console.error('Error fetching full profile:', err);
        res.status(500).json({ error: 'Server error' });
    }
};

// @desc Bulk upload student data across multiple tables
// @route POST /api/students/bulk
exports.bulkUploadStudents = async (req, res) => {
    let connection;
    try {
        const { students } = req.body;
        if (!students || !Array.isArray(students)) {
            return res.status(400).json({ error: 'Invalid data format. Expected an array of student objects.' });
        }

        connection = await db.getConnection();
        await connection.beginTransaction();

        const results = {
            processed: 0,
            updated: 0,
            errors: []
        };

        for (const data of students) {
            try {
                // Delegate to unified importService logic
                const studentId = await importService.upsertStudent(connection, data);
                await importService.upsertAcademics(connection, studentId, data);
                await importService.upsertSemesters(connection, studentId, data);
                await importService.upsertFamily(connection, studentId, data);
                await importService.upsertGaps(connection, studentId, data);
                await importService.upsertExperiences(connection, studentId, data);
                await importService.upsertPlacements(connection, studentId, data);
                await importService.upsertAddresses(connection, studentId, data);

                results.processed++;
            } catch (rowErr) {
                console.error(`Error processing row for student ${data['Enrollment No.'] || 'Unknown'}:`, rowErr);
                results.errors.push({
                    enrollment_no: data['Enrollment No.'] || 'Unknown',
                    error: rowErr.message
                });
            }
        }

        await connection.commit();
        res.json({
            message: `Bulk upload completed. Processed ${results.processed} students successfully.`,
            errors: results.errors
        });

    } catch (err) {
        if (connection) await connection.rollback();
        console.error('Bulk upload server error:', err);
        res.status(500).json({ error: 'Server error during bulk upload' });
    } finally {
        if (connection) connection.release();
    }
};
// @desc Send student details to company via email
// @route POST /api/students/send-to-company
exports.sendStudentsToCompany = async (req, res) => {
    try {
        const { companyEmail, subject, message, sendAsExcel, students } = req.body;

        console.log('📧 Email request received:', { companyEmail, subject, sendAsExcel, studentCount: students?.length });

        if (!companyEmail || !subject || !message) {
            return res.status(400).json({ error: 'Missing required fields: companyEmail, subject, or message' });
        }

        let attachment = null;

        if (sendAsExcel && students && Array.isArray(students) && students.length > 0) {
            console.log('📊 Generating Excel attachment for', students.length, 'students');
            
            // Map student data for Excel
            const excelData = students.map(s => ({
                'Name': s.name,
                'Enrollment No': s.enrollment_no,
                'Course': s.course,
                'Email': s.student_email || s.primary_email,
                'Phone': s.phone || 'N/A',
                'CGPA': s.current_cgpa || 'N/A',
                '10th %': s.percentage_10th || 'N/A',
                '12th %': s.percentage_12th || 'N/A',
                'Grad %': s.percentage_grad || 'N/A',
                'Skills': s.skills || 'N/A',
                'LinkedIn': s.linkedin || 'N/A',
                'GitHub': s.github || 'N/A'
            }));

            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(excelData);
            XLSX.utils.book_append_sheet(wb, ws, "Students");
            
            // Generate buffer
            const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
            const base64Content = buffer.toString('base64');
            
            attachment = [{
                content: base64Content,
                name: `Student_Details_${new Date().toISOString().split('T')[0]}.xlsx`
            }];
        }

        // Plain text version
        const textContent = message;

        // Minimal HTML
        const htmlContent = `<html><body style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#000;">${message.replace(/\n/g, '<br>')}</body></html>`;

        const result = await emailService.sendBrevoEmail({
            to: companyEmail,
            subject: subject,
            htmlContent: htmlContent,
            textContent: textContent,
            attachment: attachment
        });

        console.log('✅ Email sent successfully! Brevo response:', result);
        res.json({ message: 'Email sent successfully to ' + companyEmail });
    } catch (err) {
        console.error('❌ Error in sendStudentsToCompany:', err.message);
        res.status(500).json({ error: 'Failed to send email: ' + err.message });
    }
};

// @desc Notify selected students via email
// @route POST /api/students/notify-students
exports.notifyStudents = async (req, res) => {
    try {
        const { studentIds, subject, message } = req.body;

        if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
            return res.status(400).json({ error: 'No student IDs provided' });
        }
        if (!subject || !message) {
            return res.status(400).json({ error: 'Subject and message are required' });
        }

        // ✅ ALWAYS fetch fresh data from DB — never trust stale frontend cache
        const placeholders = studentIds.map(() => '?').join(',');
        const [freshStudents] = await db.query(
            `SELECT student_id, name, enrollment_no, course, student_email, primary_email FROM students WHERE student_id IN (${placeholders})`,
            studentIds
        );

        if (freshStudents.length === 0) {
            return res.status(404).json({ error: 'No students found for the given IDs' });
        }

        const results = { sent: [], failed: [] };

        for (const student of freshStudents) {
            // Use the LATEST email from DB, prioritize student_email over primary_email
            const recipientEmail = student.student_email || student.primary_email;
            if (!recipientEmail) {
                results.failed.push({ name: student.name, reason: 'No email address found in database' });
                continue;
            }

            try {
                const personalizedMessage = message
                    .replace(/\[Student Name\]/g, student.name)
                    .replace(/\[Enrollment No\]/g, student.enrollment_no || '')
                    .replace(/\[Course\]/g, student.course || '');

                const htmlContent = `<html><body style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#000;">${personalizedMessage.replace(/\n/g, '<br>')}</body></html>`;

                await emailService.sendBrevoEmail({
                    to: recipientEmail,
                    toName: student.name,
                    subject: subject,
                    htmlContent: htmlContent,
                    textContent: personalizedMessage
                });

                results.sent.push({ name: student.name, email: recipientEmail });
                console.log(`✅ Notified: ${student.name} <${recipientEmail}>`);
            } catch (err) {
                console.error(`❌ Failed to notify ${student.name}:`, err.message);
                results.failed.push({ name: student.name, reason: err.message });
            }
        }

        res.json({
            message: `Notifications sent: ${results.sent.length} succeeded, ${results.failed.length} failed.`,
            sent: results.sent,
            failed: results.failed
        });
    } catch (err) {
        console.error('❌ Error in notifyStudents:', err.message);
        res.status(500).json({ error: 'Failed to send notifications: ' + err.message });
    }
};
