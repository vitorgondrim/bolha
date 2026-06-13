// utils/sanitizerUtils.js
exports.cleanText = (text) => {
  if (!text) return '';
  // Remove tags de script que um hacker tentaria injetar
  return text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
};