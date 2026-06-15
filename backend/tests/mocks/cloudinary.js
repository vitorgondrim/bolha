// ============================================================
// BOLHA - CLOUDINARY MOCK
// Stubs the Cloudinary SDK so tests never call external APIs
// ============================================================

const cloudinaryMock = {
  v2: {
    config: () => {},
    uploader: {
      upload_stream: (options, callback) => {
        // Simulate a successful Cloudinary upload
        const result = {
          secure_url: 'https://res.cloudinary.com/test/image/upload/v1/bolha/covers/test-mock.jpg',
          public_id: 'bolha/covers/test-mock',
        };
        // Callback is (error, result)
        callback(null, result);
        // Return a mock stream
        const { PassThrough } = require('stream');
        const stream = new PassThrough();
        stream.end();
        return stream;
      },
      destroy: async (publicId) => {
        return { result: 'ok' };
      },
    },
  },
};

module.exports = cloudinaryMock;
