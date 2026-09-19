// server.js — Node.js + Express + MySQL Backend

const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(express.json());
app.use(cors());

// Serve static frontend files from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));


// ==========================================
// MYSQL DATABASE CONNECTION
// ==========================================

const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'agricare_db',
    port: process.env.DB_PORT || 3306
});


// ==========================================
// DATABASE CONNECTION + USERS TABLE
// ==========================================

db.connect((err) => {
    if (err) {
        console.error('Database connection failed:', err);
        console.log('Tip: Ensure your MySQL server is running and the database "agricare_db" has been created.');
        return;
    }

    console.log('Connected to MySQL Database successfully.');

    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            location VARCHAR(255) NOT NULL,
            password VARCHAR(255) NOT NULL,
            role VARCHAR(50) DEFAULT 'user'
        )
    `;

    db.query(createTableQuery, (err) => {
        if (err) {
            console.error('Error creating users table:', err);
        } else {
            console.log('Users table verified/created.');
        }
    });
});


// ==========================================
// STRICT ADMIN CONFIGURATION
// ==========================================

const ADMIN_EMAILS = [
    'mutarkarsoham01@gmail.com',
    'morepurva@gmail.com',
    'nairakshay@gmail.com'
];

const ADMIN_PASSWORD = 'Farmer@12345';


// ==========================================
// REGISTER USER
// ==========================================

app.post('/api/users/register', (req, res) => {
    const { name, email, location, password } = req.body;

    if (!name || !email || !location || !password) {
        return res.status(400).json({
            success: false,
            message: 'All fields are required.'
        });
    }

    const checkQuery = 'SELECT * FROM users WHERE email = ?';

    db.query(checkQuery, [email], (err, results) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Database error: ' + err.message
            });
        }

        if (results.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'This email is already registered. Please log in.'
            });
        }

        let role = 'user';

        // Check designated admin email
        if (ADMIN_EMAILS.includes(email)) {
            if (password !== ADMIN_PASSWORD) {
                return res.status(400).json({
                    success: false,
                    message: 'This email is reserved for system administration. Please use the correct admin password.'
                });
            }
            role = 'admin';
        } else {
            // Prevent normal users from using admin password
            if (password === ADMIN_PASSWORD) {
                return res.status(400).json({
                    success: false,
                    message: 'This password is reserved for designated administrator accounts.'
                });
            }
        }

        const insertQuery = `
            INSERT INTO users (name, email, location, password, role)
            VALUES (?, ?, ?, ?, ?)
        `;

        db.query(insertQuery, [name, email, location, password, role], (insertErr) => {
            if (insertErr) {
                if (insertErr.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({
                        success: false,
                        message: 'This email is already registered.'
                    });
                }

                return res.status(500).json({
                    success: false,
                    message: 'Database error: ' + insertErr.message
                });
            }

            res.status(201).json({
                success: true,
                message: 'User registered successfully!',
                role: role
            });
        });
    });
});


// ==========================================
// LOGIN USER / ADMIN
// ==========================================

app.post('/api/users/login', (req, res) => {
    const { email, password, isAdminChecked } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            success: false,
            message: 'Email and password are required.'
        });
    }

    const query = 'SELECT * FROM users WHERE email = ?';

    db.query(query, [email], (err, results) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Database error: ' + err.message
            });
        }

        let user = null;

        // ==========================================
        // ADMIN LOGIN WHEN ADMIN DOES NOT EXIST IN DB
        // ==========================================
        if (results.length === 0) {
            if (ADMIN_EMAILS.includes(email) && password === ADMIN_PASSWORD && isAdminChecked) {
                user = {
                    name: 'System Admin',
                    email: email,
                    role: 'admin'
                };
            } else {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid email or password.'
                });
            }
        } else {
            user = results[0];

            if (user.password !== password) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid email or password.'
                });
            }
        }

        // ==========================================
        // ADMIN PRIVILEGE VALIDATION
        // ==========================================
        if (isAdminChecked) {
            if (!ADMIN_EMAILS.includes(email) || password !== ADMIN_PASSWORD) {
                return res.status(403).json({
                    success: false,
                    message: 'Access Denied: You do not possess administrator privileges.'
                });
            }
            user.role = 'admin';
        } else {
            if (ADMIN_EMAILS.includes(email)) {
                user.role = 'admin';
            }
        }

        // ==========================================
        // LOGIN RESPONSE
        // ==========================================
        res.json({
            success: true,
            message: 'Login successful',
            token: 'mock-jwt-token-' + email,
            user: {
                id: user.id || null,
                name: user.name,
                email: user.email,
                location: user.location || '',
                role: user.role
            },
            role: user.role
        });
    });
});


// ==========================================
// ADMIN DASHBOARD API
// ==========================================

// 1. GET ALL REGISTERED USERS
app.get('/api/admin/users', (req, res) => {
    const query = `
        SELECT id, name, email, location, role
        FROM users
        ORDER BY id DESC
    `;

    db.query(query, (err, results) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Database error: ' + err.message
            });
        }

        res.json({
            success: true,
            users: results
        });
    });
});


// 2. DELETE USER
app.delete('/api/admin/users/:id', (req, res) => {
    const userId = req.params.id;
    const query = 'DELETE FROM users WHERE id = ?';

    db.query(query, [userId], (err, result) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Database error: ' + err.message
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found.'
            });
        }

        res.json({
            success: true,
            message: 'User deleted successfully.'
        });
    });
});


// 3. UPDATE USER ROLE
app.put('/api/admin/users/role/:id', (req, res) => {
    const userId = req.params.id;
    const { role } = req.body;

    if (!role || !['admin', 'user'].includes(role)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid role. Use admin or user.'
        });
    }

    const query = 'UPDATE users SET role = ? WHERE id = ?';

    db.query(query, [role, userId], (err, result) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Database error: ' + err.message
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found.'
            });
        }

        res.json({
            success: true,
            message: 'User role updated successfully.'
        });
    });
});


// ==========================================
// ADMIN DASHBOARD STATISTICS
// ==========================================

app.get('/api/admin/stats', (req, res) => {
    const query = `
        SELECT
            COUNT(*) AS totalUsers,
            SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) AS totalAdmins,
            SUM(CASE WHEN role = 'user' THEN 1 ELSE 0 END) AS totalFarmers
        FROM users
    `;

    db.query(query, (err, results) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Database error: ' + err.message
            });
        }

        res.json({
            success: true,
            stats: results[0]
        });
    });
});


// ==========================================
// SERVER FALLBACK ROUTE
// ==========================================

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'), (err) => {
        if (err) {
            res.status(404).send('Agricare API Server is running.');
        }
    });
});


// ==========================================
// START SERVER
// ==========================================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
});