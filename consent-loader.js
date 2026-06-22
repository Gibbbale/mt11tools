/*
  consent-loader.js — Dynamic consent banner loader with inline fallback.
  Tries to load consent-banner.js; if blocked (e.g. by adblockers),
  falls back to an inline implementation after a short timeout.
*/
(function() {
  var SCRIPT_SRC = 'consent-banner.js';
  var CSS_HREF  = 'consent-banner.css';
  var FALLBACK_TIMEOUT_MS = 600;
  var scriptLoaded = false;

  var s = document.createElement('script');
  s.src = SCRIPT_SRC;
  s.async = true;
  s.onload = function() { scriptLoaded = true; };
  s.onerror = function() { scriptLoaded = false; };
  document.head.appendChild(s);

  if (!document.querySelector('link[href="' + CSS_HREF + '"]')) {
    var l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = CSS_HREF;
    document.head.appendChild(l);
  }

  setTimeout(function() {
    if (scriptLoaded) return;

    if (!document.getElementById('consent-banner-inline-style')) {
      var style = document.createElement('style');
      style.id = 'consent-banner-inline-style';
      style.textContent =
        '#cookie-consent { position: fixed; left: 16px; right: 16px; bottom: 16px; background: rgba(17,17,17,0.95); color: #fff; padding: 12px 16px; border-radius: 8px; display: flex; gap: 12px; align-items: center; z-index: 9999; box-shadow: 0 6px 18px rgba(0,0,0,0.3); font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial; font-size: 14px; }' +
        '#cookie-consent p { margin: 0; flex: 1; }' +
        '#cookie-consent .cc-actions { display: flex; gap: 8px; }' +
        '#cookie-consent button { background: #fff; color: #111; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer; }' +
        '#cookie-consent button.secondary { background: transparent; color: #fff; border: 1px solid rgba(255,255,255,0.2); }';
      document.head.appendChild(style);
    }

    if (!document.getElementById('cookie-consent')) {
      var STORAGE_KEY = 'mt11_cookie_consent_v1';

      function hasConsent() { return localStorage.getItem(STORAGE_KEY) === 'accepted'; }
      function setConsent(value) { localStorage.setItem(STORAGE_KEY, value ? 'accepted' : 'rejected'); }
      function removeBanner() { var el = document.getElementById('cookie-consent'); if (el) el.remove(); }
      function onAccept() { setConsent(true); removeBanner(); }
      function onReject() { setConsent(false); removeBanner(); }

      if (!hasConsent()) {
        var container = document.createElement('div');
        container.id = 'cookie-consent';
        container.innerHTML =
          '<p>Usiamo cookie per migliorare l\'esperienza e, con il tuo consenso, per analitica e pubblicit\u00e0. Puoi accettare o rifiutare.</p>' +
          '<div class="cc-actions">' +
          '<button id="cc-accept">Accetta</button>' +
          '<button id="cc-reject" class="secondary">Rifiuta</button>' +
          '</div>';
        document.body.appendChild(container);
        document.getElementById('cc-accept').addEventListener('click', onAccept);
        document.getElementById('cc-reject').addEventListener('click', onReject);
      }
    }
  }, FALLBACK_TIMEOUT_MS);
})();
