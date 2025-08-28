const express = require('express');
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const router = express.Router();

// Database connection
const dbPath = path.join(__dirname, '..', 'database', 'events.db');

function getDb() {
    return new sqlite3.Database(dbPath, (err) => {
        if (err) {
            console.error('Database connection error:', err.message);
        }
    });
}

// Validation middleware
const validateRegistration = [
    body('username')
        .isLength({ min: 3 })
        .withMessage('Username must be at least 3 characters long')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Username can only contain letters, numbers, and underscores'),
    body('email')
        .isEmail()
        .withMessage('Please provide a valid email address'),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long'),
    body('firstName')
        .isLength({ min: 1 })
        .withMessage('First name is required'),
    body('lastName')
        .isLength({ min: 1 })
        .withMessage('Last name is required')
];

const validateLogin = [
    body('username')
        .isLength({ min: 1 })
        .withMessage('Username is required'),
    body('password')
        .isLength({ min: 1 })
        .withMessage('Password is required')
];

// Register new user
router.post('/register', validateRegistration, async (req, res) => {
    try {
        // Check validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                error: 'Validation failed', 
                details: errors.array() 
            });
        }

        const { username, email, password, firstName, lastName } = req.body;
        
        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);
        
        const db = getDb();
        
        // Check if user already exists
        db.get(
            'SELECT id FROM users WHERE username = ? OR email = ?',
            [username, email],
            (err, row) => {
                if (err) {
                    console.error('Database error:', err);
                    return res.status(500).json({ error: 'Database error' });
                }
                
                if (row) {
                    return res.status(409).json({ error: 'Username or email already exists' });
                }
                
                // Insert new user
                db.run(
                    `INSERT INTO users (username, email, password_hash, first_name, last_name) 
                     VALUES (?, ?, ?, ?, ?)`,
                    [username, email, passwordHash, firstName, lastName],
                    function(err) {
                        if (err) {
                            console.error('Insert error:', err);
                            return res.status(500).json({ error: 'Failed to create user' });
                        }
                        
                        // Get the created user
                        db.get(
                            'SELECT id, username, email, role, first_name, last_name FROM users WHERE id = ?',
                            [this.lastID],
                            (err, user) => {
                                db.close();
                                
                                if (err) {
                                    console.error('User fetch error:', err);
                                    return res.status(500).json({ error: 'User created but fetch failed' });
                                }
                                
                                // Set session
                                req.session.user = user;
                                
                                res.status(201).json({
                                    message: 'User registered successfully',
                                    user: {
                                        id: user.id,
                                        username: user.username,
                                        email: user.email,
                                        role: user.role,
                                        firstName: user.first_name,
                                        lastName: user.last_name
                                    }
                                });
                            }
                        );
                    }
                );
            }
        );
        
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Login user
router.post('/login', validateLogin, (req, res) => {
    try {
        // Check validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                error: 'Validation failed', 
                details: errors.array() 
            });
        }

        const { username, password } = req.body;
        
        const db = getDb();
        
        // Find user by username or email
        db.get(
            'SELECT * FROM users WHERE username = ? OR email = ?',
            [username, username],
            async (err, user) => {
                db.close();
                
                if (err) {
                    console.error('Database error:', err);
                    return res.status(500).json({ error: 'Database error' });
                }
                
                if (!user) {
                    return res.status(401).json({ error: 'Invalid username or password' });
                }
                
                // Check password
                try {
                    const passwordMatch = await bcrypt.compare(password, user.password_hash);
                    
                    if (!passwordMatch) {
                        return res.status(401).json({ error: 'Invalid username or password' });
                    }
                    
                    // Set session
                    req.session.user = {
                        id: user.id,
                        username: user.username,
                        email: user.email,
                        role: user.role,
                        firstName: user.first_name,
                        lastName: user.last_name
                    };
                    
                    res.json({
                        message: 'Login successful',
                        user: req.session.user
                    });
                    
                } catch (bcryptError) {
                    console.error('Password comparison error:', bcryptError);
                    res.status(500).json({ error: 'Authentication error' });
                }
            }
        );
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Logout user
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Session destroy error:', err);
            return res.status(500).json({ error: 'Logout failed' });
        }
        res.json({ message: 'Logout successful' });
    });
});

// Get current user session
router.get('/me', (req, res) => {
    if (req.session.user) {
        res.json({ user: req.session.user });
    } else {
        res.status(401).json({ error: 'Not authenticated' });
    }
});

// Check authentication status
router.get('/status', (req, res) => {
    res.json({ 
        authenticated: !!req.session.user,
        user: req.session.user || null
    });
});

module.exports = router;