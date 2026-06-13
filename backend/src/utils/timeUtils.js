// utils/timeUtils.js
exports.getMinutesBetween = (date1, date2) => {
  const diffMs = Math.abs(new Date(date1) - new Date(date2));
  return Math.floor(diffMs / (1000 * 60));
};

exports.isExpired = (expiresAt) => {
  return new Date() > new Date(expiresAt);
};