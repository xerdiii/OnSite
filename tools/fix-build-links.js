/* One-off: repoint builder CTAs to /build.

   Every localized page shipped with its "Start a Project" button aimed at
   that language's services page, so the builder at /build was unreachable
   by clicking from anywhere on the site. This rewrites only the anchors
   whose visible text is a builder call to action; the plain "Extras" nav
   link and the links that genuinely point at the extras list are left
   alone.

   Run from the repo root:  node tools/fix-build-links.js
*/
const fs = require('fs');
const path = require('path');

const LANGS = {
  en: { svc: '/en/services', cta: [
    'Start a Project', 'Build your package', 'Choose Package',
    'or build your package \u2192', 'Get your website for\u20ac49',
    'send a project request', 'form that walks through all of it' ] },
  sq: { svc: '/sq/sherbimet', cta: [
    'Fillo një projekt', 'Ndërtoni pakon tuaj', 'Zgjidh paketën',
    'ose ndërtoni paketën tuaj \u2192', 'Merrni faqen tuaj për\u20ac49',
    'dërgoni një kërkesë projekti', 'formulari që ju kalon gjithçka' ] },
  de: { svc: '/de/leistungen', cta: [
    'Projekt starten', 'Stellen Sie Ihr Paket zusammen', 'Paket wählen',
    'oder Paket zusammenstellen \u2192', 'Website sichern für\u20ac49',
    'senden Sie eine Projektanfrage', 'Formular, das alles durchgeht' ] },
  fr: { svc: '/fr/services', cta: [
    'Démarrer un projet', 'Composer votre formule', 'Choisir la formule',
    'ou composez votre formule \u2192', 'Obtenez votre site pour\u20ac49',
    'envoyez une demande de projet', 'formulaire qui passe en revue tout cela' ] },
  it: { svc: '/it/servizi', cta: [
    'Avvia un progetto', 'Componi il tuo pacchetto', 'Scegli il pacchetto',
    'oppure componi il tuo pacchetto \u2192', 'Il tuo sito a partire da\u20ac49',
    'invia una richiesta di progetto', 'modulo che attraversa tutto passo per passo' ] },
  es: { svc: '/es/servicios', cta: [
    'Empezar un proyecto', 'Crea tu paquete', 'Elegir paquete',
    'o crea tu paquete \u2192', 'Consigue tu web por\u20ac49',
    'envía una solicitud de proyecto', 'formulario que recorre todo paso a paso' ] },
  pt: { svc: '/pt/servicos', cta: [
    'Iniciar um projeto', 'Montar o seu pacote', 'Escolher pacote',
    'ou componha o seu pacote \u2192', 'O seu site por\u20ac49',
    'envie um pedido de projeto', 'formulário que percorre tudo isto' ] },
  nl: { svc: '/nl/diensten', cta: [
    'Start een project', 'Stel je pakket samen', 'Kies pakket',
    'of stel je pakket samen \u2192', 'Jouw website voor\u20ac49',
    'stuur dan een projectaanvraag', 'formulier dat alles doorloopt' ] },
  sv: { svc: '/sv/tjanster', cta: [
    'Starta ett projekt', 'Bygg ditt paket', 'Välj paket',
    'eller bygg ditt paket \u2192', 'Få din webbplats för\u20ac49',
    'skicka en projektförfrågan', 'formulär som går igenom allt detta' ] },
  tr: { svc: '/tr/hizmetler', cta: [
    'Proje başlat', 'Paketinizi oluşturun', 'Paketi seç',
    'ya da kendi paketinizi oluşturun \u2192', 'Web sitenizi şu fiyata alın:\u20ac49',
    'bir proje talebi gönderin', 'her şeyi adım adım geçen form' ] }
};

// Visible text, with tags stripped, entities folded and whitespace collapsed,
// so the table above can be written the way a reader sees the button.
function visible(html) {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&rarr;/g, '\u2192')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&'); }

let total = 0;
for (const [lang, { svc, cta }] of Object.entries(LANGS)) {
  let files;
  try { files = fs.readdirSync(lang).filter(f => f.endsWith('.html')); }
  catch (e) { continue; }

  const wanted = new Set(cta.map(visible));
  const re = new RegExp('(<a\\s[^>]*href=")' + escapeRe(svc) + '("[^>]*>)([\\s\\S]*?)(<\\/a>)', 'g');

  let langCount = 0;
  for (const f of files) {
    const p = path.join(lang, f);
    const before = fs.readFileSync(p, 'utf8');
    let n = 0;
    const after = before.replace(re, (m, open, mid, inner, close) => {
      if (!wanted.has(visible(inner))) return m;
      n++;
      return open + '/build' + mid + inner + close;
    });
    if (n) { fs.writeFileSync(p, after); langCount += n; console.log('  ' + p + ': ' + n); }
  }
  console.log(lang + ': ' + langCount);
  total += langCount;
}
console.log('TOTAL rewritten: ' + total);
