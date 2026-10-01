import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  Trash2,
  Sparkles,
  Award,
  Link as LinkIcon,
  HelpCircle,
  Check,
} from 'lucide-react';
import { User, Category, CATEGORY_HIERARCHY } from '../types';
import { useApp } from '../context/AppContext';
import { HelpTooltip } from './HelpTooltip';

interface ExpertCertificationApplyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExpertCertificationApplyModal: React.FC<ExpertCertificationApplyModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { currentUser, setCurrentUser, addNotification, openAboutModal } = useApp();

  // 7-day cooldown calculation
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  const lastAppliedTime = currentUser.lastExpertAppliedAt
    ? new Date(currentUser.lastExpertAppliedAt).getTime()
    : 0;
  const now = Date.now();
  const timeSinceLastApply = now - lastAppliedTime;
  const isWithinCooldown = Boolean(
    currentUser.lastExpertAppliedAt &&
    timeSinceLastApply < SEVEN_DAYS_MS &&
    currentUser.expertApplicationStatus === 'rejected'
  );

  const remainingDays = isWithinCooldown
    ? Math.ceil((SEVEN_DAYS_MS - timeSinceLastApply) / (24 * 60 * 60 * 1000))
    : 0;

  const isPending = currentUser.expertApplicationStatus === 'pending';
  const isApproved =
    currentUser.verifiedExpert ||
    currentUser.verifiedBadge ||
    currentUser.expertApplicationStatus === 'approved';

  // Form State
  const initialData = currentUser.expertApplicationData;
  const [selectedDomains, setSelectedDomains] = useState<string[]>(() => {
    if (initialData?.domains && initialData.domains.length > 0) return initialData.domains;
    if (initialData?.domain && initialData.domain !== 'auto' && initialData.domain !== '由平台為您分類') return [initialData.domain];
    if (currentUser.domains && currentUser.domains.length > 0) return currentUser.domains;
    if (currentUser.domain) return [currentUser.domain];
    return ['創新創業'];
  });
  const [selectedSubdomains, setSelectedSubdomains] = useState<string[]>(() => {
    if (initialData?.subdomains && initialData.subdomains.length > 0) return initialData.subdomains;
    if (initialData?.subdomain) return [initialData.subdomain];
    if (currentUser.subdomains && currentUser.subdomains.length > 0) return currentUser.subdomains;
    return ['資訊科技'];
  });
  const [professionalTitle, setProfessionalTitle] = useState(
    currentUser.expertApplicationData?.professionalTitle || currentUser.title || ''
  );
  const [yearsOfExperience, setYearsOfExperience] = useState(
    currentUser.expertApplicationData?.yearsOfExperience || '5-8 年'
  );

  const toggleSubdomain = (sub: string, parentCat: Category) => {
    if (selectedSubdomains.includes(sub)) {
      if (selectedSubdomains.length > 1) {
        setSelectedSubdomains(selectedSubdomains.filter((s) => s !== sub));
      }
    } else {
      if (selectedSubdomains.length < 5) {
        setSelectedSubdomains([...selectedSubdomains, sub]);
        if (!selectedDomains.includes(parentCat)) {
          setSelectedDomains([...selectedDomains, parentCat]);
        }
      }
    }
  };

  const removeSubdomain = (sub: string) => {
    if (selectedSubdomains.length > 1) {
      setSelectedSubdomains(selectedSubdomains.filter((s) => s !== sub));
    }
  };

  // Uploaded credentials files (證件/證照)
  const [credentialsFiles, setCredentialsFiles] = useState<
    Array<{ name: string; size?: string; url?: string }>
  >(
    currentUser.expertApplicationData?.credentialsFiles || [
      { name: '專業證照與在職證明_實名掃描本.pdf', size: '2.4 MB' },
    ]
  );

  // Proof & Portfolio (有利證明與案例)
  const [proofDescription, setProofDescription] = useState(
    currentUser.expertApplicationData?.proofDescription || ''
  );
  const [proofFiles, setProofFiles] = useState<
    Array<{ name: string; size?: string; url?: string }>
  >(
    currentUser.expertApplicationData?.proofFiles || []
  );
  const [portfolioLink, setPortfolioLink] = useState(
    currentUser.expertApplicationData?.portfolioLink || ''
  );

  // Policy Agreement
  const [agreedPrivacy, setAgreedPrivacy] = useState(true);
  const [agreedHonesty, setAgreedHonesty] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  if (!isOpen) return null;

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'credential' | 'proof'
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles: Array<{ name: string; size?: string }> = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      newFiles.push({
        name: file.name,
        size: `${sizeMb} MB`,
      });
    }

    if (type === 'credential') {
      setCredentialsFiles((prev) => [...prev, ...newFiles]);
    } else {
      setProofFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isWithinCooldown) {
      alert(`依平台審核規定，申請未通過者每 7 日僅能申請一次，請於 ${remainingDays} 天後再次提交。`);
      return;
    }

    if (!professionalTitle.trim()) {
      alert('請填寫您的專業頭銜或職稱！');
      return;
    }

    if (credentialsFiles.length === 0) {
      alert('請至少上傳一份身分或專業相關證件（如證照、聘書、在職證明等）！');
      return;
    }

    if (!proofDescription.trim() && proofFiles.length === 0 && !portfolioLink.trim()) {
      alert('請填寫實戰經驗或提供有利成果證明佐證！');
      return;
    }

    if (!agreedPrivacy || !agreedHonesty) {
      alert('請閱讀並勾選個人資料隱私權政策與專家誠信保證！');
      return;
    }

    setIsSubmitting(true);

    const appliedAt = new Date().toISOString();
    const finalDomains = selectedDomains.length > 0 ? selectedDomains : ['創新創業'];
    const applicationPayload = {
      domain: finalDomains[0],
      domains: finalDomains,
      subdomain: selectedSubdomains[0] || '',
      subdomains: selectedSubdomains,
      professionalTitle: professionalTitle.trim(),
      yearsOfExperience,
      credentialsFiles,
      proofDescription: proofDescription.trim(),
      proofFiles,
      portfolioLink: portfolioLink.trim(),
      agreedPrivacy,
      appliedAt,
    };

    setTimeout(() => {
      setCurrentUser((prev: User) => ({
        ...prev,
        domain: (finalDomains[0] || prev.domain) as Category,
        domains: finalDomains as Category[],
        subdomains: selectedSubdomains,
        title: professionalTitle.trim(),
        expertApplicationStatus: 'pending',
        lastExpertAppliedAt: appliedAt,
        expertApplicationData: applicationPayload,
      }));

      addNotification({
        title: '認證專家資格審查已送出',
        message: '您的認證專家實名審查申請已成功送出！官方審核團隊將於 1~2 個工作天內完成審查，審核結果將即時通知。',
        type: 'system',
      });

      setIsSubmitting(false);
      setSubmitSuccess(true);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl max-h-[92vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-stone-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-200 flex items-center justify-between bg-stone-50/70 sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center font-black shadow-2xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-stone-900 flex items-center gap-2">
                <span>申請 IdeaX 認證專家審查</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                  每 7 日限申 1 次
                </span>
              </h2>
              <p className="text-xs text-stone-500">
                通過平台實名與專業資歷認證，享有全站金牌專家標章與高價值案件優先推薦
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition-colors cursor-pointer"
            title="關閉"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto flex-1 p-4 sm:p-6 space-y-6">
          {/* 已通過狀態 */}
          {isApproved && (
            <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-300 flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-black text-emerald-950">
                  恭喜！您已成功具備「IdeaX 認證專家」資格
                </h3>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  您的專業資歷與有利證明已通過官方核驗，全站各處將公開展示認證金牌標章，並獲得提問者高度信賴。
                </p>
              </div>
            </div>
          )}

          {/* 審核中提示 */}
          {isPending && !submitSuccess && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs text-amber-900">
                <strong className="block text-sm font-black text-amber-950">
                  您的專家審查申請正在審核中
                </strong>
                <p>
                  送件時間：{currentUser.lastExpertAppliedAt ? new Date(currentUser.lastExpertAppliedAt).toLocaleString() : '最近'}
                  。官方審核人員將於 1~2 個工作天內核對證件真實性，審查通過後即刻生效。
                </p>
              </div>
            </div>
          )}

          {/* 7 天冷卻期限制提示 */}
          {isWithinCooldown && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-300 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs text-rose-900">
                <strong className="block text-sm font-black text-rose-950">
                  尚在 7 日重新申請冷卻期內
                </strong>
                <p>
                  依平台安全與智庫把關機制，每次送件未通過後需間隔 7 日方可再次送審。
                  <strong>剩餘冷卻時間：約 {remainingDays} 天</strong>。
                </p>
              </div>
            </div>
          )}

          {/* 成功送出提示 */}
          {submitSuccess ? (
            <div className="p-6 text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-14 h-14 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-black text-stone-900">認證專家資格審查已送出！</h3>
                <p className="text-xs text-stone-600 max-w-md mx-auto leading-relaxed">
                  感謝您的申請！我們已收到您的專業證件與有利證明文件。官方審核人員將嚴格依據隱私權政策進行身分及資歷查驗，預計於 1~2 個工作天內完成審核。
                </p>
              </div>
              <div className="pt-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs cursor-pointer shadow-xs transition-colors"
                >
                  確認並返回個人中心
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* 1. 專業領域與子領域看板 */}
              <div className="space-y-3 p-4 rounded-2xl bg-stone-50 border border-stone-200">
                <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-500 text-stone-950 text-[11px] font-black flex items-center justify-center">
                      1
                    </span>
                    <h3 className="text-xs font-black text-stone-900">申請專家領域與子領域看板</h3>
                  </div>
                  <span className="text-[10px] text-amber-900 font-bold bg-amber-100 px-2 py-0.5 rounded border border-amber-200">
                    可複選 1~5 個子領域（已選 {selectedSubdomains.length} / 5 個）
                  </span>
                </div>

                <div className="space-y-2.5 text-xs">
                  {/* 已選清單 Chips 快速檢視 */}
                  <div className="p-2.5 rounded-xl bg-white border border-stone-200 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-stone-600">
                        已選擇的專家子領域（點擊 ✕ 移除）：
                      </span>
                      <span className="text-[10px] font-mono font-bold text-amber-900">
                        {selectedSubdomains.length} / 5 項
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1 min-h-6 items-center">
                      {selectedSubdomains.map((sub) => (
                        <span
                          key={sub}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500 text-stone-950 text-[11px] font-black shadow-2xs"
                        >
                          <span>✓ {sub}</span>
                          <button
                            type="button"
                            onClick={() => removeSubdomain(sub)}
                            className="w-3 h-3 rounded-full hover:bg-amber-600 flex items-center justify-center text-[9px] cursor-pointer ml-0.5"
                            title="移除此子領域"
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* 四大主領域與子領域勾選網格 */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[11px] font-bold text-stone-700">
                        點選專長子領域標籤（可複選 1~5 個）：
                      </label>
                      <span className="text-[10px] text-stone-400">管理員審核時可擇優通過或指派</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {(['創新創業', '專業問題', '學術探討', '日常疑難'] as Category[]).map((catName) => {
                        const subList = CATEGORY_HIERARCHY[catName] || [];
                        const catSelectedCount = subList.filter((s) => selectedSubdomains.includes(s)).length;

                        return (
                          <div
                            key={catName}
                            className="p-2.5 rounded-xl bg-white border border-stone-200 space-y-1.5"
                          >
                            <div className="flex items-center justify-between border-b border-stone-100 pb-1">
                              <span className="font-black text-xs text-stone-900">{catName}</span>
                              {catSelectedCount > 0 && (
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-900">
                                  已選 {catSelectedCount} 項
                                </span>
                              )}
                            </div>

                            {/* 子領域 Chips */}
                            <div className="flex flex-wrap gap-1">
                              {subList.map((sub) => {
                                const isChecked = selectedSubdomains.includes(sub);
                                return (
                                  <button
                                    key={sub}
                                    type="button"
                                    onClick={() => toggleSubdomain(sub, catName)}
                                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-0.5 ${
                                      isChecked
                                        ? 'bg-amber-500 text-stone-950 font-black shadow-2xs ring-1 ring-amber-400'
                                        : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border border-stone-200'
                                    }`}
                                  >
                                    <span>{isChecked ? '✓' : '+'}</span>
                                    <span>{sub}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    {/* 年資 */}
                    <div>
                      <label className="block text-[11px] font-bold text-stone-700 mb-1">
                        相關年資 / 實務資歷 <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={yearsOfExperience}
                        onChange={(e) => setYearsOfExperience(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-stone-300 text-stone-900 font-medium focus:outline-none focus:border-amber-500"
                      >
                        <option value="1-3 年">1-3 年 實務經驗</option>
                        <option value="3-5 年">3-5 年 專業資深</option>
                        <option value="5-8 年">5-8 年 資深顧問/技術主管</option>
                        <option value="8-12 年">8-12 年 行業總監/創辦人</option>
                        <option value="12 年以上">12 年以上 領域權威/學術前輩</option>
                      </select>
                    </div>

                    {/* 公開職銜 */}
                    <div>
                      <label className="block text-[11px] font-bold text-stone-700 mb-1">
                        公開認證頭銜 / 職稱 <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="例：前科技巨頭 AI 首席架構師 / 執業會計師"
                        value={professionalTitle}
                        onChange={(e) => setProfessionalTitle(e.target.value)}
                        required
                        className="w-full px-3 py-2 rounded-xl bg-white border border-stone-300 text-stone-900 font-medium focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. 上傳相關證件 (身分與專業資格) */}
              <div className="space-y-3 p-4 rounded-2xl bg-stone-50 border border-stone-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-stone-200 pb-2 gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="w-5 h-5 rounded-full bg-amber-500 text-stone-950 text-[11px] font-black flex items-center justify-center shrink-0">
                      2
                    </span>
                    <h3 className="text-xs font-black text-stone-900">上傳相關證件與資歷證明</h3>
                    <span className="text-rose-500 text-xs">*</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                      （僅供平台認證使用）
                    </span>
                    <HelpTooltip
                      title="【認證隱私安全政策】認證照片僅供認證使用，審核完畢即永久刪除"
                      content={
                        <div className="space-y-1.5 text-[11px] leading-relaxed">
                          <p>
                            • <strong>內部專屬審查：</strong>所上傳之證照與學經歷證明文件僅供官方審查人員內部審驗，絕不公開；<strong>審核完成後即自伺服器永久刪除證件檔案</strong>。
                          </p>
                          <p>
                            • <strong>自行備份提醒：</strong>平台不對用戶上傳檔案負保管責任。大型專案檔案或高畫質作品集，<strong>請善用 Google Drive、Dropbox、Figma、GitHub 等外部雲端工具之共享連結</strong>。
                          </p>
                        </div>
                      }
                    />
                  </div>
                  <span className="text-[10px] text-stone-400 font-mono">支援 PDF, JPG, PNG (單檔 10MB 內)</span>
                </div>

                <p className="text-[11px] text-stone-500">
                  請上傳可佐證您專業能力與實名身分之文件（如：<strong>國家級/國際專業證照、畢業學位證書、在職或離職證明、名片、受聘合約</strong>等，證件敏感個資請自行遮蔽）。
                </p>

                {/* Upload Box */}
                <label className="border-2 border-dashed border-stone-300 hover:border-amber-500 bg-white hover:bg-amber-50/30 rounded-2xl p-4 flex flex-col items-center justify-center gap-1.5 text-center cursor-pointer transition-colors group">
                  <Upload className="w-6 h-6 text-stone-400 group-hover:text-amber-600 transition-colors" />
                  <span className="text-xs font-bold text-stone-800">
                    點擊或拖曳上傳專業證件檔案
                  </span>
                  <span className="text-[10px] text-stone-400">
                    支援多檔上傳，審核人員將嚴格保密您的個資
                  </span>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={(e) => handleFileUpload(e, 'credential')}
                    className="hidden"
                  />
                </label>

                {/* File List */}
                {credentialsFiles.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    {credentialsFiles.map((file, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-xl bg-white border border-stone-200 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-4 h-4 text-amber-600 shrink-0" />
                          <span className="font-semibold text-stone-800 truncate">{file.name}</span>
                          {file.size && (
                            <span className="text-[10px] text-stone-400 font-mono shrink-0">
                              ({file.size})
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setCredentialsFiles((prev) => prev.filter((_, i) => i !== idx))
                          }
                          className="text-stone-400 hover:text-rose-600 p-1 cursor-pointer"
                          title="移除檔案"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 3. 出示有利證明與實戰成果 */}
              <div className="space-y-3 p-4 rounded-2xl bg-stone-50 border border-stone-200">
                <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-500 text-stone-950 text-[11px] font-black flex items-center justify-center">
                      3
                    </span>
                    <h3 className="text-xs font-black text-stone-900">出示有利證明與實戰成果</h3>
                  </div>
                  <span className="text-[10px] text-amber-800 font-bold bg-amber-100 px-2 py-0.5 rounded">
                    加分項目
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 mb-1">
                      實戰案例與成效說明（可簡述過往最具代表性的解決方案或成效）
                    </label>
                    <textarea
                      rows={3}
                      value={proofDescription}
                      onChange={(e) => setProofDescription(e.target.value)}
                      placeholder="例：曾協助 3 家新創團隊完成種子輪募資架構規劃；主導跨國金融系統高併發架構優化，將查詢延遲降低 75% 等實戰成果..."
                      className="w-full px-3 py-2 rounded-xl bg-white border border-stone-300 text-stone-900 font-medium focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 mb-1">
                      外部作品集 / 報導 / GitHub / LinkedIn 連結（選填）
                    </label>
                    <div className="relative">
                      <LinkIcon className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
                      <input
                        type="url"
                        value={portfolioLink}
                        onChange={(e) => setPortfolioLink(e.target.value)}
                        placeholder="https://github.com/... 或 https://linkedin.com/in/..."
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-stone-300 text-stone-900 font-medium focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  {/* Upload Additional Proof files */}
                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 mb-1">
                      成果簡報 / 專案成果報告附件（選填）
                    </label>
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-stone-300 hover:border-amber-500 text-stone-700 font-bold text-xs cursor-pointer transition-colors">
                      <Upload className="w-3.5 h-3.5 text-amber-600" />
                      <span>上傳佐證檔案</span>
                      <input
                        type="file"
                        multiple
                        accept=".pdf,.png,.jpg,.jpeg,.zip"
                        onChange={(e) => handleFileUpload(e, 'proof')}
                        className="hidden"
                      />
                    </label>

                    {proofFiles.length > 0 && (
                      <div className="space-y-1.5 pt-2">
                        {proofFiles.map((file, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2 rounded-xl bg-white border border-stone-200 text-xs"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText className="w-4 h-4 text-stone-500 shrink-0" />
                              <span className="font-semibold text-stone-800 truncate">{file.name}</span>
                              {file.size && (
                                <span className="text-[10px] text-stone-400 font-mono shrink-0">
                                  ({file.size})
                                </span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                setProofFiles((prev) => prev.filter((_, i) => i !== idx))
                              }
                              className="text-stone-400 hover:text-rose-600 p-1 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 4. 條款勾選與規範 */}
              <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-2.5">
                <div className="flex items-center gap-1.5 text-amber-950 font-black text-xs">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  <span>法規遵循與誠實信用保證</span>
                </div>

                <label className="flex items-start gap-2 text-xs text-stone-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreedPrivacy}
                    onChange={(e) => setAgreedPrivacy(e.target.checked)}
                    className="w-4 h-4 accent-amber-600 rounded cursor-pointer mt-0.5"
                  />
                  <span>
                    我已閱讀並同意遵守<strong>《個人資料保護法》</strong>及
                    <button
                      type="button"
                      onClick={() => openAboutModal('privacy_policy')}
                      className="text-amber-800 underline font-bold inline-flex items-center mx-1"
                    >
                      平台隱私權政策
                    </button>
                    ，同意 IdeaX 僅將所提供證件及有利證明用於身分與資歷審查核驗。
                  </span>
                </label>

                <label className="flex items-start gap-2 text-xs text-stone-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreedHonesty}
                    onChange={(e) => setAgreedHonesty(e.target.checked)}
                    className="w-4 h-4 accent-amber-600 rounded cursor-pointer mt-0.5"
                  />
                  <span>
                    我保證所填寫之經歷、上傳之證件與實戰證明均屬本人真實資歷，絕無虛偽不實或侵權情事。
                  </span>
                </label>
              </div>

              {/* 7 日申請規定提示條 */}
              <div className="text-[11px] text-stone-500 flex items-center gap-1.5 justify-center">
                <Clock className="w-3.5 h-3.5 text-stone-400" />
                <span>送出後官方將於 1~2 個工作天內完成審查；依規範審查未通過者每 7 日可再次申請一次。</span>
              </div>

              {/* Actions Footer */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl text-stone-600 hover:bg-stone-100 font-bold text-xs transition-colors cursor-pointer"
                >
                  取消
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting || isWithinCooldown}
                  className={`px-6 py-2.5 rounded-xl font-black text-xs transition-all shadow-xs flex items-center gap-1.5 cursor-pointer ${
                    isWithinCooldown
                      ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>
                    {isSubmitting
                      ? '資料加密傳輸中...'
                      : isWithinCooldown
                      ? `7 日冷卻中 (剩 ${remainingDays} 天)`
                      : '正式送出專家認證審查'}
                  </span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
