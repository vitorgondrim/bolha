// ============================================================
// BOLHA - RATE LIMIT MOCK
// Stubs the per-user rate limiter for integration tests.
// Real rate limiting is not needed in test environment.
// ============================================================

/**
 * Pass-through middleware that never rate-limits.
 */
const noOpMiddleware = (req, res, next) => next();

const limits = {
  bubbleCreation: noOpMiddleware,
  sopro: noOpMiddleware,
  like: noOpMiddleware,
  pop: noOpMiddleware,
  comment: noOpMiddleware,
  follow: noOpMiddleware,
  auth: noOpMiddleware,
};

module.exports = { createUserRateLimiter: () => noOpMiddleware, limits };
