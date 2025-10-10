#!/usr/bin/env node
/* eslint-env node */
/*
 * Markdown -> HTML bulk converter
 * Converts root README.md and all documents/*.md to HTML with a shared template
 * Output: mirrors source path, replacing .md with .html (documents/ stays same folder)
 */

const fs = require('fs');
const path = require('path');
const hljs = require('highlight.js');
const MarkdownIt = require('markdown-it');
const anchor = require('markdown-it-anchor');

const repoRoot = process.cwd();
const docsDir = path.join(repoRoot, 'documents');

function collectMarkdownFiles() {
  const files = [];
  // root README.md if present
  const rootReadme = path.join(repoRoot, 'README.md');
  if (fs.existsSync(rootReadme)) files.push(rootReadme);
  if (fs.existsSync(docsDir)) {
    for (const f of fs.readdirSync(docsDir)) {
      if (f.toLowerCase().endsWith('.md')) files.push(path.join(docsDir, f));
    }
  }
  return files;
}

const md = new MarkdownIt({
  html: true,
  linkify: true,
  highlight: function (str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return `<pre class="hljs"><code>${hljs.highlight(str, { language: lang, ignoreIllegals: true }).value}</code></pre>`;
      } catch (err) {
        // Fallback to escaped plain text if highlighting fails
  return `<pre class="hljs"><code>${md.utils.escapeHtml(str)}</code></pre>`;
      }
    }
    return `<pre class="hljs"><code>${md.utils.escapeHtml(str)}</code></pre>`;
  }
}).use(anchor, { permalink: anchor.permalink.ariaHidden({}), slugify: s => s.trim().toLowerCase().replace(/[^a-z0-9]+/g,'-') });

function enhanceInteractive(body) {
  // Inject runtime JS/CSS enhancements for collapsible sections, badges, copy buttons.
  const enhancementScript = `\n<script>\n(function(){\n  function wrapSections(){\n    const h2s=[...document.querySelectorAll('h2')].filter(h=>!h.textContent.trim().match(/^📋|^📖|^Table of Contents/i));\n    h2s.forEach(h=>{\n      if(h.dataset.enhanced) return;\n      const details=document.createElement('details');\n      details.open=false;\n      details.className='collapsible-section';\n      const summary=document.createElement('summary');\n      summary.innerHTML=h.innerHTML;\n      details.appendChild(summary);\n      let next=h.nextSibling;\n      while(next && !(next.tagName && next.tagName.match(/^H1|H2$/))){\n        const toMove=next;\n        next=next.nextSibling;\n        details.appendChild(toMove);\n      }\n      h.parentNode.replaceChild(details,h);\n    });\n  }\n  function addBadges(){\n    const map={Smoke:'badge-smoke',Load:'badge-load',Stress:'badge-stress',Spike:'badge-spike',Endurance:'badge-endurance'};\n    document.querySelectorAll('table td').forEach(td=>{\n      const txt=td.textContent.trim();\n      if(map[txt]){ td.innerHTML='<span class="badge '+map[txt]+'">'+txt+'</span>'; }\n    });\n  }\n  function addCopyButtons(){\n    document.querySelectorAll('pre').forEach(pre=>{\n      if(pre.querySelector('.copy-btn')) return;\n      const btn=document.createElement('button');\n      btn.type='button';\n      btn.className='copy-btn';\n      btn.textContent='Copy';\n      btn.addEventListener('click',()=>{\n        const code=pre.innerText;\n        navigator.clipboard.writeText(code).then(()=>{ btn.textContent='Copied!'; setTimeout(()=>btn.textContent='Copy',1500); });\n      });\n      pre.style.position='relative';\n      pre.appendChild(btn);\n    });\n  }\n  function addToolbar(){\n    if(document.querySelector('.doc-toolbar')) return;\n    const bar=document.createElement('div');\n    bar.className='doc-toolbar';\n    bar.innerHTML='<button id="toggleAll">Toggle All</button><button id="expandAll">Expand All</button><button id="collapseAll">Collapse All</button>';\n    document.body.insertBefore(bar,document.body.firstChild.nextSibling);\n    const getDetails=()=>[...document.querySelectorAll('details.collapsible-section')];\n    bar.querySelector('#toggleAll').onclick=()=>{getDetails().forEach(d=>d.open=!d.open);};\n    bar.querySelector('#expandAll').onclick=()=>{getDetails().forEach(d=>d.open=true);};\n    bar.querySelector('#collapseAll').onclick=()=>{getDetails().forEach(d=>d.open=false);};\n  }\n  document.addEventListener('DOMContentLoaded',()=>{wrapSections(); addBadges(); addCopyButtons(); addToolbar();});\n})();\n</script>`;
  const enhancementStyles = `\n<style>\n  .collapsible-section{border:1px solid #e0e0e0;margin:1rem 0;border-radius:8px;box-shadow:0 1px 2px rgba(0,0,0,0.04);}\n  .collapsible-section>summary{cursor:pointer;font-weight:600;padding:.6rem 1rem;background:linear-gradient(90deg,#fafafa,#f0f4f8);}\n  .collapsible-section[open]>summary{border-bottom:1px solid #e0e0e0;}\n  .badge{display:inline-block;padding:2px 8px;border-radius:12px;font-size:.75rem;font-weight:600;letter-spacing:.5px;color:#fff;}\n  .badge-smoke{background:#4caf50;}\n  .badge-load{background:#1976d2;}\n  .badge-stress{background:#e65100;}\n  .badge-spike{background:#6a1b9a;}\n  .badge-endurance{background:#455a64;}\n  .doc-toolbar{display:flex;gap:.5rem;position:sticky;top:0;background:#ffffffdd;padding:.5rem 0 1rem 0;backdrop-filter:blur(4px);z-index:50;}\n  .doc-toolbar button{background:#0366d6;color:#fff;border:none;padding:.45rem .9rem;border-radius:4px;cursor:pointer;font-size:.8rem;}\n  .doc-toolbar button:hover{background:#024f9f;}\n  pre .copy-btn{position:absolute;top:6px;right:6px;background:#444;border:none;color:#fff;font-size:.65rem;padding:4px 8px;border-radius:4px;cursor:pointer;}\n  pre .copy-btn:hover{background:#222;}\n</style>`;
  return enhancementStyles + body + enhancementScript;
}

function buildHtmlDoc({ title, body, sourcePath }) {
  const rel = path.relative(repoRoot, sourcePath).replace(/\\/g,'/');
  const generated = new Date().toISOString();
  // Enhance interactivity only for large reference docs (heuristic by filename length / specific file name)
  if (/NPM-COMMANDS-REFERENCE\.md$/i.test(sourcePath)) {
    body = enhanceInteractive(body);
  }
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${title}</title>
<style>
  body { font-family: system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif; margin: 2rem; line-height: 1.5; }
  pre { background:#1e1e1e; color:#ddd; padding:12px; border-radius:6px; overflow:auto; }
  code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace; }
  h1,h2,h3,h4 { scroll-margin-top: 80px; }
  table { border-collapse: collapse; width: 100%; margin:1rem 0; }
  th, td { border:1px solid #ccc; padding:6px 10px; text-align:left; }
  th { background:#f5f5f5; }
  a { color:#0366d6; text-decoration:none; }
  a:hover { text-decoration:underline; }
  .meta { font-size: 0.8rem; color:#666; margin-top:3rem; border-top:1px solid #eee; padding-top:0.5rem; }
  .toc { background:#fafafa; border:1px solid #eee; padding:1rem; border-radius:6px; }
  .anchor { text-decoration:none; }
</style>
</head>
<body>
${body}
<div class="meta">Generated from <code>${rel}</code> on ${generated}</div>
</body>
</html>`;
}

function ensureOutDir(file) {
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function convertFile(mdPath) {
  const raw = fs.readFileSync(mdPath, 'utf8');
  const rendered = md.render(raw);
  // Derive title from first heading
  const match = raw.match(/^#\s+(.+)$/m);
  const title = match ? match[1].replace(/<[^>]+>/g,'').trim() : path.basename(mdPath, '.md');
  const html = buildHtmlDoc({ title, body: rendered, sourcePath: mdPath });
  const outPath = mdPath.replace(/\.md$/i, '.html');
  ensureOutDir(outPath);
  fs.writeFileSync(outPath, html, 'utf8');
  return outPath;
}

function main() {
  const files = collectMarkdownFiles();
  if (!files.length) {
    console.error('No markdown files found.');
    process.exit(1);
  }
  console.log(`Converting ${files.length} markdown files...`);
  const outputs = files.map(convertFile);
  console.log('Generated HTML files:');
  outputs.forEach(o => console.log(' - ' + path.relative(repoRoot, o)));
}

main();
