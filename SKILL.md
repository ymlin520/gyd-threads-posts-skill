---
name: gyd-threads-posts
description: 為 GOT YOU DESIGN（Threads 帳號 @gotyoudesigns／網站 hostswp.com）依主題批次產出 WordPress 相關 Threads 貼文：套用帳號自己的成效數據寫文案、生成品牌風格單張圖卡（1080x1350）、依日期排程並打包成 zip（每個日期一個資料夾，內含圖卡與文案.txt），且自動比對過去批次避免題目重複。當使用者說「寫 Threads 文」「幫我寫 N 篇脆文」「用這個主題生 threads」「下一批 threads」「做 threads 圖卡」「排程 threads 貼文給我 zip」，或要替 GOT YOU DESIGN／hostswp 產出 WordPress、SEO、主機、資安、電商、WooCommerce、網站維護主題的社群短文時，都要使用這個 skill，即使沒有明講 Threads 或圖卡。不適用：抓取或監測 Threads 上別人的貼文（用 shihhsin-threads-watch）、發布 IG 貼文或輪播（用 ig-publish）、分析成效儀表板本身。
---

# GOT YOU DESIGN｜Threads 貼文批次產生器

依主題為 GOT YOU DESIGN 產出 WordPress 相關 Threads 貼文：文案 → 品牌單張圖卡 → 依日期排好的資料夾 → zip。

這套做法有兩個來源：帳號自己的成效數據（`references/performance-rules.md`），以及使用者看完前兩批後的回饋——**內容不能重複，題目和寫法都要換**。下面的流程，就是為了每一批都穩定做到這兩件事。

## 預設值

| 項目 | 預設 | 說明 |
|---|---|---|
| 主題 | 使用者指定；說「你挑」就從 `references/topic-bank.md` 選 | 主題可以很廣（例如「WooCommerce」），就在主題內挑 N 個不同切角 |
| 篇數 | 5 | |
| 起始日 | `history.js` 建議的日期 | 接在上一批最後一天之後 |
| 發文時間 | 15:00，每天一篇 | 使用者選定的時段，不要自行更改 |
| 導流連結 | 無 | 有的話放 `firstComment`，不放正文 |
| 輸出位置 | `C:\Users\shu\Desktop\claude\threads-cards\batch-NN\` | NN 接在現有最大編號之後 |

主題明確就直接做，並在回覆開頭用一句話說明採用了哪些預設值。只有主題完全沒給、也沒說「你挑」時才發問。

## 流程

### 1. 讀歷史，列出不能重複的題目

```bash
node "C:/Users/shu/.claude/skills/gyd-threads-posts/scripts/history.js"
```

會列出三樣東西：帳號既有貼文存檔（`_account-archive`）；每一批已排程的日期、題目、結構、核心建議（angle）；建議的下一批起始日。

判斷「重複」看的是**核心建議**，不是關鍵字：
- 算重複：「表單收不到信 → 改用 SMTP」和「訂單通知信進垃圾信 → 改用 SMTP」，解法一樣
- 不算重複：「WooCommerce 結帳欄位太多」和「WooCommerce 退換貨頁寫不清楚」，關鍵字相同，但解法不同

同一批內的篇與篇之間也照這個標準。拿不準就換題，題庫夠大。

### 2. 有辦法的話，先看一眼最新成效

`references/performance-rules.md` 的數字是 2026-09-15 抓的。如果成效中心（shu_threads studio，本機 http://localhost:3700）開著，就去看「內容成功模式」和「最佳發文時間」有沒有明顯變化，有的話照新數據調整。沒開就直接用參考檔，不要卡在這一步。

### 3. 先排企劃表，再動筆

每一篇排成一列：日期（星期）｜類別｜結構｜圖卡版型｜題目｜核心建議一句話。排表時檢查三件事：
- 六種結構輪流使用（見 `references/voice-and-structures.md`）：相鄰兩篇結構不同，單一結構不超過整批約三成
- 類別交錯：相鄰兩篇類別不同
- 每一列的核心建議，都不和歷史紀錄或同批其他列重複
- 每一篇都要跟 WordPress 直接相關：核心建議必須是 WordPress 裡的具體操作，例如後台路徑、外掛、主題、WooCommerce 設定或 wp-config。自我測試：把文中跟 WordPress 有關的字眼拿掉，如果整篇還能原封不動發在任何網站行銷帳號，就不夠 WordPress，換題或改寫。使用者對此明確要求過，一般行銷、UX、Google 商家、接案合約這類題目，要找得到 WordPress 的切入點才能用

企劃表在回覆裡精簡列出，接著直接寫。只有使用者事先說要先看題目，才停下來等確認。先排表是因為寫完 20 篇才發現撞題，重寫成本很高。

### 4. 寫 posts.js

動筆前先讀兩份參考檔：
- `references/voice-and-structures.md`：語氣、開頭寫法、六種結構、準確性底線
- `references/card-spec.md`：posts.js 的欄位、五種圖卡版型、各欄位長度上限

在輸出資料夾建立 `posts.js`（`module.exports = [...]`，正文用反引號字串。長篇中文加換行，寫成 JSON 很容易跳脫出錯）。每篇都要填 `angle`、`category`、`structure`，下一批做歷史比對時會用到。

### 5. 產圖與打包

```bash
node "C:/Users/shu/.claude/skills/gyd-threads-posts/scripts/build.js" --posts "<輸出資料夾>/posts.js" --start YYYY-MM-DD --time 15:00
```

腳本依序完成：檢查欄位與長度 → 渲染 1080×1350 圖卡 → 量測版面 → 建立日期資料夾（圖卡＋文案.txt）→ 寫入 `00-排程說明.txt` 與 `manifest.json` → 壓縮成 zip。

只想先看圖，可以加 `--no-zip`。這時不會寫入 manifest，也不會影響歷史紀錄。

執行環境需要：Node、Chrome 或 Edge、playwright-core（找不到時會改用 `Desktop\claude\mcp-video\node_modules` 裡的那份）、系統已安裝 Noto Sans TC 與 Noto Serif TC 字型。有 ffmpeg 會用來做高品質縮圖，沒有也能跑。

### 6. 看圖驗收

- 腳本回報「換行」「壓到」「撞到」：回 posts.js 把文字縮短，再跑一次。不要去改 CSS 字級，各批圖卡的風格要保持一致。
- 就算沒有回報錯誤，也要實際打開圖來看：用到的每種版型至少看一張，再加上標題最長的那張。檢查器只量得出版面位置，量不出斷句難看、單字落單成一行、重點詞被拆到兩行。

### 7. 交付

- 用 SendUserFile 傳送 zip（display: attach），附上完整路徑
- 精簡列出每篇的日期與題目
- 提醒三件事：故事型與情境舉例都是通用情境，有真實案例可以換進去；標示「示範」的價格或時程不是實際報價；排進 WordPress 後台（`hermes_thread`）之前，先確認同一天是否已經有排程貼文

寫進 WordPress 後台不在這個 skill 的範圍內，使用者另外要求才做（需要 Claude in Chrome 連線）。

## 常見失誤

- 第一句用問句（這個帳號問句開頭只有 0.65 倍）
- 正文放網址（含連結的貼文只有 0.63 倍）
- 把圖做成多張輪播（0.05 倍）
- 換個說法其實是同一個建議，或整批都套同一個模子（反轉開頭 → 四點條列 → 我建議）
- 為了有說服力，捏造百分比、研究報告、客戶名稱或成效數字
- 少了詢問邀請，或整批都用同一句罐頭文。使用者要兩件事：高流量，以及讓讀者來問 WordPress 問題。所以每篇文末問句之後都要有一句依主題寫的留言／私訊邀請，`firstComment` 放詢問管道與 hostswp.com
