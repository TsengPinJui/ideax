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
  Tag,
  Image as ImageIcon,
  ZoomIn,
  X,
} from 'lucide-react';
import { User, Category, CATEGORY_HIERARCHY } from '../types';
import { useApp } from '../context/AppContext';
import { HelpTooltip } from './HelpTooltip';
import { processAndUploadExpertCredentialImage } from '../utils/idCardImageHelper';

interface ExpertCertificationTabProps {
  onNavigateToRealName?: () => void;
}

export const ExpertCertificationTab: React.FC<ExpertCertificationTabProps> = ({
  onNavigateToRealName,
}) => {
  const { currentUser, setCurrentUser, addNotification, openAboutModal, answers } = useApp();

  const userAcceptedAnswers = answers.filter((a) => a.solverId === currentUser.id && a.isAccepted);
  const userRating = currentUser.rating || 0; // 沒有評分就是 0，不當成 5 分
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

  // 依使用者指示：用戶申請任何驗證時，絕對不自動帶入虛擬測試資料
  const isMockExpertData = Boolean(
    currentUser.expertApplicationData && (
      currentUser.expertApplicationData.professionalTitle?.includes('資深全端系統架構師') ||
      currentUser.expertApplicationData.professionalTitle?.includes('測試') ||
      currentUser.expertApplicationData.yearsOfExperience === '12年' ||
      currentUser.expertApplicationData.credentialsFiles?.some((f) => f.name?.includes('TOGAF') || f.url?.includes('unsplash'))
    )
  );

  // 若尚未審核通過或含有測試資料，一律保持空白，不帶入任何虛擬資料
  const initialData = (!isApproved || isMockExpertData) ? null : currentUser.expertApplicationData;
  const [selectedDomains, setSelectedDomains] = useState<string[]>(() => {
    if (initialData?.domains && initialData.domains.length > 0) return initialData.domains;
    if (initialData?.domain && initialData.domain !== 'auto' && initialData.domain !== '由平台為您分類') return [initialData.domain];
    return [];
  });
  const [selectedSubdomains, setSelectedSubdomains] = useState<string[]>(() => {
    if (initialData?.subdomains && initialData.subdomains.length > 0) return initialData.subdomains;
    if (initialData?.subdomain) return [initialData.subdomain];
    return [];
  });
  const [professionalTitle, setProfessionalTitle] = useState(
    initialData?.professionalTitle || ''
  );
  const [yearsOfExperience, setYearsOfExperience] = useState(
    initialData?.yearsOfExperience || ''
  );

  const toggleSubdomain = (sub: string, parentCat: Category) => {
    if (selectedSubdomains.includes(sub)) {
      if (selectedSubdomains.length > 1) {
        setSelectedSubdomains(selectedSubdomains.filter((s) => s !== sub));
      } else {
        setMsg(' 至少須保留 1 個專長子領域！');
        setTimeout(() => setMsg(null), 3000);
      }
    } else {
      if (selectedSubdomains.length < 5) {
        setSelectedSubdomains([...selectedSubdomains, sub]);
        if (!selectedDomains.includes(parentCat)) {
          setSelectedDomains([...selectedDomains, parentCat]);
        }
      } else {
        setMsg(' 專家專長子領域至多可複選 5 個！');
        setTimeout(() => setMsg(null), 3000);
      }
    }
  };

  const removeSubdomain = (sub: string) => {
    if (selectedSubdomains.length > 1) {
      setSelectedSubdomains(selectedSubdomains.filter((s) => s !== sub));
    } else {
      setMsg(' 至少須保留 1 個專長子領域！');
      setTimeout(() => setMsg(null), 3000);
    }
  };

  // Uploaded credentials files (專家專屬專業證照，非身分證)
  const [credentialsFiles, setCredentialsFiles] = useState<
    Array<{
      name: string;
      size?: string;
      url?: string;
      storagePath?: string;
      isStorage?: boolean;
      uploadedAt?: string;
    }>
  >(
    initialData?.credentialsFiles || []
  );
  const [isProcessingCredential, setIsProcessingCredential] = useState(false);
  const [previewCredentialImg, setPreviewCredentialImg] = useState<{
    title: string;
    url: string;
    size?: string;
    isStorage?: boolean;
    storagePath?: string;
  } | null>(null);

  // Proof & Portfolio
  const [proofDescription, setProofDescription] = useState(
    initialData?.proofDescription || ''
  );
  const [proofFiles, setProofFiles] = useState<
    Array<{
      name: string;
      size?: string;
      url?: string;
      storagePath?: string;
      isStorage?: boolean;
      uploadedAt?: string;
    }>
  >(
    initialData?.proofFiles || []
  );
  const [portfolioLink, setPortfolioLink] = useState(
    initialData?.portfolioLink || ''
  );

  // Policy Agreement
  const [agreedPrivacy, setAgreedPrivacy] = useState(false);
  const [agreedHonesty, setAgreedHonesty] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'credential' | 'proof'
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (type === 'credential') {
      setIsProcessingCredential(true);
      try {
        const added: Array<{
          name: string;
          size?: string;
          url?: string;
          storagePath?: string;
          isStorage?: boolean;
          uploadedAt?: string;
        }> = [];

        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          if (file.type.startsWith('image/')) {
            const processed = await processAndUploadExpertCredentialImage(file, currentUser.id);
            added.push({
              name: file.name,
              size: processed.size,
              url: processed.url,
              storagePath: processed.storagePath,
              isStorage: processed.isStorage,
              uploadedAt: processed.uploadedAt,
            });
          } else {
            const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
            added.push({
              name: file.name,
              size: `${sizeMb} MB`,
            });
          }
        }
        setCredentialsFiles((prev) => [...prev, ...added]);
      } catch (err) {
        console.error('Expert credential upload failed:', err);
      } finally {
        setIsProcessingCredential(false);
      }
    } else {
      const newFiles: Array<{ name: string; size?: string }> = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
        newFiles.push({
          name: file.name,
          size: `${sizeMb} MB`,
        });
      }
      setProofFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (currentUser.realNameAuthStatus !== 'verified') {
      setMsg(' 申請專家認證前必須先完成【實名認證】！即使您已達到採納方案數 ≥ 50 且平均評分 ≥ 4.0 星，亦須先完成實名認證通過後，方可解鎖成為認證專家。');
      return;
    }

    if (isWithinCooldown) {
      setMsg(` 依審核規範，未通過者每 7 日僅能申請一次，請於 ${remainingDays} 天後再次送出。`);
      return;
    }

    if (selectedSubdomains.length === 0) {
      setMsg(' 請至少選擇 1 個專長子領域（至多 5 個）！');
      return;
    }

    if (!professionalTitle.trim()) {
      setMsg(' 請填寫您的專業頭銜或職稱！');
      return;
    }

    if (credentialsFiles.length === 0) {
      setMsg(' 請至少上傳一份專業相關證件或資歷佐證！');
      return;
    }

    if (!proofDescription.trim() && proofFiles.length === 0 && !portfolioLink.trim()) {
      setMsg(' 請填寫實戰案例說明或提供成果佐證連結！');
      return;
    }

    if (!agreedPrivacy || !agreedHonesty) {
      setMsg(' 請閱讀並勾選隱私權保護政策與真實性切結聲明！');
      return;
    }

    setIsSubmitting(true);

    const appliedAt = new Date().toISOString();
    const finalDomains = selectedDomains.length > 0 ? selectedDomains : ['創新創業'];
    const payload = {
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
        expertApplicationData: payload,
      }));

      addNotification({
        title: '專家認證資格審查已送出',
        message: '您的專家認證申請已成功送出！官方專業審核團隊將於 1~2 個工作天內核驗證件真實性。',
        type: 'system',
      });

      setIsSubmitting(false);
      setMsg(' 專家認證資格審查表單已成功送出！官方人員審核中。');
      setTimeout(() => setMsg(null), 4000);
    }, 600);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="p-4 sm:p-6 rounded-2xl bg-white border border-stone-200 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-stone-950 flex items-center justify-center font-semibold shadow-2xs shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-semibold text-stone-900">
                  IdeaX 認證專家資格審查
                </h3>
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-200/90 text-amber-950 border border-stone-200 inline-flex items-center gap-1 shadow-2xs">
                  <Sparkles className="w-3 h-3 text-amber-700" />
                  <span>成為專家優先獲得曝光</span>
                </span>
                {isApproved ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-stone-200">
                    <CheckCircle2 className="w-3.5 h-3.5" /> 認證專家
                  </span>
                ) : isPending ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-stone-200">
                    <Clock className="w-3.5 h-3.5" /> 專家審核中
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 border border-stone-200">
                    未取得專家認證
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                提供專門證照或資歷證明，審查通過即享認證專家標章與優先推薦。
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-amber-900 font-bold bg-amber-100 px-3 py-1 rounded-xl border border-stone-200">
              每 7 日限申請 1 次
            </span>
          </div>
        </div>

        {/* Message notification */}
        {msg && (
          <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-stone-200 text-amber-950 text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{msg}</span>
          </div>
        )}

        {/* Real Name Verification Prerequisite Alert (簡潔提醒) */}
        {currentUser.realNameAuthStatus !== 'verified' && (
          <div className="mt-3 px-3.5 py-2.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-2 text-xs text-amber-900">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>依合規要求，送出專家審查前請先完成<strong>實名認證</strong>。</span>
            </div>
            {onNavigateToRealName && (
              <button
                type="button"
                onClick={onNavigateToRealName}
                className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 text-[11px] font-bold shrink-0 transition-colors cursor-pointer"
              >
                前往實名認證 →
              </button>
            )}
          </div>
        )}

        {/* Approved Card */}
        {isApproved && (
          <div className="mt-3 p-3.5 rounded-xl bg-stone-50 border border-stone-200 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div className="text-xs text-emerald-950">
              <strong className="font-semibold">您已具備「IdeaX 認證專家」資格</strong>
              <p className="text-emerald-800 text-[11px] mt-0.5">全站問題頁將享有 AI 優先推薦與專家標章曝光。</p>
            </div>
          </div>
        )}

        {/* Pending Card */}
        {isPending && (
          <div className="mt-3 p-3.5 rounded-xl bg-stone-50 border border-stone-200 flex items-center gap-3">
            <Clock className="w-5 h-5 text-amber-700 shrink-0" />
            <div className="text-xs text-amber-950">
              <strong className="font-semibold">專家審查表單已送出，官方審核中</strong>
              <p className="text-amber-800 text-[11px] mt-0.5">預計 1~2 個工作天內核對完畢並發布結果通知。</p>
            </div>
          </div>
        )}

        {/* Cooldown notice */}
        {isWithinCooldown && (
          <div className="mt-3 p-3.5 rounded-xl bg-rose-50 border border-stone-200 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <div className="text-xs text-rose-950">
              <strong className="font-semibold">尚在 7 日重新申請冷卻期內</strong>
              <p className="text-rose-800 text-[11px] mt-0.5">剩餘冷卻時間：約 {remainingDays} 天。</p>
            </div>
          </div>
        )}
      </div>

      {/* Expert Application Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 1. 專業領域與子領域看板 */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-stone-200 space-y-4 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-stone-100 pb-3 gap-2">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-500 text-stone-950 text-[11px] font-semibold flex items-center justify-center">
                1
              </span>
              <h4 className="font-semibold text-sm text-stone-900">
                申請專家領域與子領域看板
              </h4>
            </div>
            <span className="text-[11px] text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded-full font-bold border border-stone-200">
              可複選 1~5 個子領域（已選 {selectedSubdomains.length} / 5 個）
            </span>
          </div>

          <div className="space-y-3.5 text-xs">
            {/* 已選清單 Chips 快速檢視 */}
            <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-stone-700 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-amber-600" />
                  <span>已選擇的專家專長子領域（點擊 ✕ 移除）：</span>
                </span>
                <span className="text-[11px] tabular-nums font-bold text-amber-900">
                  {selectedSubdomains.length} / 5 項
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 min-h-7 items-center">
                {selectedSubdomains.map((sub) => (
                  <span
                    key={sub}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500 text-stone-950 text-xs font-semibold shadow-2xs"
                  >
                    <span>✓ {sub}</span>
                    <button
                      type="button"
                      onClick={() => removeSubdomain(sub)}
                      className="w-3.5 h-3.5 rounded-full hover:bg-amber-600 flex items-center justify-center text-[11px] cursor-pointer ml-0.5"
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
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] font-bold text-stone-800">
                  點選下方看板子領域標籤（可跨領域複選 1~5 個專長）：
                </label>
                <span className="text-[11px] text-stone-400">管理員審核時可擇優通過或指派</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(['創新創業', '專業問題', '學術探討', '日常疑難'] as Category[]).map((catName) => {
                  const subList = CATEGORY_HIERARCHY[catName] || [];
                  const catSelectedCount = subList.filter((s) => selectedSubdomains.includes(s)).length;

                  return (
                    <div
                      key={catName}
                      className="p-3.5 rounded-2xl bg-white border border-stone-200/90 shadow-2xs space-y-2.5 hover:border-stone-200 transition-colors"
                    >
                      <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              catName === '創新創業'
                                ? 'bg-amber-500'
                                : catName === '專業問題'
                                ? 'bg-blue-500'
                                : catName === '學術探討'
                                ? 'bg-purple-500'
                                : 'bg-emerald-500'
                            }`}
                          />
                          <span className="font-semibold text-xs text-stone-900">{catName}</span>
                        </div>
                        {catSelectedCount > 0 && (
                          <span className="text-[11px] font-bold px-2 py-0.2 rounded-full bg-amber-100 text-amber-900 border border-stone-200">
                            已選 {catSelectedCount} 項
                          </span>
                        )}
                      </div>

                      {/* 子領域標籤 Chips */}
                      <div className="flex flex-wrap gap-1.5">
                        {subList.map((sub) => {
                          const isChecked = selectedSubdomains.includes(sub);
                          return (
                            <button
                              key={sub}
                              type="button"
                              onClick={() => toggleSubdomain(sub, catName)}
                              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                                isChecked
                                  ? 'bg-amber-500 text-stone-950 font-semibold shadow-2xs ring-1 ring-amber-400'
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* 實務年資 */}
              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                  實務年資 / 經驗年限 <span className="text-rose-500">*</span>
                </label>
                <select
                  value={yearsOfExperience}
                  onChange={(e) => setYearsOfExperience(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-300 text-stone-900 font-medium focus:outline-none focus:border-amber-500 focus:bg-white"
                >
                  <option value="">請選擇實務年資...</option>
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
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-stone-200 space-y-3.5 shadow-2xs">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3 gap-2">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-500 text-stone-950 text-[11px] font-semibold flex items-center justify-center shrink-0">
                2
              </span>
              <h4 className="font-semibold text-sm text-stone-900">
                上傳專業證照與資歷證明
              </h4>
            </div>
            <span className="text-[11px] text-stone-400">支援 JPG、PNG、PDF</span>
          </div>

          <p className="text-xs text-stone-500 leading-relaxed">
            請上傳專技執照、專業證照、在職證明或學歷證書（機密資訊請自行遮蔽）。僅供官方審查專業資格，絕不對外公開。
          </p>

          <label className="border-2 border-dashed border-stone-200 hover:border-amber-500 bg-stone-50 hover:bg-stone-50 rounded-2xl p-5 flex flex-col items-center justify-center gap-1.5 text-center cursor-pointer transition-colors group">
            <Upload className="w-6 h-6 text-amber-600 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-semibold text-stone-800">點擊或拖曳上傳證照 / 執照檔案</span>
            <span className="text-[11px] text-stone-400">單檔上限 10MB</span>
            <input
              type="file"
              multiple
              accept=".pdf,.png,.jpg,.jpeg,.webp"
              onChange={(e) => handleFileUpload(e, 'credential')}
              className="hidden"
            />
          </label>

          {isProcessingCredential && (
            <div className="p-2.5 rounded-xl bg-amber-50 border border-stone-200 text-xs text-amber-900 flex items-center justify-center gap-2 animate-pulse font-bold">
              <Clock className="w-3.5 h-3.5 text-amber-600 animate-spin" />
              <span>證照檔案處理中...</span>
            </div>
          )}

          {credentialsFiles.length > 0 && (
            <div className="space-y-2 pt-1">
              <span className="text-[11px] font-bold text-stone-700 block">
                已準備上傳的專業證件清單 ({credentialsFiles.length} 份)：
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {credentialsFiles.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-2xl bg-white border border-stone-200 text-xs hover:border-stone-200 transition-all shadow-2xs group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {file.url ? (
                        <div
                          onClick={() =>
                            setPreviewCredentialImg({
                              title: file.name,
                              url: file.url!,
                              size: file.size,
                              isStorage: file.isStorage,
                              storagePath: file.storagePath,
                            })
                          }
                          className="w-12 h-10 rounded-lg overflow-hidden bg-stone-900 border border-stone-200 shrink-0 relative cursor-pointer group-hover:ring-2 group-hover:ring-amber-400"
                        >
                          <img
                            src={file.url}
                            alt={file.name}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                            <ZoomIn className="w-3.5 h-3.5" />
                          </div>
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-amber-50 border border-stone-200 flex items-center justify-center text-amber-700 shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <span className="font-bold text-stone-800 truncate block max-w-[150px] sm:max-w-[180px]">
                          {file.name}
                        </span>
                        <div className="flex items-center gap-1.5 text-[11px] text-stone-500 tabular-nums mt-0.5">
                          <span className="text-emerald-700 font-bold">{file.size || '安全清晰壓縮'}</span>
                          <span>•</span>
                          <span>{file.isStorage ? ' Storage' : '安全加密'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {file.url && (
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewCredentialImg({
                              title: file.name,
                              url: file.url!,
                              size: file.size,
                              isStorage: file.isStorage,
                              storagePath: file.storagePath,
                            })
                          }
                          className="p-1.5 rounded-lg text-stone-400 hover:text-amber-700 hover:bg-amber-50 cursor-pointer"
                          title="放大檢視證照照片"
                        >
                          <ZoomIn className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          setCredentialsFiles((prev) => prev.filter((_, i) => i !== idx))
                        }
                        className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                        title="移除此證照"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 3. 出示有利證明與實戰成果 */}
        <div className="p-5 rounded-2xl bg-white border border-stone-200 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-500 text-stone-950 text-[11px] font-semibold flex items-center justify-center">
                3
              </span>
              <h4 className="font-semibold text-sm text-stone-900">
                出示有利證明與實戰成果（加分與審查依據）
              </h4>
            </div>
            <span className="text-[11px] text-amber-900 font-bold bg-amber-100 px-2 py-0.5 rounded">
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
                          <span className="text-[11px] text-stone-400 tabular-nums shrink-0">
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

        {/* 4. 保證與同意 */}
        <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200">
          <label className="flex items-start gap-2 text-xs text-stone-700 cursor-pointer">
            <input
              type="checkbox"
              checked={agreedPrivacy && agreedHonesty}
              onChange={(e) => {
                setAgreedPrivacy(e.target.checked);
                setAgreedHonesty(e.target.checked);
              }}
              className="w-4 h-4 accent-amber-600 rounded cursor-pointer mt-0.5"
            />
            <span>
              我保證所填經歷與上傳證明均屬本人真實資歷，並同意依照
              <button
                type="button"
                onClick={() => openAboutModal('privacy_policy')}
                className="text-amber-800 underline font-bold inline-flex items-center mx-1"
              >
                隱私權政策
              </button>
              由官方進行資格審查。
            </span>
          </label>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={isSubmitting || isWithinCooldown}
            className={`px-6 py-2.5 rounded-xl font-semibold text-xs sm:text-sm shadow-xs transition-all flex items-center gap-1.5 cursor-pointer ${
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

      {/* 專家專業證照照片放大檢視彈窗 */}
      {previewCredentialImg && (
        <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-xl w-full p-5 space-y-4 shadow-2xl border border-stone-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center shrink-0">
                  <Award className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-semibold text-sm text-stone-900 truncate">
                    {previewCredentialImg.title}
                  </h4>
                  <div className="flex items-center gap-2 text-[11px] text-stone-500 tabular-nums mt-0.5">
                    <span className="text-emerald-700 font-bold">{previewCredentialImg.size || '安全清晰壓縮'}</span>
                    <span>•</span>
                    <span>{previewCredentialImg.isStorage ? ' Firebase Storage' : '本地安全加密'}</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewCredentialImg(null)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="rounded-2xl overflow-hidden bg-stone-900 border border-stone-200 flex items-center justify-center max-h-[60vh]">
              <img
                src={previewCredentialImg.url}
                alt={previewCredentialImg.title}
                className="max-h-[60vh] w-auto object-contain select-none"
              />
            </div>

            <div className="p-3 rounded-xl bg-amber-50 border border-stone-200 text-xs text-amber-950 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                <span>專家專業證照建檔（非身分證，文字與防偽印章清晰可辨）</span>
              </span>
              <button
                type="button"
                onClick={() => setPreviewCredentialImg(null)}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold text-xs cursor-pointer shadow-2xs"
              >
                完成檢視
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
