const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.V3_JWT_SECRET;
if (!JWT_SECRET) {
    console.error('[FATAL] V3_JWT_SECRET environment variable is not set. Server cannot start.');
    process.exit(1);
}
const TOKEN_EXPIRY = '7d'; // Token valid for 7 days

/**
 * Generate a signed JWT for an authorized device
 */
function generateToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

/**
 * Verify a JWT coming from the extension
 */
function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (err) {
        return null; // Invalid or expired
    }
}

module.exports = {
    generateToken,
    verifyToken
};
