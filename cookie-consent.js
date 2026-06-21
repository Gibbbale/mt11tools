/* cookie-consent.js - banner cookie semplice che attiva script su consenso */
(function(){
  const STORAGE_KEY = 'mt11_cookie_consent_v1';

  function hasConsent(){
    return localStorage.getItem(STORAGE_KEY) === 'accepted';
  }

  function setConsent(value){
    localStorage.setItem(STORAGE_KEY, value ? 'accepted' : 'rejected');
  }

  function injectScript(src, attrs = {}) {
    const s = document.createElement('script');
    s.src = src;
    Object.keys(attrs).forEach(k => s.setAttribute(k, attrs[k]));
    s.async = true;
    document.head.appendChild(s);
  }

  function onAccept() {
    setConsent(true);
    removeBanner();
    // Esempi (decommenta / sostituisci gli ID se vuoi che inietti automaticamente):
    // injectScript('https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX');
    // window.dataLayer = window.dataLayer || [];
    // function gtag(){dataLayer.push(arguments);} 
    // gtag('js', new Date());
    // gtag('config', 'G-XXXXXXXXXX');

    // injectScript('https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js', { 'data-ad-client': 'ca-pub-XXXXXXXX' });
  }

  function onReject() {
    setConsent(false);
    removeBanner();
  }

  function removeBanner(){
    const el = document.getElementById('cookie-consent');
    if(el) el.remove();
  }

  function renderBanner(){
    if(hasConsent()) return;
    if(document.getElementById('cookie-consent')) return;

    const div = document.createElement('div');
    div.id = 'cookie-consent';
    div.innerHTML = `
      <p>Usiamo cookie per migliorare l'esperienza e, con il tuo consenso, per analitica e pubblicità. Puoi accettare o rifiutare.</p>
      <div class="cc-actions">
        <button id="cc-accept">Accetta</button>
        <button id="cc-reject" class="secondary">Rifiuta</button>
      </div>
    `;
    document.body.appendChild(div);

    document.getElementById('cc-accept').addEventListener('click', function(){
      onAccept();
    });
    document.getElementById('cc-reject').addEventListener('click', function(){
      onReject();
    });
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', renderBanner);
  } else {
    renderBanner();
  }
})();
