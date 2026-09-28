import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { SubscriptionTier, AiCrmSystemConfig, AiCrmLead, AiCrmPushNotification } from '../types';
import { getAiCrmLeadsForSolver, getAiCrmPushesForSolver } from '../services/aiService';
import {
  Sparkles,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Clock,
  Send,
  Users,
  Radio,
  BarChart3,
  RefreshCw,
  Crown,
  Eye,
  Settings,
  HelpCircle,
  Save,
  MessageSquare,
  ShieldCheck,
  Flame,
  Plus,
  Zap,
} from 'lucide-react';

interface AdminAiCrmTabProps {
  onOpenAiCrm?: () => void;
}

export const AdminAiCrmTab: React.FC<AdminAiCrmTabProps> = ({ onOpenAiCrm }) => {
  const {
    currentUser,
    aiCrmConfig,
    updateAiCrmConfig,
    questions,
    solvers,
    availableUsers,
  } = useApp();

  // Local form state for settings
  const [formData, setFormData] = useState<AiCrmSystemConfig>({
    isEnabled: aiCrmConfig?.isEnabled ?? true,
    requiredTier: aiCrmConfig?.requiredTier ?? 'master',
    hesitationDaysThreshold: aiCrmConfig?.hesitationDaysThreshold ?? 3,
    highIntentBountyThreshold: aiCrmConfig?.highIntentBountyThreshold ?? 3000,
    toneStyle: aiCrmConfig?.toneStyle ?? 'professional',
    autoScanIntervalHours: aiCrmConfig?.autoScanIntervalHours ?? 4,
    allowCustomTone: aiCrmConfig?.allowCustomTone ?? true,
    boardPushEnabled: aiCrmConfig?.boardPushEnabled ?? true,
    maxPushesPerDay: aiCrmConfig?.maxPushesPerDay ?? 5,
  });

  const [activeSubTab, setActiveSubTab] = useState<'settings' | 'leads_pool' | 'broadcast_center'>('settings');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanNotice, setScanNotice] = useState<string | null>(null);

  // Active leads pool state
  const [leadsPool, setLeadsPool] = useState<AiCrmLead[]>(() =>
    getAiCrmLeadsForSolver(currentUser?.domain || '資訊工程', currentUser?.skills || ['AI', '行銷'], questions)
  );

  // Broadcast list state
  const [broadcastList, setBroadcastList] = useState<AiCrmPushNotification[]>(() =>
    getAiCrmPushesForSolver(currentUser?.id)
  );

  // Form for manual broadcast creation
  const [newBroadcastAudience, setNewBroadcastAudience] = useState('關注「創新創業」與「AI技術」全體會員');
  const [newBroadcastEvent, setNewBroadcastEvent] = useState('主題看板新增大師方案專家解答');
  const [newBroadcastContent, setNewBroadcastContent] = useState('「您關注的主題看板剛新增了 2 則高質量解題方案，點擊立即預覽前沿思路！」');
  const [broadcastSuccessNotice, setBroadcastSuccessNotice] = useState<string | null>(null);

  const handleSaveSettings = () => {
    updateAiCrmConfig(formData);
    setSaveSuccessMsg('AI-CRM 系統運營設定已成功儲存！所有規則與演算法即刻在全站生效。');
    setTimeout(() => setSaveSuccessMsg(null), 4000);
  };

  const handleTriggerRescan = () => {
    setIsScanning(true);
    setTimeout(() => {
      const refreshed = getAiCrmLeadsForSolver(
        currentUser?.domain || '資訊工程',
        currentUser?.skills || ['AI', '行銷'],
        questions
      );
      setLeadsPool(refreshed);
      setIsScanning(false);
      setScanNotice(`全站商機池已完成重新探測！共掃描 ${questions.length} 個題目，偵測出 ${refreshed.length} 筆高價值潛在客情商機。`);
      setTimeout(() => setScanNotice(null), 4000);
    }, 700);
  };

  const handleCreateBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBroadcastContent.trim()) return;

    const newPush: AiCrmPushNotification = {
      id: `push-admin-${Date.now()}`,
      targetAudience: newBroadcastAudience,
      triggerEvent: newBroadcastEvent,
      content: newBroadcastContent.trim(),
      status: 'sent',
      clicksCount: 1,
    };

    setBroadcastList([newPush, ...broadcastList]);
    setBroadcastSuccessNotice('系統級主動推播已成功派發至目標受眾推播佇列中！');
    setTimeout(() => setBroadcastSuccessNotice(null), 3500);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner / Description */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-stone-900 via-amber-950 to-stone-900 text-white border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Sparkles className="w-4 h-4" />
            </span>
            <h2 className="text-base sm:text-lg font-black text-amber-300">
              AI-CRM 客戶關係管理系統・後台營運控制中心
            </h2>
            <span
              className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                formData.isEnabled ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
              }`}
            >
              {formData.isEnabled ? '系統運作中' : '系統已暫停'}
            </span>
          </div>
          <p className="text-xs text-stone-300 max-w-2xl leading-relaxed">
            設定全站 AI 追蹤演算法、提問者猶豫期跟進觸發天數、推播擴散門檻與話術風格。支持管理員即時監控全站客情商機動態並發布系統廣播。
          </p>
        </div>

        {onOpenAiCrm && (
          <button
            type="button"
            onClick={onOpenAiCrm}
            className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-xs"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>預覽專家端視角</span>
          </button>
        )}
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-2xs">
          <span className="text-[11px] text-stone-500 font-bold block">AI-CRM 總運行狀態</span>
          <span className={`text-lg font-black mt-1 block ${formData.isEnabled ? 'text-emerald-700' : 'text-stone-400'}`}>
            {formData.isEnabled ? '● 正常啟用中' : '○ 已手動停用'}
          </span>
          <span className="text-[10px] text-stone-400 mt-0.5 block">
            {formData.boardPushEnabled ? '主題看板推播：開' : '主題看板推播：關'}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 shadow-2xs">
          <span className="text-[11px] text-amber-800 font-bold block">猶豫期偵測天數</span>
          <span className="text-xl font-black text-amber-900 font-mono mt-1 block">
            {formData.hesitationDaysThreshold} 天
          </span>
          <span className="text-[10px] text-amber-700 mt-0.5 block">提問者未回覆即觸發跟進</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-2xs">
          <span className="text-[11px] text-stone-500 font-bold block">目前商機池動態</span>
          <span className="text-xl font-black text-stone-900 font-mono mt-1 block">
            {leadsPool.length} 筆
          </span>
          <span className="text-[10px] text-stone-400 mt-0.5 block">
            高意向案件：{leadsPool.filter((l) => l.urgency === 'high').length} 筆
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 shadow-2xs">
          <span className="text-[11px] text-stone-500 font-bold block">最低方案解鎖門檻</span>
          <span className="text-sm font-black text-purple-900 mt-1 block flex items-center gap-1">
            <Crown className="w-3.5 h-3.5 text-purple-600" />
            <span>
              {formData.requiredTier === 'master'
                ? '大師方案 (Master)'
                : formData.requiredTier === 'authority'
                ? '權威方案以上'
                : formData.requiredTier === 'expert'
                ? '專家方案以上'
                : '全體會員開放'}
            </span>
          </span>
          <span className="text-[10px] text-stone-400 mt-0.5 block">高端解答者專屬權益</span>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 text-xs font-bold overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveSubTab('settings')}
          className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeSubTab === 'settings'
              ? 'border-purple-600 text-purple-900 font-black'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>核心功能設定與參數</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('leads_pool')}
          className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeSubTab === 'leads_pool'
              ? 'border-purple-600 text-purple-900 font-black'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>全站商機池與客情監控 ({leadsPool.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('broadcast_center')}
          className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeSubTab === 'broadcast_center'
              ? 'border-purple-600 text-purple-900 font-black'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          <span>主動推播廣播中心 ({broadcastList.length})</span>
        </button>
      </div>

      {/* SUBTAB 1: SETTINGS */}
      {activeSubTab === 'settings' && (
        <div className="space-y-6">
          {saveSuccessMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{saveSuccessMsg}</span>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 space-y-6 shadow-2xs">
            {/* Section 1: System Switch & Access Tier */}
            <div className="space-y-4">
              <h3 className="font-extrabold text-sm sm:text-base text-stone-900 flex items-center gap-2 border-b border-stone-100 pb-2">
                <Settings className="w-4 h-4 text-purple-600" />
                <span>1. 全域運行狀態與方案權限</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Switch */}
                <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/80 flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-stone-900 block">AI-CRM 系統總開關</label>
                    <p className="text-[11px] text-stone-500 mt-0.5">
                      停用時，專家後台與通知中心將暫停客情跟進與商機提醒
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, isEnabled: !formData.isEnabled })}
                    className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                      formData.isEnabled ? 'bg-purple-600' : 'bg-stone-300'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                        formData.isEnabled ? 'left-6.5' : 'left-0.5'
                      }`}
                    />
                  </button>
                </div>

                {/* Required Tier */}
                <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/80 space-y-1.5">
                  <label className="text-xs font-bold text-stone-900 block">解鎖最低資格方案</label>
                  <p className="text-[11px] text-stone-500">決定哪些等級的解答者可使用主動跟進與 AI-CRM 功能</p>
                  <select
                    value={formData.requiredTier}
                    onChange={(e) => setFormData({ ...formData, requiredTier: e.target.value as SubscriptionTier })}
                    className="w-full mt-1 p-2 rounded-lg border border-stone-300 text-xs font-bold bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-purple-300"
                  >
                    <option value="master">⭐️ 大師方案 (Master) - 官方推薦</option>
                    <option value="authority">權威方案 (Authority) 以上</option>
                    <option value="expert">專家方案 (Expert) 以上</option>
                    <option value="pro">進階方案 (Pro) 以上</option>
                    <option value="free">全體會員開放 (Free)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section 2: Algorithm Parameters */}
            <div className="space-y-4">
              <h3 className="font-extrabold text-sm sm:text-base text-stone-900 flex items-center gap-2 border-b border-stone-100 pb-2">
                <Zap className="w-4 h-4 text-amber-600" />
                <span>2. 客情偵測與猶豫期演算法參數</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Hesitation Days */}
                <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200 space-y-1.5">
                  <label className="text-xs font-bold text-amber-950 block">提問者猶豫期閾值 (天)</label>
                  <p className="text-[10px] text-amber-800/80">提問者查閱提案後超過此天數未回覆，生成主動跟進提醒</p>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="number"
                      min={1}
                      max={14}
                      value={formData.hesitationDaysThreshold}
                      onChange={(e) =>
                        setFormData({ ...formData, hesitationDaysThreshold: Math.max(1, Number(e.target.value) || 1) })
                      }
                      className="w-24 p-2 rounded-lg border border-amber-300 text-xs font-bold bg-white text-stone-900 text-center"
                    />
                    <span className="text-xs font-bold text-amber-950">天</span>
                  </div>
                </div>

                {/* High Intent Bounty Threshold */}
                <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-1.5">
                  <label className="text-xs font-bold text-stone-900 block">高意向懸賞門檻 (NT$)</label>
                  <p className="text-[10px] text-stone-500">懸賞金額達標之案件自動標記為「🔥 高意向優先跟進」</p>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="number"
                      min={500}
                      step={500}
                      value={formData.highIntentBountyThreshold}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          highIntentBountyThreshold: Math.max(500, Number(e.target.value) || 500),
                        })
                      }
                      className="w-28 p-2 rounded-lg border border-stone-300 text-xs font-bold bg-white text-stone-900 text-center"
                    />
                    <span className="text-xs font-bold text-stone-700">元</span>
                  </div>
                </div>

                {/* Scan Interval */}
                <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-1.5">
                  <label className="text-xs font-bold text-stone-900 block">全站商機掃描頻率</label>
                  <p className="text-[10px] text-stone-500">背景演算法定時排程重整全站客情標籤之週期</p>
                  <select
                    value={formData.autoScanIntervalHours}
                    onChange={(e) =>
                      setFormData({ ...formData, autoScanIntervalHours: Number(e.target.value) || 4 })
                    }
                    className="w-full mt-1 p-2 rounded-lg border border-stone-300 text-xs font-bold bg-white text-stone-900"
                  >
                    <option value={2}>每 2 小時（極度即時）</option>
                    <option value={4}>每 4 小時（建議值）</option>
                    <option value={8}>每 8 小時</option>
                    <option value={24}>每 24 小時（每日一次）</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section 3: AI Tone & Features */}
            <div className="space-y-4">
              <h3 className="font-extrabold text-sm sm:text-base text-stone-900 flex items-center gap-2 border-b border-stone-100 pb-2">
                <MessageSquare className="w-4 h-4 text-indigo-600" />
                <span>3. AI 擬定訊息話術語氣與擴散功能</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Tone Style */}
                <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-1.5">
                  <label className="text-xs font-bold text-stone-900 block">AI 建議訊息預設語氣風格</label>
                  <p className="text-[11px] text-stone-500">演算法在為專家自動擬定溝通話術時採用的表達風格</p>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {[
                      { id: 'professional', label: '專業顧問風', desc: '條理分明、引用方法論與避坑指南' },
                      { id: 'consultative', label: '諮詢引導風', desc: '痛點深挖、先同理再提供初步架構' },
                      { id: 'friendly', label: '親切熱情風', desc: '主動真誠、建立夥伴般的信任交流' },
                      { id: 'efficient', label: '商務高效風', desc: '直切重點、量化成效與快速交付承諾' },
                    ].map((tone) => (
                      <button
                        key={tone.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, toneStyle: tone.id as any })}
                        className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                          formData.toneStyle === tone.id
                            ? 'bg-purple-100 border-purple-500 text-purple-950 font-black'
                            : 'bg-white border-stone-200 hover:border-stone-300 text-stone-700'
                        }`}
                      >
                        <span className="text-xs font-bold block">{tone.label}</span>
                        <span className="text-[10px] text-stone-500 block mt-0.5">{tone.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Additional Toggles */}
                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-stone-900 block">主題看板主動推播擴散</span>
                      <span className="text-[10px] text-stone-500 block mt-0.5">
                        當提問者進入相關領域主題看板時，系統主動發送優選大師解題方案
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, boardPushEnabled: !formData.boardPushEnabled })}
                      className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                        formData.boardPushEnabled ? 'bg-amber-500' : 'bg-stone-300'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                          formData.boardPushEnabled ? 'left-5.5' : 'left-0.5'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-stone-900 block">允許專家編輯 AI 話術</span>
                      <span className="text-[10px] text-stone-500 block mt-0.5">
                        在專家 CRM 介面，專家可直接對 AI 建議訊息點擊發送或自由編輯修改
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, allowCustomTone: !formData.allowCustomTone })}
                      className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                        formData.allowCustomTone ? 'bg-purple-600' : 'bg-stone-300'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                          formData.allowCustomTone ? 'left-5.5' : 'left-0.5'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleSaveSettings}
                className="px-6 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 active:scale-95 text-white font-bold text-xs shadow-sm flex items-center gap-2 cursor-pointer transition-all"
              >
                <Save className="w-4 h-4" />
                <span>儲存 AI-CRM 設定</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: LEADS POOL MONITOR */}
      {activeSubTab === 'leads_pool' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-stone-900">
                全站即時 AI-CRM 客情商機動態監控池
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                系統當前正主動為各領域大師專家探測之潛在委託者、疑慮狀態與 AI 擬定話術
              </p>
            </div>

            <button
              type="button"
              disabled={isScanning}
              onClick={handleTriggerRescan}
              className="px-3.5 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? '演算掃描中...' : '強制全站重新掃描商機'}</span>
            </button>
          </div>

          {scanNotice && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{scanNotice}</span>
            </div>
          )}

          <div className="space-y-3">
            {leadsPool.map((lead, idx) => (
              <div
                key={lead.id || idx}
                className="p-4 sm:p-5 rounded-2xl bg-white border border-stone-200 space-y-3 shadow-2xs"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <img
                      src={lead.clientAvatar}
                      alt={lead.clientName}
                      className="w-10 h-10 rounded-full object-cover border border-amber-300"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-stone-900">{lead.clientName}</h4>
                        <span className="text-xs text-stone-500">{lead.clientRole}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            lead.urgency === 'high' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {lead.urgency === 'high' ? '🔥 高意向案件' : '一般意向'}
                        </span>
                      </div>
                      <p className="text-xs text-stone-600 mt-0.5">
                        <span className="font-semibold text-amber-900">【狀態】：</span>
                        {lead.statusDescription}
                      </p>
                    </div>
                  </div>

                  <span className="text-[11px] font-mono text-stone-400 bg-stone-100 px-2.5 py-1 rounded-lg">
                    最後活躍：{lead.lastActiveTime}
                  </span>
                </div>

                {/* AI Insight */}
                <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-amber-900">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>AI 診斷：</span>
                  </div>
                  <p className="text-stone-700 leading-relaxed">{lead.aiInsight}</p>
                </div>

                {/* Suggested Message Preview */}
                <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs space-y-1">
                  <span className="font-bold text-stone-700 block">AI 擬定建議訊息預覽：</span>
                  <p className="text-stone-800 font-mono italic leading-relaxed">「{lead.suggestedMessage}」</p>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-stone-100">
                  <span className="text-stone-500">
                    行動策略：<strong>{lead.aiRecommendedAction}</strong>
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      lead.hasSent ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-700'
                    }`}
                  >
                    {lead.hasSent ? '已由專家發送' : '待專家點擊發送'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBTAB 3: BROADCAST CENTER */}
      {activeSubTab === 'broadcast_center' && (
        <div className="space-y-6">
          {/* Create Broadcast Box */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 space-y-4 shadow-2xs">
            <h3 className="font-extrabold text-sm sm:text-base text-stone-900 flex items-center gap-2">
              <Radio className="w-4 h-4 text-purple-600" />
              <span>發布系統級主動推播（全站主題擴散）</span>
            </h3>

            {broadcastSuccessNotice && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{broadcastSuccessNotice}</span>
              </div>
            )}

            <form onSubmit={handleCreateBroadcast} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-stone-800 block mb-1">目標受眾範圍</label>
                  <input
                    type="text"
                    value={newBroadcastAudience}
                    onChange={(e) => setNewBroadcastAudience(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-stone-300 text-xs bg-stone-50 focus:bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-purple-300"
                    placeholder="如：關注『跨境電商』全體提問者"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-800 block mb-1">觸發事件說明</label>
                  <input
                    type="text"
                    value={newBroadcastEvent}
                    onChange={(e) => setNewBroadcastEvent(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-stone-300 text-xs bg-stone-50 focus:bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-purple-300"
                    placeholder="如：主題看板新增大師方案解題"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-800 block mb-1">推播內容文案</label>
                <textarea
                  rows={2}
                  value={newBroadcastContent}
                  onChange={(e) => setNewBroadcastContent(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-300 text-xs bg-stone-50 focus:bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-purple-300"
                  placeholder="輸入推播給使用者的文案"
                  required
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>立即發送此系統推播</span>
                </button>
              </div>
            </form>
          </div>

          {/* Broadcast History */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-xs sm:text-sm text-stone-800">全站系統推播排程與記錄</h4>
            {broadcastList.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-xl bg-white border border-stone-200 flex items-center justify-between gap-4 shadow-2xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-100 text-purple-900">
                      受眾：{item.targetAudience}
                    </span>
                    <span className="text-[10px] text-stone-400">觸發：{item.triggerEvent}</span>
                  </div>
                  <p className="text-xs text-stone-800 font-medium">「{item.content}」</p>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full block">
                    已派送
                  </span>
                  <span className="text-[10px] text-stone-400 mt-1 block">點擊量：{item.clicksCount || 0} 次</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
