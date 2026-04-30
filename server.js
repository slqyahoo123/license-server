/**
 * V3 Global License Server - Production Grade
 * Manages licensing, persistence, and secure JWT issuance for the V3 Asset Matrix.
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const { initDB, getLicenseByKey, createLicense } = require('./database');
const { generateToken } = require('./auth_service');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
const ALLOWED_ORIGINS = (process.env.V3_CORS_ORIGINS || 'chrome-extension://*').split(',');
app.use(cors({
    origin: ALLOWED_ORIGINS,
    methods: ['GET', 'POST']
}));
app.use(express.json());

// Initialize Database on startup
initDB().then(() => {
    console.log('[DB] SQLite initialized successfully.');
}).catch(err => {
    console.error('[DB] Failed to initialize database:', err);
    process.exit(1);
});

/**
 * STRIPE WEBHOOK (Simulated Production Logic)
 * In a real production environment, this would verify Stripe signatures.
 */
app.post('/api/webhook/stripe', async (req, res) => {
    const { email, plan, projectId } = req.body;

    if (!email || !projectId) {
        return res.status(400).json({ error: 'Missing email or projectId' });
    }

    const licenseKey = `V3-${projectId}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    try {
        await createLicense(licenseKey, email, projectId);
        console.log(`[SALES] New license issued: ${licenseKey} for ${projectId}`);
        res.status(201).json({ status: 'success', key: licenseKey });
    } catch (err) {
        console.error('[SALES] Error creating license:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

/**
 * PAYPAL SUBSCRIPTION WEBHOOK
 * Called after user subscribes via PayPal. Creates an ALL_ACCESS license key.
 */
app.post('/api/webhook/paypal', async (req, res) => {
    const { email, subscriptionId } = req.body;

    if (!email || !subscriptionId) {
        return res.status(400).json({ error: 'Missing email or subscriptionId' });
    }

    const licenseKey = `V3-PAYPAL-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    try {
        await createLicense(licenseKey, email, 'ALL_ACCESS', Date.now() + 365 * 24 * 60 * 60 * 1000);
        console.log(`[PAYPAL] License issued: ${licenseKey} for ${email} (sub: ${subscriptionId})`);
        res.status(201).json({ status: 'success', key: licenseKey });
    } catch (err) {
        console.error('[PAYPAL] Error creating license:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

/**
 * LICENSE VERIFICATION
 * Validates the license key against SQLite and returns a signed JWT.
 */
app.post('/api/license/verify', async (req, res) => {
    const { key, projectId } = req.body;

    if (!key || !projectId) {
        return res.status(400).json({ error: 'Missing key or projectId' });
    }

    try {
        const license = await getLicenseByKey(key);

        if (!license || !license.is_active) {
            return res.status(403).json({ valid: false, error: 'Invalid license key' });
        }

        // Verify project isolation
        if (license.project_id !== projectId && license.project_id !== 'ALL_ACCESS') {
            return res.status(403).json({ valid: false, error: 'License not valid for this project' });
        }

        // Check expiration
        if (license.expires_at && Date.now() > license.expires_at) {
            return res.status(403).json({ valid: false, error: 'License expired' });
        }

        // Issue production JWT
        const token = generateToken({
            sub: license.email,
            key: license.license_key,
            project: projectId,
            tier: 'pro'
        });

        res.json({
            valid: true,
            token: token,
            issuedAt: Date.now()
        });

    } catch (err) {
        console.error('[AUTH] Verification error:', err);
        res.status(500).json({ error: 'Internal verification error' });
    }
});

// PayPal subscription redirect
app.get('/subscribe', (req, res) => {
    res.redirect('https://www.paypal.com/webapps/billing/subscriptions?plan_id=P-9RD48572XF8523849NHZSPKA');
});

// Health check
app.get('/health', (req, res) => res.json({ status: 'healthy', timestamp: Date.now() }));

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('[SERVER ERROR]', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Only start the server when run directly (not when required as a module for testing)
if (require.main === module) {
    app.listen(PORT, () => {
        const mode = process.env.NODE_ENV || 'development';
        console.log(`\n================================================`);
        console.log(`V3 MASTER LICENSE SERVER - [${mode.toUpperCase()}]`);
        console.log(`Running on: http://localhost:${PORT}`);
        console.log(`CORS allowed origins: ${ALLOWED_ORIGINS.join(', ')}`);
        console.log(`Ready for 15-asset matrix deployment.`);
        console.log(`================================================\n`);
    });
}

module.exports = app;
