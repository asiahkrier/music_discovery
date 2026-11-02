import { validEmail } from './email-validation.js';
import { useEffect, useState } from 'react';
import { checkSignupAvailability, takenMessage } from './account-client.js';

export default function useSignupAvailability(field, value, enabled) {
  const [result, setResult] = useState(null);
  const normalized = value.trim().toLowerCase();
  const valid = field === 'username' ? /^[a-z0-9_]{3,24}$/.test(normalized) : validEmail(normalized);
  useEffect(() => {
    if (!enabled || !valid) return undefined;
    const controller = new AbortController();
    let active = true;
    setResult(null);
    const timer = setTimeout(() => {
      checkSignupAvailability(field, normalized, controller.signal).then(available => {
        const label = field === 'username' ? 'Username' : 'Email';
        const message = available ? `${label} is available.` : takenMessage(field);
        if (active) setResult({ value: normalized, taken: !available, message });
      }).catch(error => {
        if (active && error.name !== 'AbortError') setResult({ value: normalized, taken: false, message: error.message });
      });
    }, 500);
    return () => { active = false; clearTimeout(timer); controller.abort(); };
  }, [field, normalized, valid, enabled]);
  if (!enabled || !normalized) return { message: '', taken: false };
  if (!valid) return { message: field === 'username' ? 'Use 3–24 letters, numbers, or underscores.' : 'Enter a complete email address.', taken: false };
  return result?.value === normalized ? result : { message: 'Checking availability…', taken: false };
}
