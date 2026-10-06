import React, { useState, useRef } from 'react';
import {
  X,
  ShieldCheck,
  Upload,
  FileText,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Info,
  Award,
} from 'lucide-react';
import { User } from '../../types';
import { useApp } from '../../context/AppContext';
import { CHALLENGE_CONSTANTS } from '../../data/challengeData';

interface ChallengeExpertApplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onSuccess: (updatedUser: User) => void;
  onOpenRegulations?: (tab: 'regulations' | 'participant_terms' | 'expert_terms') => void;
}

export const ChallengeExpertApplyModal: React.FC<ChallengeExpertApplyModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSuccess,
  onOpenRegulations,
}) => {
  const { setCurrentUser, setAvailableUsers } = useApp();

  const [expertName, setExpertName] = useState(currentUser.name || '');
  const [expertOrg, setExpertOrg] = useState(currentUser.company || '');
  const [expertTitle, setExpertTitle] = useState(currentUser.title || '');
  const [expertBio, setExpertBio] = useState(currentUser.bio || '');
  const [selectedDomains, setSelectedDomains] = useState<string[]>(['AI 智慧科技', '商業模式']);

  // File Upload State (相關證明或專業證件)
  const [proofFile, setProofFile] = useState<{
    name: string;
    size: number;
    type: string;
    dataUrl: string;
  } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Terms Agreement
  const [agreeSolverTerms, setAgreeSolverTerms] = useState(false);
  const [agreeChallengeExpertTerms, setAgreeChallengeExpertTerms] = useState(false);

  // Feedback states
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('檔案容量超過上限：上傳之證件容量需在 10MB 以內！');
      return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      setErrorMsg('不支援的檔案格式：僅接受 JPG、PNG、WebP 圖檔或 PDF 文件！');
      return;
    }

    setIsUploading(true);
    setErrorMsg(null);

    const reader = new FileReader();
    reader.onload = () => {
      setProofFile({
        name: file.name,
        size: file.size,
        type: file.type,
        dataUrl: reader.result as string,
      });
      setIsUploading(false);
    };
    reader.onerror = () => {
      setErrorMsg('讀取檔案失敗，請重試！');
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveFile = () => {
    setProofFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const toggleDomain = (domain: string) => {
    if (selectedDomains.includes(domain)) {
      if (selectedDomains.length <= 1) return;
      setSelectedDomains(selectedDomains.filter((d) => d !== domain));
    } else {
      setSelectedDomains([...selectedDomains, domain]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!expertName.trim()) {
      setErrorMsg('請輸入專家姓名！');
      return;
    }
    if (!expertOrg.trim()) {
      setErrorMsg('請輸入目前任職機構或公司！');
      return;
    }
    if (!expertTitle.trim()) {
      setErrorMsg('請輸入專業職稱（例如：資深架構師、顧問總監）！');
      return;
    }
    if (expertBio.trim().length < 20) {
      setErrorMsg('個人簡介與專業資歷至少需填寫 20 字！');
      return;
    }

    // 核心驗證：成為專家需要求上傳相關證明或專業證件
    if (!proofFile) {
      setErrorMsg('成為專家需要求上傳相關證明或專業證件（如名片、專業執照、在職證明或獲獎作品等）。請先上傳佐證資料！');
      return;
    }

    // 條款勾選驗證：舊站專家隊友條款 + 新站創星季專家條款
    if (!agreeSolverTerms) {
      setErrorMsg('請勾選並同意《IdeaX 舊站專家解題與隊友服務條款》！');
      return;
    }
    if (!agreeChallengeExpertTerms) {
      setErrorMsg('請勾選並同意《IdeaX 創星季特聘評審與專家指導條款》！');
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      const updatedUser: User = {
        ...currentUser,
        name: expertName.trim(),
        company: expertOrg.trim(),
        title: expertTitle.trim(),
        bio: expertBio.trim(),
        role: 'solver', // 同步開通舊站解答者權限
        isExpert: true, // 新站認證特聘專家
        badges: Array.from(new Set([...(currentUser.badges || []), '認證專家', '創星季評審'])),
      };

      setCurrentUser(updatedUser);
      setAvailableUsers((prev) =>
        prev.map((u) => (u.id === updatedUser.id ? updatedUser : u))
      );

      // Local storage sync for expert status
      try {
        localStorage.setItem(`ideax_expert_verified_${updatedUser.id}`, 'true');
        localStorage.setItem(
          `ideax_expert_proof_${updatedUser.id}`,
          JSON.stringify({ fileName: proofFile.name, uploadedAt: new Date().toISOString() })
        );
      } catch (e) {
        // ignore
      }

      setIsSubmitting(false);
      setIsSuccess(true);
      onSuccess(updatedUser);

      setTimeout(() => {
        setIsSuccess(false);
        onClose();
      }, 2000);
    }, 800);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/70 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-stone-200 p-5 sm:p-6 space-y-5 animate-in zoom-in-95 duration-200 my-auto max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-purple-100 border border-purple-300 text-purple-900 flex items-center justify-center font-black shadow-xs">
              <ShieldCheck className="w-5 h-5 text-purple-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-stone-900">
                  成為特聘專家 • 資格申請與證件上傳
                </h3>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                  專屬 $3,000,000
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                加入 IdeaX 創星季評審顧問團，逐案診斷點評並重磅注資
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl border border-stone-200 hover:bg-stone-100 flex items-center justify-center text-stone-500 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          {/* Benefit Banner */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-50 via-fuchsia-50/40 to-amber-50/50 border border-purple-200 text-xs text-purple-950 space-y-1">
            <div className="font-black flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              <span>成為專家三大專屬特權：</span>
            </div>
            <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-stone-700">
              <li>獲配專屬 <strong>$3,000,000 支持金池</strong>（單案最高可投 $200 萬點）</li>
              <li>登上官方評審團導師專區，個人品牌高強度曝光與案源對接</li>
              <li>同步開通主站解答者（solver）商業諮詢接案資格</li>
            </ul>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {isSuccess && (
            <div className="p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-400 text-center space-y-1 animate-in zoom-in-95">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
              <h4 className="font-black text-emerald-950 text-sm">
                🎉 恭喜！特聘專家資格已核驗通過！
              </h4>
              <p className="text-xs text-emerald-800">
                已為您開通專家身分並配發 3,000,000 點支持金池，即刻進入評審模式！
              </p>
            </div>
          )}

          {!isSuccess && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Field 1: 姓名 */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-stone-700">
                  專家姓名 / 顯示名稱 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={expertName}
                  onChange={(e) => setExpertName(e.target.value)}
                  placeholder="例如：陳大為 David Chen"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  required
                />
              </div>

              {/* Field 2: 任職機構與職稱 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-stone-700">
                    目前任職機構 / 公司 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={expertOrg}
                    onChange={(e) => setExpertOrg(e.target.value)}
                    placeholder="例如：台積電 / 某創投基金"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-purple-400"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-stone-700">
                    專業職稱 / 經歷 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={expertTitle}
                    onChange={(e) => setExpertTitle(e.target.value)}
                    placeholder="例如：資深架構師 / 投資合夥人"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-purple-400"
                    required
                  />
                </div>
              </div>

              {/* Field 3: 專長領域多選 */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-stone-700">
                  核心審查與指導領域（可多選） <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {['科技創新', 'AI智慧', '商業模式', '生活永續', '社會創新', '文創教育', '生醫健康'].map((cat) => {
                    const isSelected = selectedDomains.includes(cat);
                    return (
                      <button
                        type="button"
                        key={cat}
                        onClick={() => toggleDomain(cat)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-purple-600 text-white shadow-2xs'
                            : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Field 4: 專家簡介 */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-stone-700">
                  個人專業背景與顧問指導資歷（至少20字） <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={expertBio}
                  onChange={(e) => setExpertBio(e.target.value)}
                  placeholder="請簡述您的實務經驗、曾輔導專案或創業成功實績，這將展示於專家評審名冊中..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  required
                />
              </div>

              {/* Field 5: 關鍵要求 — 相關證明或專業證件上傳 */}
              <div className="p-4 rounded-2xl bg-purple-50/60 border-2 border-dashed border-purple-300 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-black text-purple-950">
                    <Upload className="w-4 h-4 text-purple-700" />
                    <span>上傳相關證明或專業證件（必備審核材料）</span>
                    <span className="text-red-500">*</span>
                  </div>
                  <span className="text-[10px] text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full font-bold">
                    限 10MB
                  </span>
                </div>

                <p className="text-[11px] text-stone-600 leading-relaxed">
                  成為專家需要求上傳相關證明或專業證件，如：<strong>工作名片、專業證照/執照、在職證明、顧問聘書或具代表性獲獎作品</strong>。支援 JPG, PNG, WebP 或 PDF。
                </p>

                {proofFile ? (
                  <div className="p-3 rounded-xl bg-white border border-purple-200 flex items-center justify-between shadow-2xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {proofFile.type.startsWith('image/') ? (
                        <img
                          src={proofFile.dataUrl}
                          alt="證件預覽"
                          className="w-10 h-10 rounded-lg object-cover border border-purple-200 shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                      )}
                      <div className="min-w-0 text-left">
                        <span className="text-xs font-black text-stone-900 block truncate">
                          {proofFile.name}
                        </span>
                        <span className="text-[10px] text-stone-500 font-mono">
                          {(proofFile.size / 1024).toFixed(1)} KB • 上傳成功
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 cursor-pointer"
                      title="刪除重新上傳"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleFileChange}
                      className="hidden"
                      id="expert-modal-proof-file"
                    />
                    <label
                      htmlFor="expert-modal-proof-file"
                      className="w-full py-4 border border-purple-300 hover:border-purple-500 bg-white hover:bg-purple-50/50 rounded-xl flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all group"
                    >
                      <Upload className="w-5 h-5 text-purple-600 group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-black text-purple-900">
                        {isUploading ? '讀取上傳中...' : '點擊此處或拖曳上傳專業證件 / 名片'}
                      </span>
                      <span className="text-[10px] text-stone-400">
                        接受 JPG、PNG、WebP、PDF（最大 10MB）
                      </span>
                    </label>
                  </div>
                )}
              </div>

              {/* Field 6: 雙重條款勾選（舊站專家隊友條款 + 新站創星季專家條款） */}
              <div className="space-y-2 p-3.5 rounded-2xl bg-stone-50 border border-stone-200 text-xs">
                <span className="font-bold text-stone-700 block text-[11px] uppercase tracking-wider">
                  法規承諾與倫理條款
                </span>

                <label className="flex items-start gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={agreeSolverTerms}
                    onChange={(e) => setAgreeSolverTerms(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-purple-600 accent-purple-600 cursor-pointer"
                  />
                  <span className="text-stone-700 leading-tight">
                    我已閱讀並同意{' '}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        if (onOpenRegulations) onOpenRegulations('expert_terms');
                      }}
                      className="text-purple-700 font-bold underline hover:text-purple-900"
                    >
                      《IdeaX 舊站專家解題與隊友服務條款》
                    </button>
                    <span className="block text-[10px] text-stone-400">
                      （獨立執業顧問自負法律責任、商業諮詢誠信與保密協定）
                    </span>
                  </span>
                </label>

                <label className="flex items-start gap-2 cursor-pointer select-none pt-1 border-t border-stone-200/60">
                  <input
                    type="checkbox"
                    checked={agreeChallengeExpertTerms}
                    onChange={(e) => setAgreeChallengeExpertTerms(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-purple-600 accent-purple-600 cursor-pointer"
                  />
                  <span className="text-stone-700 leading-tight">
                    我已閱讀並同意{' '}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        if (onOpenRegulations) onOpenRegulations('expert_terms');
                      }}
                      className="text-purple-700 font-bold underline hover:text-purple-900"
                    >
                      《IdeaX 創星季特聘評審與專家指導條款》
                    </button>
                    <span className="block text-[10px] text-stone-400">
                      （專業證件真實擔保、客觀公正評審、300萬額度神聖性使用與利益迴避守則）
                    </span>
                  </span>
                </label>
              </div>

              {/* Submit CTA */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 active:scale-98 text-white font-black text-xs sm:text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>
                    {isSubmitting ? '驗證證件並開通專家資格中...' : '提交證件審核並開通 300 萬專家池'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
