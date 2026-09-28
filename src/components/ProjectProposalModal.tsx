import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Download,
  Printer,
  FileText,
  Sparkles,
  Layers,
  Coins,
  ShieldCheck,
  Video,
  FileSpreadsheet,
  Calendar,
  Lock,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  Share2,
} from 'lucide-react';
import { IdeaXLogo } from './IdeaXLogo';
import {
  PROPOSAL_VERSION,
  PROPOSAL_UPDATED_AT,
  FULL_PROPOSAL_MARKDOWN,
  downloadProposalMarkdown,
  printProposalDocument,
} from '../services/proposalService';

interface ProjectProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProjectProposalModal: React.FC<ProjectProposalModalProps> = ({ isOpen, onClose }) => {
  const [activeSection, setActiveSection] = useState<'overview' | 'levels' | 'trading' | 'subscription' | 'roadmap' | 'raw_markdown'>('overview');

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-stone-950/75 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-stone-200 flex flex-col max-h-[92vh] overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-stone-200 bg-stone-50/90 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-stone-950 flex items-center justify-center shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-stone-900 text-lg sm:text-xl tracking-tight">
                  創點子 IdeaX 商業企劃書暨全系統規格書
                </h3>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                  {PROPOSAL_VERSION}
                </span>
              </div>
              <p className="text-xs text-stone-500">
                完整系統架構、商業模式、五級定價、交易閉環、抽成訂閱與運營 Roadmap
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Download .md Button */}
            <button
              onClick={downloadProposalMarkdown}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-stone-950 font-bold text-xs shadow-xs transition-all cursor-pointer"
              title="下載完整 Markdown 格式企劃書檔案 (.md)"
            >
              <Download className="w-4 h-4" />
              <span>下載企劃書 (.md)</span>
            </button>

            {/* Print / Save as PDF */}
            <button
              onClick={printProposalDocument}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-stone-100 text-stone-700 font-semibold text-xs border border-stone-200 shadow-2xs transition-all cursor-pointer"
              title="列印或另存為 PDF"
            >
              <Printer className="w-4 h-4 text-stone-600" />
              <span className="hidden sm:inline">列印 / 轉存 PDF</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 rounded-xl transition-colors cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Section Tabs */}
        <div className="px-6 py-2.5 bg-stone-100/70 border-b border-stone-200 flex items-center gap-2 overflow-x-auto text-xs font-bold scrollbar-none shrink-0">
          <button
            onClick={() => setActiveSection('overview')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              activeSection === 'overview'
                ? 'bg-white text-stone-900 shadow-2xs border border-stone-200'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            📋 摘要與願景定位
          </button>
          <button
            onClick={() => setActiveSection('levels')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              activeSection === 'levels'
                ? 'bg-white text-stone-900 shadow-2xs border border-stone-200'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            🎯 五級問題體系 (L0~L4)
          </button>
          <button
            onClick={() => setActiveSection('trading')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              activeSection === 'trading'
                ? 'bg-white text-stone-900 shadow-2xs border border-stone-200'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            ⚖️ 雙軌交易與交付閉環
          </button>
          <button
            onClick={() => setActiveSection('subscription')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              activeSection === 'subscription'
                ? 'bg-white text-stone-900 shadow-2xs border border-stone-200'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            💰 平台抽成與階梯訂閱
          </button>
          <button
            onClick={() => setActiveSection('roadmap')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              activeSection === 'roadmap'
                ? 'bg-white text-stone-900 shadow-2xs border border-stone-200'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            🚀 運營Roadmap與財務預測
          </button>
          <button
            onClick={() => setActiveSection('raw_markdown')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              activeSection === 'raw_markdown'
                ? 'bg-white text-stone-900 shadow-2xs border border-stone-200'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            📄 Markdown 完整源碼
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-stone-700 leading-relaxed max-h-[calc(92vh-130px)]">
          {activeSection === 'overview' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Cover Banner */}
              <div className="p-6 rounded-3xl bg-gradient-to-br from-stone-900 via-stone-800 to-amber-950 text-white space-y-3 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black tracking-widest text-amber-400 uppercase">
                    Official Business Plan & System Specification
                  </span>
                  <span className="text-xs text-stone-400">{PROPOSAL_UPDATED_AT}</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  創點子 IdeaX — 商業企劃書暨全系統規格說明書
                </h1>
                <p className="text-amber-100/90 text-sm max-w-2xl leading-relaxed">
                  Ideas Connect Possibilities ｜ 讓想法發光・高價值問題與解決方案交易市場。
                  連結企業痛點與跨領域專家智慧，建立公平透明、可持續變現的智慧財產交易新經濟體。
                </p>
                <div className="pt-2 flex flex-wrap gap-2 text-xs">
                  <span className="px-3 py-1 rounded-full bg-white/10 text-stone-200 border border-white/15">
                    五級問題分級 (L0~L4)
                  </span>
                  <span className="px-3 py-1 rounded-full bg-white/10 text-stone-200 border border-white/15">
                    雙軌交易 (懸賞託管 + 付費解鎖 Paywall)
                  </span>
                  <span className="px-3 py-1 rounded-full bg-white/10 text-stone-200 border border-white/15">
                    線上會談與附件交付
                  </span>
                  <span className="px-3 py-1 rounded-full bg-white/10 text-stone-200 border border-white/15">
                    月退階梯訂閱降抽成 (5%~20%)
                  </span>
                  <span className="px-3 py-1 rounded-full bg-amber-400 text-stone-950 font-bold">
                    餘額 $\ge$ 賞金 100% 門檻
                  </span>
                </div>
              </div>

              {/* 三大價值定位 Card Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl bg-amber-50/50 border border-amber-200 space-y-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500 text-stone-950 font-black flex items-center justify-center text-sm">
                    1
                  </div>
                  <h4 className="font-bold text-base text-stone-900">對提問者：直擊要害</h4>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    以懸賞機制激勵專家深度思考，第三方託管保證资金安全，採納前絕不扣款；同時支援線上視訊會談與檔案附件直接落地。
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-blue-50/50 border border-blue-200 space-y-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-500 text-white font-black flex items-center justify-center text-sm">
                    2
                  </div>
                  <h4 className="font-bold text-base text-stone-900">對解答者：智財變現</h4>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    專業知識不再被白嫖，提供免費預覽 + 付費解鎖雙層保護；支援多重解鎖帶來長尾收益，搭配階梯訂閱享受最低 5% 實質抽成。
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-stone-900 text-white border border-stone-800 space-y-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-400 text-stone-950 font-black flex items-center justify-center text-sm">
                    3
                  </div>
                  <h4 className="font-bold text-base text-white">對平台：閉環健康增長</h4>
                  <p className="text-xs text-stone-300 leading-relaxed">
                    雙軌交易佣金 + 經常性會員訂閱月費 (MRR) + AI 智能結構化分析賦能，構建高壁壘與高黏著度的專業智庫生態。
                  </p>
                </div>
              </div>

              {/* 痛點與現狀比較表 */}
              <div className="space-y-3">
                <h4 className="font-extrabold text-base text-stone-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-amber-600" />
                  <span>市場現狀與 IdeaX 創新架構對比</span>
                </h4>
                <div className="overflow-x-auto rounded-2xl border border-stone-200">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-stone-100/80 text-stone-800 font-bold border-b border-stone-200">
                      <tr>
                        <th className="p-3">比較維度</th>
                        <th className="p-3">傳統論壇 (PTT/知乎/Dcard)</th>
                        <th className="p-3">傳統管理顧問與律師事務所</th>
                        <th className="p-3 bg-amber-50/80 text-amber-950">創點子 IdeaX 解決方案</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200">
                      <tr>
                        <td className="p-3 font-bold text-stone-900">激勵體系</td>
                        <td className="p-3 text-stone-600">無金錢回饋，灌水與情緒宣洩居多</td>
                        <td className="p-3 text-stone-600">費用極高（單案數十萬起跳）</td>
                        <td className="p-3 bg-amber-50/40 font-bold text-amber-900">五級精準標價 (L0~L4)，小額至資深顧問皆有解</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold text-stone-900">解答責任</td>
                        <td className="p-3 text-stone-600">隨意回覆，無人對執行結果負責</td>
                        <td className="p-3 text-stone-600">週期冗長，溝通層級繁瑣</td>
                        <td className="p-3 bg-amber-50/40 font-bold text-amber-900">精華預覽 + 付費解鎖，滿意才採納給予聲望</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold text-stone-900">交付方式</td>
                        <td className="p-3 text-stone-600">僅純文字留言板</td>
                        <td className="p-3 text-stone-600">繁重紙本或排程正式開會</td>
                        <td className="p-3 bg-amber-50/40 font-bold text-amber-900">落地方案報告 + 50MB附件 + 線上會議多元組合</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold text-stone-900">金流安全</td>
                        <td className="p-3 text-stone-600">易生私下轉帳糾紛與詐騙</td>
                        <td className="p-3 text-stone-600">繁複合約與保證金流程</td>
                        <td className="p-3 bg-amber-50/40 font-bold text-amber-900">第三方安全託管中，採納後扣款，無解可退</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'levels' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-lg text-stone-900">五級問題分級體系（L0 ~ L4）</h4>
                  <p className="text-xs text-stone-500">標準化定價刻度，消除雙邊在定價上的心理阻力</p>
                </div>
                <span className="text-xs font-bold text-amber-800 bg-amber-100 px-3 py-1 rounded-full border border-amber-300">
                  全站五級定價標準
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  {
                    lvl: 'L0',
                    name: '無賞金問題',
                    price: 'NT$ 0',
                    desc: '完全公開的社群交流與經驗碰撞，適合開放性回饋、痛點收集與跨領域腦力激盪。',
                    scene: '大眾社群參與、日常閒聊探討',
                    badge: 'bg-stone-100 text-stone-700 border-stone-200',
                  },
                  {
                    lvl: 'L1',
                    name: '小額懸賞',
                    price: 'NT$ 100 ~ 300',
                    desc: '快速痛點診斷、工具技術推薦或數據查核，給予解答者實質激勵回饋。',
                    scene: '實務建議、日常小疑問、小工具推薦',
                    badge: 'bg-amber-50 text-amber-800 border-amber-200',
                  },
                  {
                    lvl: 'L2',
                    name: '進階懸賞',
                    price: 'NT$ 301 ~ 899',
                    desc: '深度商業架構設計、新創冷啟動、單元經濟學拆解與增長策略規劃。',
                    scene: '商業架構初審、產品冷啟動、單元經濟模型',
                    badge: 'bg-amber-100 text-amber-900 border-amber-300 font-bold',
                  },
                  {
                    lvl: 'L3',
                    name: '高價值挑戰',
                    price: 'NT$ 900 ~ 2,999',
                    desc: '跨領域技術突破、深度顧問方案、智財專利法務或客製化落地報告。',
                    scene: '智財專利防禦、關鍵合約草擬、醫療器材法規',
                    badge: 'bg-amber-500 text-stone-950 border-amber-600 font-black',
                  },
                  {
                    lvl: 'L4',
                    name: '資深顧問級',
                    price: 'NT$ 3,000 以上',
                    desc: '核心技術架構、高階商務談判、產業併購或關鍵專利規避深度攻防。',
                    scene: '百萬併發微服務、關鍵商務轉折、深度攻防',
                    badge: 'bg-gradient-to-r from-amber-600 to-amber-700 text-white border-amber-800 font-bold',
                  },
                ].map((item) => (
                  <div
                    key={item.lvl}
                    className="p-5 rounded-2xl bg-white border border-stone-200 hover:border-amber-400 transition-all space-y-3 flex flex-col justify-between shadow-2xs"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-lg text-stone-900">{item.lvl}</span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-md border ${item.badge}`}>
                            {item.name}
                          </span>
                        </div>
                        <span className="text-xs font-black text-amber-700 font-mono bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                          {item.price}
                        </span>
                      </div>
                      <p className="text-xs text-stone-600 leading-relaxed">{item.desc}</p>
                    </div>

                    <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-100 text-xs">
                      <span className="font-bold text-stone-900">典型場景：</span>
                      <span className="text-stone-600 ml-1">{item.scene}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === 'trading' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="space-y-1">
                <h4 className="font-extrabold text-lg text-stone-900">雙軌交易機制與交付閉環</h4>
                <p className="text-xs text-stone-500">
                  懸賞金託管 + 付費解鎖 (Paywall) + 私聊自訂方案 + 多元交付形式
                </p>
              </div>

              {/* 雙軌機制 Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-3">
                  <div className="flex items-center gap-2 font-bold text-base text-stone-900">
                    <Coins className="w-5 h-5 text-amber-600" />
                    <span>軌道一：懸賞金託管與採納結算</span>
                  </div>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    提問者發布時，錢包可用餘額必須 <strong>$\ge$ 賞金 100%</strong>。發布後款項進入平台第三方安全託管池。提問者可在滿意的方案下方點擊「綠色勾勾確認採納」，系統自動扣除平台費率後，淨額即時存入解答者餘額。
                  </p>
                  <div className="p-2.5 rounded-xl bg-white border border-amber-200 text-xs text-amber-950 font-medium space-y-1">
                    <div>🔒 提問端提示：<strong>「第三方安全託管中・將於採納方案後扣款」</strong></div>
                    <div>💰 解答端提示：<strong>「已扣除平台費率・完成方案即存入帳戶餘額」</strong></div>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
                  <div className="flex items-center gap-2 font-bold text-base text-stone-900">
                    <Lock className="w-5 h-5 text-stone-800" />
                    <span>軌道二：付費深度方案解鎖 (Paywall)</span>
                  </div>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    解答者提交時拆分為「公開免費預覽」與「付費解鎖內容」。全站任何有相同痛點的用戶，皆可付費解鎖。一次產出、多次銷售，為專家帶來被動長尾收入。
                  </p>
                  <div className="p-2.5 rounded-xl bg-white border border-stone-200 text-xs text-stone-700 font-medium space-y-1">
                    <div>✨ <strong>雙邊採納率連動</strong>：問題勾選採納與私聊交易採納均 100% 同步計入採納率指標。</div>
                  </div>
                </div>
              </div>

              {/* 三大交付維度 */}
              <div className="p-5 rounded-2xl bg-white border border-stone-200 space-y-3">
                <h5 className="font-bold text-sm text-stone-900">方案多元交付體系 (Delivery Formats)</h5>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 text-xs space-y-1.5">
                    <div className="font-bold text-stone-900 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-amber-600" />
                      <span>文字建議</span>
                    </div>
                    <p className="text-stone-500">
                      深度策略報告、架構圖解剖析、落地方案與各步驟排查指標。
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 text-xs space-y-1.5">
                    <div className="font-bold text-stone-900 flex items-center gap-1.5">
                      <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                      <span>落地方案附件</span>
                    </div>
                    <p className="text-stone-500">
                      支援 PDF、Excel 財務模型、合約條款範本、程式碼壓縮檔（最多 3 個檔案，總容量 ≤ 15MB）。
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 text-xs space-y-1.5">
                    <div className="font-bold text-stone-900 flex items-center gap-1.5">
                      <Video className="w-4 h-4 text-purple-600" />
                      <span>線上會談預約</span>
                    </div>
                    <p className="text-stone-500">
                      包含會談時長 (30/60分鐘)、平台 (Meet/Zoom/Teams/LINE)、預約時段與諮詢大綱。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'subscription' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="space-y-1">
                <h4 className="font-extrabold text-lg text-stone-900">
                  平台抽成體系與階梯會員訂閱（月退返還制）
                </h4>
                <p className="text-xs text-stone-500">
                  基準抽成 25%，訂閱會員每月底自動返還 5% ~ 20%，實質抽成低至 5%
                </p>
              </div>

              {/* 訂閱表格 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  {
                    tier: '一般會員',
                    price: '免費使用',
                    rebate: '無減免',
                    effective: '10%',
                    takeHome: '90%',
                    badge: 'bg-stone-100 text-stone-800 border-stone-200',
                    features: ['標準 10% 服務費', '全站自由發問與解答提案', '第三方安全託管拆款'],
                  },
                  {
                    tier: '達人方案',
                    price: '6 個月 $1,499 ($249/月)',
                    rebate: '減免 5%',
                    effective: '5%',
                    takeHome: '95%',
                    badge: 'bg-blue-50 text-blue-800 border-blue-200 font-bold',
                    features: ['服務費直接半價 5%', 'AI 初步分析報告免費 50 次', 'AI 提案架構一鍵整理'],
                  },
                  {
                    tier: '權威方案',
                    price: 'NT$ 1,490 / 月',
                    rebate: '減免 10% (免服務費)',
                    effective: '0%',
                    takeHome: '100%',
                    badge: 'bg-purple-600 text-white border-purple-700 font-bold',
                    features: ['0% 免平台服務費', '款項 100% 全額入帳', '高價值商業案件優先推薦'],
                  },
                  {
                    tier: '大師方案',
                    price: 'NT$ 3,990 / 月',
                    rebate: '免服務費 + 2% 紅利',
                    effective: '+2% BONUS',
                    takeHome: '102%',
                    badge: 'bg-gradient-to-r from-amber-500 to-orange-500 text-stone-950 font-black',
                    features: ['免服務費 + 2% 紅利回饋', 'AI-CRM 客戶關係管理系統', '主題看板專屬主動推播'],
                  },
                ].map((plan) => (
                  <div
                    key={plan.tier}
                    className="p-4 rounded-2xl bg-white border border-stone-200 hover:border-amber-400 transition-all flex flex-col justify-between space-y-3 shadow-2xs"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${plan.badge}`}>
                          {plan.tier}
                        </span>
                      </div>
                      <div className="text-base font-black text-stone-900 font-mono">{plan.price}</div>
                      <div className="mt-2 text-xs space-y-1">
                        <div className="text-stone-500">
                          月底返還：<span className="font-bold text-emerald-600">{plan.rebate}</span>
                        </div>
                        <div className="text-stone-500">
                          實質抽成：<span className="font-bold text-amber-700">{plan.effective}</span>
                        </div>
                        <div className="text-xs font-bold text-stone-900 bg-stone-50 p-1.5 rounded-lg border border-stone-100">
                          專家實拿：<span className="text-emerald-700">{plan.takeHome}</span>
                        </div>
                      </div>
                    </div>

                    <ul className="text-[11px] text-stone-600 space-y-1 pt-2 border-t border-stone-100">
                      {plan.features.map((f, idx) => (
                        <li key={idx} className="flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === 'roadmap' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="space-y-1">
                <h4 className="font-extrabold text-lg text-stone-900">正式營運落地 Roadmap 與財務預測</h4>
                <p className="text-xs text-stone-500">
                  前端閉環 100% 完成，後續四階段基礎設施串接與三年財務預估
                </p>
              </div>

              {/* 四階段 Roadmap */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
                  <div className="font-bold text-stone-900 text-sm flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-amber-500 text-stone-950 flex items-center justify-center text-xs font-black">
                      1
                    </span>
                    <span>使用者真實認證 (Authentication)</span>
                  </div>
                  <p className="text-xs text-stone-600">
                    串接 Google OAuth、LINE 快速登入及台灣在地簡訊 OTP（Twilio/三竹），防止惡意虛假帳號。
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
                  <div className="font-bold text-stone-900 text-sm flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-amber-500 text-stone-950 flex items-center justify-center text-xs font-black">
                      2
                    </span>
                    <span>台灣合規第三方金流與發票</span>
                  </div>
                  <p className="text-xs text-stone-600">
                    對接藍新金流 (NewebPay) / 綠界 (ECPay)，支援信用卡、ATM 虛擬帳號與超商繳費，並開立電子發票（含 B2B 統編）。
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
                  <div className="font-bold text-stone-900 text-sm flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-amber-500 text-stone-950 flex items-center justify-center text-xs font-black">
                      3
                    </span>
                    <span>安全雲端儲存 (Cloud Storage)</span>
                  </div>
                  <p className="text-xs text-stone-600">
                    串接 AWS S3 / Google Cloud Storage，支援 50MB 交付檔案的加密儲存與安全時效性下載連結。
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
                  <div className="font-bold text-stone-900 text-sm flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-amber-500 text-stone-950 flex items-center justify-center text-xs font-black">
                      4
                    </span>
                    <span>多管道即時推播 (Notifications)</span>
                  </div>
                  <p className="text-xs text-stone-600">
                    串接 SendGrid Email 與 LINE 官方帳號 API，當問題被回答、被採納或收到私聊訊息時即時發送提醒。
                  </p>
                </div>
              </div>

              {/* 三年財務預估表 */}
              <div className="space-y-2">
                <h5 className="font-bold text-sm text-stone-900 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-amber-600" />
                  <span>三年營運規模與財務預估模型 (NT$)</span>
                </h5>
                <div className="overflow-x-auto rounded-2xl border border-stone-200">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-stone-100 text-stone-800 font-bold border-b border-stone-200">
                      <tr>
                        <th className="p-3">指標維度</th>
                        <th className="p-3">第一年 (Year 1)</th>
                        <th className="p-3">第二年 (Year 2)</th>
                        <th className="p-3">第三年 (Year 3)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200">
                      <tr>
                        <td className="p-3 font-bold text-stone-900">總註冊會員數</td>
                        <td className="p-3 text-stone-700">25,000 人</td>
                        <td className="p-3 text-stone-700">120,000 人</td>
                        <td className="p-3 text-stone-700">450,000 人</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold text-stone-900">認證專家數</td>
                        <td className="p-3 text-stone-700">1,200 位</td>
                        <td className="p-3 text-stone-700">6,000 位</td>
                        <td className="p-3 text-stone-700">22,000 位</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold text-stone-900">年 GMV 總交易流水</td>
                        <td className="p-3 font-bold text-amber-800">NT$ 18,500,000</td>
                        <td className="p-3 font-bold text-amber-800">NT$ 115,000,000</td>
                        <td className="p-3 font-bold text-amber-800">NT$ 580,000,000</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold text-stone-900">年度總營業收入</td>
                        <td className="p-3 font-black text-emerald-700">NT$ 4,180,000</td>
                        <td className="p-3 font-black text-emerald-700">NT$ 25,500,000</td>
                        <td className="p-3 font-black text-emerald-700">NT$ 125,900,000</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'raw_markdown' && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-stone-500">FULL_PROPOSAL_MARKDOWN (UTF-8)</span>
                <button
                  onClick={downloadProposalMarkdown}
                  className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 hover:text-amber-800 underline cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>下載此 .md 檔案</span>
                </button>
              </div>
              <pre className="p-4 rounded-2xl bg-stone-950 text-stone-200 text-xs font-mono overflow-x-auto max-h-[450px] leading-relaxed select-all">
                {FULL_PROPOSAL_MARKDOWN}
              </pre>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-stone-200 bg-stone-50 flex items-center justify-between shrink-0 text-xs">
          <div className="text-stone-500">
            檔案格式：標準 Markdown (.md) ｜ 可直接匯入 Notion、Word 或轉為 PDF
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={downloadProposalMarkdown}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              <span>立即下載企劃書 (.md)</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white hover:bg-stone-100 text-stone-700 font-semibold border border-stone-200 transition-colors cursor-pointer"
            >
              關閉
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
};
