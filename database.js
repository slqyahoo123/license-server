const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
}

const dbPath = path.join(dataDir, 'licenses.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

db.exec(`
    CREATE TABLE IF NOT EXISTS licenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        license_key TEXT UNIQUE NOT NULL,
        email TEXT NOT NULL,
        project_id TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        expires_at INTEGER,
        created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
    )
`);

function initDB() {
    return Promise.resolve();
}

function getLicenseByKey(key) {
    const row = db.prepare('SELECT * FROM licenses WHERE license_key = ?').get(key);
    return Promise.resolve(row);
}

function createLicense(key, email, projectId, durationMs = null) {
    const expiresAt = durationMs ? Date.now() + durationMs : null;
    const info = db.prepare(
        'INSERT INTO licenses (license_key, email, project_id, expires_at) VALUES (?, ?, ?, ?)'
    ).run(key, email, projectId, expiresAt);
    return Promise.resolve({ id: info.lastInsertRowid, key, email, projectId, expiresAt });
}

module.exports = {
    initDB,
    getLicenseByKey,
    createLicense,
    db
};
