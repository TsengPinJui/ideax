import React, { useState } from 'react';
import {
  Bot,
  ShieldCheck,
  Clock,
  MessageSquare,
  HelpCircle,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Crown,
  Sparkles,
  Lock,
  ChevronRight,
  Info,
  ShieldAlert,
  Zap,
} from 'lucide-react';
import { User, Assistant24hrConfig, DEFAULT_ASSISTANT_24HR_CONFIG, AssistantFaqItem, AssistantCustomPrompt } from '../types';

interface AiAssistantSettingsPanelProps {
  currentUser: User;
  onUpdateConfig: (newConfig: Assistant24hrConfig) => void;
  onUpgradePlan?: () => void;
}

export const AiAssistantSettingsPanel: React.FC<AiAssistantSettingsPanelProps> = ({
  currentUser,
  onUpdateConfig,
  onUpgradePlan,
}) => {
  const userTier = currentUser.subscriptionTier || 'free';
  const isAdmin = currentUser.role === 'admin';
  const isMasterOrAdmin = userTier === 'master' || isAdmin;

  // Local state for configuration
  const [config, setConfig] = useState<Assistant24hrConfig>(() => {
    return currentUser.assistant24hrConfig || DEFAULT_ASSISTANT_24HR_CONFIG;
  });

  const [newFaqQ, setNewFaqQ] = useState('');
  const [newFaqA, setNewFaqA] = useState('');
  const [newPromptText, setNewPromptText] = useState('');
  const [isSavedToast, setIsSavedToast] = useState(false);

  // Save changes
  const handleSave = (updated: Assistant24hrConfig) => {
    setConfig(updated);
    onUpdateConfig(updated);
    setIsSavedToast(true);
    setTimeout(() => setIsSavedToast(false), 3000);
  };

  const handleAddFaq = () => {
    if (!newFaqQ.trim() || !newFaqA.trim()) return;
    const newItem: AssistantFaqItem = {
      id: `faq-${Date.now()}`,
      question: newFaqQ.trim(),
      answer: newFaqA.trim(),
    };
    const next = { ...config, faqList: [...config.faqList, newItem] };
    setNewFaqQ('');
    setNewFaqA('');
    handleSave(next);
  };

  const handleDeleteFaq = (id: string) => {
    const next = { ...config, faqList: config.faqList.filter((f) => f.id !== id) };
    handleSave(next);
  };

  const handleAddPrompt = () => {
    if (!newPromptText.trim()) return;
    const newItem: AssistantCustomPrompt = {
      id: `prompt-${Date.now()}`,
      instruction: newPromptText.trim(),
      isEnabled: true,
    };
    const next = { ...config, customPrompts: [...config.customPrompts, newItem] };
    setNewPromptText('');
    handleSave(next);
  };

  const handleDeletePrompt = (id: string) => {
    const next = { ...config, customPrompts: config.customPrompts.filter((p) => p.id !== id) };
    handleSave(next);
  };

  const handleTogglePrompt = (id: string) => {
    const next = {
      ...config,
      customPrompts: config.customPrompts.map((p) =>
        p.id === id ? { ...p, isEnabled: !p.isEnabled } : p
      ),
    };
    handleSave(next);
  };

  return (
    <div className="space-y-6">
      {/* 方案門檻提示：若未達大師方案 */}
      {!isMasterOrAdmin && (
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border-2 border-amber-400/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in duration-300">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-black text-amber-900 dark:text-amber-200">
                此功能為「大師方案」專家限定權益
              </h4>
              <p className="text-xs text-stone-600 dark:text-stone-400 mt-0.5">
                您目前的方案為【{userTier === 'authority' ? '權威方案' : userTier === 'free' ? '一般會員' : userTier === 'pro' ? 'Pro 方案' : '達人方案'}】。
                升級至大師方案即可立即解鎖 24hr AI 客服特助代客服務、2% 極低服務費（實收 98%）與全功能 AI-CRM！
              </p>
            </div>
          </div>
          {onUpgradePlan && (
            <button
              type="button"
              onClick={onUpgradePlan}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black text-xs shadow-md transition-all shrink-0 cursor-pointer flex items-center gap-1.5 justify-center"
            >
              <Crown className="w-4 h-4 text-stone-950" />
              <span>立即升級大師方案 ($1,980/月，2% 服務費)</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* 儲存成功 Toast 浮動條 */}
      {isSavedToast && (
        <div className="p-3 rounded-xl bg-emerald-500 text-stone-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckCircle2 className="w-4 h-4" />
          <span>24hr AI特助設定已同步儲存更新並即時生效！</span>
        </div>
      )}

      {/* 設定主體網格 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左側 2 欄：核心行為與知識庫設定 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 模組 1: 觸發時機與交談語氣 */}
          <div className="bg-white dark:bg-stone-900 rounded-2xl p-5 border border-stone-200 dark:border-stone-800 shadow-xs space-y-4">
            <h3 className="text-sm font-black text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              1. 觸發時機與交談語氣
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* 離線召喚時間 (預設 20 分鐘) */}
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5 flex items-center justify-between">
                  <span>專家離線觸發時間</span>
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">預設 20 分鐘</span>
                </label>
                <select
                  value={config.offlineTriggerMinutes}
                  onChange={(e) => handleSave({ ...config, offlineTriggerMinutes: Number(e.target.value) })}
                  className="w-full text-xs font-bold p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-800 dark:text-stone-200 cursor-pointer"
                >
                  <option value={0}>客戶發訊立即代答（0 分鐘）</option>
                  <option value={5}>離線 5 分鐘未回覆</option>
                  <option value={10}>離線 10 分鐘未回覆</option>
                  <option value={20}>離線 20 分鐘未回覆（標準推薦）</option>
                  <option value={30}>離線 30 分鐘未回覆</option>
                  <option value={60}>離線 60 分鐘未回覆</option>
                </select>
                <p className="text-[10px] text-stone-400 mt-1">
                  離線達設定時長，AI特助自動代答避免潛在客戶流失。
                </p>
              </div>

              {/* 交談語氣 */}
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
                  <span>交談語氣風格</span>
                </label>
                <select
                  value={config.tone}
                  onChange={(e) => handleSave({ ...config, tone: e.target.value as any })}
                  className="w-full text-xs font-bold p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-800 dark:text-stone-200 cursor-pointer"
                >
                  <option value="adaptive">依AI判定客戶習慣客製語氣</option>
                  <option value="professional">專業幹練・俐落嚴謹（商務諮詢推薦）</option>
                  <option value="warm">親切溫暖・耐心傾聽（個人顧問與輔導推薦）</option>
                  <option value="technical">架構深度・精準客觀（工程與資安領域推薦）</option>
                  <option value="authoritative">戰略高度・自信堅定（高階主管與投資策略推薦）</option>
                </select>
              </div>
            </div>

            {/* 自然語言期望回答方向 */}
            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5 flex items-center justify-between">
                <span>應對方針與策略（自然語言自訂）</span>
                <span className="text-[10px] text-stone-400">融入特助對話決策</span>
              </label>
              <textarea
                value={config.toneDescription || ''}
                onChange={(e) => setConfig({ ...config, toneDescription: e.target.value })}
                onBlur={() => handleSave(config)}
                placeholder="例如：以嚴謹具同理心態度接待，引導說明時程與預算，強調 10 年實戰經驗與平台款項託管保證。"
                rows={2}
                className="w-full text-xs p-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-800 dark:text-stone-200 focus:ring-2 focus:ring-amber-500 outline-hidden"
              />
            </div>
          </div>

          {/* 模組 2: 客戶常見問題 FAQ 與期望回答 */}
          <div className="bg-white dark:bg-stone-900 rounded-2xl p-5 border border-stone-200 dark:border-stone-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-amber-500" />
                2. 常見 FAQ 知識庫 ({config.faqList.length})
              </h3>
              <span className="text-[11px] text-stone-400">提問相符時優先引用</span>
            </div>

            {/* 現有 FAQ 清單 */}
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {config.faqList.map((faq, index) => (
                <div
                  key={faq.id}
                  className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 space-y-1.5 group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-bold text-amber-900 dark:text-amber-300">
                      Q{index + 1}: {faq.question}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteFaq(faq.id)}
                      className="text-stone-400 hover:text-rose-500 transition-colors cursor-pointer p-1"
                      title="刪除此 FAQ"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-xs text-stone-600 dark:text-stone-300 whitespace-pre-wrap leading-relaxed">
                    A: {faq.answer}
                  </p>
                </div>
              ))}
            </div>

            {/* 新增 FAQ 表單 */}
            <div className="pt-2 border-t border-stone-100 dark:border-stone-800 space-y-2">
              <span className="text-xs font-bold text-stone-700 dark:text-stone-300">新增常見問題：</span>
              <input
                type="text"
                value={newFaqQ}
                onChange={(e) => setNewFaqQ(e.target.value)}
                placeholder="客戶常見問題，例如：是否有簽署保密協議（NDA）的服務？"
                className="w-full text-xs p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200"
              />
              <textarea
                value={newFaqA}
                onChange={(e) => setNewFaqA(e.target.value)}
                placeholder="期望特助回答方向，例如：可提供標準 NDA 協議，所有委託資料在平台皆受到加密與保密條款保護。"
                rows={2}
                className="w-full text-xs p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200"
              />
              <button
                type="button"
                onClick={handleAddFaq}
                disabled={!newFaqQ.trim() || !newFaqA.trim()}
                className="w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 disabled:opacity-50 text-stone-950 font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>加入知識庫</span>
              </button>
            </div>
          </div>

          {/* 模組 3: 其他希望的 Prompt 自訂指令庫 */}
          <div className="bg-white dark:bg-stone-900 rounded-2xl p-5 border border-stone-200 dark:border-stone-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                3. 自訂指令庫 ({config.customPrompts.length})
              </h3>
              <span className="text-[11px] text-stone-400">特助代答時嚴格遵循</span>
            </div>

            <div className="space-y-2">
              {config.customPrompts.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 text-xs"
                >
                  <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={p.isEnabled}
                      onChange={() => handleTogglePrompt(p.id)}
                      className="rounded text-amber-500 focus:ring-amber-400"
                    />
                    <span className={`truncate ${p.isEnabled ? 'text-stone-800 dark:text-stone-200' : 'text-stone-400 line-through'}`}>
                      {p.instruction}
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => handleDeletePrompt(p.id)}
                    className="text-stone-400 hover:text-rose-500 p-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newPromptText}
                onChange={(e) => setNewPromptText(e.target.value)}
                placeholder="新增一筆指令，例如：若客戶諮詢未滿 30 分鐘需求，建議引導發起輕量諮詢訂單"
                className="flex-1 text-xs p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200"
              />
              <button
                type="button"
                onClick={handleAddPrompt}
                disabled={!newPromptText.trim()}
                className="px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs shrink-0 cursor-pointer disabled:opacity-50"
              >
                新增指令
              </button>
            </div>
          </div>
        </div>

        {/* 右側 1 欄：權限邊界、安全防火牆與在線召喚功能說明 */}
        <div className="space-y-6">
          {/* 模組 4: 權限邊界與交易安全約制 */}
          <div className="bg-white dark:bg-stone-900 rounded-2xl p-5 border border-stone-200 dark:border-stone-800 shadow-xs space-y-3">
            <h3 className="text-sm font-black text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              4. 交易確認與權限約制
            </h3>

            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 space-y-2">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.requireHumanApprovalForDeals}
                  onChange={(e) => handleSave({ ...config, requireHumanApprovalForDeals: e.target.checked })}
                  className="mt-0.5 rounded text-amber-500 focus:ring-amber-400"
                />
                <div className="text-xs">
                  <span className="font-bold text-amber-900 dark:text-amber-200 block">
                    報價與合約草案需專家確認
                  </span>
                  <span className="text-[11px] text-amber-800 dark:text-amber-400 leading-relaxed block mt-0.5">
                    特助僅協助記錄需求與時程，任何正式具法律約束力之報價合約需專家親自確認，防止未授權承諾。
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* 模組 5: 風險控管與雙重防火牆 */}
          <div className="bg-white dark:bg-stone-900 rounded-2xl p-5 border border-stone-200 dark:border-stone-800 shadow-xs space-y-3">
            <h3 className="text-sm font-black text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-500" />
              5. 安全防火牆
            </h3>

            {/* 防火牆 1: 商業機密與個資洩漏防護 */}
            <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>個資與商業機密防火牆：運行中</span>
              </div>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed">
                自動遮蔽身分證、銀行帳號、私人聯絡方式（電話/LINE），隔離客戶案件機密並防範 Prompt 注入。
              </p>
            </div>

            {/* 防火牆 2: 避免惡意消耗 Tokens */}
            <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-stone-800 dark:text-stone-200">
                <span>單對話每日代答上限</span>
                <span className="text-amber-600 dark:text-amber-400 font-mono font-bold">
                  {config.dailyMessageLimitPerChat || 30} 則 / 日 / 室
                </span>
              </div>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed">
                每間聊天室每日最高 30 則代答，超額時委婉提醒客戶靜候專家上線，避免惡意消耗。
              </p>
              <div className="flex items-center gap-2 pt-1 text-[11px] text-stone-400">
                <Zap className="w-3 h-3 text-amber-500" />
                <span>累計接待：{config.totalAssistedCount || 0} 次</span>
              </div>
            </div>
          </div>

          {/* 模組 6: AI-CRM 特助代操與 24hr巡航雷達說明卡 */}
          <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-2xl p-5 border border-amber-400/40 space-y-2">
            <h4 className="text-xs font-black text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
              <Bot className="w-4 h-4 text-amber-500" />
              AI-CRM 特助代操與離線接待
            </h4>
            <p className="text-[11px] text-stone-600 dark:text-stone-300 leading-relaxed">
              專家離線或忙碌時，AI 特助全天候在線為您接待客戶、釐清痛點時程；配合<strong>「24hr巡航雷達」</strong>排定之代操任務，在最佳商業時點自動發送破冰提案。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
