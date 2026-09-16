# gyd-threads-posts

GOT YOU DESIGN（Threads [@gotyoudesigns](https://www.threads.net/@gotyoudesigns)／網站 [hostswp.com](https://hostswp.com)）專用的 Claude Code skill。

給它一個主題，它會產出一批可以直接發的 Threads 貼文：每篇一段文案、一張品牌風格圖卡，依日期排進資料夾，最後打包成 zip。內容鎖定 WordPress、SEO、主機、資安、電商、網站維護這些題目，讀者設定是台灣的中小企業老闆、行銷小編和接案設計師。

這不是通用的社群貼文產生器。裡面的成效數據、語氣、圖卡樣式都綁定這一個帳號。

## 產出長什麼樣

```
Threads二十二篇-0915至1007.zip
├── 00-排程說明.txt                    整批的日期、時間、資料夾對照
├── 0915-二-2000-電子發票檢查/
│   ├── gyd-threads-20260915-01-einvoice-test-orders.png    1080×1350 圖卡
│   └── 文案.txt                        正文＋第一則留言的連結
├── 0917-四-2000-快取外掛/
│   └── ...
└── manifest.json                      這批的題目與核心建議，下一批比對重複用
```

## 安裝

```bash
git clone https://github.com/ymlin520/gyd-threads-posts-skill.git ~/.claude/skills/gyd-threads-posts
```

Claude Code 會自動載入 `~/.claude/skills/` 底下的 skill。裝好之後，跟 Claude 說「寫 5 篇 threads，主題 WooCommerce」或打 `/gyd-threads-posts` 就會用它。

這個 repo 本身就可以當工作目錄用：直接 clone 到 skills 資料夾，改完規則 commit push 就同步了。

## 執行環境

| 需求 | 說明 | 沒有會怎樣 |
|---|---|---|
| Node.js | 跑 `scripts/` 底下的腳本 | 完全不能用 |
| Chrome 或 Edge | 渲染圖卡，自動偵測 `chrome` → `msedge` | 產不出圖 |
| `playwright-core` | 依序找環境變數 `PLAYWRIGHT_CORE_PATH`、npm 套件 | 產不出圖，腳本會提示怎麼裝 |
| **Noto Sans TC**、**Noto Serif TC** | 圖卡字型 | 退回微軟正黑體，字級與行高會跑掉，版面檢查也會失準 |
| ffmpeg | 選用，縮圖用 lanczos 演算法 | 保留 2 倍解析度，檔案較大但能用 |

裝 playwright-core：

```bash
npm i playwright-core
# 或指定現成的一份
export PLAYWRIGHT_CORE_PATH=/path/to/node_modules/playwright-core
```

## 流程

Claude 會照 `SKILL.md` 走完這七步，需要自己跑的時候也可以照著做。

### 1. 先讀歷史，避免題目重複

```bash
node scripts/history.js
```

會列出帳號既有貼文、每一批已排程的日期與核心建議（angle），以及建議的下一批起始日。

判斷重複看的是**核心建議**，不是關鍵字。「表單收不到信 → 改用 SMTP」和「訂單通知信進垃圾信 → 改用 SMTP」算重複，因為解法一樣；「結帳欄位太多」和「退換貨頁寫不清楚」不算，關鍵字都是 WooCommerce 但解法不同。

### 2. 排企劃表

每篇一列：日期｜類別｜結構｜圖卡版型｜題目｜核心建議。排的時候檢查三件事：

- 六種結構輪流用，相鄰兩篇不同，單一結構不超過整批三成
- 相鄰兩篇類別不同
- 每一列的核心建議都沒和歷史或同批其他列重複

先排表是因為寫完 20 篇才發現撞題，重寫很痛。

### 3. 寫 `posts.js`

在輸出資料夾建立 `posts.js`，格式是 `module.exports = [...]`，正文用反引號字串（長篇中文寫成 JSON 很容易跳脫出錯）。欄位看下一節。

### 4. 產圖打包

```bash
node scripts/build.js --posts <輸出資料夾>/posts.js --start 2026-09-15 --time 15:00
```

| 參數 | 說明 |
|---|---|
| `--posts` | `posts.js` 或 `posts.json` 的路徑，必填 |
| `--start` | 第一篇的日期 `YYYY-MM-DD`，必填。之後每天一篇 |
| `--time` | 發文時間，預設 `15:00` |
| `--out` | 輸出資料夾，預設是 `posts.js` 所在的資料夾 |
| `--no-zip` | 只產圖，不建日期資料夾也不打包，改稿時用 |

腳本會依序做：檢查欄位與長度 → 渲染圖卡 → 實際量測版面 → 建立日期資料夾 → 寫 `00-排程說明.txt` 與 `manifest.json` → 壓成 zip。

日期不連續時（例如某一天已經有別的貼文），在該篇加 `date: '2026-09-18'` 指定，沒填的就從 `--start` 往後推。

### 5. 看圖驗收

腳本回報「換行」「壓到」「撞到」就回去把文字改短，**不要改 CSS 字級**，各批圖卡的風格要一致。

就算沒有警告也要實際打開圖看：用到的每種版型至少看一張，加上標題最長的那張。檢查器量得出位置，量不出斷句難看或重點詞被拆成兩行。

## `posts.js` 欄位

```js
module.exports = [
{
  // ── 管理用（不會出現在圖卡上）──
  slug: 'uptime-monitor',          // 小寫英數與連字號，用在圖檔名
  title: '停機監控',                // 資料夾名稱，8 字內，不可含 \ / : * ? " < > |
  category: '維護',                 // 類別，檢查相鄰兩篇是否同類
  structure: '算帳',                // 六種結構之一
  angle: '設免費 uptime 監控，避免週末停機 61 小時才發現',  // 核心建議一句話，下一批比對重複用
  date: '2026-10-02',              // 選填，指定日期

  // ── 圖卡 ──
  meta: '網站監控',                 // 右上角小字
  eyebrow: '週五晚上掛掉，週一才發現', // 標題上方的橘色小字
  h1: '網站掛了<br>是<em>客戶告訴你的</em>',  // 兩行，<br> 分行，<em> 內的字變橘色
  type: 'stat',                     // dot／num／numsub／vs／stat
  stat: { big: '61 小時', cap: '週五 20:00 掛掉 → 週一 09:00 才發現' },  // 只有 stat 版型要
  items: ['廣告照扣錢，點進來全是錯誤頁', '想詢問的人轉頭找別家', '免費監控，十分鐘設好'],
  punch: '出事不可怕，晚發現才可怕。',   // 深色結語框
  tagline: 'UptimeRobot ／ Better Stack', // 右下角小字

  // ── 文案 ──
  firstComment: 'https://hostswp.com/...', // 選填，放第一則留言的連結或補充
  text: `網站掛掉這件事，很多老闆是客戶打電話來才知道的。
...
#網站維護 #網站監控`,
},
];
```

### 五種圖卡版型

| `type` | `items` 格式 | 項數 | 適合的結構 |
|---|---|---|---|
| `dot` | `'文字'` | 3–4 | 經典條列、立場 |
| `num` | `'文字'` | 3–5 | 自我檢查、故事 |
| `numsub` | `['標題', '說明']` | 3 | 經典條列、故事 |
| `vs` | `['誤會', '事實']` | 3 | 迷思對照、立場 |
| `stat` | `'文字'`，另外填 `stat.big`、`stat.cap` | 2–3 | 算帳 |

`vs` 版型**不要**自己加 ❌ ✅，版型會畫圖示，加了會重複。

圖卡只放骨架：標題、3 到 5 個重點、一句結語。細節留在正文，讀者才有理由點開文字。

### 長度上限

中文字算 1 個寬度，英數字與半形符號約 0.55。

| 欄位 | 上限 | | 欄位 | 上限 |
|---|---|---|---|---|
| `meta` | 14 | | `dot`／`num` 項目 | 18 |
| `eyebrow` | 20 | | `numsub` 標題／說明 | 15／23 |
| `h1` 每行 | 11（最多兩行） | | `vs` 誤會／事實 | 17／19 |
| `punch` | 21 | | `stat.big` | 6.5 |
| `tagline` | 20 | | `stat.cap` | 23 |

`build.js` 先依表提出警告，渲染後再實際量測。兩者不一致時以實際量測為準。

## 寫作規則摘要

完整內容在 `references/`，這裡只列最常踩到的。

**這個帳號的成效數據**（`performance-rules.md`）：單張圖片 3.64×、輪播 0.05×（絕對不要做輪播）、正文 200 字以上 1.29×、反轉或提醒開頭 1.23×、問句當開頭 0.65×、正文含連結 0.63×（連結放 `firstComment`）。

> 這些數字是 2026-09-15 從成效中心讀的，會隨新貼文變動，也是相關性不是因果。隔一段時間要重算，不要當成定律。

**六種結構**（`voice-and-structures.md`）：故事、迷思對照、自我檢查、算帳、立場、經典條列。同一批輪流用，整批套同一個模子連著讀會很膩。

**準確性底線**：工具與外掛名稱必須真實存在而且現在還能用；不捏造百分比、研究報告、客戶名稱或成效數字；示範用的價格或時程要標「示範寫法」；法律稅務個資類只講原則並建議諮詢專業人士；資安題目只寫防護和檢查，不寫攻擊步驟。

**常見失誤**：第一句用問句、正文放網址、做成輪播、換個說法其實是同一個建議、整批都套同一個模子。

## 疑難排解

| 狀況 | 處理 |
|---|---|
| `找不到 playwright-core` | `npm i playwright-core`，或設 `PLAYWRIGHT_CORE_PATH` |
| 圖卡字型不對、版面跑掉 | 系統沒裝 Noto Sans TC／Noto Serif TC |
| 版面檢查說「換行」「壓到」 | 回去把該欄位的字改短，不要改 CSS |
| `history.js` 查不到歷史 | 預設讀 `C:/Users/shu/Desktop/claude/threads-cards`，用第一個參數指定其他資料夾 |
| 題目跟以前重複 | 過去批次的 zip 與 manifest **不在這個 repo**，換電腦要另外帶過去 |

## 檔案

| 檔案 | 用途 |
|---|---|
| `SKILL.md` | 主流程與預設值，Claude 實際讀的就是這份 |
| `references/performance-rules.md` | 帳號成效數據與寫作取捨 |
| `references/voice-and-structures.md` | 語氣、開頭寫法、六種結構、準確性底線 |
| `references/card-spec.md` | `posts.js` 欄位與圖卡規格 |
| `references/topic-bank.md` | 題庫 |
| `scripts/build.js` | 檢查、渲染、打包 |
| `scripts/history.js` | 讀過去批次，列出用過的題目與建議起始日 |

## 不適用的情況

- 抓取或監測 Threads 上別人的貼文
- 發布 IG 貼文或輪播
- 分析成效儀表板本身

發布到 Threads 不在這個 skill 的範圍內，它只負責產出 zip。
