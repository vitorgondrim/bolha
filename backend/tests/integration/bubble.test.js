// ============================================================
// BOLHA - INTEGRATION TESTS: Bubble Atomicity & Critical Flows
// Stack: Vitest + Supertest + mongodb-memory-server
// Coverage: Creation validation, Sopro race condition (C3)
// ============================================================

const request = require('supertest');
const mongoose = require('mongoose');

const {
  startMemoryServer,
  stopMemoryServer,
  clearDatabase,
  createApp,
  createTestUser,
} = require('../setup');
const { createTestBubbleRouter } = require('../helpers/testRouter');
const Bubble = require('../../src/models/Bubble');

// ─── Shared state ────────────────────────────────────────────
let app;
let bubbleId;

// ============================================================
// SUITE: Bubble Critical Flows (Create + Sopro Atomicity)
// ============================================================
describe('Bubble Integration Suite', () => {
  // ─── Global Arrange (once per suite, database is fresh) ───
  beforeAll(async () => {
    await startMemoryServer();

    app = createApp();
    app.use('/api/bubbles', createTestBubbleRouter());
  });

  afterAll(async () => {
    await stopMemoryServer();
  });

  // Full isolation: clean DB after each test
  afterEach(async () => {
    await clearDatabase();
  });

  // ==========================================================
  // SCENARIO: POST /api/bubbles — Creation
  // ==========================================================
  describe('POST /api/bubbles — Bubble Creation', () => {
    it('should create a bubble with valid payload (AAA)', async () => {
      // ─── ARRANGE ──────────────────────────────────────────
      const { token } = await createTestUser({ username: 'author_create' });
      const validPayload = {
        title: 'Bolha de Teste',
        content: 'Conteúdo válido para testes de integração.',
        subject: 'Tecnologia',
        isAnonymous: false,
      };

      // ─── ACT ──────────────────────────────────────────────
      const response = await request(app)
        .post('/api/bubbles')
        .set('Authorization', `Bearer ${token}`)
        .send(validPayload);

      // ─── ASSERT ───────────────────────────────────────────
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.bubble).toBeDefined();
      expect(response.body.bubble.title).toBe(validPayload.title);
      expect(response.body.bubble.content).toBe(validPayload.content);
      expect(response.body.bubble.subject).toBe(validPayload.subject);
      expect(response.body.bubble.author).toBeDefined();

      // Save for subsequent tests
      bubbleId = response.body.bubble._id;
    });

    it('should reject invalid payloads with 422 (Zod validation)', async () => {
      // ─── ARRANGE ──────────────────────────────────────────
      const { token } = await createTestUser({ username: 'author_invalid' });
      const invalidCases = [
        { title: '', content: 'válido' },
        { title: 'ok', content: '' },
        { title: 'ok', content: '   ' },
        { title: 'a'.repeat(61), content: 'válido' },
        { content: 'sem título' },
        {},
      ];

      for (const payload of invalidCases) {
        // ─── ACT ────────────────────────────────────────────
        const response = await request(app)
          .post('/api/bubbles')
          .set('Authorization', `Bearer ${token}`)
          .send(payload);

        // ─── ASSERT ─────────────────────────────────────────
        expect(response.status).toBe(422);
        expect(response.body.success).toBe(false);
        expect(response.body.errors).toBeDefined();
        expect(Array.isArray(response.body.errors)).toBe(true);
        expect(response.body.errors.length).toBeGreaterThanOrEqual(1);
      }
    });

    it('should reject without authentication (401)', async () => {
      // ─── ACT ──────────────────────────────────────────────
      const response = await request(app)
        .post('/api/bubbles')
        .send({ title: 'ok', content: 'conteúdo' });

      // ─── ASSERT ───────────────────────────────────────────
      expect(response.status).toBe(401);
    });
  });

  // ==========================================================
  // SCENARIO: C3 — Sopro Race Condition (Atomic $nin Barrier)
  // ==========================================================
  describe('POST /api/bubbles/:id/sopro — Bubble Atomicity (C3)', () => {
    // Helper: create fresh author + bubble + voter
    async function arrangeSoproTest() {
      const auth = await createTestUser({ username: 'sopro_author' });
      const vot = await createTestUser({ username: 'sopro_voter' });

      const bubble = await Bubble.create({
        title: 'Sopro Race Bubble',
        content: 'Bubble for atomic sopro test.',
        author: auth.user._id,
        oxygenLevel: 100,
        maxOxygen: 1000,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      return { authorToken: auth.token, voterToken: vot.token, bubble };
    }

    it('should allow only 1 successful sopro out of 5 concurrent requests', async () => {
      // ─── ARRANGE ──────────────────────────────────────────
      const { voterToken, bubble } = await arrangeSoproTest();

      // Fire 5 concurrent sopro requests from the same user
      const soproRequests = Array.from({ length: 5 }, () =>
        request(app)
          .post(`/api/bubbles/${bubble._id}/sopro`)
          .set('Authorization', `Bearer ${voterToken}`)
      );

      // ─── ACT ──────────────────────────────────────────────
      const responses = await Promise.all(soproRequests);

      // ─── ASSERT ───────────────────────────────────────────
      const statusCodes = responses.map(r => r.status).sort();
      const successCount = responses.filter(r => r.status === 200).length;
      const conflictCount = responses.filter(r => r.status === 409).length;
      const insufficientCount = responses.filter(r => r.status === 400).length;

      // Only 1 request must succeed (atomic $nin barrier)
      expect(successCount).toBe(1);

      // As 4 requisições restantes devem falhar — seja por conflito na barreira
      // atômica $nin (409) ou por saldo insuficiente na wallet (400).
      // A soma de ambos deve ser exatamente 4.
      expect(conflictCount + insufficientCount).toBe(4);

      // ─── FINAL ASSERT: oxygenLevel = 100 + 40 = 140 ──────
      const updatedBubble = await Bubble.findById(bubble._id).lean();
      expect(updatedBubble.oxygenLevel).toBe(140); // initial 100 + 40
      // Only 1 sopro entry in the array
      expect(updatedBubble.sopros).toHaveLength(1);
    });

    it('should return 409 on duplicate sopro (idempotency)', async () => {
      // ─── ARRANGE ──────────────────────────────────────────
      const { voterToken, bubble } = await arrangeSoproTest();

      // First sopro (should succeed)
      const first = await request(app)
        .post(`/api/bubbles/${bubble._id}/sopro`)
        .set('Authorization', `Bearer ${voterToken}`);
      expect(first.status).toBe(200);

      // ─── ACT ──────────────────────────────────────────────
      const second = await request(app)
        .post(`/api/bubbles/${bubble._id}/sopro`)
        .set('Authorization', `Bearer ${voterToken}`);

      // ─── ASSERT ───────────────────────────────────────────
      expect(second.status).toBe(409);
      expect(second.body.message).toContain('já soprou');
      expect(second.body.code).toBe('DUPLICATE_SOPRO');
    });

    it('should prevent author from soproing own bubble (400)', async () => {
      // ─── ARRANGE ──────────────────────────────────────────
      const auth = await createTestUser({ username: 'self_sopro' });

      const bubble = await Bubble.create({
        title: 'Self Sopro Test',
        content: 'Bubble for self-sopro prohibition.',
        author: auth.user._id,
        oxygenLevel: 100,
        maxOxygen: 1000,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      // ─── ACT ──────────────────────────────────────────────
      const response = await request(app)
        .post(`/api/bubbles/${bubble._id}/sopro`)
        .set('Authorization', `Bearer ${auth.token}`);

      // ─── ASSERT ───────────────────────────────────────────
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('não pode usar sopro');
    });
  });
});
