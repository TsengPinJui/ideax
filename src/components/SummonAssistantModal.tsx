import React, { useState } from 'react';
import {
  Bot,
  Sparkles,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Send,
  Edit3,
  X,
  Crown,
  Lock,
  ArrowRight,
  MessageSquare,
  HelpCircle,
  AlertTriangle,
  Lightbulb,
} from 'lucide-react';
import { User, ChatConversation, ChatMessage } from '../types';
import { generateExpertChatAdvice, ExpertAdviceItem } from '../services/aiService';

interface SummonAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeConversation: ChatConversation;
  currentUser: User;
  onApplySuggestedText: (text: string) => void;
  onSendDirectly: (text: string) => void;
  onUpgradePlan?: () => void;
}

export const SummonAssistantModal: React.FC<SummonAssistantModalProps> = ({
  isOpen,
  onClose,
  activeConversation,
  currentUser,
  onApplySuggestedText,
  onSendDirectly,
  onUpgradePlan,
}) => {
  if (!isOpen) return null;

  const userTier = currentUser.subscriptionTier || 'free';
  const isAdmin = currentUser.role === 'admin';
  const isMasterOrAbove = userTier === 'master' || isAdmin;

  // 對方資訊
  const otherParticipant = activeConversation.participantDetails.find(
    (p) => p.id !== currentUser.id
  ) || {
    id: 'client',
    name: '提問客戶',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
    title: '客戶',
  };

  // 最近 4 則對話紀錄
  const recentMessages = activeConversation.messages.slice(-4);

  // 輸入面臨的卡點或問題
  const [dilemma, setDilemma] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [adviceList, setAdviceList] = useState<ExpertAdviceItem[]>([]);
  const [quickTips, setQuickTips] = useState<string>('');
  const [trialUsed, setTrialUsed] = useState(false);
  const [sentToast, setSentToast] = useState<string | null>(null);

  // 快捷問題標籤
  const QUICK_QUESTIONS = [
    '客戶嫌報價太貴，希望打折',
    '引導客戶分階段驗收交付',
    '委婉婉拒私下交易與加 LINE',
    '需求規格模糊，需要引導釐清',
    '強調平台第三方履約託管安全',
    '時程過急，需協調調整範疇',
  ];

  const handleGenerateAdvice = async (customQ?: string) => {
    const questionToAsk = customQ !== undefined ? customQ : dilemma;
    setIsLoading(true);

    try {
      const historyPayload = activeConversation.messages.slice(-6).map((m) => ({
        senderName: m.senderName,
        text: m.text,
        isSelf: m.senderId === currentUser.id,
      }));

      const res = await generateExpertChatAdvice({
        solverName: currentUser.name,
        solverTitle: currentUser.title,
        expertQuestion: questionToAsk.trim() || undefined,
        conversationHistory: historyPayload,
      });

      if (res && res.adviceList && res.adviceList.length > 0) {
        setAdviceList(res.adviceList);
        setQuickTips(res.quickTips || '保持專業自信，透過拆解交付維持身價。');
      }

      if (!isMasterOrAbove) {
        setTrialUsed(true);
      }
    } catch (err) {
      console.error('Failed to generate advice:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = (text: string) => {
    onApplySuggestedText(text);
    onClose();
  };

  const handleSend = (text: string) => {
    onSendDirectly(text);
    setSentToast('建議回覆已由您親自確認並直接發送給客戶！');
    setTimeout(() => {
      setSentToast(null);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl border border-stone-200 max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-stone-900 via-stone-800 to-amber-950 p-5 text-white flex items-center justify-between shrink-0 border-b border-amber-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shrink-0">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-black text-base sm:text-lg text-white flex items-center gap-1.5">
                  <span>24hr AI 特助顧問・即時策略建議</span>
                </h3>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40 flex items-center gap-1">
                  <Crown className="w-3 h-3 text-amber-400" />
                  大師方案專屬限定
                </span>
              </div>
              <p className="text-xs text-stone-300 mt-0.5">
                在線輔助：分析對話上下文，輸出 3 種心理學戰術與應對策略，由專家挑選確認後發送
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-400 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 風險控管與防火牆雙防護指示列 */}
        <div className="bg-stone-50 px-5 py-2.5 border-b border-stone-200 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-emerald-800 font-bold">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>商業機密防火牆：全自動過濾敏感個資、密碼與未授權外部帳戶</span>
          </div>
          <div className="flex items-center gap-1.5 text-amber-800 font-bold">
            <Zap className="w-3.5 h-3.5 text-amber-600" />
            <span>Token 惡意消耗防護：單次對話速率安全保護中</span>
          </div>
        </div>

        {/* 方案門檻提示 */}
        {!isMasterOrAbove && (
          <div className="mx-5 mt-4 p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-400/10 to-transparent border border-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Crown className="w-5 h-5 text-amber-600 shrink-0" />
              <div className="text-xs text-stone-800">
                <span className="font-black text-amber-900">非大師方案專屬體驗：</span>
                {trialUsed ? '您已體驗過 1 次，升級即可無限次在對話中召喚 AI 特助！' : '目前為您開放「免費體驗 1 次」，立即感受特助談判實戰力！'}
              </div>
            </div>
            {onUpgradePlan && (
              <button
                type="button"
                onClick={onUpgradePlan}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs shadow-xs transition-all cursor-pointer shrink-0 flex items-center gap-1"
              >
                <span>升級大師方案 ($1,490/月，0% 服務費)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* 成功發送提示 Toast */}
        {sentToast && (
          <div className="mx-5 mt-3 p-3 rounded-xl bg-emerald-500 text-stone-950 font-bold text-xs flex items-center justify-center gap-2 shadow-md animate-in fade-in">
            <CheckCircle2 className="w-4 h-4" />
            <span>{sentToast}</span>
          </div>
        )}

        {/* Scrollable Content */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* 對話對象與最近脈絡 */}
          <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-stone-700">
              <div className="flex items-center gap-2">
                <img
                  src={otherParticipant.avatar}
                  alt={otherParticipant.name}
                  className="w-5 h-5 rounded-full object-cover border border-stone-300"
                />
                <span>正在與 {otherParticipant.name} 溝通中（最近 3~4 則紀錄）</span>
              </div>
              <span className="text-[11px] text-stone-400 font-normal">特助已讀取上下文</span>
            </div>

            <div className="space-y-1 max-h-28 overflow-y-auto text-xs bg-white p-2.5 rounded-xl border border-stone-100">
              {recentMessages.map((m) => (
                <div key={m.id} className="text-[11px] truncate flex items-center gap-1.5">
                  <span className={`font-bold ${m.senderId === currentUser.id ? 'text-amber-800' : 'text-blue-700'}`}>
                    {m.senderId === currentUser.id ? '我方' : otherParticipant.name}:
                  </span>
                  <span className="text-stone-600 truncate">{m.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 輸入目前遇到的問題/卡點 */}
          <div className="space-y-2.5">
            <label className="block text-xs font-black text-stone-800 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-amber-600" />
                <span>請輸入您目前面臨的溝通卡點或期望目標（可選填）：</span>
              </span>
              <span className="text-[11px] font-normal text-stone-400">亦可留空，直接點擊分析</span>
            </label>

            <textarea
              value={dilemma}
              onChange={(e) => setDilemma(e.target.value)}
              placeholder="例如：客戶覺得 2,000 元太貴希望打折、客戶想私下加 LINE 交易、需求模糊需要釐清細部驗收標準..."
              rows={2}
              className="w-full text-xs p-3 rounded-2xl border border-stone-300 focus:border-amber-500 focus:ring-1 focus:ring-amber-200 outline-none"
            />

            {/* 快捷標籤 */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold text-stone-500">專家常見情境一鍵帶入：</div>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => {
                      setDilemma(q);
                      handleGenerateAdvice(q);
                    }}
                    className="px-2.5 py-1 rounded-xl bg-stone-100 hover:bg-amber-100 text-stone-700 hover:text-amber-900 text-[11px] font-bold border border-stone-200 transition-colors cursor-pointer"
                  >
                    + {q}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 召喚按鈕 */}
          <div>
            <button
              type="button"
              onClick={() => handleGenerateAdvice()}
              disabled={isLoading || (!isMasterOrAbove && trialUsed)}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 active:scale-98 text-stone-950 font-black text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Sparkles className={`w-4 h-4 fill-stone-950 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? '特助正在推演心理學與談判策略中...' : '召喚 AI 特助推演 3 種策略與建議回答'}</span>
            </button>
          </div>

          {/* 策略生成結果 */}
          {adviceList.length > 0 && (
            <div className="space-y-4 pt-2 border-t border-stone-200">
              <div className="flex items-center justify-between">
                <h4 className="font-black text-sm text-stone-900 flex items-center gap-1.5">
                  <Lightbulb className="w-4 h-4 text-amber-600" />
                  <span>AI 特助建議作戰策略（共 3 種應對取向）</span>
                </h4>
                <span className="text-[11px] text-amber-700 font-bold bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                  {quickTips}
                </span>
              </div>

              <div className="space-y-3.5">
                {adviceList.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-stone-50 border border-stone-200 hover:border-amber-400 transition-all space-y-3 group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-stone-900 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-amber-500 text-stone-950 text-[11px] font-black flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span>{item.strategyTitle}</span>
                      </span>
                      <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                        戰術方案 #{idx + 1}
                      </span>
                    </div>

                    {/* 心理戰術解析 */}
                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-200/80 text-[11px] text-amber-950 leading-relaxed">
                      <strong>💡 心理學與談判解析：</strong>
                      {item.psychologicalAnalysis}
                    </div>

                    {/* 建議回答文本 */}
                    <div className="p-3 rounded-xl bg-white border border-stone-200 text-xs text-stone-800 leading-relaxed font-sans whitespace-pre-wrap">
                      {item.suggestedText}
                    </div>

                    {/* 動作按鈕 */}
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleApply(item.suggestedText)}
                        className="px-3 py-1.5 rounded-xl bg-white hover:bg-stone-100 border border-stone-300 text-stone-700 font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-stone-500" />
                        <span>帶入輸入框微調</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSend(item.suggestedText)}
                        className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-stone-950 font-black text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>由專家確認發送</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer 聲明 */}
        <div className="p-3.5 bg-stone-100 border-t border-stone-200 text-center text-[11px] text-stone-500 shrink-0">
          🛡️ 嚴格恪守平台資料防火牆與防惡意消耗規範。所有建議回覆最終由專家親自確認發出，兼顧靈活應變與合約責任。
        </div>
      </div>
    </div>
  );
};
