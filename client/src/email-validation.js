// Split first so validation does not backtrack across an arbitrarily long email.
export function validEmail(value) {
  if (typeof value !== 'string' || value.length > 254 || /\s/.test(value)) return false;
  const parts = value.split('@');
  if (parts.length !== 2 || !parts[0]) return false;
  const dot = parts[1].lastIndexOf('.');
  return dot > 0 && dot < parts[1].length - 1;
}
