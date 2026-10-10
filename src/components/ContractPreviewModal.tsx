import React from 'react';
import { ContractData, downloadContractFile, printContractDirectly } from '../utils/contractGenerator';
import { 
  X, 
  Download, 
  Printer, 
  FileText, 
  ShieldCheck, 
  CheckCircle2, 
  Calendar, 
  Scale, 
  ExternalLink,
  Lock,
  Building,
  UserCheck
} from 'lucide-react';

interface ContractPreviewModalProps {
  contract: ContractData;
  onClose: () => void;
}

export const ContractPreviewModal: React.FC<ContractPreviewModalProps> = ({ contract, onClose }) => {
  const isMediation = contract.contractType === 'dispute_settlement';

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/70 backdrop-blur-xs flex items-center justify-center p-1.5 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-stone-50 rounded-2xl sm:rounded-3xl border border-stone-200 shadow-2xl max-w-3xl w-full max-h-[96vh] sm:max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-3.5 sm:p-5 bg-white border-b border-stone-200 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 ${
              isMediation ? 'bg-purple-100 text-purple-800' : 'bg-amber-100 text-amber-800'
            }`}>
              {isMediation ? <Scale className="w-5 h-5 text-purple-700" /> : <FileText className="w-5 h-5 text-amber-700" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-stone-900">
                  {isMediation ? '爭議調處和解協議書' : '正式商業勞務委任契約'}
                </h3>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  已成立具法律效力
                </span>
              </div>
              <p className="text-xs text-stone-500 font-mono">
                編號：{contract.contractId} • 存證校驗：{contract.electronicSignatureHash.slice(0, 18)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => printContractDirectly(contract)}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-100 text-xs font-bold cursor-pointer transition-all shadow-2xs"
              title="列印或另存為 PDF"
            >
              <Printer className="w-3.5 h-3.5 text-stone-600" />
              <span>列印 / 存為 PDF</span>
            </button>
            <button
              type="button"
              onClick={() => downloadContractFile(contract)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-black cursor-pointer transition-all shadow-xs"
              title="下載正式契約檔案"
            >
              <Download className="w-3.5 h-3.5 text-stone-950" />
              <span>下載契約檔案</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Contract Preview Document Body */}
        <div className="p-2.5 sm:p-6 overflow-y-auto flex-1 space-y-4">
          <div className="bg-white rounded-2xl border border-stone-200 p-3.5 sm:p-8 shadow-xs space-y-6 text-stone-800 text-xs sm:text-sm leading-relaxed relative">
            {/* Watermark in Preview */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-30 text-4xl sm:text-6xl font-black text-amber-500/5 select-none pointer-events-none whitespace-nowrap">
              IDEAX VERIFIED
            </div>

            {/* Document Title Header */}
            <div className="text-center border-b-2 border-amber-600/60 pb-4 space-y-1">
              <span className="text-[11px] font-extrabold px-3 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200 inline-block">
                {isMediation ? '法定民事爭議和解契約 • 具民法和解創設效力' : '正式商業委託勞務契約 • 第三方價金託管公證'}
              </span>
              <h2 className="text-base sm:text-xl font-black text-stone-900">
                {isMediation
                  ? '《IdeaX 創點子平台爭議調處成立暨商業和解協議書》'
                  : '《IdeaX 創點子平台專業諮詢暨商業勞務委任契約書》'}
              </h2>
              <div className="flex flex-wrap justify-between text-[11px] text-stone-400 font-mono pt-1">
                <span>契約編號：{contract.contractId}</span>
                <span>生效日期：{contract.effectiveDate}</span>
                <span>存證代碼：{contract.electronicSignatureHash}</span>
              </div>
            </div>

            {/* Parties Card */}
            <div className="bg-stone-50 rounded-xl p-3.5 border border-stone-200 space-y-1.5 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center">
                <span className="w-28 font-bold text-stone-500 shrink-0">委託人（甲方）：</span>
                <span className="font-bold text-stone-900">
                  {contract.buyer.name} {contract.buyer.title ? `（${contract.buyer.title}）` : ''} • ID: {contract.buyer.id}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center">
                <span className="w-28 font-bold text-stone-500 shrink-0">受託專家（乙方）：</span>
                <span className="font-bold text-stone-900">
                  {contract.seller.name} {contract.seller.title ? `（${contract.seller.title}）` : ''} • ID: {contract.seller.id}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center">
                <span className="w-28 font-bold text-stone-500 shrink-0">履約見證（丙方）：</span>
                <span className="font-bold text-stone-900">
                  {contract.platformWitness || 'IdeaX 創點子團隊（商業技術履約託管見證方）'}
                </span>
              </div>
            </div>

            {/* Contract Clauses */}
            <div className="space-y-4 text-stone-700 text-xs sm:text-[13px] leading-relaxed">
              <div>
                <h4 className="font-extrabold text-stone-900 text-xs sm:text-sm text-amber-900 mb-1 border-l-3 border-amber-600 pl-2">
                  第一條：委託標的與專案範疇
                </h4>
                <div className="pl-3 space-y-1">
                  <p>1. 甲方委託乙方執行<strong>【{contract.title}】</strong>之專業諮詢、技術研究或成果交付勞務，乙方同意依專業誠信原則履行本契約所載義務。</p>
                  {contract.questionTitle && (
                    <p>2. 本專案關聯之原始平台問題/委託背景：<strong>{contract.questionTitle}</strong>。</p>
                  )}
                  <p>3. 約定具體交付成果項目清單：</p>
                  <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200/80 my-1.5">
                    <ul className="space-y-1">
                      {contract.deliverables && contract.deliverables.length > 0 ? (
                        contract.deliverables.map((d, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-stone-800">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                            <span><strong>第 {i + 1} 項：</strong>{d}</span>
                          </li>
                        ))
                      ) : (
                        <li className="text-stone-600">依雙方於 IdeaX 平台聊天室及需求描述約定之專業交付標準</li>
                      )}
                    </ul>
                  </div>
                  {contract.description && (
                    <p className="text-stone-600">4. 委託說明與規格：{contract.description}</p>
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-extrabold text-stone-900 text-xs sm:text-sm text-amber-900 mb-1 border-l-3 border-amber-600 pl-2">
                  第二條：委託報酬總額與第三方金流履約託管
                </h4>
                <div className="pl-3 space-y-1">
                  <p>
                    1. 本專案委託報酬總額為新臺幣{' '}
                    <span className="font-black font-mono text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded">
                      NT$ {(contract.amount || 0).toLocaleString()} 元整
                    </span>。
                  </p>
                  <p>
                    2. <strong>第三方履約託管機制：</strong>甲方於線上同意採納本方案時，已將全額款項全數交付丙方（IdeaX 平台）指定之第三方履約專戶獨立保管，於乙方交付成果並經甲方依約驗收通過前，任何一方均不得擅自挪用或提取，以確保雙方交易履約安全。
                  </p>
                  <p>
                    3. 乙方完成履約交付並經甲方驗收合格後，丙方將依平台規範自動將款項結算劃撥至乙方帳戶。
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-extrabold text-stone-900 text-xs sm:text-sm text-amber-900 mb-1 border-l-3 border-amber-600 pl-2">
                  第三條：履約期程、成果交付與驗收流程
                </h4>
                <div className="pl-3 space-y-1">
                  <p>
                    1. <strong>履約交付期限：</strong>乙方應於契約成立生效日起{' '}
                    <span className="font-black font-mono text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded">
                      {contract.estimatedDays || 3} 個工作天內
                    </span>，完成全部約定成果並上傳交付至 IdeaX 平台專屬存證聊天室或案件專區。
                  </p>
                  <p>
                    2. <strong>驗收與放款：</strong>甲方應於收到乙方交付成果後進行客觀審查。若符合約定標準，甲方應於系統點擊「確認完成交付」，系統即自動解除款項託管並完成放款。
                  </p>
                  <p>
                    3. 若甲方逾期未表示異議亦未驗收，系統將依平台營運條款進入自動驗收防禦保護流程。
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-extrabold text-stone-900 text-xs sm:text-sm text-amber-900 mb-1 border-l-3 border-amber-600 pl-2">
                  第四條：智慧財產權歸屬與使用授權
                </h4>
                <div className="pl-3 space-y-1">
                  <p>1. 乙方保證其交付之一切成果均為自主研發、合法創作或具備合法授權，絕無侵害任何第三人之專利權、著作權、商標權或營業秘密。</p>
                  <p>2. 於甲方全額給付報酬並完成驗收結案時，本專案約定交付成果之著作財產權及所有權即全數合法移轉或專屬授權予甲方享有。</p>
                </div>
              </div>

              <div>
                <h4 className="font-extrabold text-stone-900 text-xs sm:text-sm text-amber-900 mb-1 border-l-3 border-amber-600 pl-2">
                  第五條：保密協定與資料安全保護 (NDA)
                </h4>
                <div className="pl-3 space-y-1">
                  <p>1. 雙方因履行本契約所獲悉之對方商業機密、技術文件、經營資訊、個人資料或未公開數據，均負有嚴格之法定保密義務。</p>
                  <p>2. 未經對方事前書面許可，任何一方不得將保密資訊洩漏、交付或揭露予任何無關第三人，此保密責任於本契約終止後持續有效。</p>
                </div>
              </div>

              <div>
                <h4 className="font-extrabold text-stone-900 text-xs sm:text-sm text-amber-900 mb-1 border-l-3 border-amber-600 pl-2">
                  第六條：爭議處理、平台調處與合意管轄法院
                </h4>
                <div className="pl-3 space-y-1">
                  <p>1. 履約過程如遇認知歧異或瑕疵爭議，雙方合意優先依 IdeaX 平台「AI 三方比對調處」或平台專屬調解機制協商解決。</p>
                  <p>2. 本契約之解釋與適用均依中華民國法律為準據法。若因本契約涉訟，雙方合意以<strong>臺灣臺北地方法院</strong>為第一審專屬管轄法院。</p>
                </div>
              </div>

              <div>
                <h4 className="font-extrabold text-stone-900 text-xs sm:text-sm text-amber-900 mb-1 border-l-3 border-amber-600 pl-2">
                  第七條：電子簽章法定效力與數位存證
                </h4>
                <div className="pl-3 space-y-1">
                  <p>本契約依中華民國《電子簽章法》第 4 條及第 9 條規範訂立，雙方於 IdeaX 平台點選同意、採納方案或確認簽署之數位紀錄，具備完全之法定書面契約效力，並由平台伺服器安全存證。</p>
                </div>
              </div>

              {/* 第八條：AI 調節契約與免責聲明 */}
              <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2 text-xs text-stone-600">
                <h4 className="font-bold text-stone-800 text-xs flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5 text-stone-500" />
                  <span>第八條：AI 輔助調解契約生成與平台免責聲明</span>
                </h4>
                <div className="text-[11px] leading-relaxed text-stone-500 space-y-1.5 pl-1">
                  <p>
                    1. 本契約暨調解協議內容係經由雙方於 IdeaX 平台合意，並由系統 AI 依當事人提供之提案、交付標準或和解條款輔助梳理生成之法定契約範本。
                  </p>
                  <p>
                    2. <strong>【非專屬法律諮詢聲明】</strong>：IdeaX 平台為技術媒合與第三方金流履約託管服務商，非訴訟代理人亦不提供個別法律訴訟指導。本契約條款僅代表雙方之真實商業合意與民法承攬/委任/和解關係，雙方同意恪遵誠信履約義務；如有特殊客製化法律風險疑慮，當事人應另行諮詢合格執業律師。
                  </p>
                  <p>
                    3. 雙方對契約各項條款、交付標準與款項撥付條件已充分審閱並無異議，因履行本約所生之民事權利義務由雙方自負其責。
                  </p>
                </div>
              </div>
            </div>

            {/* Signature & Electronic Seals Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-6 border-t-2 border-dashed border-stone-200">
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-center space-y-1">
                <span className="text-[11px] font-bold text-stone-500 block">委託人（甲方）</span>
                <span className="font-extrabold text-stone-900 block text-xs">{contract.buyer.name}</span>
                <div className="w-16 h-16 rounded-full border-2 border-red-600 bg-red-50/50 mx-auto flex flex-col items-center justify-center text-red-600 font-black text-[9px] -rotate-6 my-1">
                  <span>電子簽署</span>
                  <span>已同意採納</span>
                  <span>VERIFIED</span>
                </div>
                <span className="text-[9px] text-stone-400 font-mono block">簽署：{contract.signedAt.slice(0, 10)}</span>
              </div>

              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-center space-y-1">
                <span className="text-[11px] font-bold text-stone-500 block">受託專家（乙方）</span>
                <span className="font-extrabold text-stone-900 block text-xs">{contract.seller.name}</span>
                <div className="w-16 h-16 rounded-full border-2 border-red-600 bg-red-50/50 mx-auto flex flex-col items-center justify-center text-red-600 font-black text-[9px] -rotate-6 my-1">
                  <span>電子簽署</span>
                  <span>已承接方案</span>
                  <span>VERIFIED</span>
                </div>
                <span className="text-[9px] text-stone-400 font-mono block">簽署：{contract.signedAt.slice(0, 10)}</span>
              </div>

              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-center space-y-1">
                <span className="text-[11px] font-bold text-stone-500 block">履約公證（丙方）</span>
                <span className="font-extrabold text-stone-900 block text-xs">創點子 IdeaX</span>
                <div className="w-16 h-16 rounded-full border-2 border-amber-700 bg-amber-50/50 mx-auto flex flex-col items-center justify-center text-amber-800 font-black text-[9px] -rotate-6 my-1">
                  <span>履約託管</span>
                  <span>公證核章</span>
                  <span>ESCROW</span>
                </div>
                <span className="text-[9px] text-stone-400 font-mono block">存證：{contract.electronicSignatureHash.slice(0, 12)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-white border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-stone-500">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            <span>全站電子契約具備民事法定效力，所有簽署紀錄受不可竄改伺服器安全防護。</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => printContractDirectly(contract)}
              className="px-4 py-2 rounded-xl border border-stone-200 hover:bg-stone-100 text-stone-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <Printer className="w-3.5 h-3.5 text-stone-600" />
              <span>列印 / 存為 PDF</span>
            </button>
            <button
              type="button"
              onClick={() => downloadContractFile(contract)}
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-black flex items-center gap-1.5 shadow-xs cursor-pointer transition-all active:scale-95"
            >
              <Download className="w-3.5 h-3.5 text-stone-950" />
              <span>下載商業契約檔案 (.html)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
