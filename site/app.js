/* ReadyWin — product landing page (vanilla HTML/CSS/JS).
   Four UI languages (uk, en, de, ru) driven by data-i18n / data-i18n-attr
   attributes plus the dictionaries below.

   Language resolution mirrors the desktop app and follows this order:
     1. the ?lang=uk|en|de|ru parameter in the address bar;
     2. the saved choice in localStorage (current key first, then the legacy
        one, so an existing choice is never lost);
     3. the system language (navigator.languages / navigator.language)
        matched by prefix;
     4. anything else falls back to English. */

/* Public repository address — drives the "Download" button (its releases page)
   and the footer source link. */
const REPO_URL = 'https://github.com/LevrikM/readyWin';

/* Canonical address of the hosted page — used for the self-referencing
   canonical link and og:url. Update this if the site moves to another domain. */
const SITE_URL = 'https://readywin.vercel.app';

(function () {
  'use strict';

  var LANGS = [
    { code: 'uk', label: '\u0423\u043a\u0440\u0430\u0457\u043d\u0441\u044c\u043a\u0430', short: '\u0423\u041a\u0420' },
    { code: 'en', label: 'English', short: 'ENG' },
    { code: 'de', label: 'Deutsch', short: 'DEU' },
    { code: 'ru', label: '\u0420\u0443\u0441\u0441\u043a\u0438\u0439', short: '\u0420\u0423\u0421' }
  ];

  var LANG_KEY = 'readywin.lang';
  var THEME_KEY = 'readywin.theme';
  /* Keys written by earlier builds: read-only fallback, never written. */
  var LEGACY_LANG_KEY = 'firstwin.lang';
  var CODES = { uk: 1, en: 1, de: 1, ru: 1 };
  var LOCALES = { uk: 'uk_UA', en: 'en_US', de: 'de_DE', ru: 'ru_RU' };

  var I18N = {
    uk: {
      'meta.title': 'ReadyWin \u2014 \u0447\u0438\u0441\u0442\u0438\u0439 \u0441\u0442\u0430\u0440\u0442 Windows',
      'meta.desc':
        'ReadyWin \u0441\u043a\u0430\u043d\u0443\u0454 \u0441\u0438\u0441\u0442\u0435\u043c\u0443, \u043f\u043e\u043a\u0430\u0437\u0443\u0454, \u0449\u043e \u0432\u0436\u0435 \u0432\u0441\u0442\u0430\u043d\u043e\u0432\u043b\u0435\u043d\u043e, \u0456 \u0441\u0442\u0430\u0432\u0438\u0442\u044c \u043f\u043e\u0442\u0440\u0456\u0431\u043d\u0456 \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u0438 \u043e\u0434\u043d\u0456\u0454\u044e \u0447\u0435\u0440\u0433\u043e\u044e \u0437 \u043e\u0434\u043d\u0438\u043c \u0437\u0430\u043f\u0438\u0442\u043e\u043c UAC.',
      'a11y.skip': '\u0414\u043e \u0437\u043c\u0456\u0441\u0442\u0443',
      'brand.sub': '\u0427\u0418\u0421\u0422\u0418\u0419 \u0421\u0422\u0410\u0420\u0422',
      'nav.features': '\u041c\u043e\u0436\u043b\u0438\u0432\u043e\u0441\u0442\u0456',
      'nav.catalog': '\u041a\u0430\u0442\u0430\u043b\u043e\u0433',
      'nav.how': '\u042f\u043a \u043f\u0440\u0430\u0446\u044e\u0454',
      'nav.langs': '\u041c\u043e\u0432\u0438',
      'theme.toggle': '\u0417\u043c\u0456\u043d\u0438\u0442\u0438 \u0442\u0435\u043c\u0443',
      'lang.toggle': '\u0417\u043c\u0456\u043d\u0438\u0442\u0438 \u043c\u043e\u0432\u0443',
      'hero.eyebrow': '\u0427\u0418\u0421\u0422\u0418\u0419 \u0421\u0422\u0410\u0420\u0422 WINDOWS',
      'hero.title': '\u041d\u043e\u0432\u0430 \u0441\u0438\u0441\u0442\u0435\u043c\u0430 \u2014 \u0437\u0430 \u043e\u0434\u043d\u0443 \u0447\u0435\u0440\u0433\u0443.',
      'hero.lead':
        'ReadyWin \u0441\u043a\u0430\u043d\u0443\u0454 \u043a\u043e\u043c\u043f\u2019\u044e\u0442\u0435\u0440, \u043f\u043e\u043a\u0430\u0437\u0443\u0454, \u0449\u043e \u0432\u0436\u0435 \u0432\u0441\u0442\u0430\u043d\u043e\u0432\u043b\u0435\u043d\u043e, \u0456 \u0441\u0442\u0430\u0432\u0438\u0442\u044c \u0440\u0435\u0448\u0442\u0443 \u0447\u0435\u0440\u0433\u043e\u044e \u2014 \u0437 \u043e\u0434\u043d\u0438\u043c \u0437\u0430\u043f\u0438\u0442\u043e\u043c UAC. \u0411\u0435\u0437 \u0440\u0435\u043a\u043b\u0430\u043c\u043d\u0438\u0445 \u0434\u043e\u0431\u0456\u0440\u043e\u043a \u0456 \u0432\u0438\u043f\u0430\u0434\u043a\u043e\u0432\u0438\u0445 \u043f\u0430\u043a\u0435\u0442\u0456\u0432.',
      'hero.cta.download': '\u0417\u0430\u0432\u0430\u043d\u0442\u0430\u0436\u0438\u0442\u0438',
      'hero.cta.primary': '\u042f\u043a \u0446\u0435 \u043f\u0440\u0430\u0446\u044e\u0454',
      'hero.cta.secondary': '\u041f\u0435\u0440\u0435\u0433\u043b\u044f\u043d\u0443\u0442\u0438 \u043a\u0430\u0442\u0430\u043b\u043e\u0433',
      'hero.metric.programs': '\u041f\u0420\u041e\u0413\u0420\u0410\u041c',
      'hero.metric.groups': '\u0413\u0420\u0423\u041f',
      'hero.metric.presets': '\u041f\u0420\u0415\u0421\u0415\u0422\u0406\u0412',
      'hero.metric.langs': '\u041c\u041e\u0412\u0418',
      'hero.shot.frame': '\u041e\u0413\u041b\u042f\u0414',
      'hero.shot.caption':
        '\u0423\u0441\u044f \u0441\u0438\u0441\u0442\u0435\u043c\u0430 \u043e\u0434\u043d\u0438\u043c \u0435\u043a\u0440\u0430\u043d\u043e\u043c: \u0449\u043e \u0432\u0436\u0435 \u043d\u0430 \u043c\u0456\u0441\u0446\u0456, \u0447\u043e\u0433\u043e \u0431\u0440\u0430\u043a\u0443\u0454 \u0456 \u0449\u043e \u0432\u0430\u0440\u0442\u043e \u0434\u043e\u0434\u0430\u0442\u0438.',
      'features.eyebrow': '\u041c\u041e\u0416\u041b\u0418\u0412\u041e\u0421\u0422\u0406',
      'features.title': '\u0429\u043e \u0432\u043c\u0456\u0454 ReadyWin',
      'features.lead':
        '\u0428\u0456\u0441\u0442\u044c \u0440\u0435\u0447\u0435\u0439, \u044f\u043a\u0456 \u0440\u043e\u0431\u043b\u044f\u0442\u044c \u0447\u0438\u0441\u0442\u0438\u0439 \u0441\u0442\u0430\u0440\u0442 Windows \u0441\u043f\u0440\u0430\u0432\u0434\u0456 \u0448\u0432\u0438\u0434\u043a\u0438\u043c: \u0442\u043e\u0447\u043d\u043e \u0437\u043d\u0430\u0442\u0438 \u0441\u0442\u0430\u043d \u0441\u0438\u0441\u0442\u0435\u043c\u0438, \u043d\u0435 \u0432\u0438\u0442\u0440\u0430\u0447\u0430\u0442\u0438 \u0447\u0430\u0441 \u043d\u0430 \u043f\u043e\u0448\u0443\u043a \u0432\u0441\u0442\u0430\u043d\u043e\u0432\u043b\u044e\u0432\u0430\u0447\u0456\u0432 \u0456 \u043d\u0435 \u0434\u0430\u0432\u0430\u0442\u0438 \u0437\u0433\u043e\u0434\u043e\u044e \u043d\u0430 UAC \u0431\u0456\u043b\u044c\u0448\u0435, \u043d\u0456\u0436 \u043f\u043e\u0442\u0440\u0456\u0431\u043d\u043e.',
      'feat.scan.title': '\u0421\u043a\u0430\u043d\u0443\u0432\u0430\u043d\u043d\u044f \u0441\u0438\u0441\u0442\u0435\u043c\u0438',
      'feat.scan.text':
        '\u0427\u0438\u0442\u0430\u0454 \u0440\u0435\u0454\u0441\u0442\u0440 \u0456 \u043f\u0430\u043a\u0435\u0442\u0438 Microsoft Store (MSIX), \u0449\u043e\u0431 \u0442\u043e\u0447\u043d\u043e \u0437\u043d\u0430\u0442\u0438, \u0449\u043e \u0432\u0436\u0435 \u0441\u0442\u043e\u0457\u0442\u044c \u043d\u0430 \u043a\u043e\u043c\u043f\u2019\u044e\u0442\u0435\u0440\u0456.',
      'feat.catalog.title': '\u041a\u0430\u0442\u0430\u043b\u043e\u0433 \u0437 \u043f\u043e\u0448\u0443\u043a\u043e\u043c \u0456 \u0444\u0456\u043b\u044c\u0442\u0440\u0430\u043c\u0438',
      'feat.catalog.text':
        '201 \u043f\u043e\u0437\u0438\u0446\u0456\u044f \u0432 12 \u0433\u0440\u0443\u043f\u0430\u0445: \u0444\u0456\u043b\u044c\u0442\u0440\u0438 \u0437\u0430 \u0433\u0440\u0443\u043f\u043e\u044e \u0439 \u0441\u0442\u0430\u043d\u043e\u043c, \u043f\u043e\u0448\u0443\u043a \u0437\u0430 \u043d\u0430\u0437\u0432\u043e\u044e, \u0432\u0438\u0434\u0430\u0432\u0446\u0435\u043c \u0430\u0431\u043e \u0442\u0435\u0433\u043e\u043c.',
      'feat.runtime.title': '\u041a\u043e\u043c\u043f\u043e\u043d\u0435\u043d\u0442\u0438 \u0441\u0435\u0440\u0435\u0434\u043e\u0432\u0438\u0449\u0430',
      'feat.runtime.text':
        'DirectX, Visual C++, .NET Desktop, WebView2, Windows Terminal, PowerShell 7 \u0456 WSL \u2014 \u043e\u0434\u043d\u0438\u043c \u0431\u043b\u043e\u043a\u043e\u043c.',
      'feat.queue.title': '\u041e\u0434\u043d\u0430 \u0447\u0435\u0440\u0433\u0430, \u043e\u0434\u0438\u043d UAC',
      'feat.queue.text':
        '\u0423\u0441\u0456 \u0432\u0438\u0431\u0440\u0430\u043d\u0456 \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u0438 \u0441\u0442\u0430\u0432\u043b\u044f\u0442\u044c\u0441\u044f \u043f\u043e\u0441\u043b\u0456\u0434\u043e\u0432\u043d\u043e \u0437\u0430 \u043e\u0434\u043d\u0438\u043c \u0437\u0430\u043f\u0438\u0442\u043e\u043c \u043f\u0440\u0430\u0432 \u0430\u0434\u043c\u0456\u043d\u0456\u0441\u0442\u0440\u0430\u0442\u043e\u0440\u0430. \u041c\u0456\u0436 \u043f\u0443\u043d\u043a\u0442\u0430\u043c\u0438 \u0447\u0435\u0440\u0433\u0443 \u043c\u043e\u0436\u043d\u0430 \u0441\u043a\u0430\u0441\u0443\u0432\u0430\u0442\u0438.',
      'feat.updates.title': '\u0412\u0456\u0434\u0441\u0442\u0435\u0436\u0435\u043d\u043d\u044f \u043e\u043d\u043e\u0432\u043b\u0435\u043d\u044c',
      'feat.updates.text':
        '\u041f\u043e\u0440\u0456\u0432\u043d\u044e\u0454 \u0432\u0441\u0442\u0430\u043d\u043e\u0432\u043b\u0435\u043d\u0435 \u0437 \u0442\u0438\u043c, \u0449\u043e \u043f\u0440\u043e\u043f\u043e\u043d\u0443\u0454 winget upgrade, \u0456 \u043f\u043e\u043a\u0430\u0437\u0443\u0454, \u0434\u0435 \u0454 \u043d\u043e\u0432\u0456\u0448\u0430 \u0432\u0435\u0440\u0441\u0456\u044f. \u0420\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442 \u043a\u0435\u0448\u0443\u0454\u0442\u044c\u0441\u044f \u043d\u0430 90 \u0441\u0435\u043a\u0443\u043d\u0434.',
      'feat.lang.title': '\u0427\u043e\u0442\u0438\u0440\u0438 \u043c\u043e\u0432\u0438 \u0456\u043d\u0442\u0435\u0440\u0444\u0435\u0439\u0441\u0443',
      'feat.lang.text':
        '\u0423\u043a\u0440\u0430\u0457\u043d\u0441\u044c\u043a\u0430, \u0430\u043d\u0433\u043b\u0456\u0439\u0441\u044c\u043a\u0430, \u043d\u0456\u043c\u0435\u0446\u044c\u043a\u0430 \u0439 \u0440\u043e\u0441\u0456\u0439\u0441\u044c\u043a\u0430. \u041c\u043e\u0432\u0430 \u043f\u0456\u0434\u0445\u043e\u043f\u043b\u044e\u0454\u0442\u044c\u0441\u044f \u0456\u0437 \u0441\u0438\u0441\u0442\u0435\u043c\u0438 \u043f\u0440\u0438 \u043f\u0435\u0440\u0448\u043e\u043c\u0443 \u0437\u0430\u043f\u0443\u0441\u043a\u0443.',
      'catalog.eyebrow': '\u041a\u0410\u0422\u0410\u041b\u041e\u0413 \u00b7 201 \u041f\u041e\u0417\u0418\u0426\u0406\u042f \u00b7 12 \u0413\u0420\u0423\u041f',
      'catalog.title': '\u0412\u0441\u0435 \u043d\u0435\u043e\u0431\u0445\u0456\u0434\u043d\u0435.',
      'catalog.lead':
        '\u0412\u0456\u0434\u0456\u0431\u0440\u0430\u043d\u0456 \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u0438, \u0441\u0435\u0440\u0435\u0434\u043e\u0432\u0438\u0449\u0430 \u0439 \u0443\u0442\u0438\u043b\u0456\u0442\u0438. \u0423\u0441\u0435 \u0441\u0442\u0430\u0432\u0438\u0442\u044c\u0441\u044f \u0447\u0435\u0440\u0435\u0437 winget \u2014 \u0431\u0435\u0437 \u0440\u0435\u043a\u043b\u0430\u043c\u043d\u0438\u0445 \u0434\u043e\u0431\u0456\u0440\u043e\u043a \u0456 \u0432\u0438\u043f\u0430\u0434\u043a\u043e\u0432\u0438\u0445 \u043f\u0430\u043a\u0435\u0442\u0456\u0432.',
      'catalog.groups.label': '\u0413\u0420\u0423\u041f\u0418 \u0419 \u041a\u0406\u041b\u042c\u041a\u0406\u0421\u0422\u042c \u041f\u041e\u0417\u0418\u0426\u0406\u0419',
      'catalog.examples.label': '\u041f\u0420\u0418\u041a\u041b\u0410\u0414\u0418 \u0417 \u041a\u0410\u0422\u0410\u041b\u041e\u0413\u0423',
      'catalog.examples.note':
        '\u041d\u0430\u0437\u0432\u0438 \u0439 \u043e\u043f\u0438\u0441\u0438 \u043f\u0440\u043e\u0433\u0440\u0430\u043c \u0443 \u0437\u0430\u0441\u0442\u043e\u0441\u0443\u043d\u043a\u0443 \u0430\u043d\u0433\u043b\u0456\u0439\u0441\u044c\u043a\u043e\u044e \u2014 \u0442\u0430\u043a \u0432\u043e\u043d\u0438 \u043f\u0440\u0438\u0445\u043e\u0434\u044f\u0442\u044c \u0456\u0437 \u043a\u0430\u0442\u0430\u043b\u043e\u0433\u0443. \u0406\u043d\u0442\u0435\u0440\u0444\u0435\u0439\u0441 \u043d\u0430\u0432\u043a\u043e\u043b\u043e \u043d\u0438\u0445 \u043f\u0435\u0440\u0435\u043a\u043b\u0430\u0434\u0435\u043d\u043e.',
      'group.system': '\u041a\u043e\u043c\u043f\u043e\u043d\u0435\u043d\u0442\u0438',
      'group.browsers': '\u0411\u0440\u0430\u0443\u0437\u0435\u0440\u0438',
      'group.communication': '\u041a\u043e\u043c\u0443\u043d\u0456\u043a\u0430\u0446\u0456\u0457',
      'group.media': '\u041c\u0435\u0434\u0456\u0430',
      'group.games': '\u0406\u0433\u0440\u0438',
      'group.development': '\u0420\u043e\u0437\u0440\u043e\u0431\u043a\u0430',
      'group.console': '\u041a\u043e\u043d\u0441\u043e\u043b\u044c',
      'group.ai': '\u0428\u0406',
      'group.office': '\u041e\u0444\u0456\u0441',
      'group.utilities': '\u0423\u0442\u0438\u043b\u0456\u0442\u0438',
      'group.creative': '\u0422\u0432\u043e\u0440\u0447\u0456\u0441\u0442\u044c',
      'group.security': '\u0411\u0435\u0437\u043f\u0435\u043a\u0430',
      'how.eyebrow': '\u042f\u041a \u041f\u0420\u0410\u0426\u042e\u0404',
      'how.title': '\u0427\u043e\u0442\u0438\u0440\u0438 \u043a\u0440\u043e\u043a\u0438 \u0434\u043e \u0447\u0438\u0441\u0442\u043e\u0457 \u0441\u0438\u0441\u0442\u0435\u043c\u0438',
      'how.lead':
        '\u0412\u0456\u0434 \u043f\u0435\u0440\u0448\u043e\u0433\u043e \u0437\u0430\u043f\u0443\u0441\u043a\u0443 \u0434\u043e \u0433\u043e\u0442\u043e\u0432\u043e\u0457 \u0441\u0438\u0441\u0442\u0435\u043c\u0438 \u2014 \u0431\u0435\u0437 \u0440\u0443\u0447\u043d\u043e\u0433\u043e \u043f\u043e\u0448\u0443\u043a\u0443 \u0432\u0441\u0442\u0430\u043d\u043e\u0432\u043b\u044e\u0432\u0430\u0447\u0456\u0432 \u0456 \u0431\u0435\u0437 \u043e\u043a\u0440\u0435\u043c\u043e\u0433\u043e \u0432\u0456\u043a\u043d\u0430 UAC \u043d\u0430 \u043a\u043e\u0436\u043d\u0443 \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u0443.',
      'step.scan.title': '\u0421\u043a\u0430\u043d\u0443\u0432\u0430\u043d\u043d\u044f',
      'step.scan.text':
        '\u0427\u0438\u0442\u0430\u0454 \u0440\u0435\u0454\u0441\u0442\u0440 \u0456 MSIX-\u043f\u0430\u043a\u0435\u0442\u0438, \u043f\u043e\u043a\u0430\u0437\u0443\u0454, \u0447\u043e\u0433\u043e \u043d\u0435\u043c\u0430\u0454, \u0456 \u0441\u043a\u0456\u043b\u044c\u043a\u0438 \u043c\u0456\u0441\u0446\u044f \u0432\u0456\u043b\u044c\u043d\u043e \u043d\u0430 \u0434\u0438\u0441\u043a\u0443.',
      'step.pick.title': '\u0412\u0438\u0431\u0456\u0440 \u0456\u0437 \u043a\u0430\u0442\u0430\u043b\u043e\u0433\u0443 \u0430\u0431\u043e \u043f\u0440\u0435\u0441\u0435\u0442\u0456\u0432',
      'step.pick.text':
        '\u041e\u043a\u0440\u0435\u043c\u0456 \u043f\u043e\u0437\u0438\u0446\u0456\u0457, \u043e\u0434\u0438\u043d \u0456\u0437 \u043f\u2019\u044f\u0442\u0438 \u043f\u0440\u0435\u0441\u0435\u0442\u0456\u0432 \u0430\u0431\u043e \u0440\u0435\u043a\u043e\u043c\u0435\u043d\u0434\u0430\u0446\u0456\u0457, \u044f\u043a\u0456 \u0437\u0430\u0441\u0442\u043e\u0441\u0443\u043d\u043e\u043a \u0437\u0431\u0438\u0440\u0430\u0454 \u0441\u0430\u043c.',
      'step.queue.title': '\u041e\u0434\u043d\u0430 \u0447\u0435\u0440\u0433\u0430, \u043e\u0434\u0438\u043d UAC',
      'step.queue.text':
        '\u041f\u0430\u043a\u0435\u0442\u0438 \u0432\u0441\u0442\u0430\u043d\u043e\u0432\u043b\u044e\u044e\u0442\u044c\u0441\u044f \u043f\u043e\u0441\u043b\u0456\u0434\u043e\u0432\u043d\u043e; Windows \u043f\u0438\u0442\u0430\u0454 \u043f\u0440\u0430\u0432\u0430 \u0430\u0434\u043c\u0456\u043d\u0456\u0441\u0442\u0440\u0430\u0442\u043e\u0440\u0430 \u0440\u0456\u0432\u043d\u043e \u043e\u0434\u0438\u043d \u0440\u0430\u0437.',
      'step.done.title': '\u0413\u043e\u0442\u043e\u0432\u043e \u0439 \u0434\u0438\u0444 \u00ab\u0434\u043e/\u043f\u0456\u0441\u043b\u044f\u00bb',
      'step.done.text':
        '\u041d\u0430\u043f\u0440\u0438\u043a\u0456\u043d\u0446\u0456 \u0432\u0438\u0434\u043d\u043e, \u0441\u043a\u0456\u043b\u044c\u043a\u0438 \u043f\u043e\u0437\u0438\u0446\u0456\u0439 \u043a\u0430\u0442\u0430\u043b\u043e\u0433\u0443 \u0431\u0443\u043b\u043e \u043d\u0430 \u043c\u0456\u0441\u0446\u0456 \u0440\u0430\u043d\u0456\u0448\u0435 \u0456 \u0441\u043a\u0456\u043b\u044c\u043a\u0438 \u0434\u043e\u0434\u0430\u043b\u043e\u0441\u044f \u043f\u0456\u0441\u043b\u044f \u0447\u0435\u0440\u0433\u0438.',
      'how.notes.label': '\u0414\u0420\u0406\u0411\u041d\u0418\u0426\u0406, \u042f\u041a\u0406 \u0412\u0410\u0416\u041b\u0418\u0412\u041e \u0417\u041d\u0410\u0422\u0418',
      'note.winget':
        '\u0423\u0441\u0435 \u0432\u0441\u0442\u0430\u043d\u043e\u0432\u043b\u044e\u0454\u0442\u044c\u0441\u044f \u0447\u0435\u0440\u0435\u0437 winget \u2014 \u0436\u043e\u0434\u043d\u0438\u0445 \u0432\u043b\u0430\u0441\u043d\u0438\u0445 \u0437\u0430\u0432\u0430\u043d\u0442\u0430\u0436\u0443\u0432\u0430\u0447\u0456\u0432 \u0456 \u00ab\u0442\u0438\u0445\u0438\u0445\u00bb \u0456\u043d\u0441\u0442\u0430\u043b\u044f\u0442\u043e\u0440\u0456\u0432.',
      'note.logs':
        '\u0406\u0441\u0442\u043e\u0440\u0456\u044f \u0432\u0441\u0442\u0430\u043d\u043e\u0432\u043b\u0435\u043d\u044c \u0437\u0431\u0435\u0440\u0456\u0433\u0430\u0454\u0442\u044c\u0441\u044f \u043b\u043e\u043a\u0430\u043b\u044c\u043d\u043e \u2014 \u0436\u0443\u0440\u043d\u0430\u043b\u0438 \u043d\u0456\u043a\u0443\u0434\u0438 \u043d\u0435 \u0432\u0456\u0434\u043f\u0440\u0430\u0432\u043b\u044f\u044e\u0442\u044c\u0441\u044f.',
      'note.cancel':
        '\u0427\u0435\u0440\u0433\u0443 \u043c\u043e\u0436\u043d\u0430 \u0441\u043a\u0430\u0441\u0443\u0432\u0430\u0442\u0438 \u043c\u0456\u0436 \u043f\u0443\u043d\u043a\u0442\u0430\u043c\u0438; \u0443\u0436\u0435 \u0432\u0441\u0442\u0430\u043d\u043e\u0432\u043b\u0435\u043d\u0435 \u0437\u0430\u043b\u0438\u0448\u0430\u0454\u0442\u044c\u0441\u044f \u043d\u0430 \u043c\u0456\u0441\u0446\u0456.',
      'note.diff':
        '\u041f\u0456\u0441\u043b\u044f \u0447\u0435\u0440\u0433\u0438 \u0437\u0430\u0441\u0442\u043e\u0441\u0443\u043d\u043e\u043a \u043f\u043e\u043a\u0430\u0437\u0443\u0454, \u044f\u043a\u0456 \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u0438 \u0440\u0435\u0430\u043b\u044c\u043d\u043e \u0437\u2019\u044f\u0432\u0438\u043b\u0438\u0441\u044f \u0432 \u0441\u0438\u0441\u0442\u0435\u043c\u0456.',
      'shots.eyebrow': '\u0421\u041a\u0420\u0406\u041d\u0428\u041e\u0422\u0418',
      'shots.title': '\u0422\u0440\u0438 \u0435\u043a\u0440\u0430\u043d\u0438 \u0437\u0430\u0441\u0442\u043e\u0441\u0443\u043d\u043a\u0443',
      'shots.lead':
        '\u041e\u0433\u043b\u044f\u0434, \u043a\u0430\u0442\u0430\u043b\u043e\u0433 \u0456 \u0447\u0435\u0440\u0433\u0430 \u2014 \u0443\u0441\u0435, \u0449\u043e \u043f\u043e\u0442\u0440\u0456\u0431\u043d\u043e \u0434\u043b\u044f \u0447\u0438\u0441\u0442\u043e\u0433\u043e \u0441\u0442\u0430\u0440\u0442\u0443 Windows.',
      'shot.catalog.cap': '\u041a\u0410\u0422\u0410\u041b\u041e\u0413 \u00b7 \u041f\u041e\u0428\u0423\u041a, \u0413\u0420\u0423\u041f\u0418 \u0419 \u0424\u0406\u041b\u042c\u0422\u0420 \u0421\u0422\u0410\u041d\u0423',
      'shot.queue.cap': '\u0427\u0415\u0420\u0413\u0410 \u00b7 \u041f\u0410\u041a\u0415\u0422\u0418, \u041e\u0426\u0406\u041d\u041a\u0410, \u041e\u0414\u0418\u041d UAC',
      'shot.result.cap': '\u0420\u0415\u0417\u0423\u041b\u042c\u0422\u0410\u0422 \u00b7 \u041d\u041e\u0412\u0406 \u041f\u0420\u041e\u0413\u0420\u0410\u041c\u0418 \u0412 \u0421\u0418\u0421\u0422\u0415\u041c\u0406',
      'alt.overview':
        '\u041f\u0430\u043d\u0435\u043b\u044c \u043e\u0433\u043b\u044f\u0434\u0443 ReadyWin: \u0441\u0442\u0430\u043d \u0441\u0438\u0441\u0442\u0435\u043c\u0438, \u043a\u043e\u043c\u043f\u043e\u043d\u0435\u043d\u0442\u0438 \u0441\u0435\u0440\u0435\u0434\u043e\u0432\u0438\u0449\u0430 \u0439 \u0440\u0435\u043a\u043e\u043c\u0435\u043d\u0434\u043e\u0432\u0430\u043d\u0456 \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u0438.',
      'alt.catalog':
        '\u041a\u0430\u0442\u0430\u043b\u043e\u0433 ReadyWin: \u0433\u0440\u0443\u043f\u0438, \u0444\u0456\u043b\u044c\u0442\u0440\u0438 \u0441\u0442\u0430\u043d\u0443 \u0439 \u043a\u0430\u0440\u0442\u043a\u0438 \u043f\u0440\u043e\u0433\u0440\u0430\u043c.',
      'alt.queue':
        '\u0427\u0435\u0440\u0433\u0430 ReadyWin: \u043f\u0430\u043a\u0435\u0442\u0438, \u043e\u0446\u0456\u043d\u043a\u0430 \u0440\u043e\u0437\u043c\u0456\u0440\u0443 \u0439 \u043e\u0434\u0438\u043d \u0437\u0430\u043f\u0438\u0442 UAC.',
      'alt.result':
        '\u0420\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442 \u0447\u0435\u0440\u0433\u0438: \u0432\u0441\u0442\u0430\u043d\u043e\u0432\u043b\u0435\u043d\u043e 3 \u0437 3 \u0456 \u043f\u0435\u0440\u0435\u043b\u0456\u043a \u043d\u043e\u0432\u0438\u0445 \u043f\u0440\u043e\u0433\u0440\u0430\u043c \u0443 \u0441\u0438\u0441\u0442\u0435\u043c\u0456.',
      'langs.eyebrow': '\u041c\u041e\u0412\u0418',
      'langs.title': '\u0427\u043e\u0442\u0438\u0440\u0438 \u043c\u043e\u0432\u0438 \u0456\u043d\u0442\u0435\u0440\u0444\u0435\u0439\u0441\u0443',
      'langs.lead':
        '\u0423\u043a\u0440\u0430\u0457\u043d\u0441\u044c\u043a\u0430, \u0430\u043d\u0433\u043b\u0456\u0439\u0441\u044c\u043a\u0430, \u043d\u0456\u043c\u0435\u0446\u044c\u043a\u0430 \u0439 \u0440\u043e\u0441\u0456\u0439\u0441\u044c\u043a\u0430. \u041f\u0435\u0440\u0435\u043c\u0438\u043a\u0430\u0447 \u0436\u0438\u0432\u0435 \u0432 \u043b\u0456\u0432\u043e\u043c\u0443 \u043d\u0438\u0436\u043d\u044c\u043e\u043c\u0443 \u043a\u0443\u0442\u0456 \u0437\u0430\u0441\u0442\u043e\u0441\u0443\u043d\u043a\u0443 \u0439 \u0437\u0430\u043f\u0430\u043c\u2019\u044f\u0442\u043e\u0432\u0443\u0454 \u0432\u0438\u0431\u0456\u0440.',
      'langs.card.uk': '\u041c\u043e\u0432\u0430 \u0456\u043d\u0442\u0435\u0440\u0444\u0435\u0439\u0441\u0443 \u0437\u0430 \u0437\u0430\u043c\u043e\u0432\u0447\u0443\u0432\u0430\u043d\u043d\u044f\u043c.',
      'langs.card.en': '\u0412\u0438\u043a\u043e\u0440\u0438\u0441\u0442\u043e\u0432\u0443\u0454\u0442\u044c\u0441\u044f, \u044f\u043a\u0449\u043e \u0441\u0438\u0441\u0442\u0435\u043c\u043d\u0430 \u043c\u043e\u0432\u0430 \u043f\u043e\u0437\u0430 \u0441\u043f\u0438\u0441\u043a\u043e\u043c.',
      'langs.card.de': '\u041d\u0456\u043c\u0435\u0446\u044c\u043a\u043e\u043c\u043e\u0432\u043d\u0430 \u0441\u0438\u0441\u0442\u0435\u043c\u0430 \u2014 \u043d\u0456\u043c\u0435\u0446\u044c\u043a\u0438\u0439 \u0456\u043d\u0442\u0435\u0440\u0444\u0435\u0439\u0441.',
      'langs.card.ru': '\u0414\u043b\u044f \u0440\u043e\u0441\u0456\u0439\u0441\u044c\u043a\u043e\u043c\u043e\u0432\u043d\u0438\u0445 \u0441\u0438\u0441\u0442\u0435\u043c.',
      'langs.note.system':
        '\u041f\u0440\u0438 \u043f\u0435\u0440\u0448\u043e\u043c\u0443 \u0437\u0430\u043f\u0443\u0441\u043a\u0443 \u043c\u043e\u0432\u0430 \u0431\u0435\u0440\u0435\u0442\u044c\u0441\u044f \u0456\u0437 \u0441\u0438\u0441\u0442\u0435\u043c\u043d\u043e\u0457: uk, en, de \u0430\u0431\u043e ru \u2014 \u0437\u0430 \u043f\u0440\u0435\u0444\u0456\u043a\u0441\u043e\u043c \u043a\u043e\u0434\u0443 \u043c\u043e\u0432\u0438 Windows.',
      'langs.note.fallback':
        '\u042f\u043a\u0449\u043e \u0441\u0438\u0441\u0442\u0435\u043c\u043d\u0430 \u043c\u043e\u0432\u0430 \u043f\u043e\u0437\u0430 \u0446\u0438\u043c \u0441\u043f\u0438\u0441\u043a\u043e\u043c, \u0456\u043d\u0442\u0435\u0440\u0444\u0435\u0439\u0441 \u0431\u0443\u0434\u0435 \u0430\u043d\u0433\u043b\u0456\u0439\u0441\u044c\u043a\u043e\u044e.',
      'langs.note.scope':
        '\u041f\u0435\u0440\u0435\u043a\u043b\u0430\u0434\u0435\u043d\u043e \u0456\u043d\u0442\u0435\u0440\u0444\u0435\u0439\u0441 \u0437\u0430\u0441\u0442\u043e\u0441\u0443\u043d\u043a\u0443; \u043e\u043f\u0438\u0441\u0438 \u043f\u0440\u043e\u0433\u0440\u0430\u043c \u0437\u0430\u043b\u0438\u0448\u0430\u044e\u0442\u044c\u0441\u044f \u0430\u043d\u0433\u043b\u0456\u0439\u0441\u044c\u043a\u0438\u043c\u0438 \u0437 \u043a\u0430\u0442\u0430\u043b\u043e\u0433\u0443.',
      'footer.tagline':
        '\u041f\u0440\u0430\u0446\u044e\u0454 \u043b\u043e\u043a\u0430\u043b\u044c\u043d\u043e \u2014 \u0431\u0435\u0437 \u043e\u0431\u043b\u0456\u043a\u043e\u0432\u0438\u0445 \u0437\u0430\u043f\u0438\u0441\u0456\u0432, \u0442\u0435\u043b\u0435\u043c\u0435\u0442\u0440\u0456\u0457 \u0442\u0430 \u0444\u043e\u043d\u043e\u0432\u0438\u0445 \u0441\u043b\u0443\u0436\u0431.',
      'footer.source': '\u0412\u0438\u0445\u0456\u0434\u043d\u0438\u0439 \u043a\u043e\u0434'
    },

    en: {
      'meta.title': 'ReadyWin \u2014 a clean Windows start',
      'meta.desc':
        'ReadyWin scans the system, shows what is already installed and queues the rest through a single UAC prompt.',
      'a11y.skip': 'Skip to content',
      'brand.sub': 'CLEAN START',
      'nav.features': 'Features',
      'nav.catalog': 'Catalog',
      'nav.how': 'How it works',
      'nav.langs': 'Languages',
      'theme.toggle': 'Switch theme',
      'lang.toggle': 'Switch language',
      'hero.eyebrow': 'CLEAN WINDOWS START',
      'hero.title': 'A new system \u2014 in one queue.',
      'hero.lead':
        'ReadyWin scans the computer, shows what is already installed and queues everything else \u2014 behind a single UAC prompt. No ad-driven picks, no random packages.',
      'hero.cta.download': 'Download',
      'hero.cta.primary': 'How it works',
      'hero.cta.secondary': 'Browse the catalog',
      'hero.metric.programs': 'PROGRAMS',
      'hero.metric.groups': 'GROUPS',
      'hero.metric.presets': 'PRESETS',
      'hero.metric.langs': 'LANGUAGES',
      'hero.shot.frame': 'OVERVIEW',
      'hero.shot.caption': 'The whole system on one screen: what is already in place, what is missing and what is worth adding.',
      'features.eyebrow': 'FEATURES',
      'features.title': 'What ReadyWin does',
      'features.lead':
        'Six things that make a clean Windows start genuinely quick: knowing the exact state of the system, skipping the hunt for installers, and not handing out UAC consent more often than needed.',
      'feat.scan.title': 'System scan',
      'feat.scan.text':
        'Reads the registry and Microsoft Store packages (MSIX) so it knows precisely what is already on the machine.',
      'feat.catalog.title': 'Catalog with search and filters',
      'feat.catalog.text':
        '201 items across 12 groups: filters by group and state, search by name, publisher or tag.',
      'feat.runtime.title': 'Runtime components',
      'feat.runtime.text':
        'DirectX, Visual C++, .NET Desktop, WebView2, Windows Terminal, PowerShell 7 and WSL \u2014 as one block.',
      'feat.queue.title': 'One queue, one UAC prompt',
      'feat.queue.text':
        'Every selected app installs back to back behind a single administrator prompt. The queue can be cancelled between items.',
      'feat.updates.title': 'Update tracking',
      'feat.updates.text':
        'Compares what is installed against what winget upgrade reports and shows where a newer version exists. The result is cached for 90 seconds.',
      'feat.lang.title': 'Four interface languages',
      'feat.lang.text':
        'Ukrainian, English, German and Russian. The language follows the system on first launch.',
      'catalog.eyebrow': 'CATALOG \u00b7 201 ITEMS \u00b7 12 GROUPS',
      'catalog.title': 'Everything essential.',
      'catalog.lead':
        'Selected apps, runtimes and utilities. Everything installs through winget \u2014 no ad-driven picks, no random packages.',
      'catalog.groups.label': 'GROUPS AND ITEM COUNTS',
      'catalog.examples.label': 'EXAMPLES FROM THE CATALOG',
      'catalog.examples.note':
        'App names and descriptions stay in English \u2014 that is how they come out of the catalog. The interface around them is translated.',
      'group.system': 'Components',
      'group.browsers': 'Browsers',
      'group.communication': 'Communication',
      'group.media': 'Media',
      'group.games': 'Games',
      'group.development': 'Development',
      'group.console': 'Console',
      'group.ai': 'AI',
      'group.office': 'Office',
      'group.utilities': 'Utilities',
      'group.creative': 'Creative',
      'group.security': 'Security',
      'how.eyebrow': 'HOW IT WORKS',
      'how.title': 'Four steps to a clean system',
      'how.lead':
        'From the first launch to a finished machine \u2014 without hunting for installers and without a separate UAC window per app.',
      'step.scan.title': 'Scan',
      'step.scan.text':
        'Reads the registry and MSIX packages, lists what is missing and how much disk space is free.',
      'step.pick.title': 'Pick from the catalog or a preset',
      'step.pick.text':
        'Individual items, one of five presets, or the recommendations the app assembles on its own.',
      'step.queue.title': 'One queue, one UAC prompt',
      'step.queue.text':
        'Packages install one after another; Windows asks for administrator rights exactly once.',
      'step.done.title': 'Done, with a before/after diff',
      'step.done.text':
        'At the end you can see how many catalog items were already in place and how many the queue added.',
      'how.notes.label': 'DETAILS WORTH KNOWING',
      'note.winget': 'Everything installs through winget \u2014 no bundled downloaders, no silent installers.',
      'note.logs': 'Install history is kept locally \u2014 logs are never sent anywhere.',
      'note.cancel': 'The queue can be cancelled between items; whatever is already installed stays put.',
      'note.diff': 'After the queue, the app shows which applications actually appeared on the system.',
      'shots.eyebrow': 'SCREENSHOTS',
      'shots.title': 'Three screens of the app',
      'shots.lead': 'Overview, catalog and queue \u2014 everything a clean Windows start needs.',
      'shot.catalog.cap': 'CATALOG \u00b7 SEARCH, GROUPS AND STATE FILTER',
      'shot.queue.cap': 'QUEUE \u00b7 PACKAGES, ESTIMATE, ONE UAC PROMPT',
      'shot.result.cap': 'RESULT \u00b7 NEW APPLICATIONS ON THE SYSTEM',
      'alt.overview':
        'ReadyWin overview panel: system state, runtime components and recommended apps.',
      'alt.catalog': 'ReadyWin catalog: groups, state filters and app cards.',
      'alt.queue': 'ReadyWin queue: packages, size estimate and a single UAC prompt.',
      'alt.result': 'Queue result: 3 of 3 installed and the list of new applications.',
      'langs.eyebrow': 'LANGUAGES',
      'langs.title': 'Four interface languages',
      'langs.lead':
        'Ukrainian, English, German and Russian. The switcher sits in the lower left corner of the app and remembers your choice.',
      'langs.card.uk': 'The default interface language.',
      'langs.card.en': 'Used when the system language is outside the list.',
      'langs.card.de': 'A German system gets the German interface.',
      'langs.card.ru': 'For Russian-language systems.',
      'langs.note.system':
        'On first launch the language comes from the system: uk, en, de or ru \u2014 matched by the Windows language code prefix.',
      'langs.note.fallback': 'If the system language is outside that list, the interface is English.',
      'langs.note.scope':
        'The application interface is translated; app descriptions stay in English from the catalog.',
      'footer.tagline': 'Runs locally \u2014 no accounts, no telemetry, no background services.',
      'footer.source': 'Source code'
    },

    de: {
      'meta.title': 'ReadyWin \u2014 ein sauberer Windows-Start',
      'meta.desc':
        'ReadyWin pr\u00fcft das System, zeigt, was bereits installiert ist, und installiert den Rest \u00fcber eine einzige UAC-Abfrage.',
      'a11y.skip': 'Zum Inhalt',
      'brand.sub': 'SAUBERER START',
      'nav.features': 'Funktionen',
      'nav.catalog': 'Katalog',
      'nav.how': 'Ablauf',
      'nav.langs': 'Sprachen',
      'theme.toggle': 'Design wechseln',
      'lang.toggle': 'Sprache wechseln',
      'hero.eyebrow': 'SAUBERER WINDOWS-START',
      'hero.title': 'Ein neues System \u2014 in einer Warteschlange.',
      'hero.lead':
        'ReadyWin pr\u00fcft den Rechner, zeigt, was bereits installiert ist, und installiert den Rest nacheinander \u2014 hinter einer einzigen UAC-Abfrage. Ohne Werbepakete, ohne Zufallsauswahl.',
      'hero.cta.download': 'Herunterladen',
      'hero.cta.primary': 'So funktioniert es',
      'hero.cta.secondary': 'Katalog ansehen',
      'hero.metric.programs': 'PROGRAMME',
      'hero.metric.groups': 'GRUPPEN',
      'hero.metric.presets': 'PRESETS',
      'hero.metric.langs': 'SPRACHEN',
      'hero.shot.frame': '\u00dcBERSICHT',
      'hero.shot.caption':
        'Das ganze System auf einem Bildschirm: was schon vorhanden ist, was fehlt und was sich lohnt.',
      'features.eyebrow': 'FUNKTIONEN',
      'features.title': 'Was ReadyWin kann',
      'features.lead':
        'Sechs Dinge, die einen sauberen Windows-Start wirklich schnell machen: den Zustand des Systems genau kennen, nicht nach Installern suchen m\u00fcssen und UAC nicht \u00f6fter best\u00e4tigen als n\u00f6tig.',
      'feat.scan.title': 'Systempr\u00fcfung',
      'feat.scan.text':
        'Liest Registry und Microsoft-Store-Pakete (MSIX) aus und wei\u00df daher genau, was schon auf dem Rechner ist.',
      'feat.catalog.title': 'Katalog mit Suche und Filtern',
      'feat.catalog.text':
        '201 Eintr\u00e4ge in 12 Gruppen: Filter nach Gruppe und Status, Suche nach Name, Herausgeber oder Tag.',
      'feat.runtime.title': 'Laufzeitkomponenten',
      'feat.runtime.text':
        'DirectX, Visual C++, .NET Desktop, WebView2, Windows Terminal, PowerShell 7 und WSL \u2014 als ein Block.',
      'feat.queue.title': 'Eine Warteschlange, eine UAC-Abfrage',
      'feat.queue.text':
        'Alle ausgew\u00e4hlten Programme laufen hintereinander unter einer einzigen Administratorabfrage. Zwischen zwei Eintr\u00e4gen l\u00e4sst sich die Warteschlange abbrechen.',
      'feat.updates.title': 'Update-\u00dcberblick',
      'feat.updates.text':
        'Vergleicht das Installierte mit dem, was winget upgrade meldet, und zeigt, wo eine neuere Version vorliegt. Das Ergebnis wird 90 Sekunden lang zwischengespeichert.',
      'feat.lang.title': 'Vier Oberfl\u00e4chensprachen',
      'feat.lang.text':
        'Ukrainisch, Englisch, Deutsch und Russisch. Beim ersten Start folgt die Sprache dem System.',
      'catalog.eyebrow': 'KATALOG \u00b7 201 EINTR\u00c4GE \u00b7 12 GRUPPEN',
      'catalog.title': 'Alles Wesentliche.',
      'catalog.lead':
        'Ausgew\u00e4hlte Programme, Laufzeiten und Werkzeuge. Installiert wird ausschliesslich \u00fcber winget \u2014 ohne Werbepakete und Zufallsauswahl.',
      'catalog.groups.label': 'GRUPPEN UND ANZAHL DER EINTR\u00c4GE',
      'catalog.examples.label': 'BEISPIELE AUS DEM KATALOG',
      'catalog.examples.note':
        'Namen und Beschreibungen der Programme bleiben englisch \u2014 so kommen sie aus dem Katalog. Die Oberfl\u00e4che darum herum ist \u00fcbersetzt.',
      'group.system': 'Komponenten',
      'group.browsers': 'Browser',
      'group.communication': 'Kommunikation',
      'group.media': 'Medien',
      'group.games': 'Spiele',
      'group.development': 'Entwicklung',
      'group.console': 'Konsole',
      'group.ai': 'KI',
      'group.office': 'Office',
      'group.utilities': 'Werkzeuge',
      'group.creative': 'Kreativ',
      'group.security': 'Sicherheit',
      'how.eyebrow': 'ABLAUF',
      'how.title': 'Vier Schritte zum sauberen System',
      'how.lead':
        'Vom ersten Start bis zum fertigen Rechner \u2014 ohne Suche nach Installern und ohne ein eigenes UAC-Fenster pro Programm.',
      'step.scan.title': 'System pr\u00fcfen',
      'step.scan.text':
        'Liest Registry und MSIX-Pakete, listet, was fehlt, und zeigt den freien Platz auf dem Datentr\u00e4ger.',
      'step.pick.title': 'Aus Katalog oder Preset ausw\u00e4hlen',
      'step.pick.text':
        'Einzelne Eintr\u00e4ge, eines von f\u00fcnf Presets oder die Empfehlungen, die die Anwendung selbst zusammenstellt.',
      'step.queue.title': 'Eine Warteschlange, eine UAC-Abfrage',
      'step.queue.text':
        'Die Pakete laufen der Reihe nach; Windows fragt genau einmal nach Administratorrechten.',
      'step.done.title': 'Fertig, mit Vorher/Nachher',
      'step.done.text':
        'Am Ende ist zu sehen, wie viele Katalogeintr\u00e4ge schon vorhanden waren und wie viele dazugekommen sind.',
      'how.notes.label': 'DETAILS, DIE WICHTIG SIND',
      'note.winget': 'Installiert wird ausschliesslich \u00fcber winget \u2014 keine eigenen Downloader, keine stillen Installer.',
      'note.logs': 'Der Installationsverlauf bleibt lokal \u2014 Protokolle werden nirgendwohin gesendet.',
      'note.cancel':
        'Die Warteschlange l\u00e4sst sich zwischen zwei Eintr\u00e4gen abbrechen; bereits Installiertes bleibt bestehen.',
      'note.diff': 'Nach der Warteschlange zeigt die Anwendung, welche Programme wirklich dazugekommen sind.',
      'shots.eyebrow': 'ANSICHTEN',
      'shots.title': 'Drei Bildschirme der Anwendung',
      'shots.lead': '\u00dcbersicht, Katalog und Warteschlange \u2014 alles, was ein sauberer Windows-Start braucht.',
      'shot.catalog.cap': 'KATALOG \u00b7 SUCHE, GRUPPEN UND STATUSFILTER',
      'shot.queue.cap': 'WARTESCHLANGE \u00b7 PAKETE, SCH\u00c4TZUNG, EINE UAC-ABFRAGE',
      'shot.result.cap': 'ERGEBNIS \u00b7 NEUE PROGRAMME IM SYSTEM',
      'alt.overview':
        'ReadyWin \u00dcbersicht: Systemzustand, Laufzeitkomponenten und empfohlene Programme.',
      'alt.catalog': 'ReadyWin Katalog: Gruppen, Statusfilter und Programm-Karten.',
      'alt.queue': 'ReadyWin Warteschlange: Pakete, Gr\u00f6\u00dfensch\u00e4tzung und eine UAC-Abfrage.',
      'alt.result': 'Ergebnis der Warteschlange: 3 von 3 installiert und die Liste der neuen Programme.',
      'langs.eyebrow': 'SPRACHEN',
      'langs.title': 'Vier Oberfl\u00e4chensprachen',
      'langs.lead':
        'Ukrainisch, Englisch, Deutsch und Russisch. Der Umschalter sitzt unten links in der Anwendung und merkt sich die Auswahl.',
      'langs.card.uk': 'Die Standardsprache der Oberfl\u00e4che.',
      'langs.card.en': 'Wird genutzt, wenn die Systemsprache nicht in der Liste steht.',
      'langs.card.de': 'Ein deutsches System bekommt die deutsche Oberfl\u00e4che.',
      'langs.card.ru': 'F\u00fcr russischsprachige Systeme.',
      'langs.note.system':
        'Beim ersten Start kommt die Sprache aus dem System: uk, en, de oder ru \u2014 erkannt am Pr\u00e4fix des Windows-Sprachcodes.',
      'langs.note.fallback': 'Steht die Systemsprache nicht in dieser Liste, ist die Oberfl\u00e4che englisch.',
      'langs.note.scope':
        '\u00dcbersetzt ist die Oberfl\u00e4che der Anwendung; Programmbeschreibungen bleiben englisch aus dem Katalog.',
      'footer.tagline':
        'L\u00e4uft lokal \u2014 ohne Konten, ohne Telemetrie, ohne Hintergrunddienste.',
      'footer.source': 'Quellcode'
    },

    ru: {
      'meta.title': 'ReadyWin \u2014 \u0447\u0438\u0441\u0442\u044b\u0439 \u0441\u0442\u0430\u0440\u0442 Windows',
      'meta.desc':
        'ReadyWin \u0441\u043a\u0430\u043d\u0438\u0440\u0443\u0435\u0442 \u0441\u0438\u0441\u0442\u0435\u043c\u0443, \u043f\u043e\u043a\u0430\u0437\u044b\u0432\u0430\u0435\u0442, \u0447\u0442\u043e \u0443\u0436\u0435 \u0443\u0441\u0442\u0430\u043d\u043e\u0432\u043b\u0435\u043d\u043e, \u0438 \u0441\u0442\u0430\u0432\u0438\u0442 \u043e\u0441\u0442\u0430\u043b\u044c\u043d\u043e\u0435 \u043e\u0434\u043d\u043e\u0439 \u043e\u0447\u0435\u0440\u0435\u0434\u044c\u044e \u0441 \u043e\u0434\u043d\u0438\u043c \u0437\u0430\u043f\u0440\u043e\u0441\u043e\u043c UAC.',
      'a11y.skip': '\u041a \u0441\u043e\u0434\u0435\u0440\u0436\u0438\u043c\u043e\u043c\u0443',
      'brand.sub': '\u0427\u0418\u0421\u0422\u042b\u0419 \u0421\u0422\u0410\u0420\u0422',
      'nav.features': '\u0412\u043e\u0437\u043c\u043e\u0436\u043d\u043e\u0441\u0442\u0438',
      'nav.catalog': '\u041a\u0430\u0442\u0430\u043b\u043e\u0433',
      'nav.how': '\u041a\u0430\u043a \u0440\u0430\u0431\u043e\u0442\u0430\u0435\u0442',
      'nav.langs': '\u042f\u0437\u044b\u043a\u0438',
      'theme.toggle': '\u0421\u043c\u0435\u043d\u0438\u0442\u044c \u0442\u0435\u043c\u0443',
      'lang.toggle': '\u0421\u043c\u0435\u043d\u0438\u0442\u044c \u044f\u0437\u044b\u043a',
      'hero.eyebrow': '\u0427\u0418\u0421\u0422\u042b\u0419 \u0421\u0422\u0410\u0420\u0422 WINDOWS',
      'hero.title': '\u041d\u043e\u0432\u0430\u044f \u0441\u0438\u0441\u0442\u0435\u043c\u0430 \u2014 \u0437\u0430 \u043e\u0434\u043d\u0443 \u043e\u0447\u0435\u0440\u0435\u0434\u044c.',
      'hero.lead':
        'ReadyWin \u0441\u043a\u0430\u043d\u0438\u0440\u0443\u0435\u0442 \u043a\u043e\u043c\u043f\u044c\u044e\u0442\u0435\u0440, \u043f\u043e\u043a\u0430\u0437\u044b\u0432\u0430\u0435\u0442, \u0447\u0442\u043e \u0443\u0436\u0435 \u0443\u0441\u0442\u0430\u043d\u043e\u0432\u043b\u0435\u043d\u043e, \u0438 \u0441\u0442\u0430\u0432\u0438\u0442 \u043e\u0441\u0442\u0430\u043b\u044c\u043d\u043e\u0435 \u043e\u0447\u0435\u0440\u0435\u0434\u044c\u044e \u2014 \u0441 \u043e\u0434\u043d\u0438\u043c \u0437\u0430\u043f\u0440\u043e\u0441\u043e\u043c UAC. \u0411\u0435\u0437 \u0440\u0435\u043a\u043b\u0430\u043c\u043d\u044b\u0445 \u043f\u043e\u0434\u0431\u043e\u0440\u043e\u043a \u0438 \u0441\u043b\u0443\u0447\u0430\u0439\u043d\u044b\u0445 \u043f\u0430\u043a\u0435\u0442\u043e\u0432.',
      'hero.cta.download': '\u0421\u043a\u0430\u0447\u0430\u0442\u044c',
      'hero.cta.primary': '\u041a\u0430\u043a \u044d\u0442\u043e \u0440\u0430\u0431\u043e\u0442\u0430\u0435\u0442',
      'hero.cta.secondary': '\u041f\u043e\u0441\u043c\u043e\u0442\u0440\u0435\u0442\u044c \u043a\u0430\u0442\u0430\u043b\u043e\u0433',
      'hero.metric.programs': '\u041f\u0420\u041e\u0413\u0420\u0410\u041c\u041c',
      'hero.metric.groups': '\u0413\u0420\u0423\u041f\u041f',
      'hero.metric.presets': '\u041f\u0420\u0415\u0421\u0415\u0422\u041e\u0412',
      'hero.metric.langs': '\u042f\u0417\u042b\u041a\u0410',
      'hero.shot.frame': '\u041e\u0411\u0417\u041e\u0420',
      'hero.shot.caption':
        '\u0412\u0441\u044f \u0441\u0438\u0441\u0442\u0435\u043c\u0430 \u043d\u0430 \u043e\u0434\u043d\u043e\u043c \u044d\u043a\u0440\u0430\u043d\u0435: \u0447\u0442\u043e \u0443\u0436\u0435 \u043d\u0430 \u043c\u0435\u0441\u0442\u0435, \u0447\u0435\u0433\u043e \u043d\u0435 \u0445\u0432\u0430\u0442\u0430\u0435\u0442 \u0438 \u0447\u0442\u043e \u0441\u0442\u043e\u0438\u0442 \u0434\u043e\u0431\u0430\u0432\u0438\u0442\u044c.',
      'features.eyebrow': '\u0412\u041e\u0417\u041c\u041e\u0416\u041d\u041e\u0421\u0422\u0418',
      'features.title': '\u0427\u0442\u043e \u0443\u043c\u0435\u0435\u0442 ReadyWin',
      'features.lead':
        '\u0428\u0435\u0441\u0442\u044c \u0432\u0435\u0449\u0435\u0439, \u043a\u043e\u0442\u043e\u0440\u044b\u0435 \u0434\u0435\u043b\u0430\u044e\u0442 \u0447\u0438\u0441\u0442\u044b\u0439 \u0441\u0442\u0430\u0440\u0442 Windows \u043f\u043e-\u043d\u0430\u0441\u0442\u043e\u044f\u0449\u0435\u043c\u0443 \u0431\u044b\u0441\u0442\u0440\u044b\u043c: \u0442\u043e\u0447\u043d\u043e \u0437\u043d\u0430\u0442\u044c \u0441\u043e\u0441\u0442\u043e\u044f\u043d\u0438\u0435 \u0441\u0438\u0441\u0442\u0435\u043c\u044b, \u043d\u0435 \u0442\u0440\u0430\u0442\u0438\u0442\u044c \u0432\u0440\u0435\u043c\u044f \u043d\u0430 \u043f\u043e\u0438\u0441\u043a \u0443\u0441\u0442\u0430\u043d\u043e\u0432\u0449\u0438\u043a\u043e\u0432 \u0438 \u043d\u0435 \u0434\u0430\u0432\u0430\u0442\u044c \u0441\u043e\u0433\u043b\u0430\u0441\u0438\u0435 \u043d\u0430 UAC \u0447\u0430\u0449\u0435, \u0447\u0435\u043c \u043d\u0443\u0436\u043d\u043e.',
      'feat.scan.title': '\u0421\u043a\u0430\u043d\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u0435 \u0441\u0438\u0441\u0442\u0435\u043c\u044b',
      'feat.scan.text':
        '\u0427\u0438\u0442\u0430\u0435\u0442 \u0440\u0435\u0435\u0441\u0442\u0440 \u0438 \u043f\u0430\u043a\u0435\u0442\u044b Microsoft Store (MSIX), \u0447\u0442\u043e\u0431\u044b \u0442\u043e\u0447\u043d\u043e \u0437\u043d\u0430\u0442\u044c, \u0447\u0442\u043e \u0443\u0436\u0435 \u0441\u0442\u043e\u0438\u0442 \u043d\u0430 \u043a\u043e\u043c\u043f\u044c\u044e\u0442\u0435\u0440\u0435.',
      'feat.catalog.title': '\u041a\u0430\u0442\u0430\u043b\u043e\u0433 \u0441 \u043f\u043e\u0438\u0441\u043a\u043e\u043c \u0438 \u0444\u0438\u043b\u044c\u0442\u0440\u0430\u043c\u0438',
      'feat.catalog.text':
        '201 \u043f\u043e\u0437\u0438\u0446\u0438\u044f \u0432 12 \u0433\u0440\u0443\u043f\u043f\u0430\u0445: \u0444\u0438\u043b\u044c\u0442\u0440\u044b \u043f\u043e \u0433\u0440\u0443\u043f\u043f\u0435 \u0438 \u0441\u043e\u0441\u0442\u043e\u044f\u043d\u0438\u044e, \u043f\u043e\u0438\u0441\u043a \u043f\u043e \u043d\u0430\u0437\u0432\u0430\u043d\u0438\u044e, \u0438\u0437\u0434\u0430\u0442\u0435\u043b\u044e \u0438\u043b\u0438 \u0442\u0435\u0433\u0443.',
      'feat.runtime.title': '\u041a\u043e\u043c\u043f\u043e\u043d\u0435\u043d\u0442\u044b \u0441\u0440\u0435\u0434\u044b',
      'feat.runtime.text':
        'DirectX, Visual C++, .NET Desktop, WebView2, Windows Terminal, PowerShell 7 \u0438 WSL \u2014 \u043e\u0434\u043d\u0438\u043c \u0431\u043b\u043e\u043a\u043e\u043c.',
      'feat.queue.title': '\u041e\u0434\u043d\u0430 \u043e\u0447\u0435\u0440\u0435\u0434\u044c, \u043e\u0434\u0438\u043d UAC',
      'feat.queue.text':
        '\u0412\u0441\u0435 \u0432\u044b\u0431\u0440\u0430\u043d\u043d\u044b\u0435 \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u044b \u0441\u0442\u0430\u0432\u044f\u0442\u0441\u044f \u043f\u043e\u0441\u043b\u0435\u0434\u043e\u0432\u0430\u0442\u0435\u043b\u044c\u043d\u043e \u0437\u0430 \u043e\u0434\u043d\u0438\u043c \u0437\u0430\u043f\u0440\u043e\u0441\u043e\u043c \u043f\u0440\u0430\u0432 \u0430\u0434\u043c\u0438\u043d\u0438\u0441\u0442\u0440\u0430\u0442\u043e\u0440\u0430. \u041c\u0435\u0436\u0434\u0443 \u043f\u0443\u043d\u043a\u0442\u0430\u043c\u0438 \u043e\u0447\u0435\u0440\u0435\u0434\u044c \u043c\u043e\u0436\u043d\u043e \u043e\u0442\u043c\u0435\u043d\u0438\u0442\u044c.',
      'feat.updates.title': '\u041e\u0442\u0441\u043b\u0435\u0436\u0438\u0432\u0430\u043d\u0438\u0435 \u043e\u0431\u043d\u043e\u0432\u043b\u0435\u043d\u0438\u0439',
      'feat.updates.text':
        '\u0421\u0440\u0430\u0432\u043d\u0438\u0432\u0430\u0435\u0442 \u0443\u0441\u0442\u0430\u043d\u043e\u0432\u043b\u0435\u043d\u043d\u043e\u0435 \u0441 \u0442\u0435\u043c, \u0447\u0442\u043e \u043f\u0440\u0435\u0434\u043b\u0430\u0433\u0430\u0435\u0442 winget upgrade, \u0438 \u043f\u043e\u043a\u0430\u0437\u044b\u0432\u0430\u0435\u0442, \u0433\u0434\u0435 \u0435\u0441\u0442\u044c \u043d\u043e\u0432\u0430\u044f \u0432\u0435\u0440\u0441\u0438\u044f. \u0420\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442 \u043a\u0435\u0448\u0438\u0440\u0443\u0435\u0442\u0441\u044f \u043d\u0430 90 \u0441\u0435\u043a\u0443\u043d\u0434.',
      'feat.lang.title': '\u0427\u0435\u0442\u044b\u0440\u0435 \u044f\u0437\u044b\u043a\u0430 \u0438\u043d\u0442\u0435\u0440\u0444\u0435\u0439\u0441\u0430',
      'feat.lang.text':
        '\u0423\u043a\u0440\u0430\u0438\u043d\u0441\u043a\u0438\u0439, \u0430\u043d\u0433\u043b\u0438\u0439\u0441\u043a\u0438\u0439, \u043d\u0435\u043c\u0435\u0446\u043a\u0438\u0439 \u0438 \u0440\u0443\u0441\u0441\u043a\u0438\u0439. \u042f\u0437\u044b\u043a \u043f\u043e\u0434\u0445\u0432\u0430\u0442\u044b\u0432\u0430\u0435\u0442\u0441\u044f \u0438\u0437 \u0441\u0438\u0441\u0442\u0435\u043c\u044b \u043f\u0440\u0438 \u043f\u0435\u0440\u0432\u043e\u043c \u0437\u0430\u043f\u0443\u0441\u043a\u0435.',
      'catalog.eyebrow': '\u041a\u0410\u0422\u0410\u041b\u041e\u0413 \u00b7 201 \u041f\u041e\u0417\u0418\u0426\u0418\u042f \u00b7 12 \u0413\u0420\u0423\u041f\u041f',
      'catalog.title': '\u0412\u0441\u0451 \u043d\u0435\u043e\u0431\u0445\u043e\u0434\u0438\u043c\u043e\u0435.',
      'catalog.lead':
        '\u041e\u0442\u043e\u0431\u0440\u0430\u043d\u043d\u044b\u0435 \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u044b, \u0441\u0440\u0435\u0434\u044b \u0438 \u0443\u0442\u0438\u043b\u0438\u0442\u044b. \u0412\u0441\u0451 \u0441\u0442\u0430\u0432\u0438\u0442\u0441\u044f \u0447\u0435\u0440\u0435\u0437 winget \u2014 \u0431\u0435\u0437 \u0440\u0435\u043a\u043b\u0430\u043c\u043d\u044b\u0445 \u043f\u043e\u0434\u0431\u043e\u0440\u043e\u043a \u0438 \u0441\u043b\u0443\u0447\u0430\u0439\u043d\u044b\u0445 \u043f\u0430\u043a\u0435\u0442\u043e\u0432.',
      'catalog.groups.label': '\u0413\u0420\u0423\u041f\u041f\u042b \u0418 \u041a\u041e\u041b\u0418\u0427\u0415\u0421\u0422\u0412\u041e \u041f\u041e\u0417\u0418\u0426\u0418\u0419',
      'catalog.examples.label': '\u041f\u0420\u0418\u041c\u0415\u0420\u042b \u0418\u0417 \u041a\u0410\u0422\u0410\u041b\u041e\u0413\u0410',
      'catalog.examples.note':
        '\u041d\u0430\u0437\u0432\u0430\u043d\u0438\u044f \u0438 \u043e\u043f\u0438\u0441\u0430\u043d\u0438\u044f \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c \u0432 \u043f\u0440\u0438\u043b\u043e\u0436\u0435\u043d\u0438\u0438 \u0430\u043d\u0433\u043b\u0438\u0439\u0441\u043a\u0438\u0435 \u2014 \u0442\u0430\u043a\u0438\u043c\u0438 \u043e\u043d\u0438 \u043f\u0440\u0438\u0445\u043e\u0434\u044f\u0442 \u0438\u0437 \u043a\u0430\u0442\u0430\u043b\u043e\u0433\u0430. \u0418\u043d\u0442\u0435\u0440\u0444\u0435\u0439\u0441 \u0432\u043e\u043a\u0440\u0443\u0433 \u043d\u0438\u0445 \u043f\u0435\u0440\u0435\u0432\u0435\u0434\u0451\u043d.',
      'group.system': '\u041a\u043e\u043c\u043f\u043e\u043d\u0435\u043d\u0442\u044b',
      'group.browsers': '\u0411\u0440\u0430\u0443\u0437\u0435\u0440\u044b',
      'group.communication': '\u041a\u043e\u043c\u043c\u0443\u043d\u0438\u043a\u0430\u0446\u0438\u0438',
      'group.media': '\u041c\u0435\u0434\u0438\u0430',
      'group.games': '\u0418\u0433\u0440\u044b',
      'group.development': '\u0420\u0430\u0437\u0440\u0430\u0431\u043e\u0442\u043a\u0430',
      'group.console': '\u041a\u043e\u043d\u0441\u043e\u043b\u044c',
      'group.ai': '\u0418\u0418',
      'group.office': '\u041e\u0444\u0438\u0441',
      'group.utilities': '\u0423\u0442\u0438\u043b\u0438\u0442\u044b',
      'group.creative': '\u0422\u0432\u043e\u0440\u0447\u0435\u0441\u0442\u0432\u043e',
      'group.security': '\u0411\u0435\u0437\u043e\u043f\u0430\u0441\u043d\u043e\u0441\u0442\u044c',
      'how.eyebrow': '\u041a\u0410\u041a \u0420\u0410\u0411\u041e\u0422\u0410\u0415\u0422',
      'how.title': '\u0427\u0435\u0442\u044b\u0440\u0435 \u0448\u0430\u0433\u0430 \u043a \u0447\u0438\u0441\u0442\u043e\u0439 \u0441\u0438\u0441\u0442\u0435\u043c\u0435',
      'how.lead':
        '\u041e\u0442 \u043f\u0435\u0440\u0432\u043e\u0433\u043e \u0437\u0430\u043f\u0443\u0441\u043a\u0430 \u0434\u043e \u0433\u043e\u0442\u043e\u0432\u043e\u0439 \u0441\u0438\u0441\u0442\u0435\u043c\u044b \u2014 \u0431\u0435\u0437 \u0440\u0443\u0447\u043d\u043e\u0433\u043e \u043f\u043e\u0438\u0441\u043a\u0430 \u0443\u0441\u0442\u0430\u043d\u043e\u0432\u0449\u0438\u043a\u043e\u0432 \u0438 \u0431\u0435\u0437 \u043e\u0442\u0434\u0435\u043b\u044c\u043d\u043e\u0433\u043e \u043e\u043a\u043d\u0430 UAC \u043d\u0430 \u043a\u0430\u0436\u0434\u0443\u044e \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u0443.',
      'step.scan.title': '\u0421\u043a\u0430\u043d\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u0435',
      'step.scan.text':
        '\u0427\u0438\u0442\u0430\u0435\u0442 \u0440\u0435\u0435\u0441\u0442\u0440 \u0438 MSIX-\u043f\u0430\u043a\u0435\u0442\u044b, \u043f\u043e\u043a\u0430\u0437\u044b\u0432\u0430\u0435\u0442, \u0447\u0435\u0433\u043e \u043d\u0435 \u0445\u0432\u0430\u0442\u0430\u0435\u0442, \u0438 \u0441\u043a\u043e\u043b\u044c\u043a\u043e \u043c\u0435\u0441\u0442\u0430 \u0441\u0432\u043e\u0431\u043e\u0434\u043d\u043e \u043d\u0430 \u0434\u0438\u0441\u043a\u0435.',
      'step.pick.title': '\u0412\u044b\u0431\u043e\u0440 \u0438\u0437 \u043a\u0430\u0442\u0430\u043b\u043e\u0433\u0430 \u0438\u043b\u0438 \u043f\u0440\u0435\u0441\u0435\u0442\u043e\u0432',
      'step.pick.text':
        '\u041e\u0442\u0434\u0435\u043b\u044c\u043d\u044b\u0435 \u043f\u043e\u0437\u0438\u0446\u0438\u0438, \u043e\u0434\u0438\u043d \u0438\u0437 \u043f\u044f\u0442\u0438 \u043f\u0440\u0435\u0441\u0435\u0442\u043e\u0432 \u0438\u043b\u0438 \u0440\u0435\u043a\u043e\u043c\u0435\u043d\u0434\u0430\u0446\u0438\u0438, \u043a\u043e\u0442\u043e\u0440\u044b\u0435 \u043f\u0440\u0438\u043b\u043e\u0436\u0435\u043d\u0438\u0435 \u0441\u043e\u0431\u0438\u0440\u0430\u0435\u0442 \u0441\u0430\u043c\u043e.',
      'step.queue.title': '\u041e\u0434\u043d\u0430 \u043e\u0447\u0435\u0440\u0435\u0434\u044c, \u043e\u0434\u0438\u043d UAC',
      'step.queue.text':
        '\u041f\u0430\u043a\u0435\u0442\u044b \u0441\u0442\u0430\u0432\u044f\u0442\u0441\u044f \u043f\u043e\u0441\u043b\u0435\u0434\u043e\u0432\u0430\u0442\u0435\u043b\u044c\u043d\u043e; Windows \u0441\u043f\u0440\u0430\u0448\u0438\u0432\u0430\u0435\u0442 \u043f\u0440\u0430\u0432\u0430 \u0430\u0434\u043c\u0438\u043d\u0438\u0441\u0442\u0440\u0430\u0442\u043e\u0440\u0430 \u0440\u043e\u0432\u043d\u043e \u043e\u0434\u0438\u043d \u0440\u0430\u0437.',
      'step.done.title': '\u0413\u043e\u0442\u043e\u0432\u043e \u0438 \u0434\u0438\u0444\u0444 \u00ab\u0434\u043e/\u043f\u043e\u0441\u043b\u0435\u00bb',
      'step.done.text':
        '\u0412 \u043a\u043e\u043d\u0446\u0435 \u0432\u0438\u0434\u043d\u043e, \u0441\u043a\u043e\u043b\u044c\u043a\u043e \u043f\u043e\u0437\u0438\u0446\u0438\u0439 \u043a\u0430\u0442\u0430\u043b\u043e\u0433\u0430 \u0431\u044b\u043b\u043e \u043d\u0430 \u043c\u0435\u0441\u0442\u0435 \u0440\u0430\u043d\u044c\u0448\u0435 \u0438 \u0441\u043a\u043e\u043b\u044c\u043a\u043e \u0434\u043e\u0431\u0430\u0432\u0438\u043b\u043e\u0441\u044c \u043f\u043e\u0441\u043b\u0435 \u043e\u0447\u0435\u0440\u0435\u0434\u0438.',
      'how.notes.label': '\u041c\u0415\u041b\u041e\u0427\u0418, \u041a\u041e\u0422\u041e\u0420\u042b\u0415 \u0412\u0410\u0416\u041d\u041e \u0417\u041d\u0410\u0422\u042c',
      'note.winget':
        '\u0423\u0441\u0442\u0430\u043d\u043e\u0432\u043a\u0430 \u0438\u0434\u0451\u0442 \u0442\u043e\u043b\u044c\u043a\u043e \u0447\u0435\u0440\u0435\u0437 winget \u2014 \u0431\u0435\u0437 \u0441\u043e\u0431\u0441\u0442\u0432\u0435\u043d\u043d\u044b\u0445 \u0437\u0430\u0433\u0440\u0443\u0437\u0447\u0438\u043a\u043e\u0432 \u0438 \u00ab\u0442\u0438\u0445\u0438\u0445\u00bb \u0443\u0441\u0442\u0430\u043d\u043e\u0432\u0449\u0438\u043a\u043e\u0432.',
      'note.logs': '\u0418\u0441\u0442\u043e\u0440\u0438\u044f \u0443\u0441\u0442\u0430\u043d\u043e\u0432\u043e\u043a \u0445\u0440\u0430\u043d\u0438\u0442\u0441\u044f \u043b\u043e\u043a\u0430\u043b\u044c\u043d\u043e \u2014 \u0436\u0443\u0440\u043d\u0430\u043b\u044b \u043d\u0438\u043a\u0443\u0434\u0430 \u043d\u0435 \u043e\u0442\u043f\u0440\u0430\u0432\u043b\u044f\u044e\u0442\u0441\u044f.',
      'note.cancel':
        '\u041e\u0447\u0435\u0440\u0435\u0434\u044c \u043c\u043e\u0436\u043d\u043e \u043e\u0442\u043c\u0435\u043d\u0438\u0442\u044c \u043c\u0435\u0436\u0434\u0443 \u043f\u0443\u043d\u043a\u0442\u0430\u043c\u0438; \u0443\u0436\u0435 \u0443\u0441\u0442\u0430\u043d\u043e\u0432\u043b\u0435\u043d\u043d\u043e\u0435 \u043e\u0441\u0442\u0430\u0451\u0442\u0441\u044f \u043d\u0430 \u043c\u0435\u0441\u0442\u0435.',
      'note.diff':
        '\u041f\u043e\u0441\u043b\u0435 \u043e\u0447\u0435\u0440\u0435\u0434\u0438 \u0432\u0438\u0434\u043d\u043e, \u043a\u0430\u043a\u0438\u0435 \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u044b \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0442\u0435\u043b\u044c\u043d\u043e \u043f\u043e\u044f\u0432\u0438\u043b\u0438\u0441\u044c \u0432 \u0441\u0438\u0441\u0442\u0435\u043c\u0435.',
      'shots.eyebrow': '\u0421\u041a\u0420\u0418\u041d\u0428\u041e\u0422\u042b',
      'shots.title': '\u0422\u0440\u0438 \u044d\u043a\u0440\u0430\u043d\u0430 \u043f\u0440\u0438\u043b\u043e\u0436\u0435\u043d\u0438\u044f',
      'shots.lead':
        '\u041e\u0431\u0437\u043e\u0440, \u043a\u0430\u0442\u0430\u043b\u043e\u0433 \u0438 \u043e\u0447\u0435\u0440\u0435\u0434\u044c \u2014 \u0432\u0441\u0451, \u0447\u0442\u043e \u043d\u0443\u0436\u043d\u043e \u0434\u043b\u044f \u0447\u0438\u0441\u0442\u043e\u0433\u043e \u0441\u0442\u0430\u0440\u0442\u0430 Windows.',
      'shot.catalog.cap': '\u041a\u0410\u0422\u0410\u041b\u041e\u0413 \u00b7 \u041f\u041e\u0418\u0421\u041a, \u0413\u0420\u0423\u041f\u041f\u042b \u0418 \u0424\u0418\u041b\u042c\u0422\u0420 \u0421\u041e\u0421\u0422\u041e\u042f\u041d\u0418\u042f',
      'shot.queue.cap': '\u041e\u0427\u0415\u0420\u0415\u0414\u042c \u00b7 \u041f\u0410\u041a\u0415\u0422\u042b, \u041e\u0426\u0415\u041d\u041a\u0410, \u041e\u0414\u0418\u041d UAC',
      'shot.result.cap': '\u0420\u0415\u0417\u0423\u041b\u042c\u0422\u0410\u0422 \u00b7 \u041d\u041e\u0412\u042b\u0415 \u041f\u0420\u041e\u0413\u0420\u0410\u041c\u041c\u042b \u0412 \u0421\u0418\u0421\u0422\u0415\u041c\u0415',
      'alt.overview':
        '\u041f\u0430\u043d\u0435\u043b\u044c \u043e\u0431\u0437\u043e\u0440\u0430 ReadyWin: \u0441\u043e\u0441\u0442\u043e\u044f\u043d\u0438\u0435 \u0441\u0438\u0441\u0442\u0435\u043c\u044b, \u043a\u043e\u043c\u043f\u043e\u043d\u0435\u043d\u0442\u044b \u0441\u0440\u0435\u0434\u044b \u0438 \u0440\u0435\u043a\u043e\u043c\u0435\u043d\u0434\u0443\u0435\u043c\u044b\u0435 \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u044b.',
      'alt.catalog':
        '\u041a\u0430\u0442\u0430\u043b\u043e\u0433 ReadyWin: \u0433\u0440\u0443\u043f\u043f\u044b, \u0444\u0438\u043b\u044c\u0442\u0440\u044b \u0441\u043e\u0441\u0442\u043e\u044f\u043d\u0438\u044f \u0438 \u043a\u0430\u0440\u0442\u043e\u0447\u043a\u0438 \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c.',
      'alt.queue':
        '\u041e\u0447\u0435\u0440\u0435\u0434\u044c ReadyWin: \u043f\u0430\u043a\u0435\u0442\u044b, \u043e\u0446\u0435\u043d\u043a\u0430 \u0440\u0430\u0437\u043c\u0435\u0440\u0430 \u0438 \u043e\u0434\u0438\u043d \u0437\u0430\u043f\u0440\u043e\u0441 UAC.',
      'alt.result':
        '\u0420\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442 \u043e\u0447\u0435\u0440\u0435\u0434\u0438: \u0443\u0441\u0442\u0430\u043d\u043e\u0432\u043b\u0435\u043d\u043e 3 \u0438\u0437 3 \u0438 \u0441\u043f\u0438\u0441\u043e\u043a \u043d\u043e\u0432\u044b\u0445 \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c.',
      'langs.eyebrow': '\u042f\u0417\u042b\u041a\u0418',
      'langs.title': '\u0427\u0435\u0442\u044b\u0440\u0435 \u044f\u0437\u044b\u043a\u0430 \u0438\u043d\u0442\u0435\u0440\u0444\u0435\u0439\u0441\u0430',
      'langs.lead':
        '\u0423\u043a\u0440\u0430\u0438\u043d\u0441\u043a\u0438\u0439, \u0430\u043d\u0433\u043b\u0438\u0439\u0441\u043a\u0438\u0439, \u043d\u0435\u043c\u0435\u0446\u043a\u0438\u0439 \u0438 \u0440\u0443\u0441\u0441\u043a\u0438\u0439. \u041f\u0435\u0440\u0435\u043a\u043b\u044e\u0447\u0430\u0442\u0435\u043b\u044c \u0436\u0438\u0432\u0451\u0442 \u0432 \u043b\u0435\u0432\u043e\u043c \u043d\u0438\u0436\u043d\u0435\u043c \u0443\u0433\u043b\u0443 \u043f\u0440\u0438\u043b\u043e\u0436\u0435\u043d\u0438\u044f \u0438 \u0437\u0430\u043f\u043e\u043c\u0438\u043d\u0430\u0435\u0442 \u0432\u044b\u0431\u043e\u0440.',
      'langs.card.uk': '\u042f\u0437\u044b\u043a \u0438\u043d\u0442\u0435\u0440\u0444\u0435\u0439\u0441\u0430 \u043f\u043e \u0443\u043c\u043e\u043b\u0447\u0430\u043d\u0438\u044e.',
      'langs.card.en': '\u0418\u0441\u043f\u043e\u043b\u044c\u0437\u0443\u0435\u0442\u0441\u044f, \u0435\u0441\u043b\u0438 \u0441\u0438\u0441\u0442\u0435\u043c\u043d\u044b\u0439 \u044f\u0437\u044b\u043a \u0432\u043d\u0435 \u0441\u043f\u0438\u0441\u043a\u0430.',
      'langs.card.de': '\u041d\u0435\u043c\u0435\u0446\u043a\u043e\u044f\u0437\u044b\u0447\u043d\u0430\u044f \u0441\u0438\u0441\u0442\u0435\u043c\u0430 \u2014 \u043d\u0435\u043c\u0435\u0446\u043a\u0438\u0439 \u0438\u043d\u0442\u0435\u0440\u0444\u0435\u0439\u0441.',
      'langs.card.ru': '\u0414\u043b\u044f \u0440\u0443\u0441\u0441\u043a\u043e\u044f\u0437\u044b\u0447\u043d\u044b\u0445 \u0441\u0438\u0441\u0442\u0435\u043c.',
      'langs.note.system':
        '\u041f\u0440\u0438 \u043f\u0435\u0440\u0432\u043e\u043c \u0437\u0430\u043f\u0443\u0441\u043a\u0435 \u044f\u0437\u044b\u043a \u0431\u0435\u0440\u0451\u0442\u0441\u044f \u0438\u0437 \u0441\u0438\u0441\u0442\u0435\u043c\u043d\u043e\u0433\u043e: uk, en, de \u0438\u043b\u0438 ru \u2014 \u043f\u043e \u043f\u0440\u0435\u0444\u0438\u043a\u0441\u0443 \u043a\u043e\u0434\u0430 \u044f\u0437\u044b\u043a\u0430 Windows.',
      'langs.note.fallback':
        '\u0415\u0441\u043b\u0438 \u0441\u0438\u0441\u0442\u0435\u043c\u043d\u044b\u0439 \u044f\u0437\u044b\u043a \u0432\u043d\u0435 \u044d\u0442\u043e\u0433\u043e \u0441\u043f\u0438\u0441\u043a\u0430, \u0438\u043d\u0442\u0435\u0440\u0444\u0435\u0439\u0441 \u0431\u0443\u0434\u0435\u0442 \u0430\u043d\u0433\u043b\u0438\u0439\u0441\u043a\u0438\u043c.',
      'langs.note.scope':
        '\u041f\u0435\u0440\u0435\u0432\u0435\u0434\u0451\u043d \u0438\u043d\u0442\u0435\u0440\u0444\u0435\u0439\u0441 \u043f\u0440\u0438\u043b\u043e\u0436\u0435\u043d\u0438\u044f; \u043e\u043f\u0438\u0441\u0430\u043d\u0438\u044f \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c \u043e\u0441\u0442\u0430\u044e\u0442\u0441\u044f \u0430\u043d\u0433\u043b\u0438\u0439\u0441\u043a\u0438\u043c\u0438 \u0438\u0437 \u043a\u0430\u0442\u0430\u043b\u043e\u0433\u0430.',
      'footer.tagline':
        '\u0420\u0430\u0431\u043e\u0442\u0430\u0435\u0442 \u043b\u043e\u043a\u0430\u043b\u044c\u043d\u043e \u2014 \u0431\u0435\u0437 \u0443\u0447\u0451\u0442\u043d\u044b\u0445 \u0437\u0430\u043f\u0438\u0441\u0435\u0439, \u0442\u0435\u043b\u0435\u043c\u0435\u0442\u0440\u0438\u0438 \u0438 \u0444\u043e\u043d\u043e\u0432\u044b\u0445 \u0441\u043b\u0443\u0436\u0431.',
      'footer.source': '\u0418\u0441\u0445\u043e\u0434\u043d\u044b\u0439 \u043a\u043e\u0434'
    }
  };

  /* ---------- language resolution (same rules as the desktop app) ---------- */

  function systemLang() {
    var candidates = (navigator.languages || []).concat([navigator.language]);
    for (var i = 0; i < candidates.length; i++) {
      var code = String(candidates[i] || '').toLowerCase();
      if (code.indexOf('uk') === 0) return 'uk';
      if (code.indexOf('de') === 0) return 'de';
      if (code.indexOf('ru') === 0) return 'ru';
      if (code.indexOf('en') === 0) return 'en';
    }
    // System language outside the four supported ones.
    return 'en';
  }

  /* The ?lang= parameter wins over everything else when present. */
  function paramLang() {
    var query = window.location.search;
    if (!query || query.charAt(0) !== '?') return null;
    var pairs = query.slice(1).split('&');
    for (var i = 0; i < pairs.length; i++) {
      var parts = pairs[i].split('=');
      if (!parts[0]) continue;
      var name = '';
      var value = '';
      try {
        name = decodeURIComponent(parts[0]).trim().toLowerCase();
        value = decodeURIComponent((parts[1] || '').replace(/\+/g, ' ')).trim().toLowerCase();
      } catch (err) {
        continue; /* malformed escape sequence — ignore this pair */
      }
      if (name === 'lang' && CODES[value]) return value;
    }
    return null;
  }

  function readSavedLang() {
    try {
      var saved = localStorage.getItem(LANG_KEY);
      if (!saved) saved = localStorage.getItem(LEGACY_LANG_KEY);
      if (saved && CODES[saved]) return saved;
    } catch (err) {
      /* storage blocked (private mode, file://, ...) */
    }
    return null;
  }

  function initialLang() {
    return paramLang() || readSavedLang() || systemLang();
  }

  function persistLang(lang) {
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch (err) {
      /* ignore */
    }
  }

  /* ---------- shareable ?lang= link + self-referencing SEO links ---------- */

  /* Reflect the chosen language in the address bar without adding a history
     entry, keeping every other parameter untouched. */
  function updateUrlLang(lang) {
    try {
      var url = new URL(window.location.href);
      url.searchParams.set('lang', lang);
      window.history.replaceState(null, '', url.toString());
    } catch (err) {
      /* history API unavailable (some file:// contexts) — the page still works */
    }
  }

  /* The canonical link and og:url point at the shareable variant when the
     address carries ?lang=, and at the bare site URL otherwise. */
  function syncSeo(lang) {
    var hasParam = !!paramLang();
    var href = hasParam ? SITE_URL + '/?lang=' + encodeURIComponent(lang) : SITE_URL + '/';
    var canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.setAttribute('href', href);
    var ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) ogUrl.setAttribute('content', href);
    var ogLocale = document.querySelector('meta[property="og:locale"]');
    if (ogLocale && LOCALES[lang]) ogLocale.setAttribute('content', LOCALES[lang]);
  }

  /* ---------- applying a language ---------- */

  var currentLang = null;

  function dictFor(lang) {
    return I18N[lang] || I18N.en;
  }

  function applyLanguage(lang) {
    if (!CODES[lang]) lang = 'en';
    var dict = dictFor(lang);
    var fallback = I18N.en;

    var nodes = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < nodes.length; i++) {
      var key = nodes[i].getAttribute('data-i18n');
      var value = dict[key];
      if (value === undefined) value = fallback[key];
      if (value !== undefined) nodes[i].textContent = value;
    }

    var attrNodes = document.querySelectorAll('[data-i18n-attr]');
    for (var j = 0; j < attrNodes.length; j++) {
      var pairs = attrNodes[j].getAttribute('data-i18n-attr').split(',');
      for (var k = 0; k < pairs.length; k++) {
        var parts = pairs[k].split(':');
        var attr = parts[0] && parts[0].trim();
        var attrKey = parts[1] && parts[1].trim();
        if (!attr || !attrKey) continue;
        var text = dict[attrKey];
        if (text === undefined) text = fallback[attrKey];
        if (text !== undefined) attrNodes[j].setAttribute(attr, text);
      }
    }

    document.documentElement.lang = lang;
    currentLang = lang;

    var langCode = document.getElementById('langCode');
    if (langCode) langCode.textContent = shortFor(lang);

    var items = document.querySelectorAll('.lang__item');
    for (var m = 0; m < items.length; m++) {
      items[m].setAttribute('aria-selected', items[m].getAttribute('data-code') === lang ? 'true' : 'false');
    }
  }

  function shortFor(lang) {
    for (var i = 0; i < LANGS.length; i++) {
      if (LANGS[i].code === lang) return LANGS[i].short;
    }
    return 'ENG';
  }

  function setLang(lang) {
    applyLanguage(lang);
    persistLang(currentLang);
    /* Keep the address bar and the canonical/og:url links in step with the
       language the visitor just picked, so the page is shareable as-is. */
    updateUrlLang(currentLang);
    syncSeo(currentLang);
  }

  /* ---------- language menu ---------- */

  var menu = document.getElementById('langMenu');
  var langBtn = document.getElementById('langBtn');

  function buildMenu() {
    if (!menu) return;
    for (var i = 0; i < LANGS.length; i++) {
      var item = document.createElement('li');
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'lang__item';
      btn.setAttribute('role', 'option');
      btn.setAttribute('data-code', LANGS[i].code);
      btn.setAttribute('aria-selected', 'false');

      var name = document.createElement('span');
      name.textContent = LANGS[i].label;

      var code = document.createElement('span');
      code.className = 'lang__item-code mono';
      code.textContent = LANGS[i].short;

      btn.appendChild(name);
      btn.appendChild(code);
      btn.addEventListener('click', function () {
        setLang(this.getAttribute('data-code'));
        closeMenu();
        if (langBtn) langBtn.focus();
      });

      item.appendChild(btn);
      menu.appendChild(item);
    }
  }

  function openMenu() {
    if (!menu || !langBtn) return;
    menu.setAttribute('data-open', 'true');
    langBtn.setAttribute('aria-expanded', 'true');
    var selected = menu.querySelector('.lang__item[aria-selected="true"]');
    if (selected) selected.focus();
  }

  function closeMenu() {
    if (!menu || !langBtn) return;
    menu.removeAttribute('data-open');
    langBtn.setAttribute('aria-expanded', 'false');
  }

  function menuOpen() {
    return !!menu && menu.getAttribute('data-open') === 'true';
  }

  if (langBtn) {
    langBtn.addEventListener('click', function (event) {
      event.stopPropagation();
      if (menuOpen()) closeMenu();
      else openMenu();
    });
  }

  document.addEventListener('click', function (event) {
    if (!menuOpen()) return;
    if (menu && menu.contains(event.target)) return;
    closeMenu();
  });

  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;
    if (menuOpen()) {
      closeMenu();
      if (langBtn) langBtn.focus();
    }
  });

  /* ---------- theme ---------- */

  var themeBtn = document.getElementById('themeBtn');

  function flipTheme() {
    var next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch (err) {
      /* ignore */
    }
  }

  if (themeBtn) themeBtn.addEventListener('click', flipTheme);

  /* ---------- repository links (download / source) ---------- */

  function repoBase() {
    return typeof REPO_URL === 'string' ? REPO_URL.trim().replace(/\/+$/, '') : '';
  }

  function wireRepository() {
    var repo = repoBase();
    if (!repo) return false;
    // The download button mirrors the repository releases page, but only when
    // the repository is actually configured — hidden otherwise.
    var download = document.getElementById('heroDownload');
    if (download) {
      download.href = repo + '/releases/latest';
      download.hidden = false;
      var how = document.getElementById('heroHow');
      if (how) {
        how.classList.remove('btn--primary');
        how.classList.add('btn--ghost');
      }
    }

    var source = document.getElementById('footSource');
    if (source) {
      source.href = repo;
      source.hidden = false;
    }
    return true;
  }

  /* ---------- boot ---------- */

  buildMenu();
  applyLanguage(initialLang());
  persistLang(currentLang);
  wireRepository();
  syncSeo(currentLang);
})();
