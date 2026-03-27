// openAmazon.js — Abre producto de Amazon en la app nativa con tag de afiliado
// iOS: Universal Links hacen que iOS abra la app de Amazon si está instalada
// Si no está instalada, abre el navegador con el tag igualmente

const TAG = 'juanantonioex-21';

export async function openAmazonProduct(url) {
  if (!url) return;
  try {
    const { Linking } = require('react-native');

    // Extraer ASIN de la URL
    const asinMatch = url.match(/\/(?:dp|gp\/product|ASIN)\/([A-Z0-9]{10})/i);
    const asin = asinMatch ? asinMatch[1] : null;

    // Construir URL limpia con tag
    const targetUrl = asin
      ? `https://www.amazon.es/dp/${asin}?tag=${TAG}`
      : (() => {
          try {
            const u = new URL(url.startsWith('http') ? url : 'https://' + url);
            u.searchParams.set('tag', TAG);
            return u.toString();
          } catch(_) { return url; }
        })();

    await Linking.openURL(targetUrl);
  } catch(_) {
    // fallback: WebBrowser
    try {
      const WebBrowser = require('expo-web-browser');
      await WebBrowser.openBrowserAsync(url);
    } catch(_) {}
  }
}
