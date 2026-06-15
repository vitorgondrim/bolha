// ============================================================
// BOLHA - TEST HELPER: Lightweight Router Builder
// Builds an Express router for bubble routes WITHOUT the real
// rate limit or upload middlewares (which require Cloudinary/MongoDB).
// ============================================================

const express = require('express');
const bubbleController = require('../../src/controllers/bubbleController');
const { protect, optionalAuth } = require('../../src/middlewares/authMiddleware');
const { bubbleExistsAndAlive } = require('../../src/middlewares/bubbleMiddleware');

// ─── Pass-through stubs ──────────────────────────────────────
const noOp = (req, res, next) => next();

/**
 * Creates a test-ready bubble router.
 * Uses real auth + bubble middleware but stubs rate limit + upload.
 */
function createTestBubbleRouter() {
  const router = express.Router();

  // Public / hybrid routes
  router.get('/', optionalAuth, bubbleController.getAllBubbles);
  router.get('/leaked', optionalAuth, bubbleController.getLeakedBubbles);

  // Protected routes (stubbed: no rate-limit, no upload/Cloudinary)
  router.post('/', protect, noOp, noOp, bubbleController.createBubble);
  router.get('/my', protect, bubbleController.getMyBubbles);
  router.get('/profile', protect, bubbleController.getProfile);
  router.get('/following', protect, bubbleController.getFollowingFeed);

  // Parameterized routes
  router.get('/user/:userId', optionalAuth, bubbleController.getUserBubbles);
  router.get('/:id', optionalAuth, bubbleController.getBubbleById);
  router.delete('/:id', protect, bubbleExistsAndAlive, bubbleController.deleteBubble);

  // Interactions (stubbed rate-limit)
  router.patch('/:id/like', protect, noOp, bubbleExistsAndAlive, bubbleController.toggleLike);
  router.patch('/:id/dislike', protect, noOp, bubbleExistsAndAlive, bubbleController.toggleDislike);
  router.post('/:id/sopro', protect, noOp, bubbleExistsAndAlive, bubbleController.useSopro);
  router.post('/:id/comment', protect, noOp, noOp, bubbleExistsAndAlive, bubbleController.addComment);
  router.post('/:id/pop', protect, noOp, bubbleExistsAndAlive, bubbleController.popBubble);

  return router;
}

module.exports = { createTestBubbleRouter };
