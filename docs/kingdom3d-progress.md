# 3D 實境漫遊：進度紀錄（2026-10-28 14:50）

## 已上線
- v4.3.0（PR #217）：展覽館、電玩城新門面；地下展場挑高；薈萃廣場圓章；論道廣場兩側白牆大型熱門佈告欄（茶藝街／百工坊輪播）
- v4.3.1（PR #218）：百工坊街改建（右側大熊匠鋪平頂工棚＋中間通道、左側白牆一排佈告欄、月洞門通廣場）；土樓樓板天花修正；求職廟六卷畫卷（30 筆）；翰林院／獵頭卷軸；徵才島渡口移位；堂前燕 6→2

## 這個分支（wip-agents-remodel，尚未合併）
1. 求職廟六卷畫卷的排列順序修正（面向牆由左往右讀卷一→卷三）— `stylized/architecture.ts`，已完成、可直接出貨
2. Agent 重新建模（照角色設定圖）— 新檔 `stylized/agents3d.ts`，**已寫好但還沒接上**：
   - `buildBaimiao` / `buildDuohui` / `buildAgent007` / `buildBear` / `buildSousou` / `buildXiaodengpao`
   - 保留原本動畫部件：白喵 body/tail、多慧 wingL/wingR（現在是肩膀群組）、007 dish/legs、大熊 arm/gear、搜搜 trail
   - 臉用貼圖「臉皮」（faceShell）畫眼睛、眉毛、嘴、腮紅

## 接下來要做
- [ ] `stylized/fauna.ts`：把 `baimiao()`、`duohui()`、`agent007()`、`bear()`、`sousou()` 換成 agents3d 的 build 函式；
      檢查 mergeByMaterial / keepApart / mergeSelf 對新部件（臉皮 noMerge、多慧翅膀群組）是否正常
- [ ] 小燈泡吉祥物：主島中央廣場繞著大燈泡走，偶爾跳起來（setPose 'jump'）、偶爾跌倒（'fallen' 暈眼）再爬起；
      CharacterId 加 'xiaodengpao'（CHARACTERS 卡片 img `/agents/xiaodengpao.webp`、role 調節器 Agent），點了觸發彩蛋 'bulb'
      （FirstPersonKingdomView 的 `t.id === 'sousou' ? 'soso' : t.id` 要加上 xiaodengpao → 'bulb'）；picking.ts 的 character id 也要加
- [ ] 求職廟裡的搜搜 NPC（`stylized/npcs.ts` createSosoNpc）可改用新造型
- [ ] Playwright 截圖逐一檢查六位角色（臉的方向、大小、穿模）
- [ ] 版本 4.3.2（#236），更新 versionData / package.json / platformManualData，出貨

## 待使用者決定／提醒
- 百工坊拆除範圍：使用者沒選，採「整條街重整」（拆大屋＋五間分類店鋪），已上線
- 大熊匠鋪位置使用者說會「再另選址」，目前在百工坊街右側
- database.rules.json（kingdomBoats、kingdomBonds）需要使用者到 Firebase 主控台發布
