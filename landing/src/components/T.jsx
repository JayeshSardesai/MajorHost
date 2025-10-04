import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { aiTranslate, getCachedTranslation, setCachedTranslation } from '../services/aiTranslateService';

// Usage: <T k="nav.features">Features</T>
// Props:
// - k: i18n key
// - children: default English text
// - noAi: boolean to disable AI fallback
export default function T({ k, children, noAi = false, ...rest }) {
  const { t, i18n } = useTranslation();
  const lng = i18n.language || 'en';

  // First try i18n
  const i18nText = useMemo(() => t(k, { defaultValue: children }), [k, children, t]);
  const isMissing = i18nText === k || (!i18nText && !!children);

  const [txt, setTxt] = useState(i18nText);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      // If language is English or AI disabled or we have a proper translation, just use i18nText
      if (lng.startsWith('en') || noAi || !isMissing) {
        setTxt(i18nText);
        return;
      }
      // We only attempt AI translate when key is missing AND we have a fallback English children text
      const source = children || '';
      if (!source) {
        setTxt(i18nText);
        return;
      }

      const cached = getCachedTranslation(source, lng);
      if (cached) {
        setTxt(cached);
        return;
      }

      const translated = await aiTranslate(source, lng);
      if (!cancelled) {
        if (translated && translated !== source) {
          setCachedTranslation(source, lng, translated);
          setTxt(translated);
        } else {
          setTxt(i18nText || source);
        }
      }
    };
    run();
    return () => { cancelled = true; };
  }, [lng, i18nText, isMissing, noAi, children]);

  return <>{txt}</>;
}
