const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const app = express();
const port = process.env.PORT || 3000;

// Log environment state (helpful for debugging Render)
console.log('🌐 Environment:', process.env.NODE_ENV || 'development');
console.log('🔌 Database URL detected:', (process.env.DATABASE_URL || process.env.MYSQL_PUBLIC_URL) ? 'Yes' : 'No');

// Global error handlers for better debugging
process.on('unhandledRejection', (reason, promise) => {
  console.error('🔥 Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('🔥 Uncaught Exception:', err);
  process.exit(1);
});

// Middleware
// Middleware
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL
].filter(Boolean); // Remove null/undefined if FRONTEND_URL isn't set

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // Check if origin matches allowed list or is a Vercel subdomain
    const isAllowed = allowedOrigins.includes(origin) ||
      origin.endsWith('.vercel.app');

    if (!isAllowed) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Database connection
const pool = require('./src/config/db');

// Routes
const studentRoutes = require('./src/routes/studentRoutes');
const authRoutes = require('./src/routes/authRoutes');
const companyRoutes = require('./src/routes/companyRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const importRoutes = require('./src/routes/importRoutes');
const companyCsvRoutes = require('./src/routes/companyCsvRoutes');
const cieCsvRoutes = require('./src/routes/cieCsvRoutes');
const mockCsvRoutes = require('./src/routes/mockCsvRoutes');

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
  const fs = require('fs');
  const distPath = path.join(__dirname, '../client/dist');
  
  if (fs.existsSync(distPath)) {
    console.log('📂 Production Mode: Serving static files from', distPath);
    app.use(express.static(distPath));

    app.get('(.*)', (req, res, next) => {
      // If it's an API route, don't serve index.html
      if (req.path.startsWith('/api')) return next();
      
      const indexPath = path.join(distPath, 'index.html');
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
  try {
    // Ensure database is ready before taking requests
    await pool.initializeDatabase();

    app.listen(port, () => {
      console.log(`✅ Server is running on port: ${port}`);
    });
  } catch (err) {
    console.error('❌ Failed to start server due to database error:', err);
    process.exit(1);
  }
};

startServer().catch(err => {
  console.error('🔥 Fatal error during server startup:', err);
  process.exit(1);
});

