#!/usr/bin/env node
/*
 * index.html と CSS・JS を1つの HTML ファイルにまとめる（試遊用の配布に使う）。
 *
 *   node tools/build-single.js                 → dist/dust-dash.html
 *   node tools/build-single.js --body-only OUT → <html>/<head>/<body> を外した版（Artifact 公開用）
 */
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const args = process.argv.slice(2);
const bodyOnly = args.includes('--body-only');
const outArg = args.filter(a => !a.startsWith('--'))[0];
const out = outArg ? path.resolve(outArg) : path.join(root, 'dist', 'dust-dash.html');

let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

html = html.replace(/<link rel="stylesheet" href="(?!https?:)([^"]+)">/g, (_, href) =>
  '<style>\n' + fs.readFileSync(path.join(root, href), 'utf8') + '</style>');

html = html.replace(/<script src="(?!https?:)([^"]+)"><\/script>/g, (_, src) =>
  '<script>\n' + fs.readFileSync(path.join(root, src), 'utf8').replace(/<\/script/gi, '<\\/script') + '</script>');

if (bodyOnly) {
  html = html
    .replace(/<!doctype html>\s*/i, '')
    .replace(/<html[^>]*>\s*/i, '')
    .replace(/<\/?head>\s*/gi, '')
    .replace(/<meta charset[^>]*>\s*/i, '')
    .replace(/<meta name="viewport"[^>]*>\s*/i, '')
    .replace(/<body>\s*/i, '')
    .replace(/<\/body>\s*<\/html>\s*$/i, '');
  // <title> を先頭に（Artifact はファイルの最初の方からタイトルを読む）
  const title = (html.match(/<title>.*?<\/title>\s*/) || [''])[0];
  html = title + html.replace(title, '');
}

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
console.log('wrote', path.relative(process.cwd(), out), (html.length / 1024).toFixed(1) + ' KB');
