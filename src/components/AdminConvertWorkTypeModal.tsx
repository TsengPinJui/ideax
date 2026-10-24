import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  ArrowLeftRight,
  Sparkles,
  Lightbulb,
  Code2,
  CheckCircle2,
  AlertCircle,
  Layers,
  ChevronRight,
  Info,
  Loader2,
} from 'lucide-react';
import {
  Question,
  SOFTWARE_CATEGORIES,
  SoftwareCategory,
  INNOVATION_PROPOSAL_CATEGORIES,
  InnovationProposalCategory,
  INNOVATION_PROPOSAL_SUBCATEGORIES,
  INNOVATION_PROGRESS_STAGES,
} from '../types';
import { useApp } from '../context/AppContext';

interface AdminConvertWorkTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  question?: Question | null;
  batchQuestions?: Question[];
  onSuccess?: (updatedQuestions: Question[]) => void;
}

export const AdminConvertWorkTypeModal: React.FC<AdminConvertWorkTypeModalProps> = ({
  isOpen,
  onClose,
  question,
  batchQuestions,
  onSuccess,
}) => {
  const { convertQuestionType, batchConvertQuestionsType, showCenterToast } = useApp();

  const isBatchMode = Boolean(batchQuestions && batchQuestions.length > 0);
  const activeQuestions = useMemo(() => {
    if (isBatchMode) return batchQuestions || [];
    return question ? [question] : [];
  }, [isBatchMode, batchQuestions, question]);

  const singleQuestion = activeQuestions[0] || null;

  // 判定當前屬性：若是創新提案則預設轉為軟體作品；若為軟體作品則預設轉為創新提案
  const defaultTargetType: 'innovation_proposal' | 'vibecoding_app' = useMemo(() => {
    if (!singleQuestion) return 'vibecoding_app';
    if (singleQuestion.postType === 'innovation_proposal' || singleQuestion.specialZone === 'create_ideas') {
      return 'vibecoding_app';
    }
    return 'innovation_proposal';
  }, [singleQuestion]);

  const [targetType, setTargetType] = useState<'innovation_proposal' | 'vibecoding_app'>(defaultTargetType);

  useEffect(() => {
    setTargetType(defaultTargetType);
  }, [defaultTargetType, isOpen]);

  // 軟體作品相關設定
  const [softwareCategory, setSoftwareCategory] = useState<SoftwareCategory>('網站程式');
  const [appNameInput, setAppNameInput] = useState<string>('');

  // 創新提案相關設定
  const [innovationCategory, setInnovationCategory] = useState<InnovationProposalCategory>('資通訊');
  const [innovationSubcategory, setInnovationSubcategory] = useState<string>('AI智慧應用');
  const [progressStage, setProgressStage] = useState<string>('prototype');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // 當單一項目變更時，初始化預填欄位
  useEffect(() => {
    if (singleQuestion) {
      setAppNameInput(singleQuestion.appName || singleQuestion.title || '');
      if (SOFTWARE_CATEGORIES.includes(singleQuestion.subcategory as any)) {
        setSoftwareCategory(singleQuestion.subcategory as SoftwareCategory);
      }
      if (INNOVATION_PROPOSAL_CATEGORIES.includes(singleQuestion.category as any)) {
        setInnovationCategory(singleQuestion.category as InnovationProposalCategory);
      }
      if (singleQuestion.proposalProgressStage) {
        setProgressStage(singleQuestion.proposalProgressStage);
      }
    }
  }, [singleQuestion?.id, isOpen]);

  // 當創新主領域改變時，連動調整子領域預設值
  const availableSubcategories = useMemo(() => {
    return INNOVATION_PROPOSAL_SUBCATEGORIES[innovationCategory] || [];
  }, [innovationCategory]);

  useEffect(() => {
    if (availableSubcategories.length > 0 && !availableSubcategories.includes(innovationSubcategory)) {
      setInnovationSubcategory(availableSubcategories[0]);
    }
  }, [availableSubcategories, innovationSubcategory]);

  if (!isOpen || activeQuestions.length === 0) return null;

  const handleConfirmConvert = async () => {
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      if (isBatchMode) {
        // 批次轉換
        const qIds = activeQuestions.map((q) => q.id);
        const res = await batchConvertQuestionsType(qIds, targetType, {
          subcategory: targetType === 'vibecoding_app' ? softwareCategory : innovationSubcategory,
        });

        if (res.success && res.convertedCount > 0) {
          const typeLabel = targetType === 'vibecoding_app' ? '軟體作品' : '創新提案';
          showCenterToast(
            '批次屬性轉換完成！',
            `已成功將 ${res.convertedCount} 個項目轉性為【${typeLabel}】！`,
            { type: 'success', duration: 4000 }
          );
          if (onSuccess) {
            onSuccess(res.updatedQuestions);
          }
          onClose();
        } else {
          setErrorMessage('批次轉性失敗，請稍後重試');
        }
      } else {
        // 單筆轉換
        const res = await convertQuestionType(singleQuestion.id, targetType, {
          category: targetType === 'vibecoding_app' ? '網站程式' : '創新創業',
          subcategory: targetType === 'vibecoding_app' ? softwareCategory : innovationSubcategory,
          subcategories: targetType === 'vibecoding_app' ? [softwareCategory] : [innovationSubcategory],
          appName: targetType === 'vibecoding_app' ? appNameInput.trim() || singleQuestion.title : undefined,
          proposalProgressStage: targetType === 'innovation_proposal' ? progressStage : undefined,
        });

        if (res.success && res.updatedQuestion) {
          const typeLabel = targetType === 'vibecoding_app' ? '軟體作品' : '創新提案';
          showCenterToast(
            '屬性轉換完成！',
            `已成功將作品轉性為【${typeLabel}】！`,
            { type: 'success', duration: 4000 }
          );
          if (onSuccess) {
            onSuccess([res.updatedQuestion]);
          }
          onClose();
        } else {
          setErrorMessage(res.message || '轉性失敗，請稍後重試');
        }
      }
    } catch (err: any) {
      setErrorMessage(err?.message || '轉性作業異常，請確認伺服器連線');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal 頂部 Header */}
        <div className="px-5 py-4 sm:px-6 bg-gradient-to-r from-purple-500/10 via-indigo-500/5 to-transparent border-b border-stone-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-purple-600/15 text-purple-700 flex items-center justify-center shrink-0 border border-purple-200">
              <ArrowLeftRight className="w-5 h-5 text-purple-700" />
            </div>
            <div>
              <h3 className="text-base font-black text-stone-900 flex items-center gap-1.5 flex-wrap">
                <span>{isBatchMode ? '批次轉換作品屬性 (轉性)' : '轉換作品屬性 (轉性)'}</span>
                <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-purple-100 text-purple-900 border border-purple-200">
                  {isBatchMode ? `共 ${activeQuestions.length} 項` : '創新提案 ⇄ 軟體作品'}
                </span>
              </h3>
              <p className="text-xs text-stone-500">
                將項目在「創新提案（創點子專區）」與「軟體作品（VibeCoding展場）」之間雙向互相轉換
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal 主體內容 */}
        <div className="p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* 目標對象摘要卡片 */}
          {isBatchMode ? (
            <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-black text-stone-600 uppercase tracking-wider">
                <span className="flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-stone-400" />
                  <span>已選取待轉性清單（共 {activeQuestions.length} 項）：</span>
                </span>
              </div>
              <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                {activeQuestions.map((q, idx) => (
                  <div
                    key={q.id}
                    className="p-2 rounded-xl bg-white border border-stone-200 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-[10px] font-mono text-stone-400">#{idx + 1}</span>
                      <span className="font-bold text-stone-900 truncate">
                        {q.appName ? `【${q.appName}】${q.title}` : q.title}
                      </span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 shrink-0 font-bold">
                      目前：{q.postType === 'vibecoding_app' ? '軟體作品' : '創新提案'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : singleQuestion ? (
            <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-black text-stone-500 uppercase tracking-wider">
                <span>轉換對象項目：</span>
                <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 font-bold">
                  當前：{singleQuestion.postType === 'vibecoding_app' ? '🚀 軟體作品' : '💡 創新提案'}
                </span>
              </div>
              <div className="flex items-start gap-3">
                {singleQuestion.coverImage && (
                  <img
                    src={singleQuestion.coverImage}
                    alt=""
                    className="w-14 h-11 rounded-xl object-cover border border-stone-200 shrink-0 bg-stone-900"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs sm:text-sm font-black text-stone-900 truncate">
                    {singleQuestion.appName ? `【${singleQuestion.appName}】${singleQuestion.title}` : singleQuestion.title}
                  </h4>
                  <div className="text-[11px] text-stone-500 flex items-center gap-2 mt-0.5">
                    <span>原分類：{singleQuestion.subcategory || singleQuestion.category}</span>
                    <span>·</span>
                    <span>發布者：{singleQuestion.authorName}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {/* 選擇轉換目標屬性方向 */}
          <div className="space-y-2">
            <label className="text-xs font-black text-stone-800 flex items-center justify-between">
              <span>欲轉換為的目標作品屬性：</span>
              <span className="text-[11px] text-purple-700 font-bold">*二擇一切換</span>
            </label>

            <div className="grid grid-cols-2 gap-2.5">
              {/* 選項 1：轉為軟體作品 */}
              <button
                type="button"
                onClick={() => setTargetType('vibecoding_app')}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  targetType === 'vibecoding_app'
                    ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-200 shadow-sm'
                    : 'border-stone-200 hover:border-stone-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <div className="flex items-center gap-1.5 font-black text-xs text-indigo-950">
                    <Code2 className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>🚀 軟體作品 (網站程式)</span>
                  </div>
                  {targetType === 'vibecoding_app' && (
                    <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                  )}
                </div>
                <p className="text-[11px] text-stone-500 leading-relaxed">
                  刊登於 <strong>VibeCoding 展場</strong>，支援在線嵌入試玩、外部連結直達與技術規格展示。
                </p>
              </button>

              {/* 選項 2：轉為創新提案 */}
              <button
                type="button"
                onClick={() => setTargetType('innovation_proposal')}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  targetType === 'innovation_proposal'
                    ? 'border-amber-600 bg-amber-50/70 ring-2 ring-amber-200 shadow-sm'
                    : 'border-stone-200 hover:border-stone-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <div className="flex items-center gap-1.5 font-black text-xs text-amber-950">
                    <Lightbulb className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>💡 創新提案 (創點子專區)</span>
                  </div>
                  {targetType === 'innovation_proposal' && (
                    <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                  )}
                </div>
                <p className="text-[11px] text-stone-500 leading-relaxed">
                  刊登於 <strong>創點子專區</strong>，具備完程度里程碑、引用痛點需求、提案大眾支持與打賞。
                </p>
              </button>
            </div>
          </div>

          {/* 屬性詳細設定區塊 */}
          {targetType === 'vibecoding_app' ? (
            <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-200 space-y-3 animate-in fade-in">
              <div className="flex items-center gap-1.5 text-xs font-black text-indigo-950">
                <Code2 className="w-4 h-4 text-indigo-600" />
                <span>軟體作品專屬參數設定：</span>
              </div>

              {!isBatchMode && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-700">作品名稱 (以藍色標記於卡片左下角)：</label>
                  <input
                    type="text"
                    value={appNameInput}
                    onChange={(e) => setAppNameInput(e.target.value)}
                    placeholder="例如: 智慧AI日誌生成器"
                    className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs text-stone-800 font-bold focus:outline-hidden focus:border-indigo-600"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700">選擇軟體主要分類：</label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                  {SOFTWARE_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSoftwareCategory(cat)}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                        softwareCategory === cat
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200 space-y-3 animate-in fade-in">
              <div className="flex items-center gap-1.5 text-xs font-black text-amber-950">
                <Lightbulb className="w-4 h-4 text-amber-600" />
                <span>創新提案專屬參數設定：</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700">選擇提案所屬領域：</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {INNOVATION_PROPOSAL_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setInnovationCategory(cat)}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                        innovationCategory === cat
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700">選擇提案子領域：</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {availableSubcategories.map((subcat) => (
                    <button
                      key={subcat}
                      type="button"
                      onClick={() => setInnovationSubcategory(subcat)}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-center truncate ${
                        innovationSubcategory === subcat
                          ? 'bg-stone-900 text-white shadow-xs'
                          : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'
                      }`}
                      title={subcat}
                    >
                      {subcat}
                    </button>
                  ))}
                </div>
              </div>

              {!isBatchMode && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-700">當前完程度階段：</label>
                  <select
                    value={progressStage}
                    onChange={(e) => setProgressStage(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs text-stone-800 font-bold focus:outline-hidden focus:border-amber-600 cursor-pointer"
                  >
                    {INNOVATION_PROGRESS_STAGES.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* 轉性影響說明提示 */}
          <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200 text-[11px] text-stone-600 space-y-1">
            <span className="font-bold text-stone-800 flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-stone-500" />
              屬性轉換效果說明：
            </span>
            <ul className="list-disc list-inside space-y-0.5 text-stone-500 pl-1 leading-relaxed">
              <li>轉性後<strong>不會遺失</strong>原有的瀏覽數、Like/按讚數、打賞點數與評論回覆。</li>
              <li>項目將自動同步至雲端 Firestore 資料庫，並即時於目標專區（展場或創點子專區）顯示。</li>
              <li>發布紀錄中會自動附加一筆「屬性轉換」版本日誌，維護歷史透明性。</li>
            </ul>
          </div>

          {/* 錯誤提示 */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Modal 底部按鈕 */}
        <div className="px-5 py-3.5 sm:px-6 sm:py-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-stone-300 hover:bg-stone-100 text-stone-700 text-xs font-bold transition-all cursor-pointer"
          >
            取消
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleConfirmConvert}
            className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:bg-stone-300 text-white text-xs font-black transition-all flex items-center gap-1.5 shadow-md cursor-pointer disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>轉換處理中...</span>
              </>
            ) : (
              <>
                <ArrowLeftRight className="w-4 h-4" />
                <span>
                  {targetType === 'vibecoding_app' ? '確認轉為軟體作品 🚀' : '確認轉為創新提案 💡'}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
