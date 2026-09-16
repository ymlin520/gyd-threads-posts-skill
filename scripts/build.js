#!/usr/bin/env node
// GOT YOU DESIGN Threads 圖卡與排程包產生器
// 用法: node build.js --posts <posts.js|posts.json> --start YYYY-MM-DD [--time 15:00] [--out <資料夾>] [--no-zip]
'use strict';
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');

const argv = process.argv.slice(2);
const opt = name => {
  const i = argv.indexOf('--' + name);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : undefined;
};
const POSTS = opt('posts');
const START = opt('start');
const TIME = opt('time') || '15:00';
const NO_ZIP = argv.includes('--no-zip');

if (!POSTS || !/^\d{4}-\d{2}-\d{2}$/.test(START || '') || !/^([01]?\d|2[0-3]):[0-5]\d$/.test(TIME)) {
  console.error('用法: node build.js --posts <posts.js|posts.json> --start YYYY-MM-DD [--time 15:00] [--out <資料夾>] [--no-zip]');
  process.exit(1);
}

const postsFile = path.resolve(POSTS);
const OUT = path.resolve(opt('out') || path.dirname(postsFile));
const posts = postsFile.endsWith('.json') ? JSON.parse(fs.readFileSync(postsFile, 'utf8')) : require(postsFile);
if (!Array.isArray(posts) || !posts.length) { console.error('posts 必須是非空陣列'); process.exit(1); }

// ---------- 內容檢查 ----------
const TYPES = { dot: [3, 4], num: [3, 5], numsub: [3, 3], vs: [3, 3], stat: [2, 3] };
const L = { meta: 14, eyebrow: 20, h1Line: 11, punch: 21, tagline: 20, item: 18,
  subTitle: 15, subText: 23, vsNo: 17, vsYes: 19, big: 6.5, cap: 23 };
const strip = s => String(s).replace(/<[^>]+>/g, '');
const vw = s => [...strip(s)].reduce((a, ch) => a + (/[\x20-\x7e]/.test(ch) ? 0.55 : 1), 0);
const errors = [], warnings = [], missing = {};

posts.forEach((p, i) => {
  const at = `#${i + 1}${p.slug ? ` ${p.slug}` : ''}`;
  const long = (label, s, lim) => {
    if (s != null && vw(s) > lim) warnings.push(`${at} ${label}可能過長（${vw(s).toFixed(1)}／${lim}）：${strip(s)}`);
  };
  for (const k of ['slug', 'title', 'meta', 'eyebrow', 'h1', 'type', 'items', 'punch', 'tagline', 'text'])
    if (p[k] == null) errors.push(`${at} 缺少欄位 ${k}`);
  for (const k of ['angle', 'category', 'structure']) if (!p[k]) missing[k] = (missing[k] || 0) + 1;
  if (p.slug && !/^[a-z0-9-]+$/.test(p.slug)) errors.push(`${at} slug 只能用小寫英數與連字號`);
  if (p.title && /[\\/:*?"<>|]/.test(p.title)) errors.push(`${at} title 含有不能當資料夾名稱的字元`);

  const range = TYPES[p.type];
  if (p.type && !range) errors.push(`${at} type 必須是 ${Object.keys(TYPES).join(' / ')}`);
  if (range && Array.isArray(p.items) && (p.items.length < range[0] || p.items.length > range[1]))
    warnings.push(`${at} ${p.type} 版型建議 ${range[0]}–${range[1]} 項，目前 ${p.items.length} 項`);
  if (p.type === 'stat' && !(p.stat && p.stat.big && p.stat.cap)) errors.push(`${at} stat 版型需要 stat.big 與 stat.cap`);

  if (p.text && /https?:\/\/|www\./i.test(p.text)) warnings.push(`${at} 正文含網址；連結請放 firstComment`);
  if (p.text && /[？?]\s*$/.test(p.text.trim().split('\n')[0])) warnings.push(`${at} 第一句是問句（此帳號問句開頭表現差）`);

  long('meta ', p.meta, L.meta);
  long('eyebrow ', p.eyebrow, L.eyebrow);
  long('結語 ', p.punch, L.punch);
  long('tagline ', p.tagline, L.tagline);
  if (p.h1) {
    const lines = String(p.h1).split(/<br\s*\/?>/i);
    if (lines.length > 2) warnings.push(`${at} h1 超過兩行`);
    lines.forEach(l => long('標題單行 ', l, L.h1Line));
  }
  if (Array.isArray(p.items)) p.items.forEach(it => {
    if (p.type === 'numsub') { long('項目標題 ', it[0], L.subTitle); long('項目說明 ', it[1], L.subText); }
    else if (p.type === 'vs') { long('❌ 句 ', it[0], L.vsNo); long('✅ 句 ', it[1], L.vsYes); }
    else long('項目 ', it, L.item);
  });
  if (p.stat) { long('大數字 ', p.stat.big, L.big); long('大數字說明 ', p.stat.cap, L.cap); }
});

const seen = { slug: new Set(), title: new Set() };
posts.forEach((p, i) => ['slug', 'title'].forEach(k => {
  if (!p[k]) return;
  if (seen[k].has(p[k])) errors.push(`#${i + 1} ${k} 重複：${p[k]}`);
  seen[k].add(p[k]);
}));
for (let i = 1; i < posts.length; i++)
  for (const k of ['structure', 'category'])
    if (posts[i][k] && posts[i][k] === posts[i - 1][k]) warnings.push(`#${i}→#${i + 1} 連續同一個 ${k}：${posts[i][k]}`);
for (const [k, n] of Object.entries(missing)) warnings.push(`${n} 篇沒有填 ${k}（下一批的歷史比對與輪替檢查會用到）`);

if (warnings.length) console.log('⚠ 內容檢查：\n' + warnings.map(w => '  ' + w).join('\n'));
if (errors.length) { console.error('✖ 無法產出：\n' + errors.map(e => '  ' + e).join('\n')); process.exit(1); }

// ---------- 日期與命名 ----------
const WK = '日一二三四五六';
const pad = n => String(n).padStart(2, '0');
const [y, m, d] = START.split('-').map(Number);
// 每篇可用 date: 'YYYY-MM-DD' 指定日期（改寫既有排程時用）；沒填就從 --start 起每天一篇
const dates = posts.map((p, i) => {
  if (p.date && /^\d{4}-\d{2}-\d{2}$/.test(p.date)) { const [py, pm, pd] = p.date.split('-').map(Number); return new Date(py, pm - 1, pd); }
  return new Date(y, m - 1, d + i);
});
const iso = dt => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
const mmdd = dt => pad(dt.getMonth() + 1) + pad(dt.getDate());
const [hh, mi] = TIME.split(':').map(Number);
const TIME_LABEL = `${pad(hh)}:${pad(mi)}`;
const TIME_TAG = `${pad(hh)}${pad(mi)}`;
const dayLabel = dt => `${iso(dt)}（${WK[dt.getDay()]}）`;
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const zhNum = n => {
  const dg = '零一二三四五六七八九';
  if (n < 10) return dg[n];
  if (n < 100) return (n >= 20 ? dg[Math.floor(n / 10)] : '') + '十' + (n % 10 ? dg[n % 10] : '');
  return String(n);
};

// ---------- 圖卡 HTML ----------
const CSS = `
*{margin:0;padding:0;box-sizing:border-box}
body{background:#5f5f5f;padding:40px;display:flex;flex-direction:column;gap:40px;align-items:center}
.card{width:1080px;height:1350px;background:#F7F5F1;position:relative;overflow:hidden;
  font-family:"Noto Sans TC","Microsoft JhengHei",sans-serif;color:#171717;
  padding:56px 70px 290px;display:flex;flex-direction:column}
.bar{display:flex;align-items:center;height:56px}
.mark{position:relative;width:46px;height:40px;margin-right:18px;flex:none}
.mark i{position:absolute;background:#111}
.mark i.v{width:3px;height:40px;top:0}
.mark i.h{height:3px;width:46px;left:0}
.mark i.o{background:#F58220}
.brand{font-size:29px;font-weight:800;letter-spacing:.04em;display:flex;align-items:center}
.brand .g{color:#F58220}.brand .d{color:#171717;margin-left:14px}
.meta{margin-left:auto;font-size:21px;color:#77716A;letter-spacing:.10em}
.rule{height:2px;background:#D8D3CC;margin-top:16px}
.eyebrow{margin-top:48px;font-size:22px;font-weight:800;color:#C9680C;letter-spacing:.10em}
h1{font-family:"Noto Serif TC","Microsoft JhengHei",serif;font-size:74px;line-height:1.26;
  font-weight:900;color:#101820;margin-top:24px;letter-spacing:-.01em}
h1 em{font-style:normal;color:#F58220}
.panel{position:relative;margin:auto 0}
.accent{position:absolute;left:0;top:0;width:8px;height:100%;background:#F58220}
.inner{position:relative;margin-left:30px;background:#fff;border-radius:26px;padding:40px 44px}
.inner::after{content:"";position:absolute;inset:18px;border:2px solid #EAE5DD;border-radius:14px;pointer-events:none}
.item{display:flex;gap:22px;align-items:flex-start;padding:19px 0;border-bottom:2px solid #F1EDE6}
.item:last-child{border-bottom:none}
.num{flex:none;width:46px;height:46px;border-radius:50%;background:#171717;color:#fff;
  font-size:23px;font-weight:800;display:flex;align-items:center;justify-content:center;margin-top:2px}
.num.o{background:#F58220}
.dotmark{flex:none;width:14px;height:14px;border-radius:50%;background:#F58220;margin-top:18px}
.txt{font-size:35px;font-weight:700;line-height:1.42}
.txt small{display:block;font-size:26px;font-weight:400;color:#68615B;margin-top:7px;line-height:1.5}
.vsrow{padding:18px 0;border-bottom:2px solid #F1EDE6}
.vsrow:last-child{border-bottom:none}
.vs-line{display:flex;gap:16px;align-items:center}
.vs-line + .vs-line{margin-top:10px}
.badge{flex:none;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;
  font-size:20px;font-weight:900}
.badge.no{background:#ECE7E0;color:#9A928A}
.badge.yes{background:#F58220;color:#fff}
.vs-no{font-size:27px;color:#9A928A;text-decoration:line-through;text-decoration-color:#CFC8C0;text-decoration-thickness:2px}
.vs-yes{font-size:34px;font-weight:700;color:#171717;line-height:1.35}
.stat-big{font-family:"Noto Serif TC","Microsoft JhengHei",serif;font-size:112px;font-weight:900;color:#F58220;
  line-height:1.05;letter-spacing:-.02em}
.stat-cap{font-size:27px;color:#68615B;margin-top:10px;padding-bottom:20px;border-bottom:2px solid #F1EDE6}
.punch{position:absolute;left:70px;right:70px;bottom:128px;background:#171717;color:#fff;
  border-radius:26px;padding:32px 40px;font-size:30px;font-weight:800;line-height:1.5;
  display:flex;align-items:center;gap:20px}
.punch .dot{margin-left:auto;width:16px;height:16px;border-radius:50%;background:#F58220;flex:none}
.foot{position:absolute;left:70px;bottom:68px;font-size:22px;color:#77716A;letter-spacing:.05em}
.tagline{position:absolute;right:70px;bottom:68px;font-size:22px;color:#A79F96;letter-spacing:.05em}
`;

const MARK = `<div class="mark">
  <i class="v" style="left:0"></i><i class="v o" style="left:13px"></i>
  <i class="v" style="left:26px"></i><i class="v o" style="left:39px"></i>
  <i class="h o" style="top:2px"></i><i class="h" style="top:14px"></i>
  <i class="h o" style="top:25px"></i><i class="h" style="top:36px"></i></div>`;

const dotItem = t => `<div class="item"><div class="dotmark"></div><div class="txt">${esc(t)}</div></div>`;

function panelHtml(p) {
  switch (p.type) {
    case 'dot':
      return p.items.map(dotItem).join('');
    case 'num':
      return p.items.map((t, i) =>
        `<div class="item"><div class="num${i === 0 ? ' o' : ''}">${i + 1}</div><div class="txt">${esc(t)}</div></div>`).join('');
    case 'numsub':
      return p.items.map(([t, s], i) =>
        `<div class="item"><div class="num${i === 0 ? ' o' : ''}">${i + 1}</div><div class="txt">${esc(t)}<small>${esc(s)}</small></div></div>`).join('');
    case 'vs':
      return p.items.map(([no, yes]) => `<div class="vsrow">
        <div class="vs-line"><span class="badge no">✕</span><span class="vs-no">${esc(no)}</span></div>
        <div class="vs-line"><span class="badge yes">✓</span><span class="vs-yes">${esc(yes)}</span></div></div>`).join('');
    case 'stat':
      return `<div class="stat-big">${esc(p.stat.big)}</div><div class="stat-cap">${esc(p.stat.cap)}</div>`
        + p.items.map(dotItem).join('');
  }
}

const cardsHtml = posts.map(p => `
<div class="card">
  <div class="bar">${MARK}<div class="brand"><span class="g">GOT YOU</span><span class="d">DESIGN</span></div>
    <div class="meta">${esc(p.meta)}</div></div>
  <div class="rule"></div>
  <div class="eyebrow">${esc(p.eyebrow)}</div>
  <h1>${p.h1}</h1>
  <div class="panel"><div class="accent"></div><div class="inner">${panelHtml(p)}</div></div>
  <div class="punch">${esc(p.punch)}<span class="dot"></span></div>
  <div class="foot">hostswp.com</div>
  <div class="tagline">${esc(p.tagline)}</div>
</div>`).join('\n');

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'cards.html'),
  `<meta charset="utf-8"><title>GOT YOU DESIGN Threads Cards</title><style>${CSS}</style>${cardsHtml}`);

// ---------- 渲染 ----------
function loadPlaywright() {
  const tries = [process.env.PLAYWRIGHT_CORE_PATH, 'playwright-core', 'playwright',
    'C:/Users/shu/Desktop/claude/mcp-video/node_modules/playwright-core'].filter(Boolean);
  for (const t of tries) { try { return require(t); } catch (e) { /* 試下一個 */ } }
  console.error('找不到 playwright-core：請 npm i playwright-core，並把 PLAYWRIGHT_CORE_PATH 設成它的路徑。');
  process.exit(1);
}

async function launch(chromium) {
  let lastErr;
  for (const channel of ['chrome', 'msedge', null]) {
    try { return await chromium.launch(channel ? { channel } : {}); } catch (e) { lastErr = e; }
  }
  throw lastErr;
}

(async () => {
  const { chromium } = loadPlaywright();
  const W = 1080, H = 1350;
  const imgDir = path.join(OUT, 'png');
  fs.rmSync(imgDir, { recursive: true, force: true });
  fs.mkdirSync(imgDir, { recursive: true });

  const browser = await launch(chromium);
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
  await page.goto('file:///' + path.join(OUT, 'cards.html').replace(/\\/g, '/'));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(800);

  // 實際量測：只數文字本身的行數，不把 padding、分隔線或 <small> 算進去
  const layout = await page.$$eval('.card', cards => {
    const lineCount = (node, fontEl) => {
      const r = document.createRange();
      r.selectNodeContents(node);
      const fsz = parseFloat(getComputedStyle(fontEl).fontSize);
      const ys = [...r.getClientRects()].filter(x => x.width > 0).map(x => x.top).sort((a, b) => a - b);
      let n = 0, last = -Infinity;
      for (const top of ys) if (top - last > fsz * 0.6) { n++; last = top; }
      return n || 1;
    };
    const ownText = el => [...el.childNodes].find(n => n.nodeType === 3 && n.textContent.trim());
    return cards.map((c, i) => {
      const box = s => c.querySelector(s).getBoundingClientRect();
      const out = [];
      const h1 = c.querySelector('h1');
      if (lineCount(h1, h1) > 2) out.push('標題超過兩行');
      if (box('.panel').top - box('h1').bottom < 24) out.push('內容卡貼近標題');
      if (box('.punch').top - box('.panel').bottom < 24) out.push('內容卡壓到結語框');
      if (box('.tagline').left < box('.foot').right + 24) out.push('右下小字撞到網址');
      c.querySelectorAll('.txt, .vs-no, .vs-yes, .stat-cap, .stat-big, .punch').forEach(el => {
        const t = ownText(el);
        if (t && lineCount(t, el) > 1) out.push('換行：' + t.textContent.trim());
      });
      return out.length ? `#${i + 1} ${out.join(' ／ ')}` : null;
    }).filter(Boolean);
  });
  console.log(layout.length ? '⚠ 版面問題：\n' + layout.map(x => '  ' + x).join('\n') : '版面檢查通過');

  const cards = await page.$$('.card');
  const files = [];
  for (let i = 0; i < cards.length; i++) {
    const name = `gyd-threads-${iso(dates[i]).replace(/-/g, '')}-${pad(i + 1)}-${posts[i].slug}.png`;
    const raw = path.join(imgDir, `_raw-${pad(i + 1)}.png`);
    const out = path.join(imgDir, name);
    await cards[i].screenshot({ path: raw });
    try {
      execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', raw, '-vf', `scale=${W}:${H}:flags=lanczos`, out]);
      fs.unlinkSync(raw);
    } catch (e) {
      fs.renameSync(raw, out); // 沒有 ffmpeg 時保留 2 倍解析度
    }
    files.push({ name, out });
  }
  await browser.close();
  console.log(`已渲染 ${files.length} 張圖卡 → ${imgDir}`);

  if (NO_ZIP) return;

  // ---------- 日期資料夾、說明、manifest、zip ----------
  const first = dates[0], last = dates[dates.length - 1];
  const bundleName = `Threads${zhNum(posts.length)}篇-${mmdd(first)}至${mmdd(last)}`;
  const bundle = path.join(OUT, bundleName);
  fs.rmSync(bundle, { recursive: true, force: true });
  fs.mkdirSync(bundle);

  const index = [];
  posts.forEach((p, i) => {
    const dt = dates[i];
    const folder = `${mmdd(dt)}-${WK[dt.getDay()]}-${TIME_TAG}-${p.title}`;
    const fdir = path.join(bundle, folder);
    fs.mkdirSync(fdir);
    fs.copyFileSync(files[i].out, path.join(fdir, files[i].name));
    const comment = p.firstComment ? `\n----------------------------------------\n第一則留言：\n${p.firstComment}\n` : '';
    fs.writeFileSync(path.join(fdir, '文案.txt'),
      `發布時間：${dayLabel(dt)} ${TIME_LABEL}\n圖卡：${files[i].name}\n注意：連結放第一則留言，不要放正文\n` +
      `----------------------------------------\n\n${p.text.trim()}\n${comment}`);
    index.push(`  ${folder}`);
  });

  fs.writeFileSync(path.join(bundle, '00-排程說明.txt'),
`GOT YOU DESIGN｜Threads ${zhNum(posts.length)}篇貼文
${dayLabel(first)} ～ ${dayLabel(last)}，每天 ${TIME_LABEL}

資料夾（依發布日期）：
${index.join('\n')}

每個資料夾內含：
  - 圖卡 PNG（1080x1350，4:5）
  - 文案.txt（有第一則留言內容時會附在文末）

發文重點：
  1. 連結放第一則留言，不要放正文
  2. 圖用單張，不要做成輪播
  3. 維持固定時段發文

提醒：
  - 故事型與情境舉例屬於通用情境，有自己的真實案例可以替換進去
  - 文案中標示「示範」的價格或時程不是實際報價
  - 排進後台前，先確認同一天是否已經有排程中的貼文
`);

  const manifest = {
    brand: 'GOT YOU DESIGN', account: '@gotyoudesigns', source: 'batch',
    createdAt: new Date().toISOString(), start: iso(first), time: TIME_LABEL, count: posts.length,
    posts: posts.map((p, i) => ({
      date: iso(dates[i]), weekday: WK[dates[i].getDay()], time: TIME_LABEL,
      slug: p.slug, title: p.title, category: p.category || '', structure: p.structure || '',
      type: p.type, angle: p.angle || '', h1: strip(p.h1),
    })),
  };
  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));

  const zip = bundle + '.zip';
  fs.rmSync(zip, { force: true });
  if (process.platform === 'win32') {
    const q = s => s.replace(/'/g, "''");
    execFileSync('powershell.exe', ['-NoProfile', '-Command',
      `Compress-Archive -LiteralPath '${q(bundle)}' -DestinationPath '${q(zip)}' -Force`], { stdio: 'inherit' });
  } else {
    execFileSync('zip', ['-rq', path.basename(zip), bundleName], { cwd: OUT, stdio: 'inherit' });
  }
  console.log(`zip → ${zip}（${Math.round(fs.statSync(zip).size / 1024)}KB）`);
  console.log(`manifest → ${path.join(OUT, 'manifest.json')}`);
})().catch(e => { console.error(e); process.exit(1); });
