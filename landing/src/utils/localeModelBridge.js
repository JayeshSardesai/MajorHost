// Utilities to ensure any text sent to ML/models is in English
// Uses AI translation service via backend proxy. See services/aiTranslateService.js

import { aiTranslate, getCachedTranslation, setCachedTranslation } from '../services/aiTranslateService';

export async function ensureEnglish(text, i18n) {
  try {
    const lng = (i18n?.language || 'en').toLowerCase();
    if (!text) return text;
    if (lng.startsWith('en')) return text;

    const cached = getCachedTranslation(text, 'en');
    if (cached) return cached;

    const translated = await aiTranslate(text, 'en');
    if (translated && translated !== text) {
      setCachedTranslation(text, 'en', translated);
      return translated;
    }
    return text;
  } catch {
    return text;
  }
}

export async function ensureEnglishArray(arr, i18n) {
  if (!Array.isArray(arr)) return arr;
  const out = [];
  for (const item of arr) {
    // eslint-disable-next-line no-await-in-loop
    out.push(await ensureEnglish(String(item ?? ''), i18n));
  }
  return out;
}

export async function ensureEnglishObject(obj, i18n, fields = []) {
  if (!obj || typeof obj !== 'object') return obj;
  const clone = { ...obj };
  for (const f of fields) {
    if (f in clone) {
      // eslint-disable-next-line no-await-in-loop
      clone[f] = await ensureEnglish(String(clone[f] ?? ''), i18n);
    }
  }
  return clone;
}

// Helper specifically for crop names when user may see localized labels
export async function ensureEnglishCrop(cropName, i18n) {
  // If your UI already stores English codes (recommended), this is a no-op
  // Otherwise, attempt translation-to-English just before sending to the model
  return ensureEnglish(cropName, i18n);
}
