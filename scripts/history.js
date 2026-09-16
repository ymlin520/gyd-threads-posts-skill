#!/usr/bin/env node
// 列出過去 Threads 批次與帳號既有貼文的日期、題目、核心建議，並建議下一批起始日
// 用法: node history.js [根目錄，預設 C:/Users/shu/Desktop/claude/threads-cards] [--json]
'use strict';
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const ROOT = path.resolve(args.find(a => !a.startsWith('--')) || 'C:/Users/shu/Desktop/claude/threads-cards');
const AS_JSON = args.includes('--json');
const WK = '日一二三四五六';
const pad = n => String(n).padStart(2, '0');
const iso = dt => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
const weekday = s => { const [y, m, d] = s.split('-').map(Number); return WK[new Date(y, m - 1, d).getDay()]; };

const rows = [], undated = [];
if (fs.existsSync(ROOT)) {
  for (const ent of fs.readdirSync(ROOT, { withFileTypes: true })) {
    if (!ent.isDirectory()) continue;
    const dir = path.join(ROOT, ent.name);
    const mf = path.join(dir, 'manifest.json');
    if (fs.existsSync(mf)) {
      try {
        const m = JSON.parse(fs.readFileSync(mf, 'utf8'));
        for (const p of m.posts || []) rows.push({ folder: ent.name, source: m.source || 'batch', ...p });
      } catch (e) { console.error(`讀取 ${mf} 失敗：${e.message}`); }
      continue;
    }
    for (const f of ['posts.js', 'posts.json']) {
      const pf = path.join(dir, f);
      if (!fs.existsSync(pf)) continue;
      try {
        const ps = f.endsWith('.json') ? JSON.parse(fs.readFileSync(pf, 'utf8')) : require(pf);
        for (const p of ps) undated.push({ folder: ent.name, title: p.title, angle: p.angle || '',
          h1: String(p.h1 || '').replace(/<[^>]+>/g, '') });
      } catch (e) { console.error(`讀取 ${pf} 失敗：${e.message}`); }
      break;
    }
  }
}

rows.sort((a, b) => String(a.date).localeCompare(String(b.date)));
const scheduled = rows.filter(r => r.source !== 'account');
const lastScheduled = scheduled.length ? scheduled[scheduled.length - 1].date : null;

const today = new Date(); today.setHours(0, 0, 0, 0);
let next = new Date(today); next.setDate(next.getDate() + 1);
if (lastScheduled) {
  const [y, m, d] = lastScheduled.split('-').map(Number);
  const after = new Date(y, m - 1, d + 1);
  if (after > next) next = after;
}

if (AS_JSON) {
  console.log(JSON.stringify({ root: ROOT, posts: rows, undated, lastScheduled, suggestedStart: iso(next) }, null, 2));
  process.exit(0);
}

const line = r => {
  const tag = [r.structure, r.category].filter(Boolean).join('／');
  return `  ${r.date}（${r.weekday || weekday(r.date)}） ${tag ? `[${tag}] ` : ''}${r.title}${r.angle ? ` — ${r.angle}` : ''}`;
};

const account = rows.filter(r => r.source === 'account');
if (account.length) {
  console.log(`帳號既有貼文（${account.length} 篇，取自成效中心；非完整清單）：`);
  account.forEach(r => console.log(line(r)));
  console.log('');
}
const byFolder = {};
scheduled.forEach(r => (byFolder[r.folder] = byFolder[r.folder] || []).push(r));
for (const [folder, list] of Object.entries(byFolder)) {
  console.log(`批次 ${folder}（${list.length} 篇）：`);
  list.forEach(r => console.log(line(r)));
  console.log('');
}
if (undated.length) {
  console.log(`沒有 manifest 的草稿（${undated.length} 篇，未排日期）：`);
  undated.forEach(r => console.log(`  [${r.folder}] ${r.title}｜${r.h1}${r.angle ? ` — ${r.angle}` : ''}`));
  console.log('');
}
if (!rows.length && !undated.length) console.log(`在 ${ROOT} 找不到任何歷史批次。\n`);

console.log(`已排程最後一天：${lastScheduled || '無'}`);
console.log(`建議下一批起始日：${iso(next)}（${WK[next.getDay()]}）`);
