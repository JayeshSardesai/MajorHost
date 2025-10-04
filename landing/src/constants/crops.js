// Centralized crop helpers to localize display while keeping English codes for models
export const SUPPORTED_CROPS = [
  'cowpea',
  'tomato',
  'onion',
  'cabbage',
  'bhendi',
  'brinjal',
  'bottle gourd',
  'bitter gourd',
  'cucumber',
  'cluster bean',
  'peas',
  'french bean',
  'carrot',
  'radish',
  'cauliflower',
  'small onion',
  'sweet potato'
];

// Turn English name (may have spaces) into an i18n key suffix: "french bean" -> "french_bean"
export const cropKeyFromName = (name = '') => name.toString().trim().toLowerCase().replace(/\s+/g, '_');

// Get localized label for a crop English name; fallback to Title Case English
export const getCropLabelFromName = (name, t) => {
  const key = cropKeyFromName(name);
  const localized = t ? t(`crops.${key}`) : undefined;
  // react-i18next returns the key if missing; detect and fallback
  if (!localized || localized === `crops.${key}`) {
    return (name || '').replace(/\b\w/g, (ch) => ch.toUpperCase());
  }
  return localized;
};
