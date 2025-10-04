import React from 'react';
import i18n from '../i18n';

const LANGS = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिंदी' },
  { code: 'kn', label: 'ಕನ್ನಡ' },
  { code: 'mr', label: 'मराठी' },
];

export default function LanguageSwitcher({ inline = false, className = "" }) {
  const current = i18n.resolvedLanguage || i18n.language || 'en';
  const handleChange = (e) => {
    const lang = e.target.value;
    i18n.changeLanguage(lang);
    try { localStorage.setItem('i18nextLng', lang); } catch (e) {}
    document.documentElement.lang = lang;
  };

  if (inline) {
    return (
      <select
        aria-label="Select language"
        className={`px-2 py-1 rounded-md border border-farm-green-300 bg-white text-xs font-medium text-farm-green-700 hover:border-farm-green-500 focus:ring-1 focus:ring-farm-green-500 focus:border-transparent transition-all duration-200 ${className}`}
        value={current}
        onChange={handleChange}
      >
        {LANGS.map((l) => (
          <option key={l.code} value={l.code}>{l.label}</option>
        ))}
      </select>
    );
  }

  return (
    // On small screens, bottom-right. On md+ use top-right.
    <div className="fixed bottom-4 right-4 md:top-4 md:bottom-auto md:right-4 z-50">
      <select
        aria-label="Select language"
        className="px-3 py-2 rounded-lg border border-farm-green-300 bg-white/95 backdrop-blur shadow-lg text-sm font-medium text-farm-green-700 hover:border-farm-green-500 focus:ring-2 focus:ring-farm-green-500 focus:border-transparent transition-all duration-200"
        value={current}
        onChange={handleChange}
      >
        {LANGS.map((l) => (
          <option key={l.code} value={l.code}>{l.label}</option>
        ))}
      </select>
    </div>
  );
}
