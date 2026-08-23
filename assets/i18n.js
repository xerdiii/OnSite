/* ───────────────────────────────────────────────────────────────
   Onsite — language and currency

   Two choices, kept together because they are made together, and both
   living in the menu rather than the bar: the top of the page is for
   the business, not for settings.

   LANGUAGE. Translation is keyed on the English source text rather
   than on data-i18n attributes sprinkled through the markup. That way
   nothing in the HTML has to change to add a language, and any string
   the dictionary has not learned yet simply stays in English instead
   of rendering as a missing key. The original text of every node is
   captured once, so switching back and forth is lossless.

   The dictionary covers the interface: navigation, headings, buttons,
   card copy, the catalogue's group names, the forms. Long-form prose —
   the FAQ answers, the terms, the privacy policy — is deliberately not
   machine-translated here; legal text that is subtly wrong in nine
   languages is worse than legal text in one. Those pages stay English
   and say so.

   CURRENCY. Every price on the site is authored in EUR and marked up
   as <span class="cur" data-eur="79.99">. Nothing else is stored. The
   rates below are indicative and fixed at build time — they are there
   so a visitor can recognise the size of a number in money they think
   in, not to quote them. Billing is in EUR, and the control says so.
   ─────────────────────────────────────────────────────────────── */
(function (global) {
  'use strict';

  var doc = global.document;
  var LKEY = 'onsite.lang';
  var CKEY = 'onsite.currency';

  var LANGS = [
    { code: 'en', label: 'English',    locale: 'en-GB' },
    { code: 'sq', label: 'Shqip',      locale: 'sq-AL' },
    { code: 'de', label: 'Deutsch',    locale: 'de-DE' },
    { code: 'fr', label: 'Français',   locale: 'fr-FR' },
    { code: 'it', label: 'Italiano',   locale: 'it-IT' },
    { code: 'es', label: 'Español',    locale: 'es-ES' },
    { code: 'pt', label: 'Português',  locale: 'pt-PT' },
    { code: 'nl', label: 'Nederlands', locale: 'nl-NL' },
    { code: 'sv', label: 'Svenska',    locale: 'sv-SE' },
    { code: 'tr', label: 'Türkçe',     locale: 'tr-TR' }
  ];

  /* Indicative only. EUR is what you are actually billed in. */
  var CURRENCIES = [
    { code: 'EUR', label: 'Euro',            rate: 1,     whole: false },
    { code: 'USD', label: 'US dollar',       rate: 1.09,  whole: false },
    { code: 'GBP', label: 'British pound',   rate: 0.85,  whole: false },
    { code: 'CHF', label: 'Swiss franc',     rate: 0.95,  whole: false },
    { code: 'SEK', label: 'Swedish krona',   rate: 11.4,  whole: true  },
    { code: 'NOK', label: 'Norwegian krone', rate: 11.6,  whole: true  },
    { code: 'DKK', label: 'Danish krone',    rate: 7.46,  whole: true  },
    { code: 'PLN', label: 'Polish złoty',    rate: 4.30,  whole: true  },
    { code: 'TRY', label: 'Turkish lira',    rate: 38.0,  whole: true  },
    { code: 'ALL', label: 'Albanian lek',    rate: 98.0,  whole: true  }
  ];

  /* ── The dictionary ───────────────────────────────────────────
     Keyed on the exact English string, whitespace-collapsed. */
  var STRINGS = {
    sq: {
      'Pricing': 'Çmimet', 'Features': 'Veçoritë', 'Monthly': 'Mujore', 'Extras': 'Shtesa',
      'FAQ': 'Pyetje', 'Contact': 'Kontakt', 'Log in': 'Hyr', 'Home': 'Ballina',
      'Services': 'Shërbimet', 'Get started': 'Fillo', 'Build my website': 'Ndërto faqen time',
      'Build My Website': 'Ndërto faqen time', 'See the pricing': 'Shih çmimet',
      'Skip to content': 'Kalo te përmbajtja', 'Menu': 'Menyja', 'Close menu': 'Mbyll menynë',
      'Theme': 'Pamja', 'Language': 'Gjuha', 'Currency': 'Monedha',
      'You run the business.': 'Ti drejton biznesin.', 'We build the website.': 'Ne ndërtojmë faqen.',
      'Websites': 'Faqe interneti', 'Three ways to get one.': 'Tri mënyra për ta marrë.',
      'Custom Website': 'Faqe e Zgjedhur', 'Full Website': 'Faqe e Plotë',
      'Complete Package': 'Paketa e Plotë', 'One-time': 'Një herë',
      'Domain & hosting': 'Domeni dhe hostimi', 'How it works': 'Si funksionon',
      'Four steps, start to live.': 'Katër hapa, nga nisja te publikimi.',
      'Pay 25%': 'Paguaj 25%', 'Send your content': 'Dërgo përmbajtjen',
      'We build it': 'Ne e ndërtojmë', 'Approve it, pay the rest': 'Aprovoje, paguaj pjesën tjetër',
      'Business extras': 'Shtesa biznesi',
      'The things a website does not cover.': 'Gjërat që një faqe nuk i mbulon.',
      'Straight answers': 'Përgjigje të drejtpërdrejta',
      'Why a quarter, and not the whole thing?': 'Pse një e katërta, e jo e tëra?',
      'Ready when you are.': 'Gati kur të jesh ti.', 'Get started': 'Fillo',
      'The 34 that come with every website': '34 që vijnë me çdo faqe',
      'Pages & sections': 'Faqe dhe seksione', 'Catalogues & documents': 'Katalogë dhe dokumente',
      'Navigation & interaction': 'Navigim dhe ndërveprim', 'Media & the basics': 'Media dhe bazat',
      'Website features': 'Veçori të faqes', 'Business & technical': 'Biznes dhe teknike',
      'Automation': 'Automatizim', 'Brand & design': 'Brend dhe dizajn',
      'Monthly services': 'Shërbime mujore', 'paid once': 'paguhet një herë',
      'every month, stop any time': 'çdo muaj, ndalo kur të duash', 'Coming soon': 'Së shpejti',
      'part of the build, never monthly': 'pjesë e ndërtimit, kurrë mujore',
      'Pay today — 25%': 'Paguaj sot — 25%', 'Clear': 'Pastro', 'selected': 'të zgjedhura',
      'Create your account': 'Krijo llogarinë tënde', 'Business name': 'Emri i biznesit',
      'Phone number': 'Numri i telefonit', 'Password': 'Fjalëkalimi', 'Confirm': 'Konfirmo',
      'Create account': 'Krijo llogari', 'Confirm your email': 'Konfirmo emailin',
      'Verify & continue': 'Verifiko dhe vazhdo', 'Search country': 'Kërko shtetin',
      'Trouble signing in': 'Probleme me hyrjen', 'Signing in': 'Hyrja', 'Signing up': 'Regjistrimi',
      'Still stuck?': 'Ende i bllokuar?', 'Message us': 'Na shkruaj',
      'Reset my password': 'Rivendos fjalëkalimin', 'Find my email address': 'Gjej emailin tim'
    },
    de: {
      'Pricing': 'Preise', 'Features': 'Funktionen', 'Monthly': 'Monatlich', 'Extras': 'Extras',
      'FAQ': 'FAQ', 'Contact': 'Kontakt', 'Log in': 'Anmelden', 'Home': 'Startseite',
      'Services': 'Leistungen', 'Get started': 'Loslegen', 'Build my website': 'Website erstellen',
      'Build My Website': 'Website erstellen', 'See the pricing': 'Preise ansehen',
      'Skip to content': 'Zum Inhalt springen', 'Menu': 'Menü', 'Close menu': 'Menü schließen',
      'Theme': 'Darstellung', 'Language': 'Sprache', 'Currency': 'Währung',
      'You run the business.': 'Sie führen das Geschäft.', 'We build the website.': 'Wir bauen die Website.',
      'Websites': 'Websites', 'Three ways to get one.': 'Drei Wege zu Ihrer Website.',
      'Custom Website': 'Individuelle Website', 'Full Website': 'Komplette Website',
      'Complete Package': 'Rundum-Paket', 'One-time': 'Einmalig',
      'Domain & hosting': 'Domain & Hosting', 'How it works': 'So läuft es ab',
      'Four steps, start to live.': 'Vier Schritte bis zum Livegang.',
      'Pay 25%': '25 % anzahlen', 'Send your content': 'Inhalte schicken',
      'We build it': 'Wir bauen sie', 'Approve it, pay the rest': 'Freigeben, Rest zahlen',
      'Business extras': 'Zusatzleistungen',
      'The things a website does not cover.': 'Was eine Website nicht abdeckt.',
      'Straight answers': 'Klare Antworten',
      'Why a quarter, and not the whole thing?': 'Warum ein Viertel und nicht alles?',
      'Ready when you are.': 'Bereit, wenn Sie es sind.',
      'The 34 that come with every website': 'Die 34, die zu jeder Website gehören',
      'Pages & sections': 'Seiten & Abschnitte', 'Catalogues & documents': 'Kataloge & Dokumente',
      'Navigation & interaction': 'Navigation & Interaktion', 'Media & the basics': 'Medien & Grundlagen',
      'Website features': 'Website-Funktionen', 'Business & technical': 'Business & Technik',
      'Automation': 'Automatisierung', 'Brand & design': 'Marke & Design',
      'Monthly services': 'Monatliche Leistungen', 'paid once': 'einmalig',
      'every month, stop any time': 'monatlich, jederzeit kündbar', 'Coming soon': 'Demnächst',
      'part of the build, never monthly': 'Teil des Aufbaus, nie monatlich',
      'Pay today — 25%': 'Heute fällig — 25 %', 'Clear': 'Zurücksetzen', 'selected': 'ausgewählt',
      'Create your account': 'Konto erstellen', 'Business name': 'Firmenname',
      'Phone number': 'Telefonnummer', 'Password': 'Passwort', 'Confirm': 'Bestätigen',
      'Create account': 'Konto erstellen', 'Confirm your email': 'E-Mail bestätigen',
      'Verify & continue': 'Bestätigen und weiter', 'Search country': 'Land suchen',
      'Trouble signing in': 'Probleme beim Anmelden', 'Signing in': 'Anmelden', 'Signing up': 'Registrieren',
      'Still stuck?': 'Immer noch nicht weiter?', 'Message us': 'Schreiben Sie uns',
      'Reset my password': 'Passwort zurücksetzen', 'Find my email address': 'Meine E-Mail finden'
    },
    fr: {
      'Pricing': 'Tarifs', 'Features': 'Fonctionnalités', 'Monthly': 'Mensuel', 'Extras': 'Options',
      'FAQ': 'FAQ', 'Contact': 'Contact', 'Log in': 'Se connecter', 'Home': 'Accueil',
      'Services': 'Services', 'Get started': 'Commencer', 'Build my website': 'Créer mon site',
      'Build My Website': 'Créer mon site', 'See the pricing': 'Voir les tarifs',
      'Skip to content': 'Aller au contenu', 'Menu': 'Menu', 'Close menu': 'Fermer le menu',
      'Theme': 'Thème', 'Language': 'Langue', 'Currency': 'Devise',
      'You run the business.': 'Vous gérez l’entreprise.', 'We build the website.': 'Nous créons le site.',
      'Websites': 'Sites web', 'Three ways to get one.': 'Trois façons d’en avoir un.',
      'Custom Website': 'Site sur mesure', 'Full Website': 'Site complet',
      'Complete Package': 'Formule intégrale', 'One-time': 'Paiement unique',
      'Domain & hosting': 'Domaine et hébergement', 'How it works': 'Comment ça marche',
      'Four steps, start to live.': 'Quatre étapes, du début à la mise en ligne.',
      'Pay 25%': 'Payer 25 %', 'Send your content': 'Envoyez vos contenus',
      'We build it': 'Nous le construisons', 'Approve it, pay the rest': 'Validez, payez le reste',
      'Business extras': 'Options pour l’entreprise',
      'The things a website does not cover.': 'Ce qu’un site ne couvre pas.',
      'Straight answers': 'Réponses directes',
      'Why a quarter, and not the whole thing?': 'Pourquoi un quart, et non la totalité ?',
      'Ready when you are.': 'Prêts quand vous l’êtes.',
      'The 34 that come with every website': 'Les 34 inclus dans chaque site',
      'Pages & sections': 'Pages et sections', 'Catalogues & documents': 'Catalogues et documents',
      'Navigation & interaction': 'Navigation et interaction', 'Media & the basics': 'Médias et essentiels',
      'Website features': 'Fonctions du site', 'Business & technical': 'Entreprise et technique',
      'Automation': 'Automatisation', 'Brand & design': 'Marque et design',
      'Monthly services': 'Services mensuels', 'paid once': 'paiement unique',
      'every month, stop any time': 'chaque mois, résiliable à tout moment', 'Coming soon': 'Bientôt',
      'part of the build, never monthly': 'inclus dans la création, jamais mensuel',
      'Pay today — 25%': 'À payer aujourd’hui — 25 %', 'Clear': 'Effacer', 'selected': 'sélectionnés',
      'Create your account': 'Créez votre compte', 'Business name': 'Nom de l’entreprise',
      'Phone number': 'Numéro de téléphone', 'Password': 'Mot de passe', 'Confirm': 'Confirmer',
      'Create account': 'Créer le compte', 'Confirm your email': 'Confirmez votre e-mail',
      'Verify & continue': 'Vérifier et continuer', 'Search country': 'Rechercher un pays',
      'Trouble signing in': 'Problème de connexion', 'Signing in': 'Connexion', 'Signing up': 'Inscription',
      'Still stuck?': 'Toujours bloqué ?', 'Message us': 'Écrivez-nous',
      'Reset my password': 'Réinitialiser mon mot de passe', 'Find my email address': 'Retrouver mon e-mail'
    },
    it: {
      'Pricing': 'Prezzi', 'Features': 'Funzionalità', 'Monthly': 'Mensile', 'Extras': 'Extra',
      'FAQ': 'FAQ', 'Contact': 'Contatti', 'Log in': 'Accedi', 'Home': 'Home',
      'Services': 'Servizi', 'Get started': 'Inizia', 'Build my website': 'Crea il mio sito',
      'Build My Website': 'Crea il mio sito', 'See the pricing': 'Vedi i prezzi',
      'Skip to content': 'Vai al contenuto', 'Menu': 'Menu', 'Close menu': 'Chiudi il menu',
      'Theme': 'Tema', 'Language': 'Lingua', 'Currency': 'Valuta',
      'You run the business.': 'Tu gestisci l’attività.', 'We build the website.': 'Noi costruiamo il sito.',
      'Websites': 'Siti web', 'Three ways to get one.': 'Tre modi per averlo.',
      'Custom Website': 'Sito su misura', 'Full Website': 'Sito completo',
      'Complete Package': 'Pacchetto completo', 'One-time': 'Una tantum',
      'Domain & hosting': 'Dominio e hosting', 'How it works': 'Come funziona',
      'Four steps, start to live.': 'Quattro passi, dall’inizio alla pubblicazione.',
      'Pay 25%': 'Paga il 25%', 'Send your content': 'Manda i contenuti',
      'We build it': 'Lo costruiamo', 'Approve it, pay the rest': 'Approva e paga il resto',
      'Business extras': 'Extra per l’attività',
      'The things a website does not cover.': 'Ciò che un sito non copre.',
      'Straight answers': 'Risposte chiare',
      'Why a quarter, and not the whole thing?': 'Perché un quarto e non tutto?',
      'Ready when you are.': 'Pronti quando lo sei tu.',
      'The 34 that come with every website': 'I 34 inclusi in ogni sito',
      'Pages & sections': 'Pagine e sezioni', 'Catalogues & documents': 'Cataloghi e documenti',
      'Navigation & interaction': 'Navigazione e interazione', 'Media & the basics': 'Media ed essenziali',
      'Website features': 'Funzioni del sito', 'Business & technical': 'Business e tecnica',
      'Automation': 'Automazione', 'Brand & design': 'Brand e design',
      'Monthly services': 'Servizi mensili', 'paid once': 'una tantum',
      'every month, stop any time': 'ogni mese, disdici quando vuoi', 'Coming soon': 'In arrivo',
      'part of the build, never monthly': 'parte della costruzione, mai mensile',
      'Pay today — 25%': 'Da pagare oggi — 25%', 'Clear': 'Azzera', 'selected': 'selezionati',
      'Create your account': 'Crea il tuo account', 'Business name': 'Nome dell’attività',
      'Phone number': 'Numero di telefono', 'Password': 'Password', 'Confirm': 'Conferma',
      'Create account': 'Crea account', 'Confirm your email': 'Conferma la tua email',
      'Verify & continue': 'Verifica e continua', 'Search country': 'Cerca il paese',
      'Trouble signing in': 'Problemi ad accedere', 'Signing in': 'Accesso', 'Signing up': 'Registrazione',
      'Still stuck?': 'Ancora bloccato?', 'Message us': 'Scrivici',
      'Reset my password': 'Reimposta la password', 'Find my email address': 'Trova la mia email'
    },
    es: {
      'Pricing': 'Precios', 'Features': 'Funciones', 'Monthly': 'Mensual', 'Extras': 'Extras',
      'FAQ': 'Preguntas', 'Contact': 'Contacto', 'Log in': 'Iniciar sesión', 'Home': 'Inicio',
      'Services': 'Servicios', 'Get started': 'Empezar', 'Build my website': 'Crear mi web',
      'Build My Website': 'Crear mi web', 'See the pricing': 'Ver precios',
      'Skip to content': 'Ir al contenido', 'Menu': 'Menú', 'Close menu': 'Cerrar el menú',
      'Theme': 'Tema', 'Language': 'Idioma', 'Currency': 'Moneda',
      'You run the business.': 'Tú llevas el negocio.', 'We build the website.': 'Nosotros hacemos la web.',
      'Websites': 'Sitios web', 'Three ways to get one.': 'Tres formas de tenerla.',
      'Custom Website': 'Web a medida', 'Full Website': 'Web completa',
      'Complete Package': 'Paquete completo', 'One-time': 'Pago único',
      'Domain & hosting': 'Dominio y alojamiento', 'How it works': 'Cómo funciona',
      'Four steps, start to live.': 'Cuatro pasos, del inicio a la publicación.',
      'Pay 25%': 'Paga el 25 %', 'Send your content': 'Envía tu contenido',
      'We build it': 'La construimos', 'Approve it, pay the rest': 'Apruébala y paga el resto',
      'Business extras': 'Extras para el negocio',
      'The things a website does not cover.': 'Lo que una web no cubre.',
      'Straight answers': 'Respuestas claras',
      'Why a quarter, and not the whole thing?': '¿Por qué un cuarto y no todo?',
      'Ready when you are.': 'Listos cuando tú lo estés.',
      'The 34 that come with every website': 'Los 34 que vienen con cada web',
      'Pages & sections': 'Páginas y secciones', 'Catalogues & documents': 'Catálogos y documentos',
      'Navigation & interaction': 'Navegación e interacción', 'Media & the basics': 'Medios y lo esencial',
      'Website features': 'Funciones de la web', 'Business & technical': 'Negocio y técnica',
      'Automation': 'Automatización', 'Brand & design': 'Marca y diseño',
      'Monthly services': 'Servicios mensuales', 'paid once': 'pago único',
      'every month, stop any time': 'cada mes, cancela cuando quieras', 'Coming soon': 'Próximamente',
      'part of the build, never monthly': 'parte de la creación, nunca mensual',
      'Pay today — 25%': 'A pagar hoy — 25 %', 'Clear': 'Borrar', 'selected': 'seleccionados',
      'Create your account': 'Crea tu cuenta', 'Business name': 'Nombre del negocio',
      'Phone number': 'Número de teléfono', 'Password': 'Contraseña', 'Confirm': 'Confirmar',
      'Create account': 'Crear cuenta', 'Confirm your email': 'Confirma tu correo',
      'Verify & continue': 'Verificar y continuar', 'Search country': 'Buscar país',
      'Trouble signing in': 'Problemas para entrar', 'Signing in': 'Acceso', 'Signing up': 'Registro',
      'Still stuck?': '¿Sigues atascado?', 'Message us': 'Escríbenos',
      'Reset my password': 'Restablecer mi contraseña', 'Find my email address': 'Encontrar mi correo'
    },
    pt: {
      'Pricing': 'Preços', 'Features': 'Funcionalidades', 'Monthly': 'Mensal', 'Extras': 'Extras',
      'FAQ': 'FAQ', 'Contact': 'Contacto', 'Log in': 'Entrar', 'Home': 'Início',
      'Services': 'Serviços', 'Get started': 'Começar', 'Build my website': 'Criar o meu site',
      'Build My Website': 'Criar o meu site', 'See the pricing': 'Ver os preços',
      'Skip to content': 'Saltar para o conteúdo', 'Menu': 'Menu', 'Close menu': 'Fechar o menu',
      'Theme': 'Tema', 'Language': 'Idioma', 'Currency': 'Moeda',
      'You run the business.': 'O negócio é seu.', 'We build the website.': 'O site fazemos nós.',
      'Websites': 'Sites', 'Three ways to get one.': 'Três formas de ter um.',
      'Custom Website': 'Site à medida', 'Full Website': 'Site completo',
      'Complete Package': 'Pacote completo', 'One-time': 'Pagamento único',
      'Domain & hosting': 'Domínio e alojamento', 'How it works': 'Como funciona',
      'Four steps, start to live.': 'Quatro passos, do início à publicação.',
      'Pay 25%': 'Pagar 25 %', 'Send your content': 'Envie os conteúdos',
      'We build it': 'Nós construímos', 'Approve it, pay the rest': 'Aprove e pague o resto',
      'Business extras': 'Extras para o negócio',
      'The things a website does not cover.': 'O que um site não cobre.',
      'Straight answers': 'Respostas diretas',
      'Why a quarter, and not the whole thing?': 'Porquê um quarto e não tudo?',
      'Ready when you are.': 'Prontos quando quiser.',
      'The 34 that come with every website': 'Os 34 incluídos em cada site',
      'Pages & sections': 'Páginas e secções', 'Catalogues & documents': 'Catálogos e documentos',
      'Navigation & interaction': 'Navegação e interação', 'Media & the basics': 'Média e o essencial',
      'Website features': 'Funções do site', 'Business & technical': 'Negócio e técnica',
      'Automation': 'Automação', 'Brand & design': 'Marca e design',
      'Monthly services': 'Serviços mensais', 'paid once': 'pagamento único',
      'every month, stop any time': 'todos os meses, cancele quando quiser', 'Coming soon': 'Em breve',
      'part of the build, never monthly': 'parte da construção, nunca mensal',
      'Pay today — 25%': 'A pagar hoje — 25 %', 'Clear': 'Limpar', 'selected': 'selecionados',
      'Create your account': 'Crie a sua conta', 'Business name': 'Nome do negócio',
      'Phone number': 'Número de telefone', 'Password': 'Palavra-passe', 'Confirm': 'Confirmar',
      'Create account': 'Criar conta', 'Confirm your email': 'Confirme o seu email',
      'Verify & continue': 'Verificar e continuar', 'Search country': 'Procurar país',
      'Trouble signing in': 'Problemas a entrar', 'Signing in': 'Entrar', 'Signing up': 'Registo',
      'Still stuck?': 'Ainda sem solução?', 'Message us': 'Escreva-nos',
      'Reset my password': 'Repor a palavra-passe', 'Find my email address': 'Encontrar o meu email'
    },
    nl: {
      'Pricing': 'Prijzen', 'Features': 'Functies', 'Monthly': 'Maandelijks', 'Extras': 'Extra’s',
      'FAQ': 'FAQ', 'Contact': 'Contact', 'Log in': 'Inloggen', 'Home': 'Home',
      'Services': 'Diensten', 'Get started': 'Beginnen', 'Build my website': 'Bouw mijn website',
      'Build My Website': 'Bouw mijn website', 'See the pricing': 'Bekijk de prijzen',
      'Skip to content': 'Naar de inhoud', 'Menu': 'Menu', 'Close menu': 'Menu sluiten',
      'Theme': 'Thema', 'Language': 'Taal', 'Currency': 'Valuta',
      'You run the business.': 'Jij runt de zaak.', 'We build the website.': 'Wij bouwen de website.',
      'Websites': 'Websites', 'Three ways to get one.': 'Drie manieren om er een te krijgen.',
      'Custom Website': 'Website op maat', 'Full Website': 'Volledige website',
      'Complete Package': 'Compleet pakket', 'One-time': 'Eenmalig',
      'Domain & hosting': 'Domein en hosting', 'How it works': 'Hoe het werkt',
      'Four steps, start to live.': 'Vier stappen, van start tot live.',
      'Pay 25%': 'Betaal 25%', 'Send your content': 'Stuur je materiaal',
      'We build it': 'Wij bouwen hem', 'Approve it, pay the rest': 'Goedkeuren, rest betalen',
      'Business extras': 'Zakelijke extra’s',
      'The things a website does not cover.': 'Wat een website niet dekt.',
      'Straight answers': 'Duidelijke antwoorden',
      'Why a quarter, and not the whole thing?': 'Waarom een kwart en niet alles?',
      'Ready when you are.': 'Klaar wanneer jij dat bent.',
      'The 34 that come with every website': 'De 34 die bij elke website horen',
      'Pages & sections': 'Pagina’s en secties', 'Catalogues & documents': 'Catalogi en documenten',
      'Navigation & interaction': 'Navigatie en interactie', 'Media & the basics': 'Media en de basis',
      'Website features': 'Websitefuncties', 'Business & technical': 'Zakelijk en technisch',
      'Automation': 'Automatisering', 'Brand & design': 'Merk en ontwerp',
      'Monthly services': 'Maandelijkse diensten', 'paid once': 'eenmalig',
      'every month, stop any time': 'elke maand, stop wanneer je wilt', 'Coming soon': 'Binnenkort',
      'part of the build, never monthly': 'onderdeel van de bouw, nooit maandelijks',
      'Pay today — 25%': 'Vandaag te betalen — 25%', 'Clear': 'Wissen', 'selected': 'geselecteerd',
      'Create your account': 'Maak je account aan', 'Business name': 'Bedrijfsnaam',
      'Phone number': 'Telefoonnummer', 'Password': 'Wachtwoord', 'Confirm': 'Bevestigen',
      'Create account': 'Account aanmaken', 'Confirm your email': 'Bevestig je e-mail',
      'Verify & continue': 'Verifiëren en doorgaan', 'Search country': 'Zoek een land',
      'Trouble signing in': 'Problemen met inloggen', 'Signing in': 'Inloggen', 'Signing up': 'Registreren',
      'Still stuck?': 'Kom je er niet uit?', 'Message us': 'Stuur ons een bericht',
      'Reset my password': 'Wachtwoord opnieuw instellen', 'Find my email address': 'Mijn e-mailadres vinden'
    },
    sv: {
      'Pricing': 'Priser', 'Features': 'Funktioner', 'Monthly': 'Månadsvis', 'Extras': 'Tillägg',
      'FAQ': 'FAQ', 'Contact': 'Kontakt', 'Log in': 'Logga in', 'Home': 'Hem',
      'Services': 'Tjänster', 'Get started': 'Kom igång', 'Build my website': 'Bygg min webbplats',
      'Build My Website': 'Bygg min webbplats', 'See the pricing': 'Se priserna',
      'Skip to content': 'Hoppa till innehållet', 'Menu': 'Meny', 'Close menu': 'Stäng menyn',
      'Theme': 'Tema', 'Language': 'Språk', 'Currency': 'Valuta',
      'You run the business.': 'Du driver företaget.', 'We build the website.': 'Vi bygger webbplatsen.',
      'Websites': 'Webbplatser', 'Three ways to get one.': 'Tre sätt att få en.',
      'Custom Website': 'Skräddarsydd webbplats', 'Full Website': 'Komplett webbplats',
      'Complete Package': 'Helhetspaket', 'One-time': 'Engångsbelopp',
      'Domain & hosting': 'Domän och webbhotell', 'How it works': 'Så går det till',
      'Four steps, start to live.': 'Fyra steg, från start till lansering.',
      'Pay 25%': 'Betala 25 %', 'Send your content': 'Skicka ditt material',
      'We build it': 'Vi bygger den', 'Approve it, pay the rest': 'Godkänn och betala resten',
      'Business extras': 'Tillägg för företaget',
      'The things a website does not cover.': 'Det en webbplats inte täcker.',
      'Straight answers': 'Raka svar',
      'Why a quarter, and not the whole thing?': 'Varför en fjärdedel och inte allt?',
      'Ready when you are.': 'Redo när du är det.',
      'The 34 that come with every website': 'De 34 som ingår i varje webbplats',
      'Pages & sections': 'Sidor och avsnitt', 'Catalogues & documents': 'Kataloger och dokument',
      'Navigation & interaction': 'Navigering och interaktion', 'Media & the basics': 'Media och grunderna',
      'Website features': 'Webbplatsfunktioner', 'Business & technical': 'Företag och teknik',
      'Automation': 'Automatisering', 'Brand & design': 'Varumärke och design',
      'Monthly services': 'Månadstjänster', 'paid once': 'betalas en gång',
      'every month, stop any time': 'varje månad, avsluta när du vill', 'Coming soon': 'Kommer snart',
      'part of the build, never monthly': 'del av bygget, aldrig månadsvis',
      'Pay today — 25%': 'Att betala idag — 25 %', 'Clear': 'Rensa', 'selected': 'valda',
      'Create your account': 'Skapa ditt konto', 'Business name': 'Företagsnamn',
      'Phone number': 'Telefonnummer', 'Password': 'Lösenord', 'Confirm': 'Bekräfta',
      'Create account': 'Skapa konto', 'Confirm your email': 'Bekräfta din e-post',
      'Verify & continue': 'Verifiera och fortsätt', 'Search country': 'Sök land',
      'Trouble signing in': 'Problem att logga in', 'Signing in': 'Inloggning', 'Signing up': 'Registrering',
      'Still stuck?': 'Fortfarande fast?', 'Message us': 'Skriv till oss',
      'Reset my password': 'Återställ mitt lösenord', 'Find my email address': 'Hitta min e-postadress'
    },
    tr: {
      'Pricing': 'Fiyatlar', 'Features': 'Özellikler', 'Monthly': 'Aylık', 'Extras': 'Ekstralar',
      'FAQ': 'SSS', 'Contact': 'İletişim', 'Log in': 'Giriş yap', 'Home': 'Ana sayfa',
      'Services': 'Hizmetler', 'Get started': 'Başla', 'Build my website': 'Siteni oluştur',
      'Build My Website': 'Siteni oluştur', 'See the pricing': 'Fiyatları gör',
      'Skip to content': 'İçeriğe geç', 'Menu': 'Menü', 'Close menu': 'Menüyü kapat',
      'Theme': 'Tema', 'Language': 'Dil', 'Currency': 'Para birimi',
      'You run the business.': 'İşi siz yönetin.', 'We build the website.': 'Siteyi biz yapalım.',
      'Websites': 'Web siteleri', 'Three ways to get one.': 'Sahip olmanın üç yolu.',
      'Custom Website': 'Özel Site', 'Full Website': 'Tam Site',
      'Complete Package': 'Eksiksiz Paket', 'One-time': 'Tek seferlik',
      'Domain & hosting': 'Alan adı ve barındırma', 'How it works': 'Nasıl işler',
      'Four steps, start to live.': 'Dört adım, başlangıçtan yayına.',
      'Pay 25%': '%25 öde', 'Send your content': 'İçeriğinizi gönderin',
      'We build it': 'Biz kuralım', 'Approve it, pay the rest': 'Onaylayın, kalanı ödeyin',
      'Business extras': 'İşletme ekstraları',
      'The things a website does not cover.': 'Bir sitenin kapsamadıkları.',
      'Straight answers': 'Net yanıtlar',
      'Why a quarter, and not the whole thing?': 'Neden çeyreği, tamamı değil?',
      'Ready when you are.': 'Siz hazır olduğunuzda hazırız.',
      'The 34 that come with every website': 'Her siteyle gelen 34 şey',
      'Pages & sections': 'Sayfalar ve bölümler', 'Catalogues & documents': 'Kataloglar ve belgeler',
      'Navigation & interaction': 'Gezinme ve etkileşim', 'Media & the basics': 'Medya ve temeller',
      'Website features': 'Site özellikleri', 'Business & technical': 'İşletme ve teknik',
      'Automation': 'Otomasyon', 'Brand & design': 'Marka ve tasarım',
      'Monthly services': 'Aylık hizmetler', 'paid once': 'tek seferlik',
      'every month, stop any time': 'her ay, istediğinizde durdurun', 'Coming soon': 'Yakında',
      'part of the build, never monthly': 'kurulumun parçası, asla aylık değil',
      'Pay today — 25%': 'Bugün ödenecek — %25', 'Clear': 'Temizle', 'selected': 'seçildi',
      'Create your account': 'Hesabınızı oluşturun', 'Business name': 'İşletme adı',
      'Phone number': 'Telefon numarası', 'Password': 'Parola', 'Confirm': 'Onayla',
      'Create account': 'Hesap oluştur', 'Confirm your email': 'E-postanızı doğrulayın',
      'Verify & continue': 'Doğrula ve devam et', 'Search country': 'Ülke ara',
      'Trouble signing in': 'Giriş sorunu', 'Signing in': 'Giriş', 'Signing up': 'Kayıt',
      'Still stuck?': 'Hâlâ çözülmedi mi?', 'Message us': 'Bize yazın',
      'Reset my password': 'Parolamı sıfırla', 'Find my email address': 'E-posta adresimi bul'
    }
  };

  /* ── State ────────────────────────────────────────────────── */
  function stored(key, fallback) {
    try { return global.localStorage.getItem(key) || fallback; }
    catch (e) { return fallback; }
  }

  var lang = stored(LKEY, 'en');
  var currency = stored(CKEY, 'EUR');
  if (!LANGS.some(function (l) { return l.code === lang; })) lang = 'en';
  if (!CURRENCIES.some(function (c) { return c.code === currency; })) currency = 'EUR';

  function langInfo() {
    return LANGS.filter(function (l) { return l.code === lang; })[0] || LANGS[0];
  }
  function curInfo() {
    return CURRENCIES.filter(function (c) { return c.code === currency; })[0] || CURRENCIES[0];
  }

  /* ── Money ────────────────────────────────────────────────── */
  function format(eur) {
    var c = curInfo();
    var value = eur * c.rate;
    var digits = c.whole ? 0 : (value % 1 === 0 ? 0 : 2);
    try {
      return new Intl.NumberFormat(langInfo().locale, {
        style: 'currency', currency: c.code,
        minimumFractionDigits: digits, maximumFractionDigits: digits
      }).format(value);
    } catch (e) {
      return c.code + ' ' + value.toFixed(digits);
    }
  }

  function paintPrices(root) {
    var nodes = (root || doc).querySelectorAll('.cur[data-eur]');
    [].forEach.call(nodes, function (el) {
      var eur = parseFloat(el.getAttribute('data-eur'));
      if (isNaN(eur)) return;
      el.textContent = format(eur);
    });
  }

  /* ── Words ────────────────────────────────────────────────── */
  /* The original English of every text node, captured once. Switching
     language always translates from English, never from whatever the
     previous language left behind. */
  var originals = [];
  var seen = new WeakSet();

  function collapse(t) { return t.replace(/\s+/g, ' ').trim(); }

  /* Re-runnable. The footer, the mobile drawer and the dashboard's views
     are all built after this file loads, so capture has to be able to
     pick up nodes that did not exist the first time. Nodes already
     captured keep the English they were first seen with. */
  function capture() {
    var walk = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        var p = node.parentNode;
        if (!p) return NodeFilter.FILTER_REJECT;
        var tag = p.nodeName;
        if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'TEXTAREA') return NodeFilter.FILTER_REJECT;
        if (p.classList && p.classList.contains('cur')) return NodeFilter.FILTER_REJECT;
        if (p.closest && p.closest('[data-no-i18n]')) return NodeFilter.FILTER_REJECT;
        return collapse(node.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    var n;
    while ((n = walk.nextNode())) {
      if (seen.has(n)) continue;
      seen.add(n);
      originals.push({ node: n, text: n.nodeValue });
    }
    // Nodes that have since left the document are dead weight on every pass.
    originals = originals.filter(function (o) { return o.node.isConnected; });
  }

  var ATTRS = ['placeholder', 'aria-label', 'title'];
  var attrOriginals = [];
  var attrSeen = new WeakSet();

  function captureAttrs() {
    ATTRS.forEach(function (a) {
      [].forEach.call(doc.querySelectorAll('[' + a + ']'), function (el) {
        var mark = a + '|' + el.getAttribute(a);
        if (el.__i18nAttrs && el.__i18nAttrs[a] !== undefined) return;
        el.__i18nAttrs = el.__i18nAttrs || {};
        el.__i18nAttrs[a] = el.getAttribute(a);
        attrOriginals.push({ el: el, attr: a, text: el.getAttribute(a) });
      });
    });
    attrOriginals = attrOriginals.filter(function (o) { return o.el.isConnected; });
  }

  function paintWords() {
    capture();
    captureAttrs();
    var dict = STRINGS[lang] || null;

    originals.forEach(function (o) {
      if (!dict) { o.node.nodeValue = o.text; return; }
      var key = collapse(o.text);
      var hit = dict[key];
      if (!hit) { o.node.nodeValue = o.text; return; }
      // Keep the surrounding whitespace the markup had.
      var lead = o.text.match(/^\s*/)[0];
      var tail = o.text.match(/\s*$/)[0];
      o.node.nodeValue = lead + hit + tail;
    });

    attrOriginals.forEach(function (o) {
      var hit = dict && dict[collapse(o.text)];
      o.el.setAttribute(o.attr, hit || o.text);
    });

    doc.documentElement.setAttribute('lang', lang);
  }

  /* ── Apply ────────────────────────────────────────────────── */
  var listeners = [];

  function apply() {
    paintWords();
    paintPrices();
    listeners.forEach(function (fn) { try { fn(); } catch (e) {} });
    /* An event as well as the callback list, because script order is not
       guaranteed: anything loaded before this file cannot have called
       onChange yet, but it can already be listening. */
    try { doc.dispatchEvent(new CustomEvent('onsite:i18n', { detail: { lang: lang, currency: currency } })); }
    catch (e) { /* very old browser — the callback list still fired */ }
    [].forEach.call(doc.querySelectorAll('[data-i18n-lang]'), function (s) { s.value = lang; });
    [].forEach.call(doc.querySelectorAll('[data-i18n-cur]'), function (s) { s.value = currency; });
  }

  function setLang(code) {
    lang = code;
    try { global.localStorage.setItem(LKEY, code); } catch (e) {}
    apply();
  }

  function setCurrency(code) {
    currency = code;
    try { global.localStorage.setItem(CKEY, code); } catch (e) {}
    apply();
  }

  /* ── The control ──────────────────────────────────────────── */
  function control(compact) {
    var wrap = doc.createElement('div');
    wrap.className = 'i18n' + (compact ? ' i18n--compact' : '');
    wrap.setAttribute('data-no-i18n', '');

    function field(labelText, name, items, value, onPick) {
      var f = doc.createElement('label');
      f.className = 'i18n-field';
      var span = doc.createElement('span');
      span.textContent = labelText;
      var sel = doc.createElement('select');
      sel.setAttribute(name, '');
      items.forEach(function (i) {
        var o = doc.createElement('option');
        o.value = i.code;
        o.textContent = i.text;
        sel.appendChild(o);
      });
      sel.value = value;
      sel.addEventListener('change', function () { onPick(sel.value); });
      f.appendChild(span);
      f.appendChild(sel);
      return f;
    }

    wrap.appendChild(field('Language', 'data-i18n-lang',
      LANGS.map(function (l) { return { code: l.code, text: l.label }; }),
      lang, setLang));

    wrap.appendChild(field('Currency', 'data-i18n-cur',
      CURRENCIES.map(function (c) { return { code: c.code, text: c.code + ' · ' + c.label }; }),
      currency, setCurrency));

    var note = doc.createElement('p');
    note.className = 'i18n-note';
    note.textContent = 'Prices are shown for guidance. Billing is in EUR.';
    wrap.appendChild(note);

    return wrap;
  }

  function mount() {
    /* The landing page's own menu. */
    var slot = doc.querySelector('[data-theme-slot]');
    if (slot && !slot.parentNode.querySelector('.i18n')) {
      slot.parentNode.insertBefore(control(true), slot.nextSibling);
    }
    /* The drawer every other public page builds. */
    var drawer = doc.querySelector('.m-drawer-body');
    if (drawer && !drawer.querySelector('.i18n')) drawer.appendChild(control(true));
    /* Account settings in the dashboard. */
    var settings = doc.querySelector('[data-i18n-slot]');
    if (settings && !settings.querySelector('.i18n')) settings.appendChild(control(false));
  }

  global.OnsiteI18n = {
    format: format,
    paintPrices: paintPrices,
    onChange: function (fn) { listeners.push(fn); },
    get lang() { return lang; },
    get currency() { return currency; },
    setLang: setLang,
    setCurrency: setCurrency,
    mount: mount
  };

  function start() {
    apply();
    mount();
    /* The footer, the drawer and the dashboard's settings card are built
       by other files that may run after this one, so sweep again once
       they have had their turn. */
    global.setTimeout(function () { apply(); mount(); }, 0);
    global.setTimeout(function () { apply(); mount(); }, 400);
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start);
  else start();
})(window);
