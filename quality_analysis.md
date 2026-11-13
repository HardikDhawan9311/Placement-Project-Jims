# 🔍 Placement Project — Quality Analysis Report
### Dimensions: Reliability · Maintainability · Usability · Efficiency · Security · Portability

---

## 🔴 SECURITY (Critical Issues First)

### Backend

| # | File | Flaw | Severity |
|---|------|------|----------|
| 1 | [`authMiddleware.js`](file:///c:/Users/Harsh%20Gupta/Desktop/Projects/Placement-Project-Jims/Backend/src/middleware/authMiddleware.js#L11) | **Hardcoded fallback JWT secret** — `'my_super_secret_jwt_key'` is used when `JWT_SECRET` env var is missing. Any attacker knowing this string can forge valid tokens. | 🔴 Critical |
| 2 | [`.env`](file:///c:/Users/Harsh%20Gupta/Desktop/Projects/Placement-Project-Jims/Backend/.env) | **Real credentials committed to the repo** — `DATABASE_URL` contains plaintext password and a live `BREVO_API_KEY` is exposed. This is a direct credential leak if the repo is pushed to GitHub. | 🔴 Critical |
| 3 | [`adminRoutes.js`](file:///c:/Users/Harsh%20Gupta/Desktop/Projects/Placement-Project-Jims/Backend/src/routes/adminRoutes.js) | **Admin endpoints are completely unprotected** — All `/api/admin/*` routes (approve user, reject user, get pending users) have no `verifyToken` or `isAdmin` middleware. Anyone can approve themselves as admin. | 🔴 Critical |
| 4 | [`studentRoutes.js`](file:///c:/Users/Harsh%20Gupta/Desktop/Projects/Placement-Project-Jims/Backend/src/routes/studentRoutes.js) | **All student routes have zero authentication** — `/api/students`, `/api/students/bulk`, `/api/students/send-to-company` etc. are publicly accessible. Sensitive student PII is exposed. | 🔴 Critical |
| 5 | [`authController.js`](file:///c:/Users/Harsh%20Gupta/Desktop/Projects/Placement-Project-Jims/Backend/src/controllers/authController.js#L25) | **Client-supplied role trusted on signup** — `const userRole = role \|\| 'user'` allows anyone to register as `admin` by sending `role: "admin"` in the request body. | 🔴 Critical |
| 6 | [`emailService.js`](file:///c:/Users/Harsh%20Gupta/Desktop/Projects/Placement-Project-Jims/Backend/src/services/emailService.js#L22) | **Hardcoded personal email as sender** — A personal Gmail address is hardcoded as the sender. This is both a personal data exposure and an operational problem. | 🟠 High |
| 7 | [`server.js`](file:///c:/Users/Harsh%20Gupta/Desktop/Projects/Placement-Project-Jims/Backend/server.js#L22) | **Overly permissive CORS** — `origin.endsWith('.vercel.app')` allows any Vercel subdomain (attacker-controlled) to make credentialed cross-origin requests to the API. | 🟠 High |
| 8 | [`server.js`](file:///c:/Users/Harsh%20Gupta/Desktop/Projects/Placement-Project-Jims/Backend/server.js#L35) | **No request size limit** — `express.json()` with no `limit` option. A large JSON payload can cause memory exhaustion (DoS attack). | 🟠 High |
| 9 | [`server.js`](file:///c:/Users/Harsh%20Gupta/Desktop/Projects/Placement-Project-Jims/Backend/server.js) | **No rate limiting** — Login endpoint `/api/users/login` has no brute-force protection. An attacker can try unlimited passwords indefinitely. | 🟠 High |
| 10 | [`authController.js`](file:///c:/Users/Harsh%20Gupta/Desktop/Projects/Placement-Project-Jims/Backend/src/controllers/authController.js#L57) | **Role mismatch reveals user's actual role** — Error message tells an attacker exactly what role a known email belongs to, aiding reconnaissance. | 🟡 Medium |
| 11 | [`authController.js`](file:///c:/Users/Harsh%20Gupta/Desktop/Projects/Placement-Project-Jims/Backend/src/controllers/authController.js#L97) | **Forgot password is a mock/stub** — Always returns success regardless of whether the email exists. No reset token, no expiry, no actual link — the feature is completely fake. | 🟡 Medium |
| 12 | [`db.js`](file:///c:/Users/Harsh%20Gupta/Desktop/Projects/Placement-Project-Jims/Backend/src/config/db.js#L17) | **`rejectUnauthorized: false` in SSL config** — Disables TLS certificate validation for production DB connections, making the connection vulnerable to MITM attacks. | 🟡 Medium |

### Frontend

| # | File | Flaw | Severity |
|---|------|------|----------|
| 13 | [`useAuthStore.js`](file:///c:/Users/Harsh%20Gupta/Desktop/Projects/Placement-Project-Jims/client/src/store/useAuthStore.js#L17) | **JWT token stored in `localStorage`** — Vulnerable to XSS attacks. Any injected script can steal the token. `httpOnly` cookies are the secure alternative. | 🟠 High |
| 14 | [`SignUp.jsx`](file:///c:/Users/Harsh%20Gupta/Desktop/Projects/Placement-Project-Jims/client/src/pages/SignUp.jsx#L104) | **Self-registration as Admin allowed from the UI** — The signup form explicitly offers "Admin" as a role option. Combined with backend flaw #5, this is a direct privilege escalation path. | 🟠 High |
| 15 | [`axiosInstance.js`](file:///c:/Users/Harsh%20Gupta/Desktop/Projects/Placement-Project-Jims/client/src/api/axiosInstance.js#L32) | **Hard `window.location.href` redirect on 401** — Bypasses React Router's state management and discards any pending in-memory state, potentially causing data loss. | 🟡 Medium |

---

## 🟠 RELIABILITY

### Backend

| # | File | Flaw | Severity |
|---|------|------|----------|
| 16 | [`studentController.js`](file:///c:/Users/Harsh%20Gupta/Desktop/Projects/Placement-Project-Jims/Backend/src/controllers/studentController.js#L85) | **N+1 query problem in `getStudentAcademicHistory`** — For each semester in `Promise.all`, two more DB queries are fired inside `.map()`. With 6 semesters = 12 extra queries per profile fetch. Under load, this exhausts the connection pool. | 🟠 High |
| 17 | [`importService.js`](file:///c:/Users/Harsh%20Gupta/Desktop/Projects/Placement-Project-Jims/Backend/src/services/importService.js#L121) | **Per-student DB connection opening in `commitImport`** — A new DB connection is acquired for every single row. With 200 students, 200 connections are attempted. The pool limit is 10, causing queuing and potential deadlocks/timeouts. | 🟠 High |
| 18 | [`studentController.js`](file:///c:/Users/Harsh%20Gupta/Desktop/Projects/Placement-Project-Jims/Backend/src/controllers/studentController.js#L176) | **Race condition in bulk upload** — `insertId === 0` on DUPLICATE KEY UPDATE causes a fallback `SELECT`. Between the `INSERT` and `SELECT`, another process could modify the row. Should use `LAST_INSERT_ID()` instead. | 🟡 Medium |
| 19 | [`server.js`](file:///c:/Users/Harsh%20Gupta/Desktop/Projects/Placement-Project-Jims/Backend/server.js#L83) | **No retry logic on DB init failure** — `process.exit(1)` on startup DB failure with no exponential back-off. A transient DB restart (e.g., during a deploy) kills the server permanently. | 🟡 Medium |
| 20 | [`emailService.js`](file:///c:/Users/Harsh%20Gupta/Desktop/Projects/Placement-Project-Jims/Backend/src/services/emailService.js#L48) | **`content-length` uses character count, not byte count** — `data.length` underestimates bytes for multi-byte (Unicode) characters. The Brevo API may reject requests or truncate payloads. | 🟡 Medium |
| 21 | [`cieCsvService.js`](file:///c:/Users/Harsh%20Gupta/Desktop/Projects/Placement-Project-Jims/Backend/src/services/cieCsvService.js#L78) | **CIE commit relies on transient in-memory preview data** — `semester_id` is stored only in memory. If the server restarts between upload and confirm steps, the commit will fail silently or produce incorrect results. | 🟡 Medium |

### Frontend

| # | File | Flaw | Severity |
|---|------|------|----------|
| 22 | [`MainDashboard.jsx`](file:///c:/Users/Harsh%20Gupta/Desktop/Projects/Placement-Project-Jims/client/src/pages/MainDashboard.jsx#L65) | **`fetchStudents` in a potentially infinite `useEffect`** — `useEffect(() => { fetchStudents(); }, [fetchStudents])` lists `fetchStudents` as a dependency. Zustand recreates functions on each state update, which can trigger excessive or infinite refetch loops. | 🟠 High |
| 23 | [`AppRoutes.jsx`](file:///c:/Users/Harsh%20Gupta/Desktop/Projects/Placement-Project-Jims/client/src/routes/AppRoutes.jsx#L43) | **Duplicate catch-all route** — `path="/*"` and `path="*"` both exist. The second `Navigate` is unreachable dead code and can create confusion about routing behavior. | 🟡 Medium |

---

## 🟡 MAINTAINABILITY

### Backend

| # | File | Flaw | Severity |
|---|------|------|----------|
| 24 | [`importService.js`](file:///c:/Users/Harsh%20Gupta/Desktop/Projects/Placement-Project-Jims/Backend/src/services/importService.js) + [`studentController.js`](file:///c:/Users/Harsh%20Gupta/Desktop/Projects/Placement-Project-Jims/Backend/src/controllers/studentController.js) | **Duplicated upsert logic** — The exact same 14-column student upsert SQL is copied verbatim in both `bulkUploadStudents` and `ImportService.upsertStudent`. Any schema change must be applied in two places. | 🟠 High |
| 25 | [`importService.js`](file:///c:/Users/Harsh%20Gupta/Desktop/Projects/Placement-Project-Jims/Backend/src/services/importService.js) and all CSV services | **Spreadsheet column names hardcoded as magic strings** — `data['Student Name']`, `data['Date of Birth (DD/MM/YYYY Format Only)']` etc. are scattered across 4+ files. A CSV header rename breaks all of them silently. Should be extracted into a constants file. | 🟠 High |
| 26 | [`db.js`](file:///c:/Users/Harsh%20Gupta/Desktop/Projects/Placement-Project-Jims/Backend/src/config/db.js) | **Schema managed in application startup code** — All `CREATE TABLE IF NOT EXISTS` statements live inside the app. There are no proper migration files (e.g., Knex, Flyway). Column modifications cannot be applied this way — only new tables can be created. | 🟠 High |
| 27 | [`server.js`](file:///c:/Users/Harsh%20Gupta/Desktop/Projects/Placement-Project-Jims/Backend/server.js#L8) | **Duplicate comment** — `// Middleware` appears twice consecutively at lines 8–9, indicating careless editing. | 🟢 Low |
| 28 | [`package.json`](file:///c:/Users/Harsh%20Gupta/Desktop/Projects/Placement-Project-Jims/Backend/package.json#L7) | **No dev script** — Only a `start` script using `node`. There is no `dev` script using `nodemon` for hot-reload, making the development workflow unnecessarily slow. | 🟢 Low |

### Frontend

| # | File | Flaw | Severity |
|---|------|------|----------|
| 29 | [`MainDashboard.jsx`](file:///c:/Users/Harsh%20Gupta/Desktop/Projects/Placement-Project-Jims/client/src/pages/MainDashboard.jsx#L49) | **URL-based routing via string-splitting instead of React Router** — `activeView` is derived by parsing `location.pathname`. All panels render inside a massive `if-else` chain rather than using proper `<Route>` elements. This is an anti-pattern. | 🟠 High |
| 30 | [`MainDashboard.jsx`](file:///c:/Users/Harsh%20Gupta/Desktop/Projects/Placement-Project-Jims/client/src/pages/MainDashboard.jsx) | **God component (282 lines)** — Handles routing logic, global state, 5+ modal states, auth checks, and multiple child panels all in one file. Violates Single Responsibility Principle and makes testing/refactoring extremely difficult. | 🟠 High |
| 31 | [`LoginPage.jsx`](file:///c:/Users/Harsh%20Gupta/Desktop/Projects/Placement-Project-Jims/client/src/pages/LoginPage.jsx#L66) | **Malformed `htmlFor` attribute** — `htmlFor="email text-left block"` contains CSS class names in the label ID. The label is not properly associated with the input, breaking accessibility. | 🟡 Medium |
| 32 | [`MainDashboard.jsx`](file:///c:/Users/Harsh%20Gupta/Desktop/Projects/Placement-Project-Jims/client/src/pages/MainDashboard.jsx#L181) | **Incorrect "In Process" counter** — `placement_status !== 'placed'` also catches `null`/`undefined` students (those with no placement record), so the "In Process" count is misleadingly inflated. | 🟡 Medium |

---

## 🟡 USABILITY

### Frontend

| # | File | Flaw | Severity |
|---|------|------|----------|
| 33 | [`LoginPage.jsx`](file:///c:/Users/Harsh%20Gupta/Desktop/Projects/Placement-Project-Jims/client/src/pages/LoginPage.jsx#L113) | **"Forgot Password" is non-functional** — The button shows a toast saying "coming soon". Users who forget their password have zero recovery path in the system. | 🟠 High |
| 34 | [`AdminUploadPanel.jsx`](file:///c:/Users/Harsh%20Gupta/Desktop/Projects/Placement-Project-Jims/client/src/pages/AdminUploadPanel.jsx#L141) | **File size limit stated but not enforced** — The UI shows "(Max 5MB)" but `handleFileChange` has no size check. Users discover the issue only after a slow upload and server error. | 🟡 Medium |
| 35 | [`AppRoutes.jsx`](file:///c:/Users/Harsh%20Gupta/Desktop/Projects/Placement-Project-Jims/client/src/routes/AppRoutes.jsx#L11) | **Generic spinner as loading fallback** — `LoadingFallback` is a plain spinning circle with no label. Users have no context about what is loading. | 🟡 Medium |
| 36 | [`MainDashboard.jsx`](file:///c:/Users/Harsh%20Gupta/Desktop/Projects/Placement-Project-Jims/client/src/pages/MainDashboard.jsx#L131) | **No empty state for fresh database** — When `fetchStudents` returns 0 records (e.g., on a newly seeded DB), the user sees a blank table with no explanation or call to action. | 🟡 Medium |
| 37 | [`SignUp.jsx`](file:///c:/Users/Harsh%20Gupta/Desktop/Projects/Placement-Project-Jims/client/src/pages/SignUp.jsx#L128) | **Unhelpful password field labels ("Create" / "Repeat")** — Labels are too terse, no password strength indicator is provided, and weak passwords are only caught client-side at > 6 chars. | 🟢 Low |

---

## 🟡 EFFICIENCY

### Backend

| # | File | Flaw | Severity |
|---|------|------|----------|
| 38 | [`studentController.js`](file:///c:/Users/Harsh%20Gupta/Desktop/Projects/Placement-Project-Jims/Backend/src/controllers/studentController.js#L21) | **3 correlated subqueries per row in the student list** — `percentage_10th`, `percentage_12th`, `percentage_grad` are each a separate subquery executed for every student row. A `LEFT JOIN academics` with a `CASE` expression is far more efficient. | 🟠 High |
| 39 | [`importService.js`](file:///c:/Users/Harsh%20Gupta/Desktop/Projects/Placement-Project-Jims/Backend/src/services/importService.js#L59) | **Row-by-row staging inserts** — Each CSV row triggers a separate `INSERT INTO import_staging`. For a 500-row file, that's 500 sequential round-trips. A batched bulk insert would be orders of magnitude faster. | 🟠 High |
| 40 | [`studentController.js`](file:///c:/Users/Harsh%20Gupta/Desktop/Projects/Placement-Project-Jims/Backend/src/controllers/studentController.js#L18) | **`SELECT s.*` fetches all columns** — The student list query selects all 14 columns including large `TEXT` fields (`skills`). Explicitly selecting only the fields needed for the list view reduces network I/O. | 🟡 Medium |
| 41 | [`companyController.js`](file:///c:/Users/Harsh%20Gupta/Desktop/Projects/Placement-Project-Jims/Backend/src/controllers/companyController.js#L70) | **Missing database indexes** — The `applications` table is queried frequently with `GROUP BY student_id` and `JOIN`, but no explicit index is defined beyond the primary key. Query performance degrades linearly with data growth. | 🟡 Medium |

### Frontend

| # | File | Flaw | Severity |
|---|------|------|----------|
| 42 | [`useStudentStore.js`](file:///c:/Users/Harsh%20Gupta/Desktop/Projects/Placement-Project-Jims/client/src/store/useStudentStore.js#L113) | **All filtering happens client-side in memory** — The entire student list is fetched and filtered in the browser. With 1000+ students, this will cause noticeable sluggishness. Server-side filtering and pagination is required for scalability. | 🟠 High |
| 43 | [`useStudentStore.js`](file:///c:/Users/Harsh%20Gupta/Desktop/Projects/Placement-Project-Jims/client/src/store/useStudentStore.js#L54) | **Skill extraction rebuilt on every fetch** — A `Set` of all skills is rebuilt from scratch every time `fetchStudents` runs, regardless of whether data changed. This should be memoized. | 🟢 Low |

---

## 🟡 PORTABILITY

### Backend

| # | File | Flaw | Severity |
|---|------|------|----------|
| 44 | [`db.js`](file:///c:/Users/Harsh%20Gupta/Desktop/Projects/Placement-Project-Jims/Backend/src/config/db.js) | **MySQL-specific SQL** — Heavy use of `ON DUPLICATE KEY UPDATE` and `TINYINT(1)` are MySQL-only. Migrating to PostgreSQL or SQLite would require significant query rewrites across the entire codebase. | 🟡 Medium |
| 45 | All | **No Docker / containerization** — No `Dockerfile` or `docker-compose.yml`. Deployment requires manual MySQL setup. Reproducing the environment on a new machine is error-prone and undocumented. | 🟡 Medium |
| 46 | [`importService.js`](file:///c:/Users/Harsh%20Gupta/Desktop/Projects/Placement-Project-Jims/Backend/src/services/importService.js#L181) | **Excel serial date parsing is silently unimplemented** — `if (typeof d === 'number') return null` returns null instead of parsing the Excel serial date. Spreadsheets created natively in Excel will have missing DOB values. | 🟡 Medium |
| 47 | [`server.js`](file:///c:/Users/Harsh%20Gupta/Desktop/Projects/Placement-Project-Jims/Backend/server.js#L61) | **Static file path assumes fixed directory structure** — `path.join(__dirname, '../client/dist')` only works when `client` is a sibling of `Backend`. Any deployment that changes the directory structure silently breaks production. | 🟡 Medium |

### Frontend

| # | File | Flaw | Severity |
|---|------|------|----------|
| 48 | [`axiosInstance.js`](file:///c:/Users/Harsh%20Gupta/Desktop/Projects/Placement-Project-Jims/client/src/api/axiosInstance.js#L4) | **Fallback API URL hardcoded to `localhost:3000`** — If `VITE_API_URL` is not set in production, the app silently calls `localhost` and fails. The build should throw a hard error if this variable is absent in production. | 🟠 High |

---

## Summary Table

| Category | 🔴 Critical | 🟠 High | 🟡 Medium | 🟢 Low | Total |
|----------|------------|---------|----------|--------|-------|
| Security | 5 | 7 | 3 | 0 | **15** |
| Reliability | 0 | 3 | 4 | 0 | **7** |
| Maintainability | 0 | 4 | 2 | 2 | **8** |
| Usability | 0 | 1 | 3 | 1 | **5** |
| Efficiency | 0 | 2 | 2 | 1 | **5** |
| Portability | 0 | 1 | 4 | 0 | **5** |
| **TOTAL** | **5** | **18** | **18** | **4** | **45** |

---

## 🚨 Top Priority Fixes (Do These First)

1. **Add `verifyToken` + `isAdmin` middleware to [`adminRoutes.js`](file:///c:/Users/Harsh%20Gupta/Desktop/Projects/Placement-Project-Jims/Backend/src/routes/adminRoutes.js)** — Currently, anyone can approve themselves as admin
2. **Add `verifyToken` to [`studentRoutes.js`](file:///c:/Users/Harsh%20Gupta/Desktop/Projects/Placement-Project-Jims/Backend/src/routes/studentRoutes.js)** — All student PII is publicly accessible
3. **Remove the hardcoded JWT fallback in [`authMiddleware.js`](file:///c:/Users/Harsh%20Gupta/Desktop/Projects/Placement-Project-Jims/Backend/src/middleware/authMiddleware.js#L11)** — Throw an error if `JWT_SECRET` is not set in env
4. **Add `.env` to `.gitignore`** and immediately **revoke** the exposed DB password and Brevo API key
5. **Force role to `'user'` on signup in [`authController.js`](file:///c:/Users/Harsh%20Gupta/Desktop/Projects/Placement-Project-Jims/Backend/src/controllers/authController.js#L25)** — Never trust client-supplied role values
