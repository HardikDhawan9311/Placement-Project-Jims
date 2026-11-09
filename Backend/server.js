require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Log environment state
console.log('🌐 Environment:', process.env.NODE_ENV || 'development');
console.log('🔌 Database URL detected:', (process.env.DATABASE_URL || process.env.MYSQL_PUBLIC_URL) ? 'Yes' : 'No');
console.log('Environment check (loaded booleans):', {
  PORT: Boolean(process.env.PORT),
  JWT_SECRET: Boolean(process.env.JWT_SECRET),
  DATABASE_URL: Boolean(process.env.DATABASE_URL || process.env.MYSQL_PUBLIC_URL),
  BREVO_API_KEY: Boolean(process.env.BREVO_API_KEY),
  SENDER_EMAIL: Boolean(process.env.SENDER_EMAIL)
});

// Global error handlers for better debugging
process.on('unhandledRejection', (reason, promise) => {
  console.error('🔥 Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('🔥 Uncaught Exception:', err);
  process.exit(1);
});

const app = express();
const port = process.env.PORT || 3000;

// Middleware - Allowed Origins Whitelist
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL
].filter(Boolean);

// Add any additional configured origins
if (process.env.ALLOWED_ORIGINS) {
  process.env.ALLOWED_ORIGINS.split(',').forEach(origin => {
    const trimmed = origin.trim();
    if (trimmed) allowedOrigins.push(trimmed);
  });
}

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin) return callback(null, true);

    // Check against configured allowlist or Vercel preview domains if enabled
    const isAllowed = allowedOrigins.includes(origin) ||
      (process.env.ALLOW_VERCEL_PREVIEWS === 'true' && origin.endsWith('.vercel.app'));

    if (isAllowed) {
      return callback(null, true);
    }

    const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
    return callback(new Error(msg), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Request body size limit to prevent memory exhaustion (Issue #8)
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Database connection
const pool = require('./src/config/db');

// Rate limiting for login (Issue #9)
const loginAttempts = new Map();

const loginRateLimiter = (req, res, next) => {
  const key = req.ip;
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15-minute window
  const maxAttempts = 15; // max 15 login attempts per window

  if (!loginAttempts.has(key)) {
    loginAttempts.set(key, []);
  }

  const attempts = loginAttempts.get(key).filter(ts => now - ts < windowMs);

  if (attempts.length >= maxAttempts) {
    return res.status(429).json({
      error: 'Too many login attempts. Please try again in 15 minutes.'
    });
  }

  attempts.push(now);
  loginAttempts.set(key, attempts);
  next();
};

// Periodically clean up old rate limit entries (every 30 min)
setInterval(() => {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  for (const [key, attempts] of loginAttempts.entries()) {
    const valid = attempts.filter(ts => now - ts < windowMs);
    if (valid.length === 0) {
      loginAttempts.delete(key);
    } else {
      loginAttempts.set(key, valid);
    }
  }
}, 30 * 60 * 1000);

// Routes
const studentRoutes = require('./src/routes/studentRoutes');
const authRoutes = require('./src/routes/authRoutes');
const companyRoutes = require('./src/routes/companyRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const importRoutes = require('./src/routes/importRoutes');
const companyCsvRoutes = require('./src/routes/companyCsvRoutes');
const cieCsvRoutes = require('./src/routes/cieCsvRoutes');
const mockCsvRoutes = require('./src/routes/mockCsvRoutes');

// Apply rate limiter specifically to login route
const authRateLimitRouter = express.Router();
authRateLimitRouter.post('/login', loginRateLimiter, require('./src/controllers/authController').signin);
app.use('/api/users', authRateLimitRouter);

app.use('/api/students', studentRoutes);
app.use('/api/users', authRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/import', importRoutes);
app.use('/api/companies-import', companyCsvRoutes);
app.use('/api/cie-import', cieCsvRoutes);
app.use('/api/mock-import', mockCsvRoutes);

// Basic health check (Keep this ABOVE the static files block)
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Backend is running',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV
  });
});

// Root API route
app.get('/api', (req, res) => {
  res.json({ message: 'Welcome to the Placement Project API' });
});

// Serve static files from the React app in production
if (process.env.NODE_ENV === 'production') {
  const clientDistPath = process.env.CLIENT_DIST_PATH
    ? path.resolve(__dirname, process.env.CLIENT_DIST_PATH)
    : path.join(__dirname, '../client/dist');

  if (fs.existsSync(clientDistPath)) {
    console.log('📂 Production Mode: Serving static files from', clientDistPath);
    app.use(express.static(clientDistPath));

    app.get('(.*)', (req, res, next) => {
      // If it's an API route, don't serve index.html
      if (req.path.startsWith('/api')) return next();

      const indexPath = path.join(clientDistPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        next();
      }
    });
  } else {
    console.log('ℹ️ Production Mode: Running as standalone API server (No static files found).');
  }
}

const startServer = async () => {
  const maxRetries = 3;
  const retryDelay = 5000; // 5 seconds

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Ensure database is ready before taking requests
      await pool.initializeDatabase();

      app.listen(port, () => {
        console.log(`✅ Server is running on port: ${port}`);
      });
      return; // Success — exit retry loop
    } catch (err) {
      console.error(`❌ Database init attempt ${attempt}/${maxRetries} failed:`, err.message);
      if (attempt < maxRetries) {
        console.log(`⏳ Retrying in ${retryDelay / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      } else {
        console.error('❌ All database init retries exhausted. Exiting.');
        process.exit(1);
      }
    }
  }
};

startServer().catch(err => {
  console.error('🔥 Fatal error during server startup:', err);
  process.exit(1);
});
