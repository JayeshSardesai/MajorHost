// AI Translation Service (frontend) - calls backend proxy for Gemini translation
// IMPORTANT: Do NOT put API keys in frontend. Backend must expose /api/ai-translate
// Expected backend endpoint: POST http://localhost:5000/api/ai-translate
// Body: { text: string, targetLang: string }
// Response: { success: boolean, translated: string }

export async function aiTranslate(text, targetLang) {
  try {
    if (!text || !targetLang) return text || '';
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

    const res = await fetch(`${apiUrl}/api/ai-translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, targetLang })
    });

    if (!res.ok) return text;
    const data = await res.json();
    if (data && data.success && typeof data.translated === 'string' && data.translated.trim()) {
      return data.translated;
    }
    return text;
  } catch (e) {
    console.warn('aiTranslate failed, falling back to original text:', e);
    return text;
  }
}

// Simple localStorage cache to avoid repeated calls
export function getCachedTranslation(text, targetLang) {
  try {
    const key = `ai_tx:${targetLang}:${text}`;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { translated, ts } = JSON.parse(raw);
    // Optional: expire after 7 days
    const maxAge = 7 * 24 * 60 * 60 * 1000;
    if (Date.now() - (ts || 0) > maxAge) return null;
    return translated || null;
  } catch {
    return null;
  }
}

export function setCachedTranslation(text, targetLang, translated) {
  try {
    const key = `ai_tx:${targetLang}:${text}`;
    localStorage.setItem(key, JSON.stringify({ translated, ts: Date.now() }));
  } catch { }
}
