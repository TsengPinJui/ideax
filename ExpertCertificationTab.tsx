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
        setMsg('⚠️ 至少須保留 1 個專長子領域！');
        setTimeout(() => setMsg(null), 3000);
      }
    } else {
      if (selectedSubdomains.length < 5) {
        setSelectedSubdomains([...selectedSubdomains, sub]);
        if (!selectedDomains.includes(parentCat)) {
          setSelectedDomains([...selectedDomains, parentCat]);
        }
      } else {
        setMsg('⚠️ 專家專長子領域至多可複選 5 個！');
        setTimeout(() => setMsg(null), 3000);
      }
    }
  };

  const removeSubdomain = (sub: string) => {
    if (selectedSubdomains.length > 1) {
      setSelectedSubdomains(selectedSubdomains.filter((s) => s !== sub));
    } else {
      setMsg('⚠️ 至少須保留 1 個專長子領域！');
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
      setMsg('⚠️ 申請專家認證前必須先完成【實名認證】！即使您已達到採納方案數 ≥ 50 且平均評分 ≥ 4.0 星，亦須先完成實名認證通過後，方可解鎖成為認證專家。');
      return;
    }

    if (isWithinCooldown) {
      setMsg(`⚠️ 依審核規範，未通過者每 7 日僅能申請一次，請於 ${remainingDays} 天後再次送出。`);
      return;
    }

    if (selectedSubdomains.length === 0) {
      setMsg('⚠️ 請至少選擇 1 個專長子領域（至多 5 個）！');
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
                <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-amber-200/90 text-amber-950 border border-amber-300 inline-flex items-center gap-1 shadow-2xs">
                  <Sparkles className="w-3 h-3 text-amber-700" />
                  <span>成為專家優先獲得曝光</span>
                </span>
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

      {/* 實名與專家認證分流說明公告卡 */}
      <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-amber-50 via-orange-50/40 to-white border border-amber-200 text-xs text-stone-800 space-y-2.5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-amber-950 font-black text-sm">
            <Award className="w-5 h-5 text-amber-600 shrink-0" />
            <span>【分流說明】實名認證 與 專家證照認證 為完全獨立分開之審核流程</span>
          </div>
          <span className="text-[10px] bg-amber-200 text-amber-900 px-2.5 py-0.5 rounded-full font-bold self-start sm:self-auto border border-amber-300">
            證件獨立分開 · 專屬審查
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px] leading-relaxed">
          <div className="p-3 rounded-2xl bg-white/90 border border-emerald-200 space-y-1">
            <strong className="block text-emerald-800 font-black flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>🪪 1. 實名身分認證（KYC 法定真實身分）</span>
            </strong>
            <p className="text-stone-600">
              專用於確認個人真實姓名、身分證字號與第三方金流提領撥付（<strong>國民身分證/居留證正反面</strong>）。如尚未完成，請至左側<strong>「實名認證」</strong>分頁獨立辦理。
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-white/90 border border-amber-300 space-y-1">
            <strong className="block text-amber-900 font-black flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-600" />
              <span>👑 2. 專家資格認證（專業領域實務執照）</span>
            </strong>
            <p className="text-stone-600">
              此處專門上傳您的<strong>國家專技執照、律師證、醫師執照、建築師/會計師執照、PMP、技術認證或學經歷證書</strong>。<span className="text-rose-600 font-black">請勿在此上傳身分證照片</span>。
            </p>
          </div>
        </div>
      </div>

      {/* Expert Application Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 1. 專業領域與子領域看板 */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white border border-stone-200 space-y-4 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-stone-100 pb-3 gap-2">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-500 text-stone-950 text-[11px] font-black flex items-center justify-center">
                1
              </span>
              <h4 className="font-extrabold text-sm text-stone-900">
                申請專家領域與子領域看板
              </h4>
            </div>
            <span className="text-[10px] text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded-full font-bold border border-amber-200">
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
                <span className="text-[10px] font-mono font-bold text-amber-900">
                  {selectedSubdomains.length} / 5 項
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 min-h-7 items-center">
                {selectedSubdomains.map((sub) => (
                  <span
                    key={sub}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500 text-stone-950 text-xs font-black shadow-2xs"
                  >
                    <span>✓ {sub}</span>
                    <button
                      type="button"
                      onClick={() => removeSubdomain(sub)}
                      className="w-3.5 h-3.5 rounded-full hover:bg-amber-600 flex items-center justify-center text-[10px] cursor-pointer ml-0.5"
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
                <span className="text-[10px] text-stone-400">管理員審核時可擇優通過或指派</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(['創新創業', '專業問題', '學術探討', '日常疑難'] as Category[]).map((catName) => {
                  const subList = CATEGORY_HIERARCHY[catName] || [];
                  const catSelectedCount = subList.filter((s) => selectedSubdomains.includes(s)).length;

                  return (
                    <div
                      key={catName}
                      className="p-3.5 rounded-2xl bg-white border border-stone-200/90 shadow-2xs space-y-2.5 hover:border-amber-300 transition-colors"
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
                          <span className="font-black text-xs text-stone-900">{catName}</span>
                        </div>
                        {catSelectedCount > 0 && (
                          <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
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

        {/* 2. 上傳相關證件與資歷證明 (非身分證，專家專業證照專區) */}
        <div className="p-5 rounded-3xl bg-white border border-stone-200 space-y-4 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-stone-100 pb-3 gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="w-5 h-5 rounded-full bg-amber-500 text-stone-950 text-[11px] font-black flex items-center justify-center shrink-0">
                2
              </span>
              <h4 className="font-extrabold text-sm text-stone-900">
                上傳【專家專業證照與專技執照】
              </h4>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                👑 專門審查專家資格 · 非身分證
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200">
                ☁️ Firebase Storage 雲端建檔
              </span>
              <HelpTooltip
                title="【專家證照個資與安全儲存政策】"
                content={
                  <div className="space-y-1.5 text-[11px] leading-relaxed">
                    <p>
                      • <strong>專門審查專家資格：</strong>此處專門上傳能證明您在該領域具備深厚專業能力的證書與執照，<strong>僅供官方管理員查核專業真實性，絕不對外公開</strong>。
                    </p>
                    <p>
                      • <strong>智慧安全壓縮：</strong>圖片將自動壓縮至安全值（1600px 解析度、畫質 0.84，體積僅 200~350KB），文字印章清晰可辨且不占空間。
                    </p>
                    <p>
                      • <strong>與實名認證（身分證）分開：</strong>國民身分證/居留證請至「實名認證」分頁辦理，切勿在此混淆上傳。
                    </p>
                  </div>
                }
              />
            </div>
            <span className="text-[10px] text-stone-400 font-mono">支援 JPG, PNG, PDF (智慧安全壓縮)</span>
          </div>

          <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200 text-[11px] text-stone-600 leading-relaxed space-y-1">
            <p>
              請上傳可佐證您專業能力與執業資格之憑證（如：<strong>國家級/國際專技執照、律師證、醫師執照、建築師執照、會計師執照、PMP、AWS/Google Cloud 專業認證、畢業學位證書、在職或離職證明、名片、受聘合約</strong>等，機密財務數字請自行遮蔽）。
            </p>
            <p className="text-amber-800 font-bold">
              💡 提醒：本處為「專家專業證照」，請勿上傳身分證。實名身分核驗請至「實名認證」分頁辦理。
            </p>
          </div>

          <label className="border-2 border-dashed border-amber-300 hover:border-amber-500 bg-amber-50/30 hover:bg-amber-50/60 rounded-2xl p-5 flex flex-col items-center justify-center gap-1.5 text-center cursor-pointer transition-colors group">
            <Upload className="w-6 h-6 text-amber-600 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-black text-stone-800">點擊或拖曳上傳【專業證照 / 執照】檔案</span>
            <span className="text-[10px] text-stone-500">
              支援 JPG / PNG 照片（自動進行安全防過度壓縮與 Storage 建檔）及 PDF 文件
            </span>
            <input
              type="file"
              multiple
              accept=".pdf,.png,.jpg,.jpeg,.webp"
              onChange={(e) => handleFileUpload(e, 'credential')}
              className="hidden"
            />
          </label>

          {isProcessingCredential && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center justify-center gap-2 animate-pulse font-bold">
              <Clock className="w-4 h-4 text-amber-600 animate-spin" />
              <span>正在執行證照影像安全清晰壓縮（文字清晰可辨、體積約 200~350KB）並存入專屬雲端 Storage...</span>
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
                    className="flex items-center justify-between p-3 rounded-2xl bg-white border border-stone-200 text-xs hover:border-amber-300 transition-all shadow-2xs group"
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
                        <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <span className="font-bold text-stone-800 truncate block max-w-[150px] sm:max-w-[180px]">
                          {file.name}
                        </span>
                        <div className="flex items-center gap-1.5 text-[10px] text-stone-500 font-mono mt-0.5">
                          <span className="text-emerald-700 font-bold">{file.size || '安全清晰壓縮'}</span>
                          <span>•</span>
                          <span>{file.isStorage ? '☁️ Storage' : '安全加密'}</span>
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

      {/* 專家專業證照照片放大檢視彈窗 */}
      {previewCredentialImg && (
        <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-xl w-full p-5 space-y-4 shadow-2xl border border-stone-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center shrink-0">
                  <Award className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-black text-sm text-stone-900 truncate">
                    {previewCredentialImg.title}
                  </h4>
                  <div className="flex items-center gap-2 text-[10px] text-stone-500 font-mono mt-0.5">
                    <span className="text-emerald-700 font-bold">{previewCredentialImg.size || '安全清晰壓縮'}</span>
                    <span>•</span>
                    <span>{previewCredentialImg.isStorage ? '☁️ Firebase Storage' : '本地安全加密'}</span>
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

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                <span>專家專業證照建檔（非身分證，文字與防偽印章清晰可辨）</span>
              </span>
              <button
                type="button"
                onClick={() => setPreviewCredentialImg(null)}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs cursor-pointer shadow-2xs"
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
