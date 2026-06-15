// ============================================================
// BOLHA - UPLOAD MIDDLEWARE MOCK
// Stubs multer + Cloudinary upload pipeline.
// No actual file processing — just passes through with no file.
// ============================================================

/**
 * Pass-through: simulates "no file uploaded" scenario
 * so bubble creation doesn't require Cloudinary.
 */
const noFileMiddleware = (req, res, next) => next();

module.exports = {
  uploadCover: noFileMiddleware,
  uploadAvatar: noFileMiddleware,
  deleteFromCloudinary: async () => {},
  cloudinary: {
    v2: {
      config: () => {},
      uploader: {
        upload_stream: () => {},
        destroy: async () => ({ result: 'ok' }),
      },
    },
  },
};
