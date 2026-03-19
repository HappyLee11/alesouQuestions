function formatTags(tags = []) {
  return Array.isArray(tags) ? tags.filter(Boolean) : [];
}

function splitLines(text = '') {
  return String(text)
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

module.exports = {
  formatTags,
  splitLines
};
