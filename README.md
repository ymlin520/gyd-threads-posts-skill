# gyd-threads-posts

GOT YOU DESIGN（Threads [@gotyoudesigns](https://www.threads.net/@gotyoudesigns)／網站 [hostswp.com](https://hostswp.com)）的 Claude Code skill：依主題批次產出 WordPress 相關的 Threads 貼文，包含文案、品牌風格單張圖卡（1080×1350），並依日期排好資料夾打包成 zip。

## 內容

| 檔案 | 用途 |
|---|---|
| `SKILL.md` | 主流程（讀歷史 → 排企劃表 → 寫 posts.js → 產圖打包 → 驗收交付） |
| `references/performance-rules.md` | 帳號自己的成效數據與寫作取捨 |
| `references/voice-and-structures.md` | 語氣、開頭寫法、六種結構 |
| `references/card-spec.md` | `posts.js` 欄位與五種圖卡版型 |
| `references/topic-bank.md` | 題庫 |
| `scripts/build.js` | 檢查欄位長度、渲染圖卡、建立日期資料夾、打包 zip |
| `scripts/history.js` | 讀過去批次，列出已用過的題目與建議起始日 |

## 安裝

複製到 Claude Code 的 skills 目錄：

```bash
git clone https://github.com/ymlin520/gyd-threads-posts-skill.git ~/.claude/skills/gyd-threads-posts
```

## 執行環境

`scripts/build.js` 需要：

- Node.js
- Chrome 或 Edge（自動偵測 `chrome` → `msedge`）
- `playwright-core`：依序找環境變數 `PLAYWRIGHT_CORE_PATH`、已安裝的 npm 套件
- 系統已安裝 **Noto Sans TC** 與 **Noto Serif TC** 字型，缺字型會退回微軟正黑體，版面會跑掉
- ffmpeg（選用，用來做高品質縮圖）

## 用法

```bash
node scripts/history.js                     # 看過去批次，避免題目重複
node scripts/build.js --posts <posts.js> --start YYYY-MM-DD --time 15:00
```

每篇可加 `date: 'YYYY-MM-DD'` 指定日期（日期不連續時用）；加 `--no-zip` 只產圖不打包。

`history.js` 預設讀 `C:/Users/shu/Desktop/claude/threads-cards`，可用第一個參數指定其他資料夾。過去批次的紀錄不在這個 repo 裡。
