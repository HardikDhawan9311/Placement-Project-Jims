# JIMS Placement Portal — MCA Project Assessment

> **Institution:** Jagannath International Management School (JIMS)
> **Academic Year:** 2025-26
> **Assessment Date:** October 2026
> **Technology Stack:** React + Vite (Frontend) . Node.js + Express.js (Backend) . MySQL (Database)

---

## 1. Module Status Grid

> Based on actual source files: src/controllers/, src/routes/, src/services/, client/src/pages/

| # | Module | Purpose | Files | Status | Remaining Work |
|---|--------|---------|-------|--------|----------------|
| 1 | **Authentication** | User signup, login with role selection, JWT token issuance, admin approval gate | uthController.js, uthRoutes.js, uthMiddleware.js | Completed | Forgot-password returns HTTP 501 stub — no actual reset flow |
| 2 | **Student Management** | List all students with filters (branch, name); view full individual profile (academics, family, placements, addresses, experience) | studentController.js, studentRoutes.js, StudentList.jsx, StudentProfile.jsx | Completed | Client-side filtering only; no server-side pagination |
| 3 | **Bulk Student Import (CSV/XLSX)** | Upload spreadsheet, staging validation, admin preview, confirmed commit to 8 normalized tables | importController.js, importService.js, importRoutes.js, AdminUploadPanel.jsx | Completed | Import history table is populated but no delete/retry UI |
| 4 | **Company Management** | List, filter, and create companies; view placement tracking per student; identify non-applicants | companyController.js, companyRoutes.js, Companies.jsx | Partial | sendMassMail is a mock console-log (not wired to Brevo); no company edit/delete UI |
| 5 | **Company CSV Import** | Upload companies from a CSV file into the companies table | companyCsvService.js, companyCsvController.js, CompanyImportPanel.jsx | Completed | — |
| 6 | **CIE Marks Import** | Upload semester-wise CIE marks CSV per student | cieCsvService.js, cieCsvController.js, CieMarksImportPanel.jsx | Completed | In-memory staging; server restart between upload/confirm step loses state |
| 7 | **Mock Test Import** | Upload semester-wise mock test scores CSV per student | mockCsvService.js, mockCsvController.js, MockTestsImportPanel.jsx | Completed | Same in-memory limitation as CIE import |
| 8 | **Admin User Approval** | Admin can view, approve, or reject newly registered placement officer accounts | dminController.js, dminRoutes.js, UserApproval.jsx | Completed | No email notification sent to approved/rejected users |
| 9 | **Email Notifications** | Send student details as Excel attachment to companies; send personalized notifications to individual students | emailService.js (Brevo API), studentController.js | Completed | Templates are plain text/HTML; no rich HTML-designed email templates |
| 10 | **Dashboard Overview** | Summary cards (total students, placed, in-process) with charts for placement distribution | DashboardOverview.jsx, DashboardOverviewCharts.jsx | Partial | "In Process" counter includes students with no placement record (logic bug) |
| 11 | **Placement Readiness Score** | Per-student computed score based on graduation percentage, mock test average, and academic data | PlacementReadinessCard.jsx, StudentProfile.jsx | Completed | Score formula is a simple heuristic; not calibrated against real outcomes |
| 12 | **Forgot Password** | Password recovery flow | uthController.js (forgotPassword) | Pending | Returns HTTP 501 — feature not implemented |
| 13 | **Student Self-Service Role** | Students who register see a Pending Approval page only; no student-facing portal | UserPending.jsx, MainDashboard.jsx | Partial | No student self-service portal; role is effectively a placeholder |

**Legend:** Completed | Partial | Pending

---

## 2. SDLC Model Followed

**Model: Incremental / Iterative Development**

**Justification (based on code evidence):**

- The codebase shows clear functional increments added over time: core authentication was built first, then student CRUD, then bulk import, then CIE/Mock/Company CSV imports, then email notifications — each as a standalone, independently usable feature.
- A quality_analysis.md file in the project root (19,422 bytes) documents 45 identified flaws with severity ratings across Security, Reliability, Maintainability, Usability, Efficiency, and Portability — evidence of iterative review cycles between development phases.
- Multiple in-place fixes are visible in the code: rate limiting was added to server.js after the initial build; LAST_INSERT_ID() was introduced into importService.js; the hardcoded JWT fallback was removed from authMiddleware.js — all indicators of iterative refinement rather than a single waterfall delivery.
- The project does not follow Agile sprints formally (no sprint files, no user story tracking) but follows the incremental spirit of adding working modules one at a time.

There is no evidence of formal Waterfall phasing (no design-phase documents frozen before coding) or of a pure Agile framework (no sprint backlogs or velocity tracking).

---

## 3. Use Case of the Project

### Project Purpose

The JIMS Placement Portal is a college placement management system designed for Jagannath International Management School (JIMS). It digitises and centralises the entire campus placement workflow: student profile management, academic record tracking, company onboarding, placement drive tracking, and inter-party email communication — all in one web application.

### Actors

| Actor | Description | Access |
|-------|-------------|--------|
| **Admin** | College placement coordinator or IT admin | Full access: approve/reject users, import all data, manage companies, view all students |
| **Placement Officer** | Faculty or staff managing placement activities | Student list and profiles, company list, email features, import panels |
| **User (Student Role)** | Students who register — currently limited | Sees only a Pending Approval screen; no active student portal exists |
| **External: Brevo API** | Third-party transactional email service | Receives email dispatch requests from the backend |

### Main Interactions (Use Cases)

| Use Case | Actor | Description |
|----------|-------|-------------|
| Register and Login | All | Users register with name/email/password; login requires admin approval before access is granted |
| Approve / Reject User | Admin | Admin sees a list of pending registrations and approves or rejects them |
| Import Student Data | Admin / Placement Officer | Upload a CSV or XLSX spreadsheet; review staged rows; confirm import into 8 normalized tables |
| Import CIE Marks | Admin / Placement Officer | Upload a subject-wise CIE marks CSV linked to student enrollment numbers |
| Import Mock Test Scores | Admin / Placement Officer | Upload aptitude/mock test scores per student per semester |
| Import Company List | Admin / Placement Officer | Upload companies (name, job role, package, status) from a CSV file |
| View Student List | Placement Officer | Browse all students; filter by course/branch or search by name |
| View Student Profile | Placement Officer | See complete profile: personal info, family, addresses, 10th/12th/graduation academics, semester SGPA, CIE marks, mock tests, placement status |
| Send Student Details to Company | Placement Officer | Select students and email their details (with optional Excel attachment) to a company recruiter |
| Notify Students by Email | Placement Officer | Send personalised email messages to selected students with template variables |
| View Dashboard | Admin / Placement Officer | See summary KPIs (total students, placed count) and placement distribution charts |
| Manage Companies | Admin / Placement Officer | View, filter, and manually add companies; view placement tracking per student |

---

## 4. System Design Diagram

The system follows a 3-tier client-server architecture:

`
[ Browser / React SPA ]
         |  REST HTTP + JWT Bearer Token
         v
[ Node.js + Express.js API Server ]
    - JWT Middleware (verifyToken, isAdmin)
    - IP-based Rate Limiter (login endpoint)
    - CORS whitelist policy
         |
         |---> Controllers (auth, student, company, admin, import, csv)
         |           |
         |           |---> Services (ImportService, EmailService, CSV Services)
         |           |           |
         |           |           |---> MySQL (mysql2 pool, 15 tables)
         |           |           '---> Brevo Email API (HTTPS)
         |           '---> Utils (normalisers, column constants)
         |
         '---> Static file serving (production: React /dist build)
`

> **See System_Design.pdf in the project root for the full colour-coded architecture diagram.**

### Key Design Decisions (from code)

| Decision | Implementation |
|----------|---------------|
| Stateless authentication | JWT tokens (1-day expiry), stored in client localStorage via Zustand |
| DB schema management | Auto-created at startup via CREATE TABLE IF NOT EXISTS in db.js |
| Import pipeline | Two-phase: file uploaded to staging table, admin reviews, then confirmed commit to production tables |
| Connection pooling | mysql2 pool of 10 connections with keep-alive and 60s idle timeout |
| Frontend routing | React Router v7 with lazy-loaded pages and a ProtectedRoute guard |
| Email delivery | Brevo (Sendinblue) transactional API v3 via raw Node.js https.request |

---

## 5. Database Implementation Status

**Database:** MySQL
**Driver:** mysql2 npm package with promise-based connection pooling
**Connection:** Configured via DATABASE_URL or individual DB_HOST/PORT/USER/PASSWORD/NAME env vars; SSL enforced for remote hosts
**Schema Management:** Auto-initialised on server startup from src/config/db.js

### Implemented Tables (15 of 15)

| # | Table | Purpose | Key Columns | Operations Implemented |
|---|-------|---------|-------------|------------------------|
| 1 | users | System user accounts (admin, placement officer) | id, name, email, password (bcrypt), role, is_approved | INSERT, SELECT, UPDATE (approval), DELETE (reject) |
| 2 | students | Core student master record | student_id, enrollment_no (UNIQUE), name, course, phone, gender, dob, linkedin, github, skills, pan_india | INSERT ON DUPLICATE KEY UPDATE, SELECT (list + profile) |
| 3 | academics | Academic records at 10th, 12th, Graduation levels | student_id, level (ENUM), board_or_college, stream, passing_year, percentage | INSERT ON DUPLICATE KEY UPDATE, SELECT |
| 4 | academic_semesters | Per-semester SGPA (Semesters 1 to 6) | student_id, semester_number, sgpa | INSERT ON DUPLICATE KEY UPDATE, SELECT, AVG aggregation |
| 5 | cie_marks | Subject-wise CIE marks per semester | semester_id (FK), subject, marks | INSERT ON DUPLICATE KEY UPDATE, SELECT (batch IN clause) |
| 6 | mock_tests | Mock/aptitude test scores per semester | semester_id (FK), test_name, marks | INSERT ON DUPLICATE KEY UPDATE, SELECT (batch IN clause) |
| 7 | family | Student family information | student_id (UNIQUE FK), father_name, father_occupation, mother_name, contact fields | INSERT ON DUPLICATE KEY UPDATE, SELECT |
| 8 | addresses | Permanent and Local addresses | student_id, type (ENUM: Permanent/Local), address | INSERT ON DUPLICATE KEY UPDATE, SELECT |
| 9 | gaps | Academic gap year records | student_id (UNIQUE FK), has_gap, reason | INSERT ON DUPLICATE KEY UPDATE, SELECT |
| 10 | experiences | Internship and work experience | student_id (UNIQUE FK), has_experience, description, internship_details | INSERT ON DUPLICATE KEY UPDATE, SELECT |
| 11 | placements | Student placement outcome | student_id (UNIQUE FK), campus_offer, company, status | INSERT ON DUPLICATE KEY UPDATE, SELECT |
| 12 | companies | Recruiting companies | id, name (UNIQUE), course, job_role, package_lpa, status (ENUM: Upcoming/Ongoing/Completed), official_email | INSERT ON DUPLICATE KEY UPDATE, SELECT (filtered), CREATE |
| 13 | applications | Student-company application linkage | student_id (FK), company_id (FK), round_reached, status (ENUM: Applied/In Progress/Selected/Rejected) | INSERT, SELECT (tracking and non-applicant queries), custom index |
| 14 | import_logs | Tracks each CSV upload batch | file_name, module_type, uploaded_by (FK to users), total_rows, success_rows, failed_rows, status | INSERT, SELECT, UPDATE |
| 15 | import_staging | Stores raw rows for pre-commit review | batch_id (FK to import_logs), enrollment_no, raw_data_json (JSON type), validation_status, error_message | INSERT (batch), SELECT, UPDATE (on commit failure) |

**All 15 tables implemented.** All foreign key relationships are enforced with ON DELETE CASCADE. One performance index (idx_student_status on applications) is created at startup. Transactions with rollback are used throughout the import commit pipeline.

**Not implemented:** No migration files — schema changes to existing tables require manual ALTER TABLE; no soft-delete mechanism.

---

## 6. Types of Testing Performed Till Date

> **Note:** No automated test files, test runners (Jest, Mocha, Vitest), or CI/CD configuration were found anywhere in the project. The package.json test script in the Backend explicitly reads: "test": "echo \"Error: no test specified\" && exit 1" — confirming no automated tests are configured.

### Testing Actually Performed

| Type | Evidence | Details |
|------|----------|---------|
| **Manual Functional Testing** | Sample datasets in /Datasets/ directory | 4 CSV files present: students_50_realistic.csv (50 student records), companies_dataset.csv (25 companies), cia_marks.csv, mock_tests.csv — used to manually test the import pipeline end-to-end |
| **Manual Smoke Testing** | Seed script src/scripts/seed.js | A database seed script inserts 5 students, 5 companies, academics, family, gaps, experiences, placements, semesters, CIE marks, and mock tests — used to verify fresh database state and basic UI rendering |
| **Code-Level Quality Review** | quality_analysis.md (45 documented issues) | A systematic manual review identifying security flaws, reliability issues, performance problems, and usability gaps across all files — structured review across 6 quality dimensions |
| **Environment/Integration Testing** | Server startup logs and env validation | The server checks JWT_SECRET, DATABASE_URL, BREVO_API_KEY, SENDER_EMAIL at startup and logs boolean presence — manual integration verification by running the server |

### No Evidence Found For

- Unit tests (no *.test.js or *.spec.js files anywhere)
- Integration tests (no test database setup or mocking frameworks)
- API testing via Postman collections (no .postman_collection.json found)
- End-to-end or browser automation tests
- Performance or load tests

**Conclusion:** Testing has been limited to manual functional testing using sample CSV datasets and visual verification through the browser UI. No automated test suite exists as of the assessment date.

---

## 7. Limitations of the Work

### Functional Limitations

| # | Limitation | Detail |
|---|-----------|--------|
| 1 | **No student self-service portal** | Students who register are shown a static Pending Approval page only. They cannot view their own profile, placement status, or receive notifications through the system. |
| 2 | **Forgot password is non-functional** | authController.forgotPassword returns HTTP 501 with a message to contact the admin. No email-based reset flow is implemented. |
| 3 | **Mass mail to companies is mocked** | companyController.sendMassMail prints to console.log and returns a fake success response after a 1-second timeout. No actual email is sent to companies via this route. |
| 4 | **Applications table has no UI** | The applications table is populated only by the seed script. There is no UI for placement officers to record or update which student applied to which company. |
| 5 | **No company edit or delete** | Companies can be created and imported but cannot be edited or deleted through the UI. |
| 6 | **No server-side pagination** | The student list fetches all records in a single SQL query and filters entirely in the browser. With large datasets, this causes performance degradation. |
| 7 | **In-memory staging for CIE and Mock imports** | The CIE and Mock CSV services store intermediate semester_id data in memory between the upload and confirm steps. A server restart between these two steps loses the staged data. |

### Security Limitations (Known)

| # | Limitation |
|---|-----------|
| 8 | JWT token stored in localStorage — vulnerable to XSS; not yet migrated to httpOnly cookies |
| 9 | No CSRF protection on any endpoint |
| 10 | No input sanitisation beyond null checks; SQL injection prevented only by parameterised queries |
| 11 | No password strength enforcement beyond a minimum length check on the frontend |

### Technical and Architectural Limitations

| # | Limitation | Detail |
|---|-----------|--------|
| 12 | **No database migration system** | Schema managed via CREATE TABLE IF NOT EXISTS. Column additions require manual ALTER TABLE — startup code cannot modify already-created tables. |
| 13 | **No Docker or containerisation** | No Dockerfile or docker-compose.yml. Deployment requires manual MySQL installation and environment setup. |
| 14 | **MySQL-specific SQL** | Heavy use of ON DUPLICATE KEY UPDATE and TINYINT(1) makes the codebase non-portable to PostgreSQL or SQLite. |
| 15 | **API URL hardcoded in frontend** | axiosInstance.js falls back to http://localhost:3000 if VITE_API_URL is not set, causing silent failures in production. |
| 16 | **No real-time updates** | Dashboard and student list require a manual browser refresh to reflect new data. No WebSocket or SSE is implemented. |
| 17 | **No audit log** | No record of which admin approved which user, or who imported or deleted which student record. |

### Possible Future Improvements

| Priority | Improvement |
|----------|-------------|
| High | Implement student self-service portal (view own profile, placement status, notifications) |
| High | Implement forgot-password email flow with secure time-limited reset tokens |
| High | Add server-side pagination and filtering (SQL LIMIT/OFFSET) to the student list API |
| High | Store JWT in httpOnly cookies instead of localStorage |
| High | Introduce Knex.js migrations for safe, version-controlled schema evolution |
| Medium | Wire sendMassMail to the actual Brevo email service |
| Medium | Build an Applications UI to record and update student-company applications |
| Medium | Add company edit and delete functionality |
| Medium | Add Docker and docker-compose for one-command local setup |
| Medium | Set up automated unit tests (Jest/Vitest) for controllers and services |
| Medium | Implement real-time dashboard updates using WebSockets or Server-Sent Events |
| Low | Add PDF resume generation per student profile |
| Low | Implement role-based KPI dashboards (admin vs. placement officer views) |
| Low | Add export-to-Excel for filtered student lists directly from the browser |

---

*This assessment was prepared strictly from inspection of the actual source code and does not assume or fabricate features. All claims are traceable to specific files and functions in the codebase.*
