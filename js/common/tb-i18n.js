/*
 * Tanuki Box 共通土台：日英切替
 * ブラウザの言語設定を見て、対応している言語を自動で選ぶ。
 * URL に ?lang=en / ?lang=ja を付けると手動で切り替えられる（確認用）。
 *
 *   var i18n = TB.createI18n({ ja: {...}, en: {...} }, 'en');
 *   i18n.t('start');              // → 'タップでスタート'
 *   i18n.t('score', { n: 3 });    // 文中の {n} を置き換える
 */
(function (global) {
  'use strict';
  var TB = global.TB = global.TB || {};

  function detect(supported, fallback) {
    try {
      var m = /[?&]lang=([a-z]{2})/i.exec(global.location.search);
      if (m && supported.indexOf(m[1].toLowerCase()) >= 0) return m[1].toLowerCase();
    } catch (e) { /* noop */ }
    var list = (global.navigator && global.navigator.languages) || [];
    if (!list.length && global.navigator) list = [global.navigator.language || ''];
    for (var i = 0; i < list.length; i++) {
      var code = String(list[i] || '').slice(0, 2).toLowerCase();
      if (supported.indexOf(code) >= 0) return code;
    }
    return fallback;
  }

  TB.createI18n = function (dicts, fallback) {
    var supported = Object.keys(dicts);
    var lang = detect(supported, fallback);
    return {
      get lang() { return lang; },
      setLang: function (code) { if (dicts[code]) lang = code; },
      t: function (key, params) {
        var s = dicts[lang][key];
        if (s === undefined) s = dicts[fallback][key];
        if (s === undefined) return key;
        if (params) {
          s = s.replace(/\{(\w+)\}/g, function (_, k) {
            return params[k] !== undefined ? params[k] : '{' + k + '}';
          });
        }
        return s;
      }
    };
  };
})(window);
