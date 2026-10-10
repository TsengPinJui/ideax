/**
 * 創點子 IdeaX - 正式商業契約與和解協議書生成引擎
 * 依據中華民國民法（委任、承攬、和解章節）及電子簽章法規範生成具法定效力之電子商業契約
 */

export interface ContractParty {
  id: string;
  name: string;
  title?: string;
  email?: string;
  verifiedStatus?: string;
}

export interface ContractData {
  contractId: string;
  contractType: 'commercial_service' | 'dispute_settlement';
  title: string;
  questionTitle?: string;
  createdAt: string;
  signedAt: string;
  effectiveDate: string;
  buyer: ContractParty;
  seller: ContractParty;
  amount: number;
  description: string;
  deliverables?: string[];
  estimatedDays?: number;
  paywalledContent?: string;
  mediationDetails?: {
    reportTitle?: string;
    settlementTerms?: string[];
    payoutAmount?: number;
    refundAmount?: number;
    extendedDays?: number;
    agreedOption?: string;
    recommendedAction?: string;
  };
  electronicSignatureHash: string;
  platformWitness: string;
}

/**
 * 產生合約數位存證防偽雜湊碼 (SHA-256 Mock / Timestamp Hash)
 */
export function generateSignatureHash(id: string, buyerId: string, sellerId: string, amount: number): string {
  const seed = `${id}_${buyerId}_${sellerId}_${amount}_${Date.now()}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0').toUpperCase();
  const timeHex = Date.now().toString(16).slice(-6).toUpperCase();
  return `IDX-AUTH-${hex}-${timeHex}-SECURE`;
}

/**
 * 產生正式契約完整 HTML (含列印樣式、公證章、水印、排版)
 */
export function generateContractHtml(data: ContractData): string {
  const isMediation = data.contractType === 'dispute_settlement';
  const mainTitle = isMediation
    ? '《IdeaX 創點子平台爭議調處成立暨商業和解協議書》'
    : '《IdeaX 創點子平台專業諮詢暨商業勞務委任契約書》';

  const subTypeTag = isMediation
    ? '法定民事爭議和解契約 • 具民法和解創設效力'
    : '正式商業委託勞務契約 • 第三方價金託管公證';

  const deliverablesList = data.deliverables && data.deliverables.length > 0
    ? data.deliverables.map((d, i) => `<li><strong>第 ${i + 1} 項：</strong>${escapeHtml(d)}</li>`).join('')
    : `<li>依雙方於 IdeaX 平台聊天室及需求描述約定之專業交付標準</li>`;

  const amountFormatted = (data.amount || 0).toLocaleString();

  return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(mainTitle)} - ${escapeHtml(data.contractId)}</title>
  <style>
    @page {
      size: A4;
      margin: 18mm 20mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: "PingFang TC", "Microsoft JhengHei", "Noto Sans TC", sans-serif;
      line-height: 1.65;
      color: #1c1917;
      background-color: #fcfbf9;
      margin: 0;
      padding: 24px;
    }
    .contract-wrapper {
      max-width: 800px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #e7e5e4;
      border-radius: 12px;
      padding: 44px 52px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
      position: relative;
    }
    .watermark {
      position: absolute;
      top: 45%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-30deg);
      font-size: 76px;
      font-weight: 900;
      color: rgba(217, 119, 6, 0.04);
      white-space: nowrap;
      pointer-events: none;
      user-select: none;
      letter-spacing: 6px;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #b45309;
      padding-bottom: 18px;
      margin-bottom: 24px;
    }
    .badge {
      display: inline-block;
      font-size: 11px;
      font-weight: 800;
      color: #92400e;
      background: #fef3c7;
      border: 1px solid #fde68a;
      padding: 3px 12px;
      border-radius: 9999px;
      margin-bottom: 8px;
      letter-spacing: 0.5px;
    }
    h1 {
      font-size: 22px;
      font-weight: 900;
      color: #1c1917;
      margin: 6px 0 4px 0;
      letter-spacing: 0.5px;
    }
    .meta-bar {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: #78716c;
      font-family: monospace;
      margin-top: 10px;
    }
    .parties-card {
      background: #fafaf9;
      border: 1px solid #e7e5e4;
      border-radius: 8px;
      padding: 14px 18px;
      margin-bottom: 24px;
      font-size: 12px;
    }
    .party-row {
      display: flex;
      margin-bottom: 6px;
    }
    .party-row:last-child {
      margin-bottom: 0;
    }
    .party-label {
      width: 140px;
      font-weight: 800;
      color: #44403c;
      flex-shrink: 0;
    }
    .party-val {
      color: #1c1917;
      font-weight: 600;
    }
    .article {
      margin-bottom: 20px;
      font-size: 12.5px;
      text-align: justify;
    }
    .article-title {
      font-weight: 800;
      font-size: 13.5px;
      color: #78350f;
      margin-bottom: 6px;
      border-left: 3px solid #d97706;
      padding-left: 8px;
    }
    .article-content {
      color: #292524;
      padding-left: 11px;
    }
    .deliverables-box {
      background: #fefce8;
      border: 1px solid #fef08a;
      border-radius: 6px;
      padding: 10px 16px;
      margin: 8px 0;
    }
    .deliverables-box ul {
      margin: 4px 0;
      padding-left: 20px;
    }
    .price-highlight {
      font-weight: 900;
      color: #9a3412;
      font-family: monospace;
      font-size: 14px;
      background: #ffedd5;
      padding: 1px 6px;
      border-radius: 4px;
    }
    .signatures-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 12px;
      margin-top: 32px;
      padding-top: 20px;
      border-top: 2px dashed #d6d3d1;
    }
    .sig-card {
      border: 1px solid #e7e5e4;
      border-radius: 8px;
      padding: 12px;
      background: #fafaf9;
      text-align: center;
      position: relative;
    }
    .sig-role {
      font-size: 11px;
      font-weight: 800;
      color: #78716c;
      margin-bottom: 4px;
    }
    .sig-name {
      font-size: 13px;
      font-weight: 900;
      color: #1c1917;
      margin-bottom: 8px;
    }
    .stamp-seal {
      width: 72px;
      height: 72px;
      border: 2px solid #dc2626;
      border-radius: 50%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      margin: 4px auto;
      color: #dc2626;
      font-size: 10px;
      font-weight: 900;
      transform: rotate(-8deg);
      line-height: 1.1;
      background: rgba(254, 242, 242, 0.4);
    }
    .sig-time {
      font-size: 9px;
      color: #78716c;
      font-family: monospace;
      margin-top: 6px;
    }
    .footer-note {
      text-align: center;
      font-size: 10px;
      color: #a8a29e;
      margin-top: 24px;
      border-top: 1px solid #f5f5f4;
      padding-top: 12px;
    }
    .print-actions {
      text-align: center;
      margin-bottom: 16px;
    }
    .btn-print {
      background: #b45309;
      color: #ffffff;
      border: none;
      font-weight: 800;
      padding: 10px 24px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 13px;
      box-shadow: 0 2px 8px rgba(180, 83, 9, 0.3);
    }
    .btn-print:hover {
      background: #92400e;
    }
    @media print {
      body {
        background: transparent;
        padding: 0;
      }
      .contract-wrapper {
        border: none;
        padding: 0;
        box-shadow: none;
      }
      .print-actions {
        display: none;
      }
    }
  </style>
</head>
<body>
  <div class="print-actions">
    <button type="button" class="btn-print" onclick="window.print()">🖨️ 立即列印存證 / 另存為 PDF 契約文件</button>
  </div>

  <div class="contract-wrapper">
    <div class="watermark">IDEAX VERIFIED</div>

    <div class="header">
      <div class="badge">${subTypeTag}</div>
      <h1>${escapeHtml(mainTitle)}</h1>
      <div class="meta-bar">
        <span>契約編號：${escapeHtml(data.contractId)}</span>
        <span>生效日期：${escapeHtml(data.effectiveDate)}</span>
        <span>存證驗證碼：${escapeHtml(data.electronicSignatureHash)}</span>
      </div>
    </div>

    <!-- 契約當事人 -->
    <div class="parties-card">
      <div class="party-row">
        <div class="party-label">委託人（甲方）：</div>
        <div class="party-val">${escapeHtml(data.buyer.name)} ${data.buyer.title ? `（${escapeHtml(data.buyer.title)}）` : ''} • 用戶ID: ${escapeHtml(data.buyer.id)}</div>
      </div>
      <div class="party-row">
        <div class="party-label">受託專家（乙方）：</div>
        <div class="party-val">${escapeHtml(data.seller.name)} ${data.seller.title ? `（${escapeHtml(data.seller.title)}）` : ''} • 用戶ID: ${escapeHtml(data.seller.id)}</div>
      </div>
      <div class="party-row">
        <div class="party-label">履約見證（丙方）：</div>
        <div class="party-val">IdeaX 創點子團隊（商業技術履約託管見證方）</div>
      </div>
    </div>

    <!-- 契約條款 -->
    <div class="article">
      <div class="article-title">第一條：委託標的與專案範疇</div>
      <div class="article-content">
        <p>1. 甲方委託乙方執行<strong>【${escapeHtml(data.title)}】</strong>之專業諮詢、技術研究或解答交付勞務，乙方同意依專業誠信原則履行本契約所載義務。</p>
        ${data.questionTitle ? `<p>2. 本專案關聯之原始平台問題/委託背景：<strong>${escapeHtml(data.questionTitle)}</strong>。</p>` : ''}
        <p>3. <strong>約定具體交付成果項目清單：</strong></p>
        <div class="deliverables-box">
          <ul>
            ${deliverablesList}
          </ul>
        </div>
        ${data.description ? `<p>4. <strong>委託說明與規格：</strong>${escapeHtml(data.description)}</p>` : ''}
      </div>
    </div>

    <div class="article">
      <div class="article-title">第二條：委託報酬總額與第三方金流履約託管</div>
      <div class="article-content">
        <p>1. 本專案委託報酬總額為新臺幣 <span class="price-highlight">NT$ ${amountFormatted} 元整</span>。</p>
        <p>2. <strong>第三方履約託管機制：</strong>甲方於線上同意採納本方案時，已將全額款項全數交付丙方（IdeaX 創點子團隊）指定之第三方履約專戶獨立保管，於乙方交付成果並經甲方依約驗收通過前，任何一方均不得擅自挪用或提取，以確保雙方交易履約安全。</p>
        <p>3. 乙方完成履約交付並經甲方驗收合格後，丙方將依平台規範自動將款項結算劃撥至乙方帳戶。</p>
      </div>
    </div>

    <div class="article">
      <div class="article-title">第三條：履約期程、成果交付與驗收流程</div>
      <div class="article-content">
        <p>1. <strong>履約交付期限：</strong>乙方應於契約成立生效日起 <span class="price-highlight">${data.estimatedDays || 3} 個工作天內</span>，完成全部約定成果並上傳交付至 IdeaX 平台專屬存證聊天室或案件專區。</p>
        <p>2. <strong>驗收與放款：</strong>甲方應於收到乙方交付成果後進行客觀審查。若符合約定標準，甲方應於系統點擊「確認完成交付」，系統即自動解除款項託管並完成放款。</p>
        <p>3. 若甲方逾期未表示異議亦未驗收，系統將依平台營運條款進入自動驗收防禦保護流程。</p>
      </div>
    </div>

    <div class="article">
      <div class="article-title">第四條：智慧財產權歸屬與使用授權</div>
      <div class="article-content">
        <p>1. 乙方保證其交付之一切成果均為自主研發、合法創作或具備合法授權，絕無侵害任何第三人之專利權、著作權、商標權或營業秘密。</p>
        <p>2. 於甲方全額給付報酬並完成驗收結案時，本專案約定交付成果之著作財產權及所有權即全數合法移轉或專屬授權予甲方享有。</p>
      </div>
    </div>

    <div class="article">
      <div class="article-title">第五條：保密協定與資料安全保護 (NDA)</div>
      <div class="article-content">
        <p>1. 雙方因履行本契約所獲悉之對方商業機密、技術文件、經營資訊、個人資料或未公開數據，均負有嚴格之法定保密義務。</p>
        <p>2. 未經對方事前書面許可，任何一方不得將保密資訊洩漏、交付或揭露予任何無關第三人，此保密責任於本契約終止後持續有效。</p>
      </div>
    </div>

    <div class="article">
      <div class="article-title">第六條：爭議處理、平台調處與合意管轄法院</div>
      <div class="article-content">
        <p>1. 履約過程如遇認知歧異或瑕疵爭議，雙方合意優先依 IdeaX 平台「AI 三方比對調處」或平台專屬調解機制協商解決。</p>
        <p>2. 本契約之解釋與適用均依中華民國法律為準據法。若因本契約涉訟，雙方合意以<strong>臺灣臺北地方法院</strong>為第一審專屬管轄法院。</p>
      </div>
    </div>

    <div class="article">
      <div class="article-title">第七條：電子簽章法定效力與數位存證</div>
      <div class="article-content">
        <p>本契約依中華民國《電子簽章法》第 4 條及第 9 條規範訂立，雙方於 IdeaX 平台點選同意、採納方案或確認簽署之數位紀錄，具備完全之法定書面契約效力，並由平台伺服器安全存證。</p>
      </div>
    </div>

    <div class="article" style="background: #fafaf9; border: 1px solid #e7e5e4; border-radius: 8px; padding: 14px 16px; margin-top: 14px;">
      <div class="article-title" style="color: #78716c; font-size: 11px; margin-bottom: 4px;">第八條：AI 輔助調解契約生成與平台免責聲明</div>
      <div class="article-content" style="font-size: 10px; color: #57534e; line-height: 1.6;">
        <p style="margin-bottom: 4px;">1. 本契約暨調解協議內容係經由雙方於 IdeaX 平台合意，並由系統 AI 依當事人提供之提案、交付標準或和解條款輔助梳理生成之法定契約範本。</p>
        <p style="margin-bottom: 4px;">2. <strong>【非專屬法律諮詢聲明】</strong>：IdeaX 平台為技術媒合與第三方金流履約託管服務商，非訴訟代理人亦不提供個別法律訴訟指導。本契約條款僅代表雙方之真實商業合意與民法承攬/委任/和解關係，雙方同意恪遵誠信履約義務；如有特殊客製化法律風險疑慮，當事人應另行諮詢合格執業律師。</p>
        <p style="margin-bottom: 0;">3. 雙方對契約各項條款、交付標準與款項撥付條件已充分審閱並無異議，因履行本約所生之民事權利義務由雙方自負其責。</p>
      </div>
    </div>

    <!-- 簽署欄 -->
    <div class="signatures-grid">
      <div class="sig-card">
        <div class="sig-role">委託人（甲方）</div>
        <div class="sig-name">${escapeHtml(data.buyer.name)}</div>
        <div class="stamp-seal">
          <span>電子簽署</span>
          <span>已同意採納</span>
          <span>VERIFIED</span>
        </div>
        <div class="sig-time">簽署時間：${escapeHtml(data.signedAt)}</div>
      </div>

      <div class="sig-card">
        <div class="sig-role">受託專家（乙方）</div>
        <div class="sig-name">${escapeHtml(data.seller.name)}</div>
        <div class="stamp-seal">
          <span>電子簽署</span>
          <span>已承接方案</span>
          <span>VERIFIED</span>
        </div>
        <div class="sig-time">簽署時間：${escapeHtml(data.signedAt)}</div>
      </div>

      <div class="sig-card">
        <div class="sig-role">履約公證（丙方）</div>
        <div class="sig-name">創點子 IdeaX</div>
        <div class="stamp-seal" style="border-color: #b45309; color: #b45309; background: rgba(254, 243, 199, 0.4);">
          <span>履約託管</span>
          <span>公證核章</span>
          <span>ESCROW</span>
        </div>
        <div class="sig-time">存證碼：${escapeHtml(data.electronicSignatureHash.slice(0, 16))}</div>
      </div>
    </div>

    <div class="footer-note">
      創點子 IdeaX 智能商業媒合與第三方金流履約託管系統 • 電子存證證明文件 • 本文件產出時間：${escapeHtml(new Date().toLocaleString('zh-TW'))}
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(str?: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * 觸發下載契約 HTML / 檔案
 */
export function downloadContractFile(data: ContractData) {
  const htmlContent = generateContractHtml(data);
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const fileName = `${data.contractType === 'dispute_settlement' ? '和解協議書' : '商業勞務委任契約'}_${data.contractId}.html`;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 直接開啟列印視窗（支援另存為 PDF）
 */
export function printContractDirectly(data: ContractData) {
  const htmlContent = generateContractHtml(data);
  const printWindow = window.open('', '_blank', 'width=900,height=800');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    // 給予渲染時間後喚起列印
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 300);
  }
}

/**
 * 依據聊天室報價 (ChatCustomOffer) 建立契約資料物件
 */
export function buildContractFromOffer(
  offer: {
    id: string;
    title: string;
    description: string;
    price: number;
    creatorId: string;
    creatorName: string;
    buyerId?: string;
    deliverables?: string[];
    estimatedDays?: number;
    paywalledContent?: string;
  },
  buyerUser: { id: string; name: string; title?: string; email?: string },
  sellerUser: { id: string; name: string; title?: string; email?: string },
  questionTitle?: string,
  createdAt?: string
): ContractData {
  const contractId = `IDX-CTR-${offer.id.replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase() || Date.now().toString(36).toUpperCase()}`;
  const nowStr = new Date().toLocaleString('zh-TW');
  const effectiveDate = (createdAt || new Date().toISOString()).split('T')[0];

  return {
    contractId,
    contractType: 'commercial_service',
    title: offer.title,
    questionTitle: questionTitle || 'IdeaX 客製專案諮詢委託',
    createdAt: createdAt || nowStr,
    signedAt: nowStr,
    effectiveDate,
    buyer: {
      id: buyerUser.id,
      name: buyerUser.name,
      title: buyerUser.title || '委託發案方',
      email: buyerUser.email,
    },
    seller: {
      id: sellerUser.id,
      name: sellerUser.name,
      title: sellerUser.title || '專業解答專家',
      email: sellerUser.email,
    },
    amount: offer.price,
    description: offer.description,
    deliverables: offer.deliverables,
    estimatedDays: offer.estimatedDays || 3,
    paywalledContent: offer.paywalledContent,
    electronicSignatureHash: generateSignatureHash(contractId, buyerUser.id, sellerUser.id, offer.price),
    platformWitness: 'IdeaX 創點子團隊',
  };
}

/**
 * 依據聊天室 AI 調解方案 (ChatAIMediation) 建立正式和解協議書資料
 */
export function buildContractFromMediation(
  mediation: {
    reportTitle?: string;
    settlementAmount?: number;
    estimatedDays?: number;
    recommendedAction?: string;
    mediatorOpinion?: string;
    fulfilledPoints?: string[];
    unfulfilledPoints?: string[];
    agreedOption?: string;
  },
  buyerUser: { id: string; name: string; title?: string; email?: string },
  sellerUser: { id: string; name: string; title?: string; email?: string },
  questionTitle?: string,
  createdAt?: string
): ContractData {
  const contractId = `IDX-MED-${Date.now().toString(36).toUpperCase()}`;
  const nowStr = new Date().toLocaleString('zh-TW');
  const effectiveDate = (createdAt || new Date().toISOString()).split('T')[0];
  const amount = mediation.settlementAmount || 1200;

  const deliverables: string[] = [];
  if (mediation.fulfilledPoints && mediation.fulfilledPoints.length > 0) {
    deliverables.push(`雙方確認已完成項目：${mediation.fulfilledPoints.join('、')}`);
  }
  if (mediation.unfulfilledPoints && mediation.unfulfilledPoints.length > 0) {
    deliverables.push(`協議約定補充交付項目：${mediation.unfulfilledPoints.join('、')}`);
  }
  if (mediation.recommendedAction) {
    deliverables.push(`調處決議執行要點：${mediation.recommendedAction}`);
  }

  return {
    contractId,
    contractType: 'dispute_settlement',
    title: mediation.reportTitle || `專案爭議調處成立和解協議`,
    questionTitle: questionTitle || 'IdeaX 平台履約爭議調處',
    createdAt: createdAt || nowStr,
    signedAt: nowStr,
    effectiveDate,
    buyer: {
      id: buyerUser.id,
      name: buyerUser.name,
      title: buyerUser.title || '提問委託人（甲方）',
      email: buyerUser.email,
    },
    seller: {
      id: sellerUser.id,
      name: sellerUser.name,
      title: sellerUser.title || '解答受託專家（乙方）',
      email: sellerUser.email,
    },
    amount,
    description: mediation.mediatorOpinion || `經 IdeaX 平台 AI 智能三方調處機制，雙方自願達成和解協議，約定折讓結案或限期補齊交付。`,
    deliverables,
    estimatedDays: mediation.estimatedDays || 3,
    mediationDetails: {
      reportTitle: mediation.reportTitle,
      payoutAmount: amount,
      extendedDays: mediation.estimatedDays || 3,
      recommendedAction: mediation.recommendedAction,
      agreedOption: mediation.agreedOption,
    },
    electronicSignatureHash: generateSignatureHash(contractId, buyerUser.id, sellerUser.id, amount),
    platformWitness: 'IdeaX 創點子團隊',
  };
}

/**
 * 依據方案管理案件項目 (ProposalItem) 建立契約資料
 */
export function buildContractFromProposalItem(
  item: {
    id: string;
    title: string;
    description: string;
    questionTitle?: string;
    amount: number;
    role: 'buyer' | 'seller';
    partnerId: string;
    partnerName: string;
    partnerTitle?: string;
    deliverables?: string[];
    submittedContent?: string;
    estimatedDays?: number;
  },
  currentUser: { id: string; name: string; title?: string; email?: string }
): ContractData {
  const contractId = `IDX-CTR-${item.id.replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase() || Date.now().toString(36).toUpperCase()}`;
  const nowStr = new Date().toLocaleString('zh-TW');

  const buyer = item.role === 'buyer'
    ? { id: currentUser.id, name: currentUser.name, title: currentUser.title, email: currentUser.email }
    : { id: item.partnerId, name: item.partnerName, title: item.partnerTitle };

  const seller = item.role === 'seller'
    ? { id: currentUser.id, name: currentUser.name, title: currentUser.title, email: currentUser.email }
    : { id: item.partnerId, name: item.partnerName, title: item.partnerTitle };

  return {
    contractId,
    contractType: 'commercial_service',
    title: item.title,
    questionTitle: item.questionTitle || 'IdeaX 客製專案委託',
    createdAt: nowStr,
    signedAt: nowStr,
    effectiveDate: new Date().toISOString().split('T')[0],
    buyer,
    seller,
    amount: item.amount || 0,
    description: item.description,
    deliverables: item.deliverables,
    estimatedDays: item.estimatedDays || 3,
    paywalledContent: item.submittedContent,
    electronicSignatureHash: generateSignatureHash(contractId, buyer.id, seller.id, item.amount || 0),
    platformWitness: 'IdeaX 創點子團隊',
  };
}

