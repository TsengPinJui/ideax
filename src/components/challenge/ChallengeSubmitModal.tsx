import React, { useState } from 'react';
import {
  X,
  Send,
  Sparkles,
  Paperclip,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  Building,
  CreditCard,
  FileText,
  Upload,
} from 'lucide-react';
import { User } from '../../types';
import { ChallengeCategory, ChallengeProposal } from '../../types/challengeTypes';
import { submitChallengeProposal } from '../../services/challengeService';
import { CHALLENGE_CONSTANTS } from '../../data/challengeData';

interface ChallengeSubmitModalProps {
  onClose: () => void;
  currentUser: User;
  onSuccess: (newProposal: ChallengeProposal) => void;
}

const CATEGORIES: ChallengeCategory[] = [
  '科技創新',
  'AI智慧',
  '商業模式',
  '生活永續',
  '社會創新',
  '文創教育',
  '生醫健康',
];

export const ChallengeSubmitModal: React.FC<ChallengeSubmitModalProps> = ({
  onClose,
  currentUser,
  onSuccess,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: 基本資料
  const [accountName, setAccountName] = useState(currentUser.name || '');
  const [teamName, setTeamName] = useState('');
  const [email, setEmail] = useState((currentUser as any).email || '');
  const [phone, setPhone] = useState('');
  const [schoolOrOccupation, setSchoolOrOccupation] = useState('');
  const [referralCode, setReferralCode] = useState('');

  // Step 2: 提案資料
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ChallengeCategory>('科技創新');
  const [painPoint, setPainPoint] = useState('');
  const [solution, setSolution] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [businessModel, setBusinessModel] = useState('');
  const [expectedImpact, setExpectedImpact] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [attachments, setAttachments] = useState<
    { id: string; name: string; type: string; size?: string }[]
  >([]);

  // Step 3: 收款資料
  const [bankName, setBankName] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [agreeRules, setAgreeRules] = useState(true);

  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Simulate file upload
  const handleSimulatedFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newAtts = Array.from(files).map((f) => ({
        id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        name: f.name,
        type: f.type || 'document',
        size: `${(f.size / (1024 * 1024)).toFixed(1)} MB`,
      }));
      setAttachments((prev) => [...prev, ...newAtts]);
    }
  };

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (step === 1) {
      if (!accountName.trim()) {
        setErrorMsg('請填寫帳號名稱');
        return;
      }
      if (!email.trim() || !email.includes('@')) {
        setErrorMsg('請填寫正確的聯絡 Email');
        return;
      }
      if (!phone.trim()) {
        setErrorMsg('請填寫聯絡電話');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!title.trim()) {
        setErrorMsg('請填寫提案名稱');
        return;
      }
      if (!painPoint.trim()) {
        setErrorMsg('請詳細填寫痛點描述');
        return;
      }
      if (!solution.trim()) {
        setErrorMsg('請詳細填寫解決方案');
        return;
      }
      if (!targetAudience.trim()) {
        setErrorMsg('請填寫目標族群');
        return;
      }
      if (!businessModel.trim()) {
        setErrorMsg('請填寫商業模式');
        return;
      }
      if (!expectedImpact.trim()) {
        setErrorMsg('請填寫預期影響');
        return;
      }
      setStep(3);
    }
  };

  const handleSubmitFinal = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!bankName.trim() || !bankAccount.trim()) {
      setErrorMsg('請填寫完整收款銀行與帳戶資料（以供競賽獎金發放）');
      return;
    }
    if (!agreeRules) {
      setErrorMsg('請先勾選同意競賽審核規範');
      return;
    }

    setIsSubmitting(true);

    const res = await submitChallengeProposal({
      title,
      category,
      authorId: currentUser.id,
      authorName: accountName,
      authorAvatar: currentUser.avatar,
      teamName,
      email,
      phone,
      schoolOrOccupation,
      referralCode,
      painPoint,
      solution,
      targetAudience,
      businessModel,
      expectedImpact,
      coverImage: coverImageUrl || undefined,
      attachments,
      bankName,
      bankAccount,
    });

    setIsSubmitting(false);

    if (!res.success || !res.proposal) {
      setErrorMsg(res.error || '投稿失敗，請稍後重試');
      return;
    }

    onSuccess(res.proposal);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto bg-stone-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh] my-auto">
        {/* Header */}
        <div className="px-6 py-4 bg-white text-stone-900 flex items-center justify-between shrink-0 border-b border-stone-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-400 text-stone-950 flex items-center justify-center font-black">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-black text-stone-900 flex items-center gap-2">
                <span>IdeaX 創新挑戰季 • 我要投稿</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold">
                  第 {step} / 3 步
                </span>
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="grid grid-cols-3 bg-stone-100 border-b border-stone-200 text-xs font-bold text-stone-600">
          <div
            className={`py-2.5 text-center transition-colors ${
              step >= 1 ? 'bg-amber-50 text-amber-950 border-b-2 border-amber-500' : ''
            }`}
          >
            1. 基本與聯絡資料
          </div>
          <div
            className={`py-2.5 text-center transition-colors ${
              step >= 2 ? 'bg-amber-50 text-amber-950 border-b-2 border-amber-500' : ''
            }`}
          >
            2. 創新提案內容
          </div>
          <div
            className={`py-2.5 text-center transition-colors ${
              step >= 3 ? 'bg-amber-50 text-amber-950 border-b-2 border-amber-500' : ''
            }`}
          >
            3. 收款與審核確認
          </div>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs font-bold text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* STEP 1: 基本資料 */}
          {step === 1 && (
            <form id="step-1-form" onSubmit={handleNextStep} className="space-y-4">
              <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 text-xs text-amber-900 space-y-1">
                <span className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  <span>帳號連結說明</span>
                </span>
                <p className="text-stone-600 leading-relaxed">
                  以上填寫之基本資訊與聯絡方式，完賽後將自動轉為 IdeaX 舊平台帳號資料與商業化履歷。
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-700">帳號名稱 *</label>
                  <input
                    type="text"
                    required
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder="例如：Alex_Innovator"
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 focus:border-amber-500 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-200"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-700">姓名／團隊名稱</label>
                  <input
                    type="text"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="個人姓名或團隊全名"
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 focus:border-amber-500 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-700">Email *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="用於接收過審通知與賽事進度"
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 focus:border-amber-500 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-200"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-700">聯絡電話 / 手機 *</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0912-345-678"
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 focus:border-amber-500 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-200"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700">學校／現職職業 *</label>
                <input
                  type="text"
                  required
                  value={schoolOrOccupation}
                  onChange={(e) => setSchoolOrOccupation(e.target.value)}
                  placeholder="例如：國立台灣大學 創新創業學程 / 軟體工程師"
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 focus:border-amber-500 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-200"
                />
              </div>

              <div className="space-y-1 pt-2">
                <label className="text-xs font-bold text-stone-700 flex items-center justify-between">
                  <span>宣傳大使推薦碼（選填）</span>
                  <span className="text-[10px] text-emerald-600 font-bold">提案審核通過後，該推薦大使可得 $800 推廣費</span>
                </label>
                <input
                  type="text"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                  placeholder="例如：IDEAX-NTU88"
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 focus:border-amber-500 rounded-xl text-xs font-mono outline-none focus:ring-2 focus:ring-amber-200 uppercase"
                />
              </div>
            </form>
          )}

          {/* STEP 2: 提案核心資料 (6 大欄位 + 附件) */}
          {step === 2 && (
            <form id="step-2-form" onSubmit={handleNextStep} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-bold text-stone-700">提案名稱 (Title) *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="簡明有吸引力的專案標題"
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 focus:border-amber-500 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-amber-200"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-700">產業類別 *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ChallengeCategory)}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 focus:border-amber-500 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-amber-200"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 1. 痛點描述 */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700">
                  1. 痛點描述（你想解決什麼問題？）*
                </label>
                <textarea
                  rows={3}
                  required
                  value={painPoint}
                  onChange={(e) => setPainPoint(e.target.value)}
                  placeholder="清晰陳述目標市場或使用者正面臨的實際困境、代價或不便之處..."
                  className="w-full p-3 bg-stone-50 border border-stone-200 focus:border-amber-500 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-200"
                />
              </div>

              {/* 2. 解決方案 */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700">
                  2. 解決方案（你的創新方法）*
                </label>
                <textarea
                  rows={3}
                  required
                  value={solution}
                  onChange={(e) => setSolution(e.target.value)}
                  placeholder="說明你的核心創新機制、技術或產品服務如何有效化解上述痛點..."
                  className="w-full p-3 bg-stone-50 border border-stone-200 focus:border-amber-500 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-200"
                />
              </div>

              {/* 3 & 4: 目標族群 & 商業模式 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-700">3. 目標族群 (Target Audience) *</label>
                  <input
                    type="text"
                    required
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    placeholder="例如：大專院校學生、醫護人員、中小企業"
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 focus:border-amber-500 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-200"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-700">4. 商業模式 (Business Model) *</label>
                  <input
                    type="text"
                    required
                    value={businessModel}
                    onChange={(e) => setBusinessModel(e.target.value)}
                    placeholder="例如：SaaS 訂閱制、抽成手續費、硬體租賃"
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 focus:border-amber-500 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-200"
                  />
                </div>
              </div>

              {/* 5. 預期影響 */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700">5. 預期影響 (Expected Impact) *</label>
                <textarea
                  rows={2}
                  required
                  value={expectedImpact}
                  onChange={(e) => setExpectedImpact(e.target.value)}
                  placeholder="預計帶來的社會效益、減碳數據、節省工時或市場估值規模..."
                  className="w-full p-3 bg-stone-50 border border-stone-200 focus:border-amber-500 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-200"
                />
              </div>

              {/* 6. 圖片與附件上傳 */}
              <div className="space-y-2 pt-2 border-t border-stone-200">
                <label className="text-xs font-bold text-stone-700 flex items-center justify-between">
                  <span>6. 提案主圖與企劃附件上傳</span>
                  <span className="text-[10px] text-stone-400">支援 PDF、簡報、圖片</span>
                </label>

                <div className="flex items-center gap-3">
                  <label className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-stone-300">
                    <Upload className="w-3.5 h-3.5" />
                    <span>選擇上傳檔案</span>
                    <input type="file" multiple onChange={handleSimulatedFileUpload} className="hidden" />
                  </label>

                  <input
                    type="text"
                    value={coverImageUrl}
                    onChange={(e) => setCoverImageUrl(e.target.value)}
                    placeholder="或貼上主圖圖片網址 (URL)..."
                    className="flex-1 px-3.5 py-2 bg-stone-50 border border-stone-200 focus:border-amber-500 rounded-xl text-xs outline-none"
                  />
                </div>

                {attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {attachments.map((att) => (
                      <span
                        key={att.id}
                        className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 text-[11px] flex items-center gap-1 font-mono"
                      >
                        <Paperclip className="w-3 h-3 text-amber-600" />
                        <span>{att.name}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </form>
          )}

          {/* STEP 3: 收款資料與審核規範 */}
          {step === 3 && (
            <form id="step-3-form" onSubmit={handleSubmitFinal} className="space-y-5">
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-3">
                <div className="flex items-center gap-2 text-xs font-black text-amber-950">
                  <CreditCard className="w-4 h-4 text-amber-600" />
                  <span>收款帳戶資料（競賽獎金發放與未來轉為平台帳號資料）</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-stone-700">銀行代碼與名稱 *</label>
                    <input
                      type="text"
                      required
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="例如：013 國泰世華銀行"
                      className="w-full px-3.5 py-2 bg-white border border-stone-300 focus:border-amber-500 rounded-xl text-xs outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-stone-700">銀行帳號與戶名 *</label>
                    <input
                      type="text"
                      required
                      value={bankAccount}
                      onChange={(e) => setBankAccount(e.target.value)}
                      placeholder="帳號 12-14 碼及存簿戶名"
                      className="w-full px-3.5 py-2 bg-white border border-stone-300 focus:border-amber-500 rounded-xl text-xs outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* 審核規則確認 */}
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2.5">
                <h4 className="text-xs font-black text-stone-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>競賽投稿審核機制與誠信守則</span>
                </h4>
                <ul className="text-[11px] text-stone-600 space-y-1.5 list-disc pl-4 leading-relaxed">
                  <li>提案需符合創新創業與真實痛點主題。</li>
                  <li>嚴禁違反中華民國法律或任何形式之抄襲剽竊。</li>
                  <li>
                    <strong>相似提案處理機制：</strong>若出現高度相似提案，將以「最早刊登時間者優先」，後提交者由審核員通知修改或下架。
                  </li>
                  <li>提交後需經管理員審核通過方可公開展示並獲得「IdeaX 創新挑戰認證」標章。</li>
                </ul>

                <label className="flex items-center gap-2 pt-2 text-xs font-bold text-stone-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreeRules}
                    onChange={(e) => setAgreeRules(e.target.checked)}
                    className="w-4 h-4 accent-amber-500 rounded"
                  />
                  <span>我已閱讀並同意上述競賽規則與原創保證。</span>
                </label>
              </div>
            </form>
          )}
        </div>

        {/* Footer Navigation Buttons */}
        <div className="px-6 py-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => (s - 1) as any)}
              className="px-4 py-2 rounded-xl bg-white hover:bg-stone-100 text-stone-700 font-bold text-xs border border-stone-200 cursor-pointer transition-colors"
            >
              上一步
            </button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <button
              type="submit"
              form={`step-${step}-form`}
              className="px-6 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs cursor-pointer transition-all shadow-sm"
            >
              下一步：{step === 1 ? '填寫提案內容' : '收款與確認'}
            </button>
          ) : (
            <button
              type="submit"
              form="step-3-form"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black text-xs cursor-pointer transition-all shadow-md flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? '提交中...' : '確認提交審核'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
