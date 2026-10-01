import React, { useState } from 'react';
import {
  ShieldCheck,
  Award,
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  Trash2,
  Sparkles,
  Link as LinkIcon,
  Check,
  Briefcase,
  Star,
  Layers,
} from 'lucide-react';
import { User, Category, CATEGORY_HIERARCHY } from '../types';
import { useApp } from '../context/AppContext';
import { HelpTooltip } from './HelpTooltip';

export const ExpertCertificationTab: React.FC = () => {
  const { currentUser, setCurrentUser, addNotification, openAboutModal, answers } = useApp();

  const userAcceptedAnswers = answers.filter((a) => a.solverId === currentUser.id && a.isAccepted);
  const userRating = currentUser.rating || 5.0;
  const isAutoQualified = userAcceptedAnswers.length >= 50 && userRating >= 4.0;

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

  const isApproved =
    currentUser.verifiedExpert ||
    Boolean(currentUser.verifiedBadge) ||
    isAutoQualified ||
    currentUser.expertApplicationStatus === 'approved';

  const isPending = currentUser.expertApplicationStatus === 'pending';

  // Form State
  const initialData = currentUser.expertApplicationData;
  const [selectedDomains, setSelectedDomains] = useState<string[]>(() => {
    if (initialData?.domains && initialData.domains.length > 0) return initialData.domains;
    if (initialData?.domain && initialData.domain !== 'auto' && initialData.domain !== '由平台為您分類') return [initialData.domain];
    if (currentUser.domains && currentUser.domains.length > 0) return currentUser.domains;
    if (currentUser.domain) return [currentUser.domain];
    return ['創新創業'];
  });
  const [subcategory, setSubcategory] = useState<string>(
    initialData?.subdomain || ''
  );
  const [professionalTitle, setProfessionalTitle] = useState(
    initialData?.professionalTitle || currentUser.title || '資深架構師 / 商業顧問'
  );
  const [yearsOfExperience, setYearsOfExperience] = useState(
    initialData?.yearsOfExperience || '5-8 年'
  );

  const toggleDomain = (domName: string) => {
    if (selectedDomains.includes(domName)) {
      if (selectedDomains.length > 1) {
        setSelectedDomains(selectedDomains.filter((d) => d !== domName));
      } else {
        setMsg('⚠️ 至少須保留 1 個申請領域！');
        setTimeout(() => setMsg(null), 3000);
      }
    } else {
      if (selectedDomains.length < 5) {
        setSelectedDomains([...selectedDomains, domName]);
      } else {
        setMsg('⚠️ 申請專家領域至多可複選 5 個領域！');
        setTimeout(() => setMsg(null), 3000);
      }
    }
  };

  // Uploaded credentials files
  const [credentialsFiles, setCredentialsFiles] = useState<
    Array<{ name: string; size?: string; url?: string }>
  >(
    initialData?.credentialsFiles || [
      { name: '國際專業資歷與執業證照掃描本.pdf', size: '2.8 MB' },
    ]
  );

  // Proof & Portfolio
  const [proofDescription, setProofDescription] = useState(
    initialData?.proofDescription ||
      '具備 8 年以上跨國企業數位轉型與大型高併發架構落地經驗，曾輔導 10+ 團隊成功交付商業落地專案。'
  );
  const [proofFiles, setProofFiles] = useState<
    Array<{ name: string; size?: string; url?: string }>
  >(
    initialData?.proofFiles || [
      { name: '代表性商業解決方案成果報告.pdf', size: '4.2 MB' },
    ]
  );
  const [portfolioLink, setPortfolioLink] = useState(
    initialData?.portfolioLink || 'https://linkedin.com/in/expert-profile'
  );

  // Policy Agreement
  const [agreedPrivacy, setAgreedPrivacy] = useState(true);
  const [agreedHonesty, setAgreedHonesty] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

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

    if (currentUser.realNameAuthStatus !== 'verified') {
      setMsg('⚠️ 申請專家認證前必須先完成【實名認證】！即使您已達到採納方案數 ≥ 50 且平均評分 ≥ 4.0 星，亦須先完成實名認證通過後，方可解鎖成為認證專家。');
      return;
    }

    if (isWithinCooldown) {
      setMsg(`⚠️ 依審核規範，未通過者每 7 日僅能申請一次，請於 ${remainingDays} 天後再次送出。`);
      return;
    }

    if (!professionalTitle.trim()) {
      setMsg('⚠️ 請填寫您的專業頭銜或職稱！');
      return;
    }

    if (credentialsFiles.length === 0) {
      setMsg('⚠️ 請至少上傳一份專業相關證件或資歷佐證！');
      return;
    }

    if (!proofDescription.trim() && proofFiles.length === 0 && !portfolioLink.trim()) {
      setMsg('⚠️ 請填寫實戰案例說明或提供成果佐證連結！');
      return;
    }

    if (!agreedPrivacy || !agreedHonesty) {
      setMsg('⚠️ 請閱讀並勾選隱私權保護政策與真實性切結聲明！');
      return;
    }

    setIsSubmitting(true);

    const appliedAt = new Date().toISOString();
    const finalDomains = selectedDomains.length > 0 ? selectedDomains : ['創新創業'];
    const payload = {
      domain: finalDomains[0],
      domains: finalDomains,
      subdomain: subcategory,
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
        title: professionalTitle.trim(),
        expertApplicationStatus: 'pending',
        lastExpertAppliedAt: appliedAt,
        expertApplicationData: payload,
      }));

      addNotification({
        title: '專家認證資格審查已送出',
        message: '您的專家認證申請已成功送出！官方專業審核團隊將於 1~2 個工作天內核驗證件真實性。',
        type: 'system',
      });

      setIsSubmitting(false);
      setMsg('🎉 專家認證資格審查表單已成功送出！官方人員審核中。');
      setTimeout(() => setMsg(null), 4000);
    }, 600);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="p-4 sm:p-6 rounded-3xl bg-white border border-stone-200 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-stone-950 flex items-center justify-center font-black shadow-2xs shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-stone-900">
                  IdeaX 認證專家資格審查
                </h3>
                {isApproved ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5" /> 認證專家
                  </span>
                ) : isPending ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                    <Clock className="w-3.5 h-3.5" /> 專家審核中
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 border border-stone-200">
                    未取得專家認證
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                認證標準：(1) 通過平台官方<strong className="font-black text-stone-800">實名審核</strong>與<strong className="font-black text-stone-800">專業證明核驗</strong>，或 (2) 在平台累計<strong className="font-black text-stone-800">採納方案數達 50 份以上且評分 ≥ 4 星</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-amber-900 font-bold bg-amber-100 px-3 py-1 rounded-xl border border-amber-200">
              每 7 日限申請 1 次
            </span>
          </div>
        </div>

        {/* Message notification */}
        {msg && (
          <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{msg}</span>
          </div>
        )}

        {/* Real Name Verification Prerequisite Warning */}
        {currentUser.realNameAuthStatus !== 'verified' && (
          <div className="mt-4 p-4 rounded-2xl bg-rose-50 border border-rose-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-rose-950">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs sm:text-sm font-black text-rose-950">
                  ⚠️ 申請專家認證前必須先完成實名認證
                </h4>
                <p className="text-[11px] text-rose-800 mt-0.5 leading-relaxed">
                  依 IdeaX 平台合規規範，在申請專家認證前<strong>必須先完成實名認證</strong>！即使您已達到採納方案數 ≥ 50 且平均評分 ≥ 4.0 星，亦須先完成實名認證通過後，方可解鎖成為認證專家。
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Approved Card */}
        {isApproved && (
          <div className="mt-4 p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs text-emerald-950">
              <strong className="block text-sm font-black">
                您已具備「IdeaX 認證專家」資格
              </strong>
              <p className="text-emerald-800">
                {currentUser.verifiedExpert || currentUser.verifiedBadge
                  ? '您的專業資歷與實名證件已通過官方認證。'
                  : '您在平台累計採納之落地方案已達 50 份以上且評分 ≥ 4 星，系統已自動為您解鎖認證專家標章。'}
                全站問題頁將享有 AI 優先推薦與首頁專家智庫曝光權益。
              </p>
            </div>
          </div>
        )}

        {/* Pending Card */}
        {isPending && (
          <div className="mt-4 p-4 rounded-2xl bg-amber-50/70 border border-amber-200 flex items-start gap-3">
            <Clock className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs text-amber-950">
              <strong className="block text-sm font-black">
                您的專家審查表單已送出，官方審核中
              </strong>
              <p className="text-amber-800">
                送件時間：{currentUser.lastExpertAppliedAt ? new Date(currentUser.lastExpertAppliedAt).toLocaleString() : '最近'}
                。官方審查小組將於 1~2 個工作天內核對您的專業證照與佐證資料，核驗完成後將即時通知。
              </p>
            </div>
          </div>
        )}

        {/* Cooldown notice */}
        {isWithinCooldown && (
          <div className="mt-4 p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs text-rose-950">
              <strong className="block text-sm font-black">
                尚在 7 日重新申請冷卻期內
              </strong>
              <p className="text-rose-800">
                依平台審核規範，未通過者需間隔 7 日方可再次送件。剩餘冷卻時間：約 {remainingDays} 天。
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Expert Application Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 1. 專業領域與頭銜 */}
        <div className="p-5 rounded-3xl bg-white border border-stone-200 space-y-4 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-stone-100 pb-3 gap-2">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-500 text-stone-950 text-[11px] font-black flex items-center justify-center">
                1
              </span>
              <h4 className="font-extrabold text-sm text-stone-900">
                申請專家領域與公開職銜
              </h4>
            </div>
            <span className="text-[10px] text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded-full font-bold border border-amber-200">
              可複選 1~5 個領域（已選 {selectedDomains.length} / 5 個）
            </span>
          </div>

          <div className="space-y-3.5 text-xs">
            {/* 複選 1~5 個申請領域 */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold text-stone-800">
                  申請專家主領域（點擊勾選 1~5 個專長領域） <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] text-stone-400">管理員審核時可擇優通過或指派</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {[
                  { id: '創新創業', name: '創新創業', desc: '商模 / 融資 / 股權 / 跨境出海' },
                  { id: '專業問題', name: '專業問題', desc: '軟硬體 / 技術 / 法律 / 財務' },
                  { id: '學術探討', name: '學術探討', desc: '科研 / 文史 / 哲學 / 統計論文' },
                  { id: '日常疑難', name: '日常疑難', desc: '職涯規劃 / 個人成長 / 諮詢顧問' },
                ].map((cat) => {
                  const isChecked = selectedDomains.includes(cat.id);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => toggleDomain(cat.id)}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                        isChecked
                          ? 'bg-amber-500/15 border-amber-400 text-amber-950 shadow-2xs ring-1 ring-amber-400'
                          : 'bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-black text-xs text-stone-900">{cat.name}</span>
                        <div
                          className={`w-4 h-4 rounded-md flex items-center justify-center text-[10px] ${
                            isChecked
                              ? 'bg-amber-500 text-stone-950 font-bold'
                              : 'border border-stone-300 bg-white'
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </div>
                      <span className="text-[10px] text-stone-500 leading-tight">{cat.desc}</span>
                    </button>
                  );
                })}
              </div>

              {/* 常用細分專長標籤（亦可點擊加入複選清單） */}
              <div className="mt-2.5 p-2.5 rounded-xl bg-stone-50 border border-stone-100 space-y-1.5">
                <span className="text-[10px] font-bold text-stone-400 block">亦可快速點選細分領域：</span>
                <div className="flex flex-wrap gap-1.5">
                  {['商業模式', '資訊科技', '軟體架構', '法律合規', '財務會計', '醫療生技', '跨境出海', '職涯輔導'].map((tag) => {
                    const isTagged = selectedDomains.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleDomain(tag)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                          isTagged
                            ? 'bg-amber-500 text-stone-950 shadow-2xs font-black'
                            : 'bg-white hover:bg-stone-200 text-stone-600 border border-stone-200'
                        }`}
                      >
                        {isTagged ? `✓ ${tag}` : `+ ${tag}`}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* 實務年資 */}
              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                  實務年資 / 經驗年限 <span className="text-rose-500">*</span>
                </label>
                <select
                  value={yearsOfExperience}
                  onChange={(e) => setYearsOfExperience(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-300 text-stone-900 font-medium focus:outline-none focus:border-amber-500 focus:bg-white"
                >
                  <option value="1-3 年">1-3 年 實務經驗</option>
                  <option value="3-5 年">3-5 年 專業資深</option>
                  <option value="5-8 年">5-8 年 資深顧問/技術主管</option>
                  <option value="8-12 年">8-12 年 行業總監/創辦人</option>
                  <option value="12 年以上">12 年以上 領域權威/學術前輩</option>
                </select>
              </div>

              {/* 公開認證頭銜 */}
              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                  認證公開頭銜 / 職稱（公開於名片與解答處） <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={professionalTitle}
                  onChange={(e) => setProfessionalTitle(e.target.value)}
                  placeholder="例：前科技巨頭 AI 首席架構師 / 執業會計師"
                  required
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-300 text-stone-900 font-medium focus:outline-none focus:border-amber-500 focus:bg-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 2. 上傳相關證件與資歷證明 */}
        <div className="p-5 rounded-3xl bg-white border border-stone-200 space-y-4 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-stone-100 pb-3 gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="w-5 h-5 rounded-full bg-amber-500 text-stone-950 text-[11px] font-black flex items-center justify-center shrink-0">
                2
              </span>
              <h4 className="font-extrabold text-sm text-stone-900">
                上傳專業證件與資歷證明
              </h4>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                （僅供平台認證使用）
              </span>
              <HelpTooltip
                title="【認證安全政策】認證照片僅供認證使用，審核完畢即永久刪除"
                content={
                  <div className="space-y-1.5 text-[11px] leading-relaxed">
                    <p>
                      • <strong>僅供平台認證審查：</strong>所上傳之證照與學經歷證明文件，僅供官方審核人員查驗專業背景，絕不對外公開；審核完畢後即由系統<strong>永久刪除原始證件照片</strong>。
                    </p>
                    <p>
                      • <strong>請務必自行備份：</strong>平台不對用戶上傳之檔案負保管責任。大型作品集、高解析影音或專案成果檔案，<strong>請善用 Google Drive、Dropbox、Figma、GitHub 等外部雲端工具之共享連結</strong>。
                    </p>
                  </div>
                }
              />
            </div>
            <span className="text-[10px] text-stone-400 font-mono">支援 PDF, JPG, PNG (單檔 10MB 內)</span>
          </div>

          <p className="text-[11px] text-stone-500">
            請上傳可佐證您專業能力與實名身分之文件（如：<strong>國家級/國際專業證照、畢業學位證書、在職或離職證明、名片、受聘合約</strong>等，機密數字請自行遮蔽）。
          </p>

          <label className="border-2 border-dashed border-stone-300 hover:border-amber-500 bg-stone-50 hover:bg-amber-50/40 rounded-2xl p-4 flex flex-col items-center justify-center gap-1 text-center cursor-pointer transition-colors group">
            <Upload className="w-6 h-6 text-stone-400 group-hover:text-amber-600 transition-colors" />
            <span className="text-xs font-bold text-stone-800">點擊或拖曳上傳專業證件檔案</span>
            <span className="text-[10px] text-stone-400">支援多檔上傳，審核人員將嚴格保密您的個資</span>
            <input
              type="file"
              multiple
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={(e) => handleFileUpload(e, 'credential')}
              className="hidden"
            />
          </label>

          {credentialsFiles.length > 0 && (
            <div className="space-y-1.5 pt-1">
              {credentialsFiles.map((file, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 text-amber-600 shrink-0" />
                    <span className="font-semibold text-stone-800 truncate">{file.name}</span>
                    {file.size && <span className="text-[10px] text-stone-400 font-mono shrink-0">({file.size})</span>}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setCredentialsFiles((prev) => prev.filter((_, i) => i !== idx))
                    }
                    className="p-1 text-stone-400 hover:text-rose-600 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 3. 出示有利證明與實戰成果 */}
        <div className="p-5 rounded-3xl bg-white border border-stone-200 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-500 text-stone-950 text-[11px] font-black flex items-center justify-center">
                3
              </span>
              <h4 className="font-extrabold text-sm text-stone-900">
                出示有利證明與實戰成果（加分與審查依據）
              </h4>
            </div>
            <span className="text-[10px] text-amber-900 font-bold bg-amber-100 px-2 py-0.5 rounded">
              加分審查
            </span>
          </div>

          <div className="space-y-3.5 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-stone-700 mb-1">
                實戰案例與成效說明（簡述最具代表性之商業成果） <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                value={proofDescription}
                onChange={(e) => setProofDescription(e.target.value)}
                placeholder="例：曾主導金融級高併發系統架構，將延遲降低 70%；輔導 5 家早期團隊完成種子輪募資..."
                required
                className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-300 text-stone-900 font-medium focus:outline-none focus:border-amber-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-stone-700 mb-1">
                外部作品集 / GitHub / LinkedIn / 專訪報導連結（選填）
              </label>
              <div className="relative">
                <LinkIcon className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
                <input
                  type="url"
                  value={portfolioLink}
                  onChange={(e) => setPortfolioLink(e.target.value)}
                  placeholder="https://linkedin.com/in/... 或 https://github.com/..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-stone-50 border border-stone-300 text-stone-900 font-medium focus:outline-none focus:border-amber-500 focus:bg-white"
                />
              </div>
            </div>

            {/* Upload Additional Proof files */}
            <div>
              <label className="block text-[11px] font-bold text-stone-700 mb-1">
                專案成果簡報 / 成果報告附件（選填）
              </label>
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-50 border border-stone-300 hover:border-amber-500 text-stone-700 font-bold text-xs cursor-pointer transition-colors">
                <Upload className="w-3.5 h-3.5 text-amber-600" />
                <span>上傳成果附件</span>
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
                      className="flex items-center justify-between p-2 rounded-xl bg-stone-50 border border-stone-200 text-xs"
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

        {/* 4. 法規勾選與 7 日申請規定 */}
        <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2.5">
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
          <span>送件後官方將於 1~2 個工作天內完成審查；依規範審查未通過者每 7 日可再次申請一次。</span>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={isSubmitting || isWithinCooldown}
            className={`px-6 py-2.5 rounded-xl font-black text-xs sm:text-sm shadow-xs transition-all flex items-center gap-1.5 cursor-pointer ${
              isWithinCooldown
                ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                : 'bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-stone-950'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>
              {isSubmitting
                ? '資料加密傳輸中...'
                : isWithinCooldown
                ? `7 日冷卻中 (剩 ${remainingDays} 天)`
                : isApproved
                ? '更新並儲存專家資料'
                : '提交專家認證資格審查'}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
};
