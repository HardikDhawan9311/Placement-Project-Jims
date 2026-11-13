const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.signup = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Check if user exists
        const [existing] = await db.query('SELECT email FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(400).json({ error: 'An account with this email already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Insert user (default is_approved to 0)
        // Always force role to 'user' on public signup to prevent privilege escalation
        const userRole = 'user';
        const result = await db.query(
            'INSERT INTO users (name, email, password, role, is_approved) VALUES (?, ?, ?, ?, 0)',
            [name, email, hashedPassword, userRole]
        );

        res.status(201).json({ 
            message: 'Registration successful! Please wait for administrator approval before logging in.', 
            userId: result[0].insertId 
        });
    } catch (err) {
        console.error('Signup error:', err);
        res.status(500).json({ error: 'Server error during signup' });
    }
};

exports.signin = async (req, res) => {
    try {
        const { email, password, role } = req.body;

        if (!email || !password || !role) {
            return res.status(400).json({ error: 'Please provide email, password, and select your role.' });
        }
        
        const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (rows.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const user = rows[0];

        // 1. Role Check — generic message to avoid revealing actual role
        if (user.role !== role) {
            return res.status(401).json({ 
                error: 'Invalid email or password.' 
            });
        }

        // 2. Approval Check
        if (!user.is_approved) {
            return res.status(403).json({ 
                error: 'Your account is pending administrator approval. Please try again later or contact the admin.' 
            });
        }

        // 3. Password Check
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        // Create JWT
        const payload = { id: user.id, email: user.email, role: user.role };
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            console.error('FATAL: JWT_SECRET is not configured in environment variables.');
            return res.status(500).json({ error: 'Server configuration error.' });
        }
        const token = jwt.sign(payload, secret, { expiresIn: '1d' });

        res.json({ 
            message: 'Logged in successfully', 
            token, 
            user: { 
                id: user.id, 
                name: user.name, 
                email: user.email, 
                role: user.role 
            } 
        });
    } catch (err) {
        console.error('Signin error:', err);
        res.status(500).json({ error: 'Server error during signin' });
    }
};

exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }
        
        // Feature not yet implemented — return a consistent message
        // to avoid revealing whether an email exists in the system
        res.status(501).json({ 
            error: 'Password reset is not yet available. Please contact the administrator to reset your password.' 
        });
    } catch (err) {
        console.error('Forgot password error:', err);
        res.status(500).json({ error: 'Server error during forgot password' });
    }
};

