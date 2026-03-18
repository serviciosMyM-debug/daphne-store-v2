function makeSlug(text) {
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

function parseCSV(value = '') {
  return value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

function safeParseJSON(value, fallback = []) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

module.exports = {
  makeSlug,
  parseCSV,
  safeParseJSON
};