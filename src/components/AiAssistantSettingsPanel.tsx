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

  const handleToggleEnable = () => {
    const next = { ...config, isEnabled: !config.isEnabled };
    handleSave(next);
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
      {/* 頂部功能介紹 Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-stone-900 via-stone-800 to-amber-950 p-5 sm:p-6 text-white shadow-xl border border-amber-500/30">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-black border border-amber-500/40">
                <Crown className="w-3.5 h-3.5 text-amber-400" />
                大師方案專屬尊榮特權
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-bold border border-emerald-500/30">
                24hr 離線全天候護航
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-amber-100 flex items-center gap-2">
              <Bot className="w-6 h-6 text-amber-400" />
              24hr AI客服特助代客服務
            </h2>
            <p className="text-xs sm:text-sm text-stone-300 max-w-2xl leading-relaxed">
              協助專家離線時主動與客戶交談維持緊密關係，自動梳理時程與痛點規格；
              專家在線時亦可在聊天室隨時召喚特助請求談判與報價建議，雙軌確保訂單零流失！
            </p>
          </div>

          {/* 總開關控制鈕 */}
          <div className="flex items-center gap-3 bg-stone-900/80 p-3 rounded-2xl border border-stone-700/80 shrink-0">
            <div className="text-right">
              <div className="text-xs font-black text-stone-200">特助代客服務狀態</div>
              <div className={`text-[11px] font-bold ${config.isEnabled ? 'text-emerald-400' : 'text-stone-400'}`}>
                {config.isEnabled ? '● 全天候在線代管中' : '○ 目前已關閉'}
              </div>
            </div>
            <button
              type="button"
              disabled={!isMasterOrAdmin}
              onClick={handleToggleEnable}
              className={`w-14 h-8 rounded-full transition-colors relative cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                config.isEnabled ? 'bg-amber-500' : 'bg-stone-700'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full bg-white shadow-md transition-transform absolute top-1 ${
                  config.isEnabled ? 'left-7' : 'left-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* 背景裝飾光澤 */}
        <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

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
                升級至大師方案即可立即解鎖 24hr AI 客服特助代客服務、0% 平台服務費（100% 全額入帳）與全功能 AI-CRM！
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
              <span>立即升級大師方案 ($1,490/月，0% 服務費)</span>
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
          {/* 模組 1: 交談語氣與離線召喚時間 */}
          <div className="bg-white dark:bg-stone-900 rounded-2xl p-5 border border-stone-200 dark:border-stone-800 shadow-xs space-y-4">
            <h3 className="text-sm font-black text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              1. 召喚時間與交談語氣設定
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* 離線召喚時間 (預設 20 分鐘) */}
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5 flex items-center justify-between">
                  <span>專家離線召喚時間</span>
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">預設 20 分鐘</span>
                </label>
                <select
                  value={config.offlineTriggerMinutes}
                  onChange={(e) => handleSave({ ...config, offlineTriggerMinutes: Number(e.target.value) })}
                  className="w-full text-xs font-bold p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-800 dark:text-stone-200 cursor-pointer"
                >
                  <option value={0}>客戶發訊立即代答（0 分鐘）</option>
                  <option value={5}>專家離線 5 分鐘未回覆</option>
                  <option value={10}>專家離線 10 分鐘未回覆</option>
                  <option value={20}>專家離線 20 分鐘未回覆（標準推薦）</option>
                  <option value={30}>專家離線 30 分鐘未回覆</option>
                  <option value={60}>專家離線 60 分鐘未回覆</option>
                </select>
                <p className="text-[10px] text-stone-400 mt-1">
                  💡 若您在上述時間內未在線回覆，AI 特助將自動代表您禮貌回話，避免潛在委託人因等待而離開。
                </p>
              </div>

              {/* 交談語氣 */}
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
                  交談語氣與風格
                </label>
                <select
                  value={config.tone}
                  onChange={(e) => handleSave({ ...config, tone: e.target.value as any })}
                  className="w-full text-xs font-bold p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-800 dark:text-stone-200 cursor-pointer"
                >
                  <option value="professional">專業幹練・俐落嚴謹（商務諮詢推薦）</option>
                  <option value="warm">親切溫暖・耐心傾聽（個人顧問與輔導推薦）</option>
                  <option value="technical">架構深度・精準客觀（工程與資安領域推薦）</option>
                  <option value="authoritative">戰略高度・自信堅定（高階主管與投資策略推薦）</option>
                </select>
                <p className="text-[10px] text-stone-400 mt-1">
                  特助將模擬您選擇的口吻與客戶交談。
                </p>
              </div>
            </div>

            {/* 自然語言期望回答方向 */}
            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5 flex items-center justify-between">
                <span>希望的回答方向與基本策略（可用自然語言自訂）</span>
                <span className="text-[10px] text-stone-400">AI 將融會貫通於所有對話中</span>
              </label>
              <textarea
                value={config.toneDescription || ''}
                onChange={(e) => setConfig({ ...config, toneDescription: e.target.value })}
                onBlur={() => handleSave(config)}
                placeholder="例如：以專業嚴謹且具同理心的態度接待，多引導客戶說明專案時程與預算範圍，強調我具備 10 年實戰經驗且有平台款項託管保證。"
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
                2. 專家自訂 FAQ 與期望回答庫 ({config.faqList.length})
              </h3>
              <span className="text-[11px] text-stone-400">當客戶問及相符問題時優先參考</span>
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
              <span className="text-xs font-bold text-stone-700 dark:text-stone-300">新增一筆常見問題：</span>
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
                placeholder="期望特助回答的方向，例如：可提供標準 NDA 協議，所有委託資料在平台皆受到加密與保密條款保護。"
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
                <span>加入 FAQ 知識庫</span>
              </button>
            </div>
          </div>

          {/* 模組 3: 其他希望的 Prompt 自訂指令庫 */}
          <div className="bg-white dark:bg-stone-900 rounded-2xl p-5 border border-stone-200 dark:border-stone-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                3. 其他自訂 Prompt 指令庫 ({config.customPrompts.length})
              </h3>
              <span className="text-[11px] text-stone-400">AI 特助代答時會嚴格遵守</span>
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
              4. 交易邊界與權限約制
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
                    產出交易/報價草案仍要專家事後親自確認
                  </span>
                  <span className="text-[11px] text-amber-800 dark:text-amber-400 leading-relaxed block mt-0.5">
                    強烈建議開啟：AI 特助只負責記錄時程與需求規格，任何正式具有法律約束力的報價與合約，皆須您親自確認簽字才生效，嚴防擅自承諾。
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* 模組 5: 風險控管與雙重防火牆 */}
          <div className="bg-white dark:bg-stone-900 rounded-2xl p-5 border border-stone-200 dark:border-stone-800 shadow-xs space-y-3">
            <h3 className="text-sm font-black text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-500" />
              5. 風險控管與雙重防火牆
            </h3>

            {/* 防火牆 1: 商業機密與個資洩漏防護 */}
            <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>商業機密與個資防火牆：運作中</span>
              </div>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed">
                系統嚴格遮蔽身分證字號、銀行帳號、私人聯絡方式（電話/LINE），並隔離其他客戶案件機密，同時具備防 Prompt Injection 提示詞注入攻擊防禦。
              </p>
            </div>

            {/* 防火牆 2: 避免惡意消耗 Tokens */}
            <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-stone-800 dark:text-stone-200">
                <span>單對話單日代答上限保護</span>
                <span className="text-amber-600 dark:text-amber-400 font-mono font-bold">
                  {config.dailyMessageLimitPerChat || 30} 則 / 日 / 聊天室
                </span>
              </div>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed">
                保護對話不被惡意消耗 Tokens。每間聊天室每日最高 30 則代答，超額時委婉提醒客戶靜候專家上線。
              </p>
              <div className="flex items-center gap-2 pt-1 text-[11px] text-stone-400">
                <Zap className="w-3 h-3 text-amber-500" />
                <span>累計協助接待次數：{config.totalAssistedCount || 0} 次</span>
              </div>
            </div>
          </div>

          {/* 模組 6: 聊天室在線召喚教學卡 */}
          <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-2xl p-5 border border-amber-400/40 space-y-2">
            <h4 className="text-xs font-black text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-amber-500" />
              專家在線功能：聊天室中「召喚 AI 特助建議」
            </h4>
            <p className="text-[11px] text-stone-600 dark:text-stone-300 leading-relaxed">
              當您親自在線與客戶洽談時，在聊天室輸入框上方點擊<strong>「✨ 召喚 AI 特助」</strong>，輸入您面臨的談判瓶頸（例如客戶嫌貴或時程太趕），AI 會即刻為您量身產出 3 組專業談判策略與發送草稿，讓您一鍵帶入微調！
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
