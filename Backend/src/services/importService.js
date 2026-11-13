const xlsx = require('xlsx');
const db = require('../config/db');
const { placementFromSpreadsheet } = require('../utils/placementNormalize');
const C = require('../utils/csvColumns');

// Safe JSON parsing helper to handle MySQL driver double-parsing or weird stringification
const safeParseJSON = (data) => {
    if (typeof data === 'object' && data !== null) return data;
    try {
        if (typeof data === 'string') {
            return JSON.parse(data);
        }
    } catch (e) {
        console.error('Safe parse error for data:', data, e.message);
    }
    return data;
};

/**
 * Service to handle complex student data imports across multiple normalized tables.
 */
class ImportService {
    /**
     * Parses the uploaded file (XLSX or CSV) and validates each row.
     * Stores results in staging area for admin review.
     */
    async processUpload(fileBuffer, fileName, userId) {
        const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        // Parse and trim all keys (headers) in the data rows
        const rawRows = xlsx.utils.sheet_to_json(sheet);
        const rows = rawRows.map(row => {
            const trimmedRow = {};
            for (const key in row) {
                trimmedRow[key.trim()] = row[key];
            }
            return trimmedRow;
        });

        // 1. Create Import Log entry
        // Validate that the userId actually exists in users table to avoid FK constraint failure
        // (can happen if DB was reset but session tokens still carry old user IDs)
        let safeUserId = null;
        if (userId) {
            const [userCheck] = await db.query('SELECT id FROM users WHERE id = ?', [userId]);
            safeUserId = userCheck.length > 0 ? userId : null;
        }

        const [logResult] = await db.query(
            'INSERT INTO import_logs (file_name, uploaded_by, total_rows, status) VALUES (?, ?, ?, ?)',
            [fileName, safeUserId, rows.length, 'pending']
        );
        const batchId = logResult.insertId;

        const stagedRows = [];
        
        // 2. Process and Validate rows (Staging)
        if (rows.length > 0) {
            const values = rows.map((rawData, i) => {
                const validationResult = this.validateRow(rawData);
                return [
                    batchId, 
                    i + 1, 
                    rawData[C.ENROLLMENT_NO] || null, 
                    JSON.stringify(rawData), 
                    validationResult.status, 
                    validationResult.error
                ];
            });

            // Batch insert for performance
            await db.query(
                `INSERT INTO import_staging 
                (batch_id, import_row_number, enrollment_no, raw_data_json, validation_status, error_message) 
                VALUES ?`,
                [values]
            );
        }

        return { batchId, totalRows: rows.length };
    }

    /**
     * Validation logic for a single row
     */
    validateRow(row) {
        const errors = [];

        if (!row[C.ENROLLMENT_NO]) errors.push("Enrollment No. is required");
        if (!row[C.STUDENT_NAME]) errors.push("Student Name is required");
        if (!row[C.COURSE]) errors.push("Course is required");

        // Basic numeric validations
        const checkNumeric = (field, label) => {
            if (row[field] && isNaN(parseFloat(row[field]))) {
                errors.push(`${label} must be numeric`);
            }
        };

        [C.PERCENTAGE_10TH, C.PERCENTAGE_12TH, C.GRAD_PERCENTAGE, C.semSGPA(1), C.semSGPA(2), C.semSGPA(3), C.semSGPA(4), C.semSGPA(5), C.semSGPA(6)].forEach(field => {
            if (row[field] && row[field] !== 'NA') checkNumeric(field, field);
        });

        if (errors.length > 0) {
            return { status: 'invalid', error: errors.join(', ') };
        }
        return { status: 'valid', error: null };
    }

    /**
     * Finalizes the import by moving valid staged rows into production tables.
     * Uses per-student transactions to ensure ACID compliance.
     */
    async commitImport(batchId) {
        const [stagedRows] = await db.query(
            'SELECT * FROM import_staging WHERE batch_id = ? AND validation_status = "valid"',
            [batchId]
        );

        let successCount = 0;
        let failCount = 0;

        const connection = await db.getConnection();

        try {
            for (const staged of stagedRows) {
                const data = safeParseJSON(staged.raw_data_json);
                
                try {
                    await connection.beginTransaction();

                    // 1. Upsert Student Core
                    const studentId = await this.upsertStudent(connection, data);

                    // 2. Upsert Academics (10th, 12th, Graduation)
                    await this.upsertAcademics(connection, studentId, data);

                    // 3. Upsert Semesters
                    await this.upsertSemesters(connection, studentId, data);

                    // 4. Upsert Family
                    await this.upsertFamily(connection, studentId, data);

                    // 5. Upsert Gaps
                    await this.upsertGaps(connection, studentId, data);

                    // 6. Upsert Experiences
                    await this.upsertExperiences(connection, studentId, data);

                    // 7. Upsert Placements
                    await this.upsertPlacements(connection, studentId, data);

                    // 8. Upsert Addresses
                    await this.upsertAddresses(connection, studentId, data);

                    await connection.commit();
                    successCount++;
                } catch (err) {
                    await connection.rollback();
                    console.error(`Error importing row ${staged.import_row_number} (${data[C.ENROLLMENT_NO]}):`, err);
                    failCount++;
                    // Update staging with commit error
                    await connection.query(
                        'UPDATE import_staging SET validation_status = "invalid", error_message = ? WHERE id = ?',
                        [`Commit failed: ${err.message}`, staged.id]
                    );
                }
            }
        } finally {
            connection.release();
        }

        // Update import log
        await db.query(
            'UPDATE import_logs SET success_rows = ?, failed_rows = ?, status = "completed" WHERE id = ?',
            [successCount, failCount, batchId]
        );

        return { successCount, failCount };
    }

    async upsertStudent(connection, data) {
        const parseDate = (d) => {
            if (!d || d === 'NA') return null;
            if (typeof d === 'number') {
                // Excel dates are days since 1899-12-30
                const excelEpoch = new Date(Date.UTC(1899, 11, 30));
                const date = new Date(excelEpoch.getTime() + d * 86400000);
                return date.toISOString().split('T')[0];
            }
            const parts = d.split('/');
            if (parts.length === 3) return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            return null;
        };

        const skills = data[C.TECHNICAL_SKILLS] 
            ? data[C.TECHNICAL_SKILLS].split(/[|,\n]/).map(s => s.trim()).filter(Boolean).join(', ')
            : '';

        const [result] = await connection.query(`
            INSERT INTO students 
            (name, enrollment_no, college_shift, primary_email, student_email, phone, gender, dob, linkedin, github, skills, pan_india, residence_type, course)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
            student_id=LAST_INSERT_ID(student_id),
            name=VALUES(name), college_shift=VALUES(college_shift), primary_email=VALUES(primary_email), 
            student_email=VALUES(student_email), phone=VALUES(phone), gender=VALUES(gender), 
            dob=VALUES(dob), linkedin=VALUES(linkedin), github=VALUES(github), skills=VALUES(skills), 
            pan_india=VALUES(pan_india), residence_type=VALUES(residence_type), course=VALUES(course)
        `, [
            data[C.STUDENT_NAME],
            data[C.ENROLLMENT_NO],
            data[C.COLLEGE_SHIFT] || 'Morning',
            data[C.PRIMARY_EMAIL],
            data[C.STUDENT_EMAIL],
            data[C.MOBILE_NUMBER],
            data[C.GENDER],
            parseDate(data[C.DOB]),
            data[C.LINKEDIN],
            data[C.GITHUB],
            skills,
            data[C.PAN_INDIA] === 'Yes' ? 1 : 0,
            data[C.RESIDENCE],
            data[C.COURSE]
        ]);

        return result.insertId;
    }

    async upsertAcademics(connection, studentId, data) {
        const levels = [
            { level: '10th', board: C.BOARD_10TH, year: C.PASSING_YEAR_10TH, pct: C.PERCENTAGE_10TH },
            { level: '12th', board: C.BOARD_12TH, year: C.PASSING_YEAR_12TH, pct: C.PERCENTAGE_12TH, stream: C.STREAM_12TH },
            { level: 'Graduation', board: C.GRAD_COLLEGE, year: C.GRAD_PASSING_YEAR, pct: C.GRAD_PERCENTAGE, stream: C.GRAD_STREAM }
        ];

        for (const l of levels) {
            if (data[l.pct] && data[l.pct] !== 'NA') {
                await connection.query(`
                    INSERT INTO academics (student_id, level, board_or_college, stream, passing_year, percentage)
                    VALUES (?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE 
                    board_or_college=VALUES(board_or_college), stream=VALUES(stream), 
                    passing_year=VALUES(passing_year), percentage=VALUES(percentage)
                `, [studentId, l.level, data[l.board] || null, data[l.stream] || null, data[l.year] || null, data[l.pct]]);
            }
        }
    }

    async upsertSemesters(connection, studentId, data) {
        for (let i = 1; i <= 6; i++) {
            const sgpa = data[C.semSGPA(i)];
            if (sgpa && sgpa !== 'NA') {
                await connection.query(`
                    INSERT INTO academic_semesters (student_id, semester_number, sgpa)
                    VALUES (?, ?, ?)
                    ON DUPLICATE KEY UPDATE sgpa=VALUES(sgpa)
                `, [studentId, i, sgpa]);
            }
        }
    }

    async upsertFamily(connection, studentId, data) {
        if (data[C.FATHER_NAME] || data[C.MOTHER_NAME]) {
            await connection.query(`
                INSERT INTO family (student_id, father_name, father_occupation, father_email, father_phone, mother_name, mother_phone, mother_email)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE 
                father_name=VALUES(father_name), father_occupation=VALUES(father_occupation), father_email=VALUES(father_email), 
                father_phone=VALUES(father_phone), mother_name=VALUES(mother_name), mother_phone=VALUES(mother_phone), mother_email=VALUES(mother_email)
            `, [
                studentId, data[C.FATHER_NAME], data[C.FATHER_OCCUPATION], data[C.FATHER_EMAIL], 
                data[C.FATHER_MOBILE], data[C.MOTHER_NAME], data[C.MOTHER_MOBILE], data[C.MOTHER_EMAIL]
            ]);
        }
    }

    async upsertGaps(connection, studentId, data) {
        if (data[C.ANY_GAP]) {
            await connection.query(`
                INSERT INTO gaps (student_id, has_gap, reason)
                VALUES (?, ?, ?)
                ON DUPLICATE KEY UPDATE has_gap=VALUES(has_gap), reason=VALUES(reason)
            `, [studentId, data[C.ANY_GAP] === 'Yes' ? 1 : 0, data[C.GAP_REASON]]);
        }
    }

    async upsertExperiences(connection, studentId, data) {
        if (data[C.PREVIOUS_EXPERIENCE] || data[C.INTERNSHIP_DETAILS]) {
            await connection.query(`
                INSERT INTO experiences (student_id, has_experience, description, internship_details)
                VALUES (?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE has_experience=VALUES(has_experience), description=VALUES(description), internship_details=VALUES(internship_details)
            `, [
                studentId, data[C.PREVIOUS_EXPERIENCE] === 'Yes' ? 1 : 0, 
                data[C.EXPERIENCE_DESC], data[C.INTERNSHIP_DETAILS]
            ]);
        }
    }

    async upsertPlacements(connection, studentId, data) {
        if (data[C.PLACED_COMPANY] || data[C.PLACEMENT_STATUS] || data[C.CAMPUS_OFFER]) {
            const { company, status } = placementFromSpreadsheet(
                data[C.PLACED_COMPANY],
                data[C.PLACEMENT_STATUS]
            );
            await connection.query(`
                INSERT INTO placements (student_id, campus_offer, company, status)
                VALUES (?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE campus_offer=VALUES(campus_offer), company=VALUES(company), status=VALUES(status)
            `, [
                studentId,
                data[C.CAMPUS_OFFER] || null,
                company,
                status,
            ]);
        }
    }

    async upsertAddresses(connection, studentId, data) {
        if (data[C.PERMANENT_ADDRESS]) {
            await connection.query(`
                INSERT INTO addresses (student_id, type, address) VALUES (?, 'Permanent', ?)
                ON DUPLICATE KEY UPDATE address=VALUES(address)
            `, [studentId, data[C.PERMANENT_ADDRESS]]);
        }
        if (data[C.CURRENT_ADDRESS]) {
            await connection.query(`
                INSERT INTO addresses (student_id, type, address) VALUES (?, 'Local', ?)
                ON DUPLICATE KEY UPDATE address=VALUES(address)
            `, [studentId, data[C.CURRENT_ADDRESS]]);
        }
    }

    async getHistory() {
        const [rows] = await db.query('SELECT * FROM import_logs ORDER BY created_at DESC LIMIT 50');
        return rows;
    }

    async getStagingPreview(batchId) {
        const [rows] = await db.query('SELECT * FROM import_staging WHERE batch_id = ?', [batchId]);
        return rows;
    }
}

module.exports = new ImportService();
