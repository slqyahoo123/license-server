/**
 * License Server - Integration Tests
 * Tests license verification, health check, and Stripe webhook.
 */

const request = require('supertest');

// Set test env before requiring server
process.env.V3_JWT_SECRET = 'test_secret_key_not_for_production_12345678';
process.env.V3_CORS_ORIGINS = 'chrome-extension://test';
process.env.NODE_ENV = 'test';

// Use a separate test database — clean slate each run
const path = require('path');
const fs = require('fs');
const testDbDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(testDbDir)) fs.mkdirSync(testDbDir);
const testDbPath = path.join(testDbDir, 'licenses.db');
if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);

const app = require('../server');

describe('Health Check', () => {
    it('GET /health returns 200 with status', async () => {
        const res = await request(app).get('/health');
        expect(res.statusCode).toBe(200);
        expect(res.body.status).toBe('healthy');
        expect(res.body.timestamp).toBeDefined();
    });
});

describe('License Verification', () => {
    const testKey = 'V3-TEST-AAAA';
    const testEmail = 'test@example.com';
    const testProject = 'V3_SPEED_PRO';

    beforeAll(async () => {
        const { createLicense } = require('../database');
        await createLicense(testKey, testEmail, testProject);
    });

    it('should reject missing key', async () => {
        const res = await request(app)
            .post('/api/license/verify')
            .send({ projectId: testProject });
        expect(res.statusCode).toBe(400);
        expect(res.body.error).toBeDefined();
    });

    it('should reject invalid key', async () => {
        const res = await request(app)
            .post('/api/license/verify')
            .send({ key: 'INVALID', projectId: testProject });
        expect(res.statusCode).toBe(403);
        expect(res.body.valid).toBe(false);
    });

    it('should accept valid key and return JWT', async () => {
        const res = await request(app)
            .post('/api/license/verify')
            .send({ key: testKey, projectId: testProject });
        expect(res.statusCode).toBe(200);
        expect(res.body.valid).toBe(true);
        expect(res.body.token).toBeDefined();
        // JWT should have 3 parts
        expect(res.body.token.split('.')).toHaveLength(3);
    });

    it('should reject key for wrong project', async () => {
        const res = await request(app)
            .post('/api/license/verify')
            .send({ key: testKey, projectId: 'V3_WRONG_PRO' });
        expect(res.statusCode).toBe(403);
        expect(res.body.valid).toBe(false);
    });

    it('should accept ALL_ACCESS key for any project', async () => {
        const { createLicense } = require('../database');
        await createLicense('V3-ALL-TEST', 'admin@test.com', 'ALL_ACCESS');

        const res = await request(app)
            .post('/api/license/verify')
            .send({ key: 'V3-ALL-TEST', projectId: 'V3_FOCUS_PRO' });
        expect(res.statusCode).toBe(200);
        expect(res.body.valid).toBe(true);
    });
});

describe('Stripe Webhook', () => {
    it('should reject missing email or projectId', async () => {
        const res = await request(app)
            .post('/api/webhook/stripe')
            .send({ email: 'test@test.com' }); // no projectId
        expect(res.statusCode).toBe(400);
        expect(res.body.error).toBe('Missing email or projectId');
    });
});
