import { jsPDF } from 'jspdf';
import { getCompetitionStageInfo } from '../utils/competitionSchedule';

/**
 * 產生 Word / Google Docs 格式的完整文字說明 (.doc)
 * 內容嚴格遵循官方競賽規章章程，確保所有金額、時程、點數與評審權重 100% 正確
 */
export function generateCompetitionDocContent(): string {
  const stageInfo = getCompetitionStageInfo();

  return `
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset="utf-8">
  <title>IdeaX 創星季 • 競賽辦法與實戰說明手冊</title>
  <style>
    body { font-family: 'Microsoft JhengHei', 'PingFang TC', sans-serif; line-height: 1.7; color: #1c1917; padding: 30px; }
    h1 { color: #b45309; font-size: 26pt; border-bottom: 3px solid #f59e0b; padding-bottom: 10px; margin-bottom: 16px; }
    h2 { color: #1c1917; font-size: 16pt; margin-top: 28px; border-left: 5px solid #f59e0b; padding-left: 10px; background-color: #fffbeb; padding-top: 4px; padding-bottom: 4px; }
    h3 { color: #44403c; font-size: 13pt; margin-top: 18px; }
    table { border-collapse: collapse; width: 100%; margin: 18px 0; }
    th, td { border: 1px solid #d6d3d1; padding: 10px 14px; text-align: left; font-size: 10.5pt; }
    th { background-color: #f5f5f4; font-weight: bold; color: #1c1917; }
    .highlight-card { background-color: #fafaf9; border-left: 4px solid #d97706; padding: 12px 16px; margin: 14px 0; }
    .footer { margin-top: 50px; font-size: 9.5pt; color: #a8a29e; text-align: center; border-top: 1px solid #e7e5e4; padding-top: 14px; }
  </style>
</head>
<body>
  <h1>IdeaX 創星季 • 官方競賽規章與實戰說明文件</h1>

  <h2>壹、競賽緣起與宗旨</h2>
  <div class="highlight-card">
    <p><strong>「先有痛點、後有解方」</strong>——IdeaX 創星季是全台首創結合生活切身痛點徵件、青年提案落地、大眾創星幣模擬募資與產學研智庫決選之全國創新提案挑戰賽。</p>
    <p>鼓勵任何在日常生活中碰到不便、困擾或產業難題的朋友勇敢提出痛點；同時提供大專院校青年與社會創客實戰舞台，將靈感化為具體落地回報與實質商業成果！</p>
  </div>

  <h2>貳、競賽 4 大關鍵階段時程</h2>
  <table>
    <thead>
      <tr>
        <th style="width: 25%;">賽事階段</th>
        <th style="width: 30%;">時程區間</th>
        <th style="width: 45%;">階段重點說明</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>全競賽報名時段</strong></td>
        <td>10/17 00:00 ～ 12/04 16:30</td>
        <td>線上即刻報名，以帳號算計一隊，個人或 1-5 人自由組隊。（※ 提痛點者請於 11/13 16:30 痛點徵件截止前完成報名）</td>
      </tr>
      <tr>
        <td><strong>第一階段：痛點徵件</strong></td>
        <td>10/24 00:00 ～ 11/13 16:30</td>
        <td>全體會員發表生活與產業切身痛點。痛點經審核通過即贈送 <strong>200 點</strong> 平台點數（價值 $250，效期 60 日）。</td>
      </tr>
      <tr>
        <td><strong>第二階段 (一)：預先提案</strong></td>
        <td>11/14 10:00 ～ 11/15 16:30</td>
        <td><strong>暫時關閉募資(投資)功能</strong>。僅開放註冊報名、線上提案提交、主辦單位審核及公眾預覽。</td>
      </tr>
      <tr>
        <td><strong>第二階段 (二)：模擬募資</strong></td>
        <td>11/16 10:00 ～ 12/04 16:30</td>
        <td><strong>全面開放功能</strong>！持續開放提案至 12/04 16:30 截止收件。用戶使用創星幣注資投票，募資總額前 20 名直接取得決選門票。</td>
      </tr>
      <tr>
        <td><strong>第三階段：進入決選(評審)</strong></td>
        <td>12/05 ～ 12/11</td>
        <td>由產學研專家團依四大維度指標（創新性40%、完整度20%、可行性20%、商業潛力20%）進行專業審查評分。</td>
      </tr>
      <tr>
        <td><strong>第四階段：公布結果</strong></td>
        <td>12/12 ～ 12/16</td>
        <td>首頁盛大公告最終得獎榜單，發放現金獎金、點數與榮譽徽章。</td>
      </tr>
    </tbody>
  </table>

  <h2>參、參賽資格與組隊規則</h2>
  <ul>
    <li><strong>參賽資格不設限：</strong>不限年齡、科系與身分，社會人士、自由創客、新創團隊與在校學生均可報名參賽。本活動開放國內外個人、團隊及法人參與。</li>
    <li><strong>海外參賽與境外撥款規範：</strong>本活動<strong>不提供跨國跨境支付</strong>；海外參賽團隊或外籍得獎者如獲獎，隊長或領獎人須提供中華民國（臺灣）境內合法金融機構或郵局之新台幣銀行帳戶以供電匯撥發，相關所得稅依法代扣。</li>
    <li><strong>組隊隊伍計算：</strong>本競賽以<strong>「每個帳號算計一隊」</strong>，可個人獨立提案，亦歡迎 1 至 5 人組隊投件。</li>
    <li><strong>提案數量不設限：</strong><strong>每隊不限提案或痛點數量</strong>！同帳號可提出多個痛點，亦可在想解方階段投稿多件解方企劃，各案獨立受評。</li>
    <li><strong>專家身分利益迴避：</strong>申請專家需提供資歷審核，<strong>不可兼任參賽者與專家</strong>，以維持評審客觀公正。</li>
  </ul>

  <h2>肆、三大角色權益與獎勵制度</h2>
  <table>
    <thead>
      <tr>
        <th>角色類別</th>
        <th>主要權益與任務</th>
        <th>專屬獎勵配額</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>提案參賽團隊</strong></td>
        <td>針對痛點提出具商業與社會落地價值的創新解方；號召社群注資並爭取專家評選青睞。</td>
        <td>角逐冠軍總值 NT$30,000（NT$20,000 現金 ＋ 8,000 點，效期 180 日），頒發官方「創之星」最高榮譽徽章與媒體曝光。</td>
      </tr>
      <tr>
        <td><strong>痛點許願者</strong></td>
        <td>發布切身生活或產業痛點，由全台青年創客為您設計解答方案。</td>
        <td>痛點過審即送 <strong>200 點</strong>（價值 $250，效期 60 日）；若採納該痛點之解方最終獲得前 1~3 名，原痛點者另獲 <strong>NT$1,500 等值好禮</strong>（含 1,200 點提問金）；4~10 名享 <strong>$500 好禮</strong>（含 400 點提問金）。</td>
      </tr>
      <tr>
        <td><strong>產學研專家</strong></td>
        <td>實名認證之產學專家與導師，提供專業實務觀點與深度評分。</td>
        <td>審核通過配發 <strong>3,000,000 創星幣</strong> 專屬評審注資額度，獲頒官方專家導師勳章與新創對接指導機會。</td>
      </tr>
    </tbody>
  </table>

  <h2>伍、官方大獎與評選佔比</h2>
  <h3>1. 決選獲獎名額與獎金表</h3>
  <ul>
    <li>🥇 <strong>第一名（冠軍）：</strong>總價值 <strong>NT$ 30,000</strong>（NT$ 20,000 現金 ＋ 8,000 點 IdeaX 平台點數，效期 180 日 ＋ 官方「創之星」最高榮譽徽章）</li>
    <li>🥈 <strong>第二名（亞軍）：</strong>總價值 <strong>NT$ 10,000</strong>（NT$ 6,000 現金 ＋ 3,200 點 IdeaX 平台點數，效期 180 日 ＋ 官方「創之星」榮譽徽章）</li>
    <li>🥉 <strong>第三名（季軍）：</strong>總價值 <strong>NT$ 5,000</strong>（NT$ 3,000 現金 ＋ 1,600 點 IdeaX 平台點數，效期 180 日 ＋ 官方「創之星」榮譽徽章）</li>
    <li>💡 <strong>痛點採用好禮：</strong>前 1~3 名採用贈價值 <strong>NT$ 1,500</strong> 好禮（含 1,200 點提問金）；前 4~10 名採用贈價值 <strong>$500</strong> 好禮（含 400 點提問金，效期 60 日）</li>
    <li>📣 <strong>推廣大使推薦獎勵：</strong>每成功推薦 1 組提案初審通過即獲 <strong>300 點</strong>（價值 $400）平台點數（效期 60 日，多推多得無上限）</li>
  </ul>

  <h3>2. 決選四大評審維度與評分佔比</h3>
  <ul>
    <li><strong>創新性 (40%)：</strong>技術突破、創意思維、獨特性與市場差異化競爭優勢。</li>
    <li><strong>完整度 (20%)：</strong>提案企劃架構完整度、邏輯嚴密性與文字陳述清晰度。</li>
    <li><strong>可行性 (20%)：</strong>落地實施路徑、原型製作技術成熟度與成本結構合理性。</li>
    <li><strong>商業潛力 (20%)：</strong>目標市場規模、客戶需求深度、營運模式與商業化發展潛力。</li>
  </ul>

  <h2>陸、代幣與點數期限特別約定</h2>
  <div class="highlight-card">
    <p><strong>創星幣性質與注資上限：</strong>創星幣純屬競賽期間「市場模擬關注度驗證」工具，新用戶登入即送 100,000 創星幣，分享推薦碼送 100 創星幣。單案支持上限：參賽者與一般用戶對單一解方提案之最高注資上限為 50,000 創星幣，專家對單一解方提案之最高注資上限為 2,000,000 創星幣；可以自我注資。創星幣不具法幣價值，嚴禁私下買賣兌現，與主站真實錢包資產獨立隔離。</p>
    <p><strong>點數有效期限：</strong>特別約定前三名（冠、亞、季軍）獲獎團隊點數效期為 <strong>180 日</strong>；其餘所有活動贈送點數（痛點過審 200 點、採用好禮、推廣推薦 300 點等）效期均為 <strong>60 日</strong>，可用於 IdeaX 創點子平台發布懸賞提問與各項加值功能，請及時使用完畢。</p>
  </div>

  <h2>柒、常見問題 (FAQ) 精華彙整</h2>
  <p><strong>Q1: 為什麼前 20 名進入決選？</strong><br>
  A: 第二階段模擬募資旨在測試市場反應力與大眾期待，募得創星幣排名前 20 名優秀提案將直接取得決選門票，由專家團依四大維度進行專業決審。</p>

  <p><strong>Q2: 推廣大使獎勵何時發放？</strong><br>
  A: 被推薦團隊提交專案經主辦單位初審通過後，系統即自動發放 300 點 IdeaX 平台點數（價值 $400）至推薦人帳戶，累積無上限。</p>

  <p><strong>Q3: 痛點提出者可以同時報名組隊提案嗎？</strong><br>
  A: 完全可以！同帳號可提出多個痛點，亦可在想解方階段針對自己或他人之痛點提出創新企劃，各案獨立受評。</p>

  <p><strong>Q4: 海外人士參賽與獎金撥款規範？</strong><br>
  A: 開放國內外個人、團隊及法人參與。活動不提供跨國跨境支付，海外參賽團隊獲獎須提供中華民國（臺灣）境內合法金融機構或郵局之新台幣銀行帳戶以供電匯撥發，所得稅依法代扣。</p>

  <div class="footer">
    IdeaX 創點子團隊 • 創星季官方賽事委員會 • 官方網站：https://www.ideax.tw
  </div>
</body>
</html>
`;
}

/**
 * 輔助畫圓角矩形
 */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * 輔助自動折行計算，確保中英文長文本在 Canvas 指定寬度內完美換行不跑版
 */
function wrapTextLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const result: string[] = [];
  const paragraphs = text.split('\n');

  for (const para of paragraphs) {
    if (!para) {
      result.push('');
      continue;
    }
    let currentLine = '';
    for (let i = 0; i < para.length; i++) {
      const char = para[i];
      const testLine = currentLine + char;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && currentLine.length > 0) {
        result.push(currentLine);
        currentLine = char;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      result.push(currentLine);
    }
  }
  return result;
}

/**
 * 繪製折行文字並回傳佔用總高度
 */
function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
): number {
  const lines = wrapTextLines(ctx, text, maxWidth);
  lines.forEach((line, idx) => {
    ctx.fillText(line, x, y + idx * lineHeight);
  });
  return lines.length * lineHeight;
}

/**
 * 繪製投影片頂部 Header
 */
function drawSlideHeader(
  ctx: CanvasRenderingContext2D,
  width: number,
  title: string,
  subtitle: string
): void {
  ctx.fillStyle = '#fffbeb';
  ctx.fillRect(0, 0, width, 140);
  ctx.fillStyle = '#d97706';
  ctx.fillRect(0, 136, width, 4);

  ctx.fillStyle = '#1c1917';
  ctx.font = '900 36px "Microsoft JhengHei", "PingFang TC", sans-serif';
  ctx.fillText(title, 80, 70);

  ctx.fillStyle = '#78716c';
  ctx.font = 'bold 20px "Microsoft JhengHei", "PingFang TC", sans-serif';
  ctx.fillText(subtitle, 80, 110);
}

/**
 * 繪製簡報幻燈片 Slide 到 Canvas
 * 嚴格遵循官方規章數據：四大維度、正確獎金配額、300點推廣獎勵與正確時程
 */
function renderSlideToCanvas(
  slideIndex: number,
  canvasWidth = 1414,
  canvasHeight = 1000
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  if (slideIndex === 0) {
    // ================= Slide 1: 封面簡報 =================
    ctx.fillStyle = '#fef3c7';
    roundRect(ctx, 80, 80, 480, 52, 26);
    ctx.fill();
    ctx.fillStyle = '#92400e';
    ctx.font = 'bold 24px "Microsoft JhengHei", "PingFang TC", sans-serif';
    ctx.fillText('★ 官方競賽懶人包 • 實戰圖文簡報', 105, 114);

    ctx.fillStyle = '#1c1917';
    ctx.font = '900 68px "Microsoft JhengHei", "PingFang TC", sans-serif';
    ctx.fillText('IdeaX 創星季', 80, 230);

    ctx.fillStyle = '#b45309';
    ctx.font = '900 48px "Microsoft JhengHei", "PingFang TC", sans-serif';
    ctx.fillText('全國創新提案與痛點共創挑戰賽', 80, 300);

    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(80, 340);
    ctx.lineTo(800, 340);
    ctx.stroke();

    const cards = [
      { title: '💡 痛點許願共創', desc: '全民提出切身痛點\n過審送200點，採用拿$1,500' },
      { title: '🪙 創星幣模擬募資', desc: '大眾注資投票驗證市場\n募資前 20 名直通決選' },
      { title: '🏆 專家智庫決選', desc: '產學專家專業評審\n冠軍總值 $30,000 (現金2萬)' },
    ];

    cards.forEach((card, i) => {
      const cardX = 80 + i * 420;
      const cardY = 400;
      ctx.fillStyle = '#ffffff';
      roundRect(ctx, cardX, cardY, 390, 200, 20);
      ctx.fill();
      ctx.strokeStyle = '#fde68a';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#1c1917';
      ctx.font = 'bold 26px "Microsoft JhengHei", "PingFang TC", sans-serif';
      ctx.fillText(card.title, cardX + 24, cardY + 54);

      ctx.fillStyle = '#57534e';
      ctx.font = 'normal 19px "Microsoft JhengHei", "PingFang TC", sans-serif';
      drawWrappedText(ctx, card.desc, cardX + 24, cardY + 105, 342, 32);
    });

    ctx.fillStyle = '#78716c';
    ctx.font = 'bold 22px "Microsoft JhengHei", "PingFang TC", sans-serif';
    ctx.fillText('主辦單位：IdeaX 創點子團隊  |  賽期：2026.10.17 ～ 12.16  |  官網：www.ideax.tw', 80, 720);
  } else if (slideIndex === 1) {
    // ================= Slide 2: 4 大階段賽程流程圖 =================
    drawSlideHeader(ctx, canvasWidth, '賽事 4 大關鍵階段流程 (Visual Roadmap)', '掌握遞進時程，不錯過關鍵節點');

    const phases = [
      {
        num: '01',
        tag: '10/17 ~ 12/04',
        title: '線上即刻報名',
        desc: '大專學生、社會創客免費報名。\n以帳號計為一隊，個人或 1-5 人自由組隊。',
        color: '#2563eb',
        bg: '#eff6ff',
      },
      {
        num: '02',
        tag: '10/24 ~ 11/13',
        title: '痛點許願徵件',
        desc: '發表生活或產業切身痛點！\n痛點過審即送 200 點，獲採用最高拿 $1,500。',
        color: '#e11d48',
        bg: '#fff1f2',
      },
      {
        num: '03',
        tag: '11/16 ~ 12/04',
        title: '解方與模擬募資',
        desc: '提交解方企劃！大眾創星幣注資投票。\n募資前 20 名直通第三階段專家決選！',
        color: '#059669',
        bg: '#ecfdf5',
      },
      {
        num: '04',
        tag: '12/05 ~ 12/16',
        title: '專家決選與公布',
        desc: '產學評審團四大維度指標打分。\n首頁公告前三名榜單，頒發現金大獎與榮譽！',
        color: '#7c3aed',
        bg: '#f5f3ff',
      },
    ];

    phases.forEach((p, i) => {
      const px = 80 + i * 315;
      const py = 220;
      ctx.fillStyle = p.bg;
      roundRect(ctx, px, py, 295, 480, 24);
      ctx.fill();
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = p.color;
      ctx.font = '900 44px "Microsoft JhengHei", "PingFang TC", sans-serif';
      ctx.fillText(p.num, px + 24, py + 64);

      ctx.fillStyle = '#1c1917';
      ctx.font = 'bold 18px "Microsoft JhengHei", "PingFang TC", sans-serif';
      ctx.fillText(p.tag, px + 24, py + 110);

      ctx.fillStyle = '#1c1917';
      ctx.font = '900 24px "Microsoft JhengHei", "PingFang TC", sans-serif';
      ctx.fillText(p.title, px + 24, py + 160);

      // 自動折行，嚴格限制在卡片可用寬度 (295 - 48 = 247px) 內，絕不溢出至相鄰卡片
      ctx.fillStyle = '#44403c';
      ctx.font = 'normal 17px "Microsoft JhengHei", "PingFang TC", sans-serif';
      drawWrappedText(ctx, p.desc, px + 24, py + 225, 247, 28);
    });

    ctx.fillStyle = '#b45309';
    ctx.font = 'bold 20px "Microsoft JhengHei", "PingFang TC", sans-serif';
    ctx.fillText('※ 備註：11/14 10:00 ～ 11/15 16:30 為預先提案階段（關閉募資功能，僅供提案、審核與預覽）。', 80, 780);
  } else if (slideIndex === 2) {
    // ================= Slide 3: 三大參賽角色權益 =================
    drawSlideHeader(ctx, canvasWidth, '三大角色權益與獎勵制度 (Role Privileges)', '創客、許願者或導師，皆有專屬實戰回報');

    const roles = [
      {
        badge: '提案參賽團隊',
        title: '青年創客 / 解方團隊',
        color: '#d97706',
        bg: '#fffbeb',
        items: [
          '• 冠軍總值 $30,000 (現金2萬+8千點，180天)',
          '• 亞軍總值 $10,000 (現金6千+3,200點，180天)',
          '• 季軍總值 $5,000 (現金3千+1,600點，180天)',
          '• 獲產學專家實名點評與官方「創之星」徽章',
          '• 以帳號為一隊，每隊不限提案與痛點數量',
        ],
      },
      {
        badge: '痛點許願者',
        title: '生活難題 / 產業痛點提出者',
        color: '#e11d48',
        bg: '#fff1f2',
        items: [
          '• 發表切身難題，審核通過即獲 200 點',
          '• 解方獲選前 1~3 名，痛點者另獲 $1,500 好禮',
          '• 解方獲選前 4~10 名，痛點者另獲 $500 好禮',
          '• 全台青年創客為您的困擾量身打造解法',
        ],
      },
      {
        badge: '產學研專家',
        title: '產業智庫 / 專家評審團',
        color: '#7c3aed',
        bg: '#f5f3ff',
        items: [
          '• 實名審核通過獲 3,000,000 創星幣評審額度',
          '• 頒發官方實名專家認證導師徽章與點評權',
          '• 依四大維度指標專業決審打分',
          '• 利益迴避原則：專家不得兼任參賽者',
        ],
      },
    ];

    roles.forEach((r, idx) => {
      const rx = 80 + idx * 420;
      const ry = 220;
      ctx.fillStyle = r.bg;
      roundRect(ctx, rx, ry, 390, 520, 24);
      ctx.fill();
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = r.color;
      roundRect(ctx, rx + 24, ry + 24, 180, 42, 12);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px "Microsoft JhengHei", "PingFang TC", sans-serif';
      ctx.fillText(r.badge, rx + 40, ry + 52);

      ctx.fillStyle = '#1c1917';
      ctx.font = '900 24px "Microsoft JhengHei", "PingFang TC", sans-serif';
      ctx.fillText(r.title, rx + 24, ry + 110);

      // 條目折行，嚴格限制在卡片可用寬度 (390 - 48 = 342px) 內
      ctx.fillStyle = '#44403c';
      ctx.font = 'normal 17px "Microsoft JhengHei", "PingFang TC", sans-serif';
      let currentItemY = ry + 160;
      r.items.forEach((item) => {
        const itemHeight = drawWrappedText(ctx, item, rx + 24, currentItemY, 342, 26);
        currentItemY += itemHeight + 14;
      });
    });
  } else if (slideIndex === 3) {
    // ================= Slide 4: 官方大獎配額與評審維度 =================
    drawSlideHeader(ctx, canvasWidth, '官方大獎配額與專家評審維度 (Prizes & Evaluation)', '真金白銀獎勵與 4 大專業指標機制');

    // 獎金卡片 (左側)
    const awards = [
      {
        rank: '🥇 冠軍 (First Prize)',
        money: '總價值 NT$ 30,000',
        bonus: 'NT$ 20,000 現金 ＋ 8,000 點平台點數 (180日)',
        border: '#f59e0b',
        bg: '#fffbeb',
      },
      {
        rank: '🥈 亞軍 (Second Prize)',
        money: '總價值 NT$ 10,000',
        bonus: 'NT$ 6,000 現金 ＋ 3,200 點平台點數 (180日)',
        border: '#94a3b8',
        bg: '#f8fafc',
      },
      {
        rank: '🥉 季軍 (Third Prize)',
        money: '總價值 NT$ 5,000',
        bonus: 'NT$ 3,000 現金 ＋ 1,600 點平台點數 (180日)',
        border: '#d97706',
        bg: '#fffbeb',
      },
    ];

    awards.forEach((a, i) => {
      const ay = 200 + i * 145;
      ctx.fillStyle = a.bg;
      roundRect(ctx, 80, ay, 620, 130, 18);
      ctx.fill();
      ctx.strokeStyle = a.border;
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = '#1c1917';
      ctx.font = '900 22px "Microsoft JhengHei", "PingFang TC", sans-serif';
      ctx.fillText(a.rank, 105, ay + 38);

      ctx.fillStyle = '#b45309';
      ctx.font = '900 28px "Microsoft JhengHei", "PingFang TC", sans-serif';
      ctx.fillText(a.money, 105, ay + 76);

      ctx.fillStyle = '#57534e';
      ctx.font = 'bold 16px "Microsoft JhengHei", "PingFang TC", sans-serif';
      ctx.fillText(a.bonus, 105, ay + 108);
    });

    // 附加獎勵小橫條
    ctx.fillStyle = '#fef3c7';
    roundRect(ctx, 80, 650, 620, 75, 16);
    ctx.fill();
    ctx.strokeStyle = '#fde68a';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#92400e';
    ctx.font = 'bold 18px "Microsoft JhengHei", "PingFang TC", sans-serif';
    ctx.fillText('💡 痛點採用獎：前3名贈 $1,500 好禮；前4~10名贈 $500 好禮', 105, 682);
    ctx.fillText('📣 推廣大使獎：每成功推薦 1 案審核通過即獲 300 點 (無上限)', 105, 710);

    // 右側：專家評分四大維度
    const evalCardX = 740;
    const evalCardY = 200;
    ctx.fillStyle = '#1e293b';
    roundRect(ctx, evalCardX, evalCardY, 590, 525, 24);
    ctx.fill();

    ctx.fillStyle = '#fde68a';
    ctx.font = '900 28px "Microsoft JhengHei", "PingFang TC", sans-serif';
    ctx.fillText('專家決選 4 大評審指標維度', evalCardX + 36, evalCardY + 54);

    const criterias = [
      { name: '1. 創新性 (40%)', desc: '• 技術突破、創意思維、原創構想\n• 與現有市場之差異化競爭優勢' },
      { name: '2. 完整度 (20%)', desc: '• 提案企劃架構完整度與邏輯嚴密性\n• 使用者情境陳述清晰度' },
      { name: '3. 可行性 (20%)', desc: '• 落地實施路徑與原型製作成熟度\n• 成本結構與實施期程合理性' },
      { name: '4. 商業潛力 (20%)', desc: '• 目標市場規模與客戶需求深度\n• 商業化推進與後續拓展潛力' },
    ];

    criterias.forEach((c, idx) => {
      const cy = evalCardY + 100 + idx * 102;
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 22px "Microsoft JhengHei", "PingFang TC", sans-serif';
      ctx.fillText(c.name, evalCardX + 36, cy);

      ctx.fillStyle = '#cbd5e1';
      ctx.font = 'normal 17px "Microsoft JhengHei", "PingFang TC", sans-serif';
      const lines = c.desc.split('\n');
      lines.forEach((l, li) => {
        ctx.fillText(l, evalCardX + 36, cy + 24 + li * 22);
      });
    });
  } else if (slideIndex === 4) {
    // ================= Slide 5: FAQ 常見問答 =================
    drawSlideHeader(ctx, canvasWidth, '參賽選手與許願者常見問答 (Key FAQ)', '釐清規則細節，順利提案過關');

    const faqs = [
      {
        q: 'Q: 參賽有身分限制嗎？海外人士可以參加嗎？',
        a: 'A: 完全無限制！開放國內外個人、團隊及法人參與。但活動不支援跨境支付，海外團隊獲獎須提供臺灣銀行帳戶供電匯。',
      },
      {
        q: 'Q: 痛點提出者與推廣大使有什麼獎勵？',
        a: 'A: 痛點過審即送 200 點；獲前三名採用另贈 $1,500 好禮！推廣大使每推薦 1 案審核通過享 300 點獎勵（無上限）。',
      },
      {
        q: 'Q: 參賽隊伍如何計算？同一隊可以投稿多個提案嗎？',
        a: 'A: 本競賽「以每個帳號算計一隊」，且「每隊不限提案或痛點數量」！可針對不同痛點提交多組獨立提案。',
      },
      {
        q: 'Q: 什麼是創星幣？單案支持上限與自我注資規範？',
        a: 'A: 創星幣為模擬工具不可兌現；參賽者與一般用戶單案上限 50,000、專家 2,000,000 創星幣，可以自我注資！',
      },
    ];

    faqs.forEach((faq, idx) => {
      const fy = 190 + idx * 148;
      ctx.fillStyle = '#f8fafc';
      roundRect(ctx, 80, fy, canvasWidth - 160, 132, 18);
      ctx.fill();
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#b45309';
      ctx.font = 'bold 21px "Microsoft JhengHei", "PingFang TC", sans-serif';
      drawWrappedText(ctx, faq.q, 110, fy + 38, canvasWidth - 220, 28);

      ctx.fillStyle = '#334155';
      ctx.font = 'normal 18px "Microsoft JhengHei", "PingFang TC", sans-serif';
      drawWrappedText(ctx, faq.a, 110, fy + 74, canvasWidth - 220, 26);
    });
  }

  // 底部共通頁尾
  ctx.fillStyle = '#a8a29e';
  ctx.font = 'normal 18px "Microsoft JhengHei", "PingFang TC", sans-serif';
  ctx.fillText(`IdeaX 創星季 • 官方競賽懶人包簡報  |  第 ${slideIndex + 1} 頁 / 共 5 頁`, 80, 960);

  return canvas;
}

/**
 * 生成包含 5 頁幻燈片的競賽說明簡報 PDF Blob
 */
export async function generateCompetitionPresentationPdfBlob(): Promise<Blob> {
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const totalSlides = 5;

  for (let i = 0; i < totalSlides; i++) {
    if (i > 0) {
      pdf.addPage('a4', 'landscape');
    }
    const canvas = renderSlideToCanvas(i);
    const imgData = canvas.toDataURL('image/jpeg', 0.92);
    pdf.addImage(imgData, 'JPEG', 0, 0, 297, 210);
  }

  return pdf.output('blob');
}

/**
 * 打包下載完整競賽懶人包 ZIP (動態包含管理員存入與保留的檔案清單)
 */
export async function downloadCompetitionPackage(): Promise<void> {
  const { downloadManagedCompetitionPackage } = await import('./cheatSheetFileManagerService');
  await downloadManagedCompetitionPackage();
}

/**
 * 單獨下載 PDF 圖文說明簡報
 */
export async function downloadCompetitionPdfOnly(): Promise<void> {
  const pdfBlob = await generateCompetitionPresentationPdfBlob();
  const url = URL.createObjectURL(pdfBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'IdeaX_創星季_競賽圖文說明簡報.pdf';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 單獨下載 Docs 文字說明
 */
export function downloadCompetitionDocOnly(): void {
  const docHtml = generateCompetitionDocContent();
  const blob = new Blob(['\ufeff', docHtml], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'IdeaX_創星季_競賽辦法完整文字說明.doc';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
