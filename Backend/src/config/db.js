const mysql = require('mysql2');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

let connectionConfig;

if (process.env.MYSQL_PUBLIC_URL || process.env.DATABASE_URL) {
    const dbUrl = process.env.MYSQL_PUBLIC_URL || process.env.DATABASE_URL;
    
    // Check if it's actually a URL (contains ://)
    if (dbUrl.includes('://')) {
        console.log("📝 Using Database URL connection strategy");
        try {
            const parsed = new URL(dbUrl);
            connectionConfig = {
                host: parsed.hostname,
                port: parsed.port || 3306,
                user: parsed.username,
                password: parsed.password, // Already decoded by new URL()
                database: (parsed.pathname || '/').replace('/', ''),
                ssl: {
                    rejectUnauthorized: false
                }
            };
            console.log("✅ Database URL parsed successfully for host:", connectionConfig.host);
        } catch (err) {
            console.error("❌ Failed to parse DATABASE_URL:", err.message);
            console.error("🔍 URL attempted:", dbUrl.replace(/:([^:@]+)@/, ':****@')); // Log scrubbed URL
            process.exit(1);
        }
    } else {
        console.warn("⚠️ DATABASE_URL detected but it lacks a protocol (e.g., mysql://). Falling back to individual variables.");
        // We let it fall through to the individual variables logic below
    }
}

if (!connectionConfig) {
    console.warn("ℹ️ Using individual environment variables or defaults.");
    connectionConfig = {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'placement'
    };

    if (!process.env.DB_HOST && process.env.NODE_ENV === 'production') {
        console.error("❌ ERROR: Database configuration missing in production environment!");
    }
}

// Create the connection pool with optimized production settings
console.log("🏊 Creating MySQL connection pool...");
const pool = mysql.createPool({
    ...connectionConfig,
    waitForConnections: true,
    connectionLimit: 10,
    maxIdle: 10, // max idle connections, the default value is the same as `connectionLimit`
    idleTimeout: 60000, // idle connections timeout, in milliseconds, the default value 60000
    queueLimit: 0,
    connectTimeout: 10000, // 10 seconds timeout for initial connection
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
});

const promisePool = pool.promise();

const initializeDatabase = async () => {
    try {
        console.log("🚀 Initializing database schema...");

        // 1. Users Table
        await promisePool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role ENUM('admin', 'placement_officer', 'user') NOT NULL DEFAULT 'user',
                is_approved TINYINT(1) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 2. Students Core Table
        await promisePool.query(`
            CREATE TABLE IF NOT EXISTS students (
                student_id INT AUTO_INCREMENT PRIMARY KEY,
                enrollment_no VARCHAR(50) UNIQUE NOT NULL,
                name VARCHAR(100) NOT NULL,
                college_shift VARCHAR(50),
                primary_email VARCHAR(100),
                student_email VARCHAR(100),
                phone VARCHAR(50),
                gender VARCHAR(20),
                dob DATE,
                linkedin VARCHAR(255),
                github VARCHAR(255),
                skills TEXT,
                pan_india TINYINT(1) DEFAULT 0,
                residence_type VARCHAR(100),
                course VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 3. Academics (Level-based: 10th, 12th, Graduation)
        await promisePool.query(`
            CREATE TABLE IF NOT EXISTS academics (
                id INT AUTO_INCREMENT PRIMARY KEY,
                student_id INT NOT NULL,
                level ENUM('10th', '12th', 'Graduation') NOT NULL,
                board_or_college VARCHAR(255),
                stream VARCHAR(100),
                passing_year INT,
                percentage DECIMAL(5,2),
                FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
                UNIQUE KEY unique_student_level (student_id, level)
            )
        `);

        // 4. Academic Semesters (Sem 1-6 SGPA)
        await promisePool.query(`
            CREATE TABLE IF NOT EXISTS academic_semesters (
                id INT AUTO_INCREMENT PRIMARY KEY,
                student_id INT NOT NULL,
                semester_number INT NOT NULL,
                sgpa DECIMAL(4,2),
                FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
                UNIQUE KEY unique_student_semester (student_id, semester_number)
            )
        `);

        // 5. CIE Marks (linked to academic_semesters)
        await promisePool.query(`
            CREATE TABLE IF NOT EXISTS cie_marks (
                id INT AUTO_INCREMENT PRIMARY KEY,
                semester_id INT NOT NULL,
                subject VARCHAR(100) NOT NULL,
                marks DECIMAL(5,2),
                FOREIGN KEY (semester_id) REFERENCES academic_semesters(id) ON DELETE CASCADE,
                UNIQUE KEY uq_cie (semester_id, subject)
            )
        `);

        // 6. Mock Tests (linked to academic_semesters)
        await promisePool.query(`
            CREATE TABLE IF NOT EXISTS mock_tests (
                id INT AUTO_INCREMENT PRIMARY KEY,
                semester_id INT NOT NULL,
                test_name VARCHAR(100) NOT NULL,
                marks DECIMAL(5,2),
                FOREIGN KEY (semester_id) REFERENCES academic_semesters(id) ON DELETE CASCADE,
                UNIQUE KEY uq_mock (semester_id, test_name)
            )
        `);

        // 7. Family Details
        await promisePool.query(`
            CREATE TABLE IF NOT EXISTS family (
                id INT AUTO_INCREMENT PRIMARY KEY,
                student_id INT NOT NULL UNIQUE,
                father_name VARCHAR(100),
                father_occupation VARCHAR(100),
                father_email VARCHAR(100),
                father_phone VARCHAR(50),
                mother_name VARCHAR(100),
                mother_phone VARCHAR(50),
                mother_email VARCHAR(100),
                FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE
            )
        `);

        // 8. Addresses
        await promisePool.query(`
            CREATE TABLE IF NOT EXISTS addresses (
                id INT AUTO_INCREMENT PRIMARY KEY,
                student_id INT NOT NULL,
                type ENUM('Permanent', 'Local') NOT NULL,
                address TEXT,
                FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
                UNIQUE KEY unique_student_address_type (student_id, type)
            )
        `);

        // 9. Gaps
        await promisePool.query(`
            CREATE TABLE IF NOT EXISTS gaps (
                id INT AUTO_INCREMENT PRIMARY KEY,
                student_id INT NOT NULL UNIQUE,
                has_gap TINYINT(1) DEFAULT 0,
                reason TEXT,
                FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE
            )
        `);

        // 10. Experiences
        await promisePool.query(`
            CREATE TABLE IF NOT EXISTS experiences (
                id INT AUTO_INCREMENT PRIMARY KEY,
                student_id INT NOT NULL UNIQUE,
                has_experience TINYINT(1) DEFAULT 0,
                description TEXT,
                internship_details TEXT,
                FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE
            )
        `);

        // 11. Placements
        await promisePool.query(`
            CREATE TABLE IF NOT EXISTS placements (
                id INT AUTO_INCREMENT PRIMARY KEY,
                student_id INT NOT NULL UNIQUE,
                campus_offer VARCHAR(255),
                company VARCHAR(255),
                status VARCHAR(100),
                FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE
            )
        `);

        // 12. Companies (extended with job_role, package_lpa, official_email)
        await promisePool.query(`
            CREATE TABLE IF NOT EXISTS companies (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                course VARCHAR(100),
                job_role VARCHAR(255),
                package_lpa DECIMAL(5,2),
                status ENUM('Upcoming', 'Ongoing', 'Completed') DEFAULT 'Upcoming',
                official_email VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY uq_company_name (name)
            )
        `);

        // 13. Applications
        await promisePool.query(`
            CREATE TABLE IF NOT EXISTS applications (
                id INT AUTO_INCREMENT PRIMARY KEY,
                student_id INT NOT NULL,
                company_id INT NOT NULL,
                round_reached VARCHAR(100),
                status ENUM('Applied', 'In Progress', 'Selected', 'Rejected') DEFAULT 'Applied',
                applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
                FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
            )
        `);

        // 14. Import Logs (tracks CSV upload batches across all modules)
        await promisePool.query(`
            CREATE TABLE IF NOT EXISTS import_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                file_name VARCHAR(255) NOT NULL,
                module_type VARCHAR(50) DEFAULT 'students',
                uploaded_by INT,
                total_rows INT DEFAULT 0,
                success_rows INT DEFAULT 0,
                failed_rows INT DEFAULT 0,
                status ENUM('pending', 'completed', 'canceled') DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
            )
        `);

        // 15. Import Staging (pre-validation raw row storage per batch)
        await promisePool.query(`
            CREATE TABLE IF NOT EXISTS import_staging (
                id INT AUTO_INCREMENT PRIMARY KEY,
                batch_id INT NOT NULL,
                import_row_number INT NOT NULL,
                enrollment_no VARCHAR(50),
                raw_data_json JSON NOT NULL,
                validation_status ENUM('valid', 'invalid') DEFAULT 'valid',
                error_message TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (batch_id) REFERENCES import_logs(id) ON DELETE CASCADE
            )
        `);

        console.log("✅ All database tables initialized successfully.");
    } catch (err) {
        console.error("❌ Error during database initialization:", err);
        throw err;
    }
};

// Test the connection on startup
(async () => {
    try {
        const connection = await promisePool.getConnection();
        console.log("✅ Database connection established successfully.");
        connection.release();
    } catch (err) {
        if (err.code === 'PROTOCOL_CONNECTION_LOST') {
            console.error('❌ Database connection was closed.');
        } else if (err.code === 'ER_CON_COUNT_ERROR') {
            console.error('❌ Database has too many connections.');
        } else if (err.code === 'ECONNREFUSED') {
            console.error('❌ Database connection was refused. Check if MySQL is running.');
        } else if (err.code === 'ETIMEDOUT') {
            console.error('❌ Database connection timed out. Check your network or firewall.');
        } else {
            console.error("❌ Connection Failed:", err.message);
        }
    }
})();

// Attach initializeDatabase to the pool so it can be awaited in server.js
promisePool.initializeDatabase = initializeDatabase;

module.exports = promisePool;
