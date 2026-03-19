function formatTags(tags = []) {
  return Array.isArray(tags) ? tags.filter(Boolean) : [];
}

function splitLines(text = '') {
  return String(text)
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitCommaText(text = '') {
  return String(text)
    .split(/[，,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function highlightText(text = '', keyword = '') {
  const source = String(text || '');
  const query = String(keyword || '').trim();
  if (!query) {
    return [{ text: source, match: false }];
  }

  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regexp = new RegExp(`(${escaped})`, 'ig');
  const parts = source.split(regexp).filter((item) => item !== '');

  if (!parts.length) {
    return [{ text: source, match: false }];
  }

  return parts.map((item) => ({
    text: item,
    match: item.toLowerCase() === query.toLowerCase()
  }));
}

function formatTime(ts) {
  if (!ts) return '--';
  const date = new Date(ts);
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function safeJsonParse(text, fallback = null) {
  try {
    return JSON.parse(text);
  } catch (error) {
    return fallback;
  }
}

module.exports = {
  formatTags,
  splitLines,
  splitCommaText,
  highlightText,
  formatTime,
  safeJsonParse
};
