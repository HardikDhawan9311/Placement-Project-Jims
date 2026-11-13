const xlsx = require('xlsx');
const db = require('../config/db');

/**
 * Service to handle CIE Marks CSV import.
 * CSV Format: Enrollment No., Semester Number, Subject, Marks
 * Flow: enrollment_no → student_id → academic_semesters.id → cie_marks insert
 */
class CieCsvService {
    async processUpload(fileBuffer, fileName, userId) {
        const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawRows = xlsx.utils.sheet_to_json(sheet);
        const rows = rawRows.map(row => {
            const trimmed = {};
            for (const key in row) trimmed[key.trim()] = typeof row[key] === 'string' ? row[key].trim() : row[key];
            return trimmed;
        });

        let safeUserId = null;
        if (userId) {
            const [userCheck] = await db.query('SELECT id FROM users WHERE id = ?', [userId]);
            safeUserId = userCheck.length > 0 ? userId : null;
        }

        const [logResult] = await db.query(
            'INSERT INTO import_logs (file_name, uploaded_by, total_rows, status, module_type) VALUES (?, ?, ?, ?, ?)',
            [fileName, safeUserId, rows.length, 'pending', 'cie_marks']
        );
        const batchId = logResult.insertId;

        const preview = [];
        const stagingValues = [];
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const validation = await this.validateRow(row);
            preview.push({
                row_number: i + 1,
                data: row,
                status: validation.status,
                error: validation.error,
                semester_id: validation.semester_id || null,
            });
            stagingValues.push([
                batchId,
                i + 1,
                row['Enrollment No.'] || null,
                JSON.stringify({ ...row, _semester_id: validation.semester_id || null }),
                validation.status,
                validation.error
            ]);
        }

        if (stagingValues.length > 0) {
            await db.query(
                `INSERT INTO import_staging 
                (batch_id, import_row_number, enrollment_no, raw_data_json, validation_status, error_message) 
                VALUES ?`,
                [stagingValues]
            );
        }

        return { batchId, totalRows: rows.length, preview };
    }

    async validateRow(row) {
        const errors = [];
        if (!row['Enrollment No.']) { errors.push('Enrollment No. is required'); return { status: 'invalid', error: errors.join(', ') }; }
        if (!row['Subject']) errors.push('Subject is required');
        if (row['Marks'] === undefined || row['Marks'] === '') errors.push('Marks is required');
        else if (isNaN(parseFloat(row['Marks']))) errors.push('Marks must be numeric');

        const semNum = parseInt(row['Semester Number']);
        if (!semNum || semNum < 1 || semNum > 6) errors.push('Semester Number must be between 1 and 6');

        if (errors.length > 0) return { status: 'invalid', error: errors.join(', ') };

        // Lookup student
        const [studentRows] = await db.query(
            'SELECT student_id FROM students WHERE enrollment_no = ?', [row['Enrollment No.']]
        );
        if (studentRows.length === 0) return { status: 'invalid', error: `Student with Enrollment No. "${row['Enrollment No.']}" not found` };

        const studentId = studentRows[0].student_id;

        // Lookup semester
        const [semRows] = await db.query(
            'SELECT id FROM academic_semesters WHERE student_id = ? AND semester_number = ?',
            [studentId, semNum]
        );
        if (semRows.length === 0) return { status: 'invalid', error: `Semester ${semNum} record not found for ${row['Enrollment No.']}` };

        return { status: 'valid', error: null, semester_id: semRows[0].id };
    }

    async commitImport(batchId) {
        const [stagedRows] = await db.query(
            'SELECT * FROM import_staging WHERE batch_id = ? AND validation_status = "valid"',
            [batchId]
        );

        let successCount = 0;
        let failCount = 0;
        const errors = [];

        for (const item of stagedRows) {
            const row = typeof item.raw_data_json === 'string' ? JSON.parse(item.raw_data_json) : item.raw_data_json;
            try {
                await db.query(`
                    INSERT INTO cie_marks (semester_id, subject, marks)
                    VALUES (?, ?, ?)
                    ON DUPLICATE KEY UPDATE marks = VALUES(marks)
                `, [row._semester_id, row['Subject'], parseFloat(row['Marks'])]);
                successCount++;
            } catch (err) {
                failCount++;
                errors.push({ row: item.import_row_number, error: err.message });
            }
        }

        await db.query(
            'UPDATE import_logs SET success_rows = ?, failed_rows = ?, status = "completed" WHERE id = ?',
            [successCount, failCount, batchId]
        );

        return { successCount, failCount, errors };
    }

    async getHistory() {
        const [rows] = await db.query(
            'SELECT * FROM import_logs WHERE module_type = "cie_marks" ORDER BY created_at DESC LIMIT 50'
        );
        return rows;
    }
}

module.exports = new CieCsvService();
