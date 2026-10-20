import React, { useState, useRef } from 'react';
import { Transaction, User } from '../types';
import {
  X,
  Printer,
  Download,
  ShieldCheck,
  FileText,
  CheckCircle2,
  Building2,
  Calendar,
  CreditCard,
  Layers,
  HelpCircle,
  Receipt,
  UserCheck,
  Briefcase,
  Copy,
  Check,
  Package,
} from 'lucide-react';
import { CopyableUserId } from './CopyableUserId';

export type CertificateTab = 'settlement' | 'service_fee' | 'expert_payout';

interface TransactionCertificateModalProps {
  transaction: Transaction;
  currentUser: User;
  onClose: () => void;
  initialTab?: CertificateTab;
}

export const TransactionCertificateModal: React.FC<TransactionCertificateModalProps> = ({
  transaction,
  currentUser,
  onClose,
  initialTab = 'settlement',
}) => {
  const [activeTab, setActiveTab] = useState<CertificateTab>(initialTab);
  const [buyerTitle, setBuyerTitle] = useState<string>(currentUser.name || '一般會員');
  const [buyerTaxId, setBuyerTaxId] = useState<string>('');
  const [remarkNote, setRemarkNote] = useState<string>(transaction.note || '');
  const [copiedId, setCopiedId] = useState(false);

  const printAreaRef = useRef<HTMLDivElement>(null);

  const totalAmount = Number(transaction.amount || 0);
  const platformFee = Number(transaction.platformFee || Math.round(totalAmount * 0.1)); // 預設 10% 服務費若為 0
  const netExpertPayout = Math.max(0, totalAmount - platformFee);

  // 營業稅 5% 拆算
  const serviceFeeUntaxed = Math.round(platformFee / 1.05);
  const serviceFeeTax = platformFee - serviceFeeUntaxed;

  const formattedDate = transaction.createdAt
    ? transaction.createdAt.replace('T', ' ').slice(0, 19)
    : new Date().toISOString().replace('T', ' ').slice(0, 19);

  const certHash = (transaction.id || 'TX').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(-8);
  const certificateNo = `CERT-${certHash}-${Date.now().toString().slice(-4)}`;
  const invoiceMockNo = `IX-${new Date().getFullYear().toString().slice(-2)}${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${certHash}`;

  // 列印 / 另存為標準 PDF
  const handlePrint = () => {
    window.print();
  };

  // 生成 HTML 字串
  const generateHtmlDoc = (tabType: CertificateTab) => {
    if (tabType === 'service_fee') {
      return `
<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <title>IdeaX 平台媒合與技術服務費電子收據 - ${certificateNo}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; padding: 40px; color: #1c1917; line-height: 1.5; background: #fff; }
    .header { text-align: center; border-bottom: 2px solid #e7e5e4; padding-bottom: 16px; margin-bottom: 20px; }
    .header h1 { margin: 0; font-size: 22px; color: #1c1917; }
    .header p { margin: 4px 0 0; font-size: 13px; color: #78716c; }
    .cert-no { display: inline-block; background: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 6px; font-family: monospace; font-size: 12px; margin-top: 8px; border: 1px solid #fde68a; font-weight: bold; }
    .grid { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 13px; }
    .table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px; }
    .table th, .table td { border: 1px solid #e7e5e4; padding: 10px 14px; text-align: left; }
    .table th { background: #fafaf9; font-weight: bold; color: #44403c; }
    .total-row { background: #fef3c7; font-weight: bold; font-size: 14px; }
    .stamp-box { position: relative; border: 1px dashed #d6d3d1; padding: 16px; border-radius: 12px; margin-top: 24px; font-size: 12px; color: #78716c; background: #fafaf9; }
    .seal { position: absolute; right: 30px; top: 12px; width: 96px; height: 96px; border: 3px solid #dc2626; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #dc2626; font-size: 10.5px; font-weight: 900; transform: rotate(-10deg); opacity: 0.9; }
    .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #a8a29e; border-top: 1px solid #f5f5f4; padding-top: 14px; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>IdeaX 創點子・點子與人才媒合平台</h1>
    <p>平台媒合與技術服務費電子收據 (Platform Service Fee e-Receipt)</p>
    <div class="cert-no">發票／收據編號：${invoiceMockNo}</div>
  </div>

  <div class="grid">
    <div>
      <div><strong>買受人抬頭：</strong>${buyerTitle}</div>
      <div><strong>統一編號：</strong>${buyerTaxId || '（個人消費 / 未填統編）'}</div>
      <div><strong>會員帳號 ID：</strong>${currentUser.id}</div>
    </div>
    <div style="text-align: right;">
      <div><strong>開立日期：</strong>${formattedDate}</div>
      <div><strong>課稅類別：</strong>應稅 5%</div>
      <div><strong>交易憑證號：</strong>${certificateNo}</div>
    </div>
  </div>

  <table class="table">
    <thead>
      <tr>
        <th>品名項目</th>
        <th>課稅別</th>
        <th>數量</th>
        <th>單價 (NT$)</th>
        <th style="text-align: right;">金額 (NT$)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>資訊媒合與智庫技術服務費</strong><br><small style="color:#78716c">關聯案件：${transaction.relatedQuestionTitle || '問答懸賞與專家諮詢媒合'}</small></td>
        <td>應稅 5%</td>
        <td>1 筆</td>
        <td>NT$ ${serviceFeeUntaxed.toLocaleString()}</td>
        <td style="text-align: right;">NT$ ${serviceFeeUntaxed.toLocaleString()}</td>
      </tr>
      <tr>
        <td colspan="4" style="text-align: right; color:#78716c;">銷售額合計 (Sales Amount)</td>
        <td style="text-align: right; font-mono">NT$ ${serviceFeeUntaxed.toLocaleString()}</td>
      </tr>
      <tr>
        <td colspan="4" style="text-align: right; color:#78716c;">營業稅額 5% (Tax 5%)</td>
        <td style="text-align: right; font-mono">NT$ ${serviceFeeTax.toLocaleString()}</td>
      </tr>
      <tr class="total-row">
        <td colspan="4" style="text-align: right;">總計含稅金額 (Total Amount Due)</td>
        <td style="text-align: right;">NT$ ${platformFee.toLocaleString()}</td>
      </tr>
    </tbody>
  </table>

  <div class="stamp-box">
    <div class="seal">
      <span>IdeaX</span>
      <span>服務費發票章</span>
      <span>★ 稅務合規 ★</span>
    </div>
    <strong>【統一發票與稅務申報備查說明】</strong><br>
    1. 本收據係本平台就收取之「平台抽成與媒合技術服務費」依法開立之營業收入憑證。<br>
    2. 公司行號可憑本收據載明之統一編號與稅額，依加值型及非加值型營業稅法申報扣抵進項稅額。<br>
    3. 如需財政部電子發票載具歸戶或補印紙本發票證明聯，可洽「客服與回報」窗口辦理。
  </div>

  <div class="footer">
    IdeaX 創點子團隊 · 客服支援：ideax.office@gmail.com
  </div>
</body>
</html>
      `;
    }

    if (tabType === 'expert_payout') {
      return `
<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <title>IdeaX 專家勞務報酬暨代收轉付證明單 - ${certificateNo}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; padding: 40px; color: #1c1917; line-height: 1.5; background: #fff; }
    .header { text-align: center; border-bottom: 2px solid #e7e5e4; padding-bottom: 16px; margin-bottom: 20px; }
    .header h1 { margin: 0; font-size: 22px; color: #1c1917; }
    .header p { margin: 4px 0 0; font-size: 13px; color: #78716c; }
    .cert-no { display: inline-block; background: #ecfdf5; color: #065f46; padding: 4px 12px; border-radius: 6px; font-family: monospace; font-size: 12px; margin-top: 8px; border: 1px solid #a7f3d0; font-weight: bold; }
    .grid { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 13px; }
    .table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px; }
    .table th, .table td { border: 1px solid #e7e5e4; padding: 10px 14px; text-align: left; }
    .table th { background: #fafaf9; font-weight: bold; color: #44403c; }
    .total-row { background: #d1fae5; font-weight: bold; font-size: 14px; color: #065f46; }
    .stamp-box { position: relative; border: 1px dashed #d6d3d1; padding: 16px; border-radius: 12px; margin-top: 24px; font-size: 12px; color: #78716c; background: #fafaf9; }
    .seal { position: absolute; right: 30px; top: 12px; width: 96px; height: 96px; border: 3px solid #059669; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #059669; font-size: 10.5px; font-weight: 900; transform: rotate(-8deg); opacity: 0.9; }
    .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #a8a29e; border-top: 1px solid #f5f5f4; padding-top: 14px; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>IdeaX 創點子・點子與人才媒合平台</h1>
    <p>專家勞務報酬暨代收轉付證明單 (Expert Remuneration & Escrow Transfer Statement)</p>
    <div class="cert-no">單據序號：${certificateNo}</div>
  </div>

  <div class="grid">
    <div>
      <div><strong>委託發案方：</strong>${buyerTitle} ${buyerTaxId ? `(統編: ${buyerTaxId})` : ''}</div>
      <div><strong>受款專家姓名：</strong>${transaction.toUserName || '受款諮詢專家'}</div>
      <div><strong>受款專家識別：</strong>${transaction.toUserName ? `專家 (${transaction.toUserName})` : '已認證專家'}</div>
    </div>
    <div style="text-align: right;">
      <div><strong>交付驗收日期：</strong>${formattedDate}</div>
      <div><strong>所得代號類別：</strong>執行業務所得 (9B) / 兼職勞務 (50)</div>
      <div><strong>履約狀態：</strong>雙方驗收合格已撥款</div>
    </div>
  </div>

  <table class="table">
    <thead>
      <tr>
        <th>專業委託項目</th>
        <th>所得申報性質</th>
        <th>點數計額</th>
        <th style="text-align: right;">實撥金額 (NT$)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>${transaction.relatedQuestionTitle || '客製化落地方案與專案諮詢成果交付'}</strong></td>
        <td>勞務報酬 / 稿費所得 (代收轉付)</td>
        <td>${netExpertPayout.toLocaleString()} PTS</td>
        <td style="text-align: right;">NT$ ${netExpertPayout.toLocaleString()}</td>
      </tr>
      <tr class="total-row">
        <td colspan="3">專家實領勞務所得總額 (Net Compensation)</td>
        <td style="text-align: right;">NT$ ${netExpertPayout.toLocaleString()}</td>
      </tr>
    </tbody>
  </table>

  <div class="stamp-box">
    <div class="seal">
      <span>IdeaX</span>
      <span>代收代付核銷</span>
      <span>★ 撥款查驗 ★</span>
    </div>
    <strong>【所得稅扣繳暨代收代付法規備查說明】</strong><br>
    1. 依《加值型及非加值型營業稅法施行細則》第 18 條，本款項屬平台受託代收代付，款項全數轉付予提供勞務之專家。<br>
    2. 依《所得稅法》規定，發案企業於年底辦理各類所得扣繳申報時，得憑本證明單開立「扣繳憑單 / 免扣繳憑單」予受款專家。<br>
    3. 單筆給付未達新台幣 20,000 元者，免予預扣 10% 所得稅及 2.11% 二代健保補充保費。
  </div>

  <div class="footer">
    IdeaX 平台資金託管組 · 本證明單受電子簽章法保護，具備完整民事合約與會計原始憑證效力
  </div>
</body>
</html>
      `;
    }

    // Default: settlement
    return `
<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <title>IdeaX 電子交易明細與對帳結算憑證 - ${certificateNo}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; padding: 40px; color: #1c1917; line-height: 1.5; background: #fff; }
    .header { text-align: center; border-bottom: 2px solid #e7e5e4; padding-bottom: 16px; margin-bottom: 20px; }
    .header h1 { margin: 0; font-size: 22px; color: #1c1917; }
    .header p { margin: 4px 0 0; font-size: 13px; color: #78716c; }
    .cert-no { display: inline-block; background: #f5f5f4; padding: 4px 12px; border-radius: 6px; font-family: monospace; font-size: 12px; margin-top: 8px; border: 1px solid #e7e5e4; }
    .grid { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 13px; }
    .table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px; }
    .table th, .table td { border: 1px solid #e7e5e4; padding: 10px 14px; text-align: left; }
    .table th { background: #fafaf9; font-weight: bold; color: #44403c; }
    .total-row { background: #fef3c7; font-weight: bold; font-size: 14px; }
    .stamp-box { position: relative; border: 1px dashed #d6d3d1; padding: 16px; border-radius: 12px; margin-top: 24px; font-size: 12px; color: #78716c; background: #fafaf9; }
    .seal { position: absolute; right: 30px; top: 12px; width: 96px; height: 96px; border: 3px solid #dc2626; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #dc2626; font-size: 10.5px; font-weight: 900; transform: rotate(-12deg); opacity: 0.85; }
    .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #a8a29e; border-top: 1px solid #f5f5f4; padding-top: 14px; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>IdeaX 創點子・點子與人才媒合平台</h1>
    <p>電子交易明細與對帳結算憑證 (Electronic Transaction Statement & Settlement Certificate)</p>
    <div class="cert-no">憑證序號：${certificateNo}</div>
  </div>

  <div class="grid">
    <div>
      <div><strong>申請 / 買受人：</strong>${buyerTitle} ${buyerTaxId ? `(統編: ${buyerTaxId})` : ''}</div>
      <div><strong>會員帳號 ID：</strong>${currentUser.id}</div>
      <div><strong>交易項目：</strong>${transaction.relatedQuestionTitle || '知識問答與專家方案交易'}</div>
    </div>
    <div style="text-align: right;">
      <div><strong>結算日期：</strong>${formattedDate}</div>
      <div><strong>履約狀態：</strong>${transaction.status || '已完成'}</div>
      <div><strong>金流方式：</strong>${transaction.paymentMethod || '平台點數儲值與代管扣抵'}</div>
    </div>
  </div>

  <table class="table">
    <thead>
      <tr>
        <th>項目明細</th>
        <th>交易性質</th>
        <th>點數計額</th>
        <th style="text-align: right;">折合新台幣 (NT$)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>專家諮詢與懸賞酬勞</strong><br><small style="color:#78716c">撥付予受款專家：${transaction.toUserName || '受款專家'}</small></td>
        <td>代收代付（轉付專家）</td>
        <td>${netExpertPayout.toLocaleString()} PTS</td>
        <td style="text-align: right;">NT$ ${netExpertPayout.toLocaleString()}</td>
      </tr>
      <tr>
        <td><strong>平台媒合與技術服務費</strong><br><small style="color:#78716c">內含 5% 營業稅 (發票號: ${invoiceMockNo})</small></td>
        <td>平台服務收入</td>
        <td>${platformFee.toLocaleString()} PTS</td>
        <td style="text-align: right;">NT$ ${platformFee.toLocaleString()}</td>
      </tr>
      <tr class="total-row">
        <td colspan="3">結算總金額 (Gross Total)</td>
        <td style="text-align: right;">NT$ ${totalAmount.toLocaleString()}</td>
      </tr>
    </tbody>
  </table>

  <div class="stamp-box">
    <div class="seal">
      <span>IdeaX</span>
      <span>財務電子核銷</span>
      <span>★ 查驗合格 ★</span>
    </div>
    <strong>【法律效力與稅務核銷備查註記】</strong><br>
    1. 本憑證依《電子簽章法》及《民法》第 153、490 條產出，具備法定直接書證效力。<br>
    2. 本平台採資金安全託管（Escrow）代收代付機制，發案企業得據此進行會計原始憑證核銷與入帳。<br>
    3. 平台媒合服務費與專家勞報單據均可於上方切換標籤單獨下載列印。
  </div>

  <div class="footer">
    IdeaX 創點子團隊 · 本憑證受中華民國電子簽章法及服務條款保護
  </div>
</body>
</html>
    `;
  };

  // 下載單一憑證
  const handleDownloadSingle = (tabType: CertificateTab) => {
    const html = generateHtmlDoc(tabType);
    const names = {
      settlement: '綜合交易對帳結算憑證',
      service_fee: '平台服務費與抽成電子收據',
      expert_payout: '專家勞務報酬暨代收轉付證明單',
    };
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `IdeaX_${names[tabType]}_${certificateNo}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 一鍵打包下載全部 3 款憑證
  const handleDownloadAll = () => {
    handleDownloadSingle('settlement');
    setTimeout(() => handleDownloadSingle('service_fee'), 300);
    setTimeout(() => handleDownloadSingle('expert_payout'), 600);
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/70 backdrop-blur-xs flex items-center justify-center p-1.5 sm:p-4 animate-in fade-in duration-150 overflow-y-auto">
      {/* 隱藏式專用列印樣式 */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-certificate-area, #print-certificate-area * {
            visibility: visible;
          }
          #print-certificate-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 24px;
            background: white !important;
          }
        }
      `}</style>

      <div className="bg-white rounded-2xl sm:rounded-3xl max-w-3xl w-full shadow-2xl border border-stone-200 text-stone-900 overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[96vh] sm:max-h-[94vh]">
        {/* Modal Top Header */}
        <div className="p-3 sm:p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <h3 className="text-base font-black text-stone-900 flex items-center gap-2">
                <span>電子交易明細與對帳收據憑證中心</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  具法律效力
                </span>
              </h3>
              <span className="text-[11px] text-stone-500 font-mono">
                流水序號：{certificateNo}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-xl border border-stone-200 hover:bg-white text-stone-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs hover:border-amber-400 active:scale-95"
              title="列印或另存為標準 PDF"
            >
              <Printer className="w-3.5 h-3.5 text-stone-600" />
              <span className="hidden sm:inline">列印 / 另存 PDF</span>
            </button>

            <button
              type="button"
              onClick={() => handleDownloadSingle(activeTab)}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
              title="下載目前檢視之憑證檔"
            >
              <Download className="w-3.5 h-3.5" />
              <span>下載此單據</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadAll}
              className="px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95 hidden sm:flex"
              title="一鍵打包下載 3 款官方核銷憑證"
            >
              <Package className="w-3.5 h-3.5 text-amber-400" />
              <span>打包下載全套 (3張)</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-stone-200 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 3 Formats Tab Navigation */}
        <div className="px-2.5 sm:px-6 pt-3 pb-0 bg-stone-100/70 border-b border-stone-200 flex items-center gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('settlement')}
            className={`px-3.5 py-2 rounded-t-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 border-b-2 ${
              activeTab === 'settlement'
                ? 'bg-white text-amber-950 border-amber-500 shadow-2xs -mb-px'
                : 'text-stone-600 hover:text-stone-900 border-transparent hover:bg-stone-200/50'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
            <span>1. 綜合交易對帳結算憑證</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('service_fee')}
            className={`px-3.5 py-2 rounded-t-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 border-b-2 ${
              activeTab === 'service_fee'
                ? 'bg-white text-amber-950 border-amber-500 shadow-2xs -mb-px'
                : 'text-stone-600 hover:text-stone-900 border-transparent hover:bg-stone-200/50'
            }`}
          >
            <Receipt className="w-3.5 h-3.5 text-blue-600" />
            <span>2. 平台服務費與抽成收據 (含稅)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('expert_payout')}
            className={`px-3.5 py-2 rounded-t-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 border-b-2 ${
              activeTab === 'expert_payout'
                ? 'bg-white text-amber-950 border-amber-500 shadow-2xs -mb-px'
                : 'text-stone-600 hover:text-stone-900 border-transparent hover:bg-stone-200/50'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>3. 專家勞報暨代收轉付單 (9B/50)</span>
          </button>
        </div>

        {/* Company Tax ID Customizer Panel */}
        <div className="px-5 py-3 bg-amber-50/40 border-b border-stone-200 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
          <div>
            <label className="text-[11px] font-bold text-stone-700 block mb-1">
              買受人抬頭 (公司/個人)
            </label>
            <input
              type="text"
              value={buyerTitle}
              onChange={(e) => setBuyerTitle(e.target.value)}
              placeholder="如：創點子團隊或個人抬頭"
              className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 bg-white text-xs focus:ring-2 focus:ring-amber-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-stone-700 block mb-1">
              統一編號 (統編 8 碼)
            </label>
            <input
              type="text"
              maxLength={8}
              value={buyerTaxId}
              onChange={(e) => setBuyerTaxId(e.target.value.replace(/\D/g, ''))}
              placeholder="如：91028374（報帳必填）"
              className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 bg-white text-xs font-mono focus:ring-2 focus:ring-amber-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-stone-700 block mb-1">
              內部報帳自訂備註
            </label>
            <input
              type="text"
              value={remarkNote}
              onChange={(e) => setRemarkNote(e.target.value)}
              placeholder="如：2026 Q4 AI系統升級顧問費"
              className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 bg-white text-xs focus:ring-2 focus:ring-amber-400 focus:outline-none"
            />
          </div>
        </div>

        {/* Certificate Body (Clean Printable Canvas) */}
        <div className="p-3 sm:p-7 overflow-y-auto space-y-4 sm:space-y-5 text-xs bg-white flex-1" id="print-certificate-area" ref={printAreaRef}>
          {/* TAB 1: 綜合對帳結算憑證 */}
          {activeTab === 'settlement' && (
            <div className="space-y-5">
              {/* Header Stamp & Title */}
              <div className="text-center pb-3 border-b-2 border-stone-200 space-y-1 relative">
                <div className="flex items-center justify-center gap-2 text-amber-700 font-bold text-xs uppercase tracking-wider">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>IdeaX 創點子・點子與人才媒合平台</span>
                </div>
                <h2 className="text-lg sm:text-xl font-black text-stone-900 tracking-tight">
                  電子交易明細與對帳結算憑證
                </h2>
                <p className="text-[11px] text-stone-500 font-mono">
                  Electronic Transaction Statement & Settlement Certificate
                </p>
                <div className="inline-block mt-1.5 px-3 py-0.5 rounded-full bg-stone-100 border border-stone-200 font-mono text-[10.5px] text-stone-600">
                  憑證號：{certificateNo}
                </div>
              </div>

              {/* Key Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-stone-50/80 border border-stone-200">
                <div className="space-y-1.5">
                  <div className="text-stone-500">
                    <span className="font-bold text-stone-800">買受／委託方：</span>
                    <strong className="text-stone-900">{buyerTitle}</strong>
                    {buyerTaxId && <span className="font-mono text-amber-800 ml-1.5">（統編: {buyerTaxId}）</span>}
                  </div>
                  <div className="text-stone-500 flex items-center gap-1.5 flex-wrap">
                    <span>會員帳號 ID：</span>
                    <CopyableUserId userId={currentUser.id} />
                  </div>
                  <div className="text-stone-500">
                    <span>交易標的：</span>
                    <strong className="text-stone-800">{transaction.relatedQuestionTitle || '平台懸賞與知識諮詢交付'}</strong>
                  </div>
                </div>

                <div className="space-y-1.5 sm:text-right">
                  <div className="text-stone-500">
                    <span>交易完成時間：</span>
                    <strong className="text-stone-800 font-mono">{formattedDate}</strong>
                  </div>
                  <div className="text-stone-500">
                    <span>結算狀態：</span>
                    <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.2 rounded border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>{transaction.status || '已完成履約核銷'}</span>
                    </span>
                  </div>
                  <div className="text-stone-500">
                    <span>金流方式：</span>
                    <strong className="text-stone-800">{transaction.paymentMethod || '平台履約價金託管'}</strong>
                  </div>
                </div>
              </div>

              {/* Breakdown Table */}
              <div className="border border-stone-200 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-100/90 text-stone-700 font-bold border-b border-stone-200">
                    <tr>
                      <th className="p-3">項目與履約標的</th>
                      <th className="p-3">性質說明</th>
                      <th className="p-3 text-center">點數計額</th>
                      <th className="p-3 text-right">折合新台幣 (NT$)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 text-stone-800">
                    <tr className="hover:bg-stone-50/50">
                      <td className="p-3 font-bold">
                        專家諮詢酬勞 (轉付受款專家)
                      </td>
                      <td className="p-3 text-stone-500">代收代付託管履約款項</td>
                      <td className="p-3 text-center font-mono">{netExpertPayout.toLocaleString()} PTS</td>
                      <td className="p-3 text-right font-mono font-bold">NT$ {netExpertPayout.toLocaleString()}</td>
                    </tr>

                    <tr className="hover:bg-stone-50/50">
                      <td className="p-3 font-medium text-stone-700">平台媒合與技術服務費</td>
                      <td className="p-3 text-stone-500">平台抽成（已內含5%營業稅）</td>
                      <td className="p-3 text-center font-mono text-stone-500">{platformFee.toLocaleString()} PTS</td>
                      <td className="p-3 text-right font-mono text-stone-600">NT$ {platformFee.toLocaleString()}</td>
                    </tr>

                    <tr className="bg-amber-50/70 font-black text-amber-950 border-t-2 border-amber-200">
                      <td className="p-3.5" colSpan={2}>
                        <div className="flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-amber-600" />
                          <span>交易結算總額 (Net Settlement Total)</span>
                        </div>
                      </td>
                      <td className="p-3.5 text-center font-mono text-sm">
                        {totalAmount.toLocaleString()} PTS
                      </td>
                      <td className="p-3.5 text-right font-mono text-base text-amber-900 font-black">
                        NT$ {totalAmount.toLocaleString()}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Official Verification Box with Red Seal Stamp */}
              <div className="relative p-4 rounded-2xl bg-stone-50 border border-stone-200 text-stone-600 text-[11px] leading-relaxed space-y-1.5">
                <div className="absolute right-4 sm:right-6 top-3 w-22 h-22 rounded-full border-2 border-rose-600/80 text-rose-600/90 flex flex-col items-center justify-center font-black rotate-[-10deg] pointer-events-none select-none shadow-2xs">
                  <span className="text-[9px] tracking-widest">IdeaX</span>
                  <span className="text-[10px]">財務核銷</span>
                  <span className="text-[7.5px] font-mono">★ CERTIFIED ★</span>
                </div>

                <div className="font-bold text-stone-900 flex items-center gap-1.5 text-xs">
                  <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>【法律效力、會計核銷與稅務備查註記】</span>
                </div>

                <ul className="list-disc pl-4 space-y-1 text-stone-600 pr-24">
                  <li><strong>民法與電子簽章法效力：</strong>依《民法》第 153、490 條及《電子簽章法》第 4 條，本憑證具備法定直接書證效力。</li>
                  <li><strong>商業會計法：</strong>依《商業會計法》第 15、19 條，得直接作為企業內部原始會計憑證核銷入帳。</li>
                  <li><strong>代收代付稅務：</strong>依《營業稅法施行細則》第 18 條，代收轉付予專家之酬金非平台本體營業額，免開立全額營業發票。</li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 2: 平台服務費發票收據 */}
          {activeTab === 'service_fee' && (
            <div className="space-y-5">
              <div className="text-center pb-3 border-b-2 border-blue-200 space-y-1 relative">
                <div className="flex items-center justify-center gap-2 text-blue-700 font-bold text-xs uppercase tracking-wider">
                  <Receipt className="w-3.5 h-3.5" />
                  <span>IdeaX 創點子・點子與人才媒合平台</span>
                </div>
                <h2 className="text-lg sm:text-xl font-black text-stone-900 tracking-tight">
                  平台媒合與技術服務費電子收據 / 發票
                </h2>
                <p className="text-[11px] text-stone-500 font-mono">
                  Platform Commission & Technology Service Fee e-Receipt
                </p>
                <div className="inline-block mt-1.5 px-3 py-0.5 rounded-full bg-blue-50 border border-blue-200 font-mono text-[10.5px] text-blue-800 font-bold">
                  發票／收據號：{invoiceMockNo}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-blue-50/40 border border-blue-200 text-xs">
                <div className="space-y-1.5">
                  <div><strong>買受人抬頭：</strong><span className="text-stone-900 font-bold">{buyerTitle}</span></div>
                  <div><strong>統一編號：</strong><span className="font-mono font-bold text-blue-900">{buyerTaxId || '（個人消費 / 未填統編）'}</span></div>
                  <div><strong>會員 ID：</strong><span className="font-mono text-stone-600">#{currentUser.id}</span></div>
                </div>

                <div className="space-y-1.5 sm:text-right">
                  <div><strong>開立日期：</strong><span className="font-mono">{formattedDate}</span></div>
                  <div><strong>課稅類別：</strong><span className="font-bold text-blue-700">應稅 5%</span></div>
                  <div><strong>防偽序號：</strong><span className="font-mono text-stone-500">{certificateNo}</span></div>
                </div>
              </div>

              <div className="border border-stone-200 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-100 text-stone-700 font-bold border-b border-stone-200">
                    <tr>
                      <th className="p-3">品名項目</th>
                      <th className="p-3">課稅別</th>
                      <th className="p-3 text-center">數量</th>
                      <th className="p-3 text-right">未稅金額</th>
                      <th className="p-3 text-right">含稅總計 (NT$)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 text-stone-800">
                    <tr>
                      <td className="p-3 font-bold">
                        資訊媒合與智庫技術服務費
                        <div className="text-[10.5px] text-stone-500 font-normal">案件：{transaction.relatedQuestionTitle || '問答諮詢專案'}</div>
                      </td>
                      <td className="p-3 text-stone-500">應稅 5%</td>
                      <td className="p-3 text-center font-mono">1 筆</td>
                      <td className="p-3 text-right font-mono">NT$ {serviceFeeUntaxed.toLocaleString()}</td>
                      <td className="p-3 text-right font-mono font-bold">NT$ {platformFee.toLocaleString()}</td>
                    </tr>
                    <tr className="bg-stone-50 text-stone-600">
                      <td colSpan={4} className="p-2.5 text-right">銷售額合計 (Sales Amount)：</td>
                      <td className="p-2.5 text-right font-mono font-bold">NT$ {serviceFeeUntaxed.toLocaleString()}</td>
                    </tr>
                    <tr className="bg-stone-50 text-stone-600">
                      <td colSpan={4} className="p-2.5 text-right">營業稅額 5% (Tax 5%)：</td>
                      <td className="p-2.5 text-right font-mono font-bold">NT$ {serviceFeeTax.toLocaleString()}</td>
                    </tr>
                    <tr className="bg-blue-50/80 font-black text-blue-950 border-t-2 border-blue-200">
                      <td colSpan={4} className="p-3 text-right">實收總計金額 (Total Due)：</td>
                      <td className="p-3 text-right font-mono text-base text-blue-900 font-black">NT$ {platformFee.toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="relative p-4 rounded-2xl bg-stone-50 border border-stone-200 text-stone-600 text-[11px] leading-relaxed space-y-1">
                <div className="absolute right-4 sm:right-6 top-3 w-22 h-22 rounded-full border-2 border-blue-600 text-blue-600 flex flex-col items-center justify-center font-black rotate-[-8deg] pointer-events-none select-none">
                  <span className="text-[9px] tracking-widest">IdeaX</span>
                  <span className="text-[10px]">服務費發票章</span>
                  <span className="text-[7.5px] font-mono">★ TAX VALID ★</span>
                </div>
                <strong>【統一發票扣抵與營利事業所得稅報帳說明】</strong>
                <p className="pr-24">
                  本收據為 IdeaX 創點子團隊依法開立之營業收入憑證。報帳團隊與企業得依記載之統一編號與稅額申報扣抵營業稅進項稅額並列報當年度營業費用。
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: 專家勞報單 */}
          {activeTab === 'expert_payout' && (
            <div className="space-y-5">
              <div className="text-center pb-3 border-b-2 border-emerald-200 space-y-1 relative">
                <div className="flex items-center justify-center gap-2 text-emerald-700 font-bold text-xs uppercase tracking-wider">
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>IdeaX 創點子・點子與人才媒合平台</span>
                </div>
                <h2 className="text-lg sm:text-xl font-black text-stone-900 tracking-tight">
                  專家勞務報酬暨代收轉付證明單
                </h2>
                <p className="text-[11px] text-stone-500 font-mono">
                  Expert Remuneration & Escrow Transfer Statement (9B/50)
                </p>
                <div className="inline-block mt-1.5 px-3 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 font-mono text-[10.5px] text-emerald-800 font-bold">
                  扣繳單序號：{certificateNo}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-emerald-50/40 border border-emerald-200 text-xs">
                <div className="space-y-1.5">
                  <div><strong>委託發案方：</strong><span className="text-stone-900 font-bold">{buyerTitle}</span> {buyerTaxId && `(統編: ${buyerTaxId})`}</div>
                  <div><strong>受款專家姓名：</strong><span className="font-bold text-emerald-950">{transaction.toUserName || '受款專家解答者'}</span></div>
                  <div><strong>受款專家：</strong><span className="font-mono text-stone-600">#{transaction.toUserName || '認證專家'}</span></div>
                </div>

                <div className="space-y-1.5 sm:text-right">
                  <div><strong>驗收放款日期：</strong><span className="font-mono">{formattedDate}</span></div>
                  <div><strong>所得申報類別：</strong><span className="font-bold text-emerald-800">執行業務所得 (9B) / 稿費 (50)</span></div>
                  <div><strong>撥款狀態：</strong><span className="font-bold text-emerald-700">平台安全託管已撥付</span></div>
                </div>
              </div>

              <div className="border border-stone-200 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-100 text-stone-700 font-bold border-b border-stone-200">
                    <tr>
                      <th className="p-3">專業委託標的與交付成果</th>
                      <th className="p-3">所得性質</th>
                      <th className="p-3 text-center">折合點數</th>
                      <th className="p-3 text-right">實付專家酬勞 (NT$)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 text-stone-800">
                    <tr>
                      <td className="p-3 font-bold">
                        {transaction.relatedQuestionTitle || '專業落地方案與客製化諮詢交付成果'}
                      </td>
                      <td className="p-3 text-stone-500">勞務報酬 / 執行業務所得</td>
                      <td className="p-3 text-center font-mono">{netExpertPayout.toLocaleString()} PTS</td>
                      <td className="p-3 text-right font-mono font-bold text-emerald-950">NT$ {netExpertPayout.toLocaleString()}</td>
                    </tr>
                    <tr className="bg-emerald-50 font-black text-emerald-950 border-t-2 border-emerald-200">
                      <td colSpan={3} className="p-3.5 text-right">專家實領所得總額 (Net Compensation)：</td>
                      <td className="p-3.5 text-right font-mono text-base font-black text-emerald-900">NT$ {netExpertPayout.toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="relative p-4 rounded-2xl bg-stone-50 border border-stone-200 text-stone-600 text-[11px] leading-relaxed space-y-1">
                <div className="absolute right-4 sm:right-6 top-3 w-22 h-22 rounded-full border-2 border-emerald-600 text-emerald-600 flex flex-col items-center justify-center font-black rotate-[-8deg] pointer-events-none select-none">
                  <span className="text-[9px] tracking-widest">IdeaX</span>
                  <span className="text-[10px]">代收轉付核銷</span>
                  <span className="text-[7.5px] font-mono">★ ESCROW OK ★</span>
                </div>
                <strong>【所得稅扣繳與企業核銷說明】</strong>
                <p className="pr-24">
                  依《加值型及非加值型營業稅法施行細則》第 18 條，本款項屬受託代收代付，款項已如數轉付受款專家。發案企業年底辦理各類所得申報時，得據此單據開立「扣繳憑單（9B/50）」供會計師查驗；單筆給付未達 NT$ 20,000 者免扣繳所得稅。
                </p>
              </div>
            </div>
          )}

          {/* Modal Footer */}
          <div className="text-center text-[10px] text-stone-400 font-mono pt-2 border-t border-stone-100">
            IdeaX 創點子團隊 · 依電子簽章法及平台服務條款生成
          </div>
        </div>

        {/* Modal Bottom Actions */}
        <div className="p-3.5 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-2 bg-stone-50">
          <div className="text-[11px] text-stone-500 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>具備唯一防偽編號與數位簽章查驗，可直接作為會計與稅務報帳憑證。</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => handleDownloadSingle(activeTab)}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>下載當前憑證 (HTML/PDF)</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-800 text-xs font-bold transition-all cursor-pointer"
            >
              關閉
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
