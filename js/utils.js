export function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

// Formats a "YYYY-MM-DD" date string as "Sep 4". Parses the parts
// manually (rather than `new Date(dateStr)`) because that constructor
// treats a plain date string as UTC midnight, which can display as the
// previous day for anyone west of UTC.
export function formatDate(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Only treat http(s) links as safe to render as a clickable <a href>.
// Blocks schemes like javascript: from ever ending up in an href, which
// someone could otherwise type into the house-listing-URL field.
export function isSafeHttpUrl(url) {
  try {
    return ['http:', 'https:'].includes(new URL(url).protocol);
  } catch {
    return false;
  }
}
