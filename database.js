const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
}

const dbPath = path.join(dataDir, 'licenses.db');
const db = new sqlite3.Database(dbPath);

/**
 * Initialize database schema
 */
function initDB() {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            db.run(`
                CREATE TABLE IF NOT EXISTS licenses (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    license_key TEXT UNIQUE NOT NULL,
                    email TEXT NOT NULL,
                    project_id TEXT NOT NULL, -- To support independent projects
                    is_active INTEGER DEFAULT 1,
                    expires_at INTEGER,
                    created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
                )
            `, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    });
}

/**
 * Get license details by key
 */
function getLicenseByKey(key) {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM licenses WHERE license_key = ?', [key], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

/**
 * Create a new license (called via Stripe Webhook or Admin)
 */
function createLicense(key, email, projectId, durationMs = null) {
    const expiresAt = durationMs ? Date.now() + durationMs : null;
    return new Promise((resolve, reject) => {
        db.run(
            'INSERT INTO licenses (license_key, email, project_id, expires_at) VALUES (?, ?, ?, ?)',
            [key, email, projectId, expiresAt],
            function(err) {
                if (err) reject(err);
                else resolve({ id: this.lastID, key, email, projectId, expiresAt });
            }
        );
    });
}

module.exports = {
    initDB,
    getLicenseByKey,
    createLicense,
    db
};
