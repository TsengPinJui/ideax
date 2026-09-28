import React, { useState } from 'react';
import {
  HelpCircle,
  Building2,
  Settings2,
  MessageSquare,
  Award,
  ShieldCheck,
  CheckCircle2,
  ArrowLeft,
  Sparkles,
  Scale,
  Headphones,
  Eye,
  Layers,
  ShieldAlert,
  ArrowUpRight,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export interface PlatformRolesSpectrumViewProps {
  showBackToList?: boolean;
  onBack?: () => void;
  compact?: boolean;
  onOpenCommunityGuidelines?: () => void;
}

export type ZoneType = 'left' | 'center' | 'right' | 'all';

export interface RoleNode {
  id: string;
  positionIndex: number;
  zone: 'left' | 'center' | 'right';
  zoneTitle: string;
  zoneShort: string;
  name: string;
  nameEn: string;
  roleType: string;
  badgeClass: string;
  dotColor: string;
  activeRing: string;
  lineAccent: string;
  icon: any;
  tagline: string;
  coreDefinition: string;
  keyPowers: string[];
  financialAndLegal: string[];
  communityRules: string[];
  actionButton?: {
    text: string;
    onClick: () => void;
  };
}

export const PlatformRolesSpectrumView: React.FC<PlatformRolesSpectrumViewProps> = ({
  showBackToList = false,
  onBack,
  compact = false,
  onOpenCommunityGuidelines,
}) => {
  const { openCustomerService, openAboutModal } = useApp();

  // 預設選中左側企業機構
  const [selectedRoleId, setSelectedRoleId] = useState<string>('enterprise');
  const [activeZone, setActiveZone] = useState<ZoneType>('all');

  const handleOpenGuidelines = () => {
    if (onOpenCommunityGuidelines) {
      onOpenCommunityGuidelines();
    } else {
      openAboutModal('community_guidelines');
    }
  };

  // 七大節點順序：企業機構 ➔ 提問者 ➔ 一般討論 ➔ 平台管理 ➔ 一般討論 ➔ 解答者 ➔ 認證專家
  const SPECTRUM_NODES: RoleNode[] = [
    {
      id: 'enterprise',
      positionIndex: 1,
      zone: 'left',
      zoneShort: '提問端',
      zoneTitle: '提問、需求、委託方',
      name: '企業機構',
      nameEn: 'Enterprise',
      roleType: '法人組織',
      badgeClass: 'bg-indigo-100 text-indigo-900 border-indigo-300',
      dotColor: 'bg-indigo-600',
      activeRing: 'ring-indigo-500 border-indigo-400',
      lineAccent: 'border-indigo-300 bg-indigo-50/70 text-indigo-950',
      icon: Building2,
      tagline: '統編報帳・成員協作・客製方案・簽訂 NDA・延攬人才',
      coreDefinition:
        '須統編報帳、成員協作、客製方案、簽訂保密協議 (NDA)、延攬人才、專屬客服服務的中大企業與新創團隊。歡迎聯絡本平台諮詢對接。',
      keyPowers: [
        '法人統一編號發票開立與合規報帳核銷',
        '團隊多成員子帳號協同發問與方案共審',
        '發布 L4 企業級深度專案與客製里程碑交付',
        '簽署正式企業 NDA，延攬各界實戰顧問人才',
      ],
      financialAndLegal: [
        '金流：支援合約對公匯款與月結採購單',
        '保障：客製 NDA 保密條款與成果排他商用授權',
        '服務：專屬客服窗口與一對一智庫對接',
      ],
      communityRules: [
        '恪遵 NDA 商業保密與智財授權約定，未經授權不得外洩提案方未採納之商業機密與代碼架構。',
        '嚴禁假藉大型專案招標名義惡意套取專家之免費諮詢顧問方案。',
        '如實提供企業統一編號資訊，方案經驗收核可後依約履行對公款項與發票核銷程序。',
      ],
      actionButton: {
        text: '聯絡企業諮詢對接',
        onClick: () =>
          openCustomerService({
            title: '企業機構專屬服務諮詢',
            initialMessage:
              '您好，我們是企業/機構團隊，想諮詢統編報帳、成員協作、客製方案、NDA簽訂與專屬客服服務。',
          }),
      },
    },
    {
      id: 'questioner',
      positionIndex: 2,
      zone: 'left',
      zoneShort: '提問端',
      zoneTitle: '提問、需求、委託方',
      name: '提問者',
      nameEn: 'Questioner',
      roleType: '發案需求方',
      badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
      dotColor: 'bg-amber-500',
      activeRing: 'ring-amber-500 border-amber-400',
      lineAccent: 'border-amber-300 bg-amber-50/70 text-amber-950',
      icon: HelpCircle,
      tagline: '發布付費懸賞與免費提痛點，精準對接實戰解法',
      coreDefinition:
        '發布付費懸賞問題（L1 ~ L4）或 NT$ 0 元免費提出痛點之發案需求方。享有第三方支付資金託管、採納驗收放款與落地成果商業實施授權。',
      keyPowers: [
        '發布分級懸賞問題（L1~L4）與 NT$ 0 元痛點免費提出',
        '自訂交付形式（付費文字、檔案交付、一對一線上會談）',
        '審閱方案、確認採納驗收與評分回饋',
        '未採納懸賞點數 100% 原路返還',
      ],
      financialAndLegal: [
        '金流：發布時系統保留懸賞點數，採納驗收後安全撥款，未採納全額退回',
        '智財：方案經採納付費即視為授權，合法取得全球永久商用與改作權',
        '隱私：可關閉職稱與個人簡介顯示，保護商業機密',
      ],
      communityRules: [
        '真實誠懇描述問題痛點與驗收期待，禁止發布虛假、釣魚或含有違禁法規之內容。',
        '尊重解答者智力勞動成果，於方案提交後及時進行檢閱、驗收確認或給予客觀反饋。',
        '未正式採納或完成解鎖前，嚴禁私自截圖抄襲、外洩或商業實施解答者之未公開方案。',
      ],
    },
    {
      id: 'discussion_asker',
      positionIndex: 3,
      zone: 'left',
      zoneShort: '提問端',
      zoneTitle: '提問、需求、委託方',
      name: '一般討論',
      nameEn: 'Discussion (Needs)',
      roleType: '需求交流',
      badgeClass: 'bg-amber-50 text-amber-900 border-amber-200',
      dotColor: 'bg-amber-600',
      activeRing: 'ring-amber-400 border-amber-300',
      lineAccent: 'border-amber-200 bg-amber-50/50 text-amber-900',
      icon: MessageSquare,
      tagline: '發案前交流探索，釐清問題核心與初步思路',
      coreDefinition:
        '於發問前或痛點交流區自由參與經驗探討、提問諮詢與社群互動，藉由初步對話釐清核心需求。',
      keyPowers: [
        '發布付費問題前與社群進行非正式交流，精準定位痛點',
        '於問題下方留言互動、補充背景資訊與延伸討論',
        '收藏問題與思路，追蹤後續破局進展',
      ],
      financialAndLegal: [
        '費用：零門檻、免費用，不涉及扣款或合約拘束',
        '效益：透過群體智慧過濾基礎疑問，提升正式懸賞效益',
      ],
      communityRules: [
        '保持理性友善與建設性溝通，禁止人身攻擊、歧視、恐嚇或騷擾性言論。',
        '嚴禁張貼垃圾廣告、未經核准之外部導流連結、詐騙推廣或惡意灌水洗版。',
        '尊重智慧財產權與個人隱私，引述他人資料應註明出處，勿張貼他人非公開個資。',
      ],
    },
    {
      id: 'platform_admin',
      positionIndex: 4,
      zone: 'center',
      zoneShort: '平台',
      zoneTitle: '媒合、認證、管理方',
      name: '平台管理',
      nameEn: 'Platform Management',
      roleType: '管理風控',
      badgeClass: 'bg-rose-100 text-rose-900 border-rose-300',
      dotColor: 'bg-rose-600',
      activeRing: 'ring-rose-500 border-rose-400',
      lineAccent: 'border-rose-300 bg-rose-50/70 text-rose-950',
      icon: Settings2,
      tagline: '專家實名 KYC 審核・異常交易風控・爭議中立仲裁',
      coreDefinition:
        '創點子 IdeaX 官方營運與風控仲裁團隊，負責系統維運、專家實名審核 (KYC)、金流風控監控、交易爭議調解仲裁與內容合規治理。',
      keyPowers: [
        '解答者與認證專家實名 KYC 審核與資歷核驗',
        '全天候金流風控監控與洗錢防制監理申報',
        '中立介入交易驗收爭議，依證據裁決放款或退還點數',
        '侵權檢舉快速下架 (Notice & Takedown) 與違禁治理',
      ],
      financialAndLegal: [
        '法規：遵循金管會第三方支付監理規範與洗錢防制法，落實價金保管與履約保障',
        '仲裁：7 日中立爭議調解機制，維護雙方公平權益',
        '資安：SSL 加密傳輸，敏感撥款資料雜湊防護',
      ],
      communityRules: [
        '恪守中立、客觀與公平原則，嚴格落實實名審查 (KYC) 與爭議調解仲裁，嚴禁圖利任何一方。',
        '落實個人資料保護與機密防護，除司法警察機關依法調閱外，絕不洩漏會員隱私。',
        '接獲侵權或違法通報時，恪遵法定程序迅速調查下架，維護全站合規秩序。',
      ],
    },
    {
      id: 'discussion_solver',
      positionIndex: 5,
      zone: 'right',
      zoneShort: '答題端',
      zoneTitle: '解答、提案、接案方',
      name: '一般討論',
      nameEn: 'Discussion (Insights)',
      roleType: '思路分享',
      badgeClass: 'bg-sky-50 text-sky-900 border-sky-200',
      dotColor: 'bg-sky-600',
      activeRing: 'ring-sky-400 border-sky-300',
      lineAccent: 'border-sky-200 bg-sky-50/50 text-sky-900',
      icon: MessageSquare,
      tagline: '分享破局思路與實戰見解，累積個人專業聲望',
      coreDefinition:
        '於問題討論區或 L0 專區自由分享實務觀點與經驗見解，藉由公開優質互動累積專業聲望與個人影響力。',
      keyPowers: [
        '於問題下方提供方向性思路建議，展現實作經驗',
        '參與 L0 閒聊激盪，跨領域交流破局技巧',
        '累積社群點讚與聲望值，為承接付費方案鋪路',
      ],
      financialAndLegal: [
        '守則：遵守社群內容管理規範，禁止廣告或抄襲',
        '聲望：優質發言提升個人信譽，吸引發案方主動委託',
      ],
      communityRules: [
        '分享真實實務經驗與具體建設性思路，杜絕空泛灌水或誤導性不實言論。',
        '嚴禁於公開討論區惡意貶損他人方案、從事不正當競爭或散播謠言。',
        '遵守社群自律公約，以互助與智慧啟發為核心，累積真實個人信譽與影響力。',
      ],
    },
    {
      id: 'solver',
      positionIndex: 6,
      zone: 'right',
      zoneShort: '答題端',
      zoneTitle: '解答、提案、接案方',
      name: '解答者',
      nameEn: 'Solver',
      roleType: '方案提供方',
      badgeClass: 'bg-blue-100 text-blue-900 border-blue-300',
      dotColor: 'bg-blue-600',
      activeRing: 'ring-blue-500 border-blue-400',
      lineAccent: 'border-blue-300 bg-blue-50/70 text-blue-950',
      icon: Award,
      tagline: '提交付費落地方案，自訂解鎖金額並定期電匯撥款',
      coreDefinition:
        '任何在平台針對問題或痛點提交落地方案的回答方（包含認證專家與社群答題者），得提交文字、附件或線上諮詢，並爭取懸賞或自訂解鎖定價。',
      keyPowers: [
        '針對懸賞問題或痛點提交付費落地方案與原創成果',
        '支援多種交付形式：付費全文、檔案交付 (50MB)、線上會談',
        '痛點自訂解鎖金額，創造長期多元被動知識收益',
        '自由選訂會員方案，享手續費減免至 0% 甚至 +2% 補貼',
      ],
      financialAndLegal: [
        '金流：實名認證後，由第三方金流每週批次電匯至銀行帳戶',
        '授權：方案一旦被採納付費，即視為授權發案方落地商用與改作',
        '原創：保證交付成果原創合法，杜絕抄襲剽竊並負擔保責任',
      ],
      communityRules: [
        '保證交付成果 100% 合法原創，嚴禁抄襲剽竊他人作品、專利或未經授權之程式碼。',
        '如期如質完成約定之交付形式（檔案無損、線上會談準時上線），不得惡意拖延或失聯。',
        '恪遵「採納付費即視為授權」契約約定，不得事後干涉提問方合法商用或追加索取權利金。',
      ],
    },
    {
      id: 'certified_expert',
      positionIndex: 7,
      zone: 'right',
      zoneShort: '答題端',
      zoneTitle: '解答、提案、接案方',
      name: '認證專家',
      nameEn: 'Certified Expert',
      roleType: '官方專業認證',
      badgeClass: 'bg-emerald-100 text-emerald-950 border-emerald-300',
      dotColor: 'bg-emerald-600',
      activeRing: 'ring-emerald-500 border-emerald-400',
      lineAccent: 'border-emerald-300 bg-emerald-50/70 text-emerald-950',
      icon: ShieldCheck,
      tagline: '官方實名認證徽章・高階顧問專案・一對一預約諮詢',
      coreDefinition:
        '經過平台官方專業實名認證與資歷審查通過之提案者，具備認證標章與官方背書，可回答問題、承接高階落地方案及接受一對一預約諮詢。',
      keyPowers: [
        '全站公開展示官方「認證專家」徽章，彰顯專業信賴',
        '收錄於專家庫專屬卡片，享全站演算法優先曝光推薦',
        '承接企業級 L4 深度專案招標與客製里程碑交付',
        '開通一對一專屬線上顧問預約與高額自訂方案定價特權',
      ],
      financialAndLegal: [
        '尊榮：享有高額定價特權與專屬會員費率減免',
        '隱私：公開認證專業徽章，個人會員訂閱等級隱私保護',
        '客服：享有專屬客服優先處理與爭議審查通道',
      ],
      communityRules: [
        '恪守最高顧問職業倫理，誠實評估可行性，絕不誇大宣傳、虛構履歷或保證絕對投資獲利。',
        '一對一線上預約諮詢務必準時出席並全力解答，展現專業嚴謹之敬業態度。',
        '珍惜官方認證信譽，嚴禁私下誘導用戶繞過平台交割款項，維護整體智庫市集安全信賴。',
      ],
    },
  ];

  // 當前選中的角色
  const activeRole =
    SPECTRUM_NODES.find((r) => r.id === selectedRoleId) || SPECTRUM_NODES[0];

  const handleSelectZone = (zone: ZoneType) => {
    setActiveZone(zone);
    if (zone === 'left') {
      if (!['enterprise', 'questioner', 'discussion_asker'].includes(selectedRoleId)) {
        setSelectedRoleId('enterprise');
      }
    } else if (zone === 'center') {
      setSelectedRoleId('platform_admin');
    } else if (zone === 'right') {
      if (!['discussion_solver', 'solver', 'certified_expert'].includes(selectedRoleId)) {
        setSelectedRoleId('solver');
      }
    }
  };

  const handleSelectRole = (role: RoleNode) => {
    setSelectedRoleId(role.id);
    setActiveZone(role.zone);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      {/* 標題與分區切換 */}
      <div className="border-b border-stone-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-amber-600" />
              <span>說明四</span>
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-stone-900">
              平台用戶角色與社群
            </h2>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            點擊各角色節點或分區，即時在右側查看角色定位、核心權能與專屬社群守則。
          </p>
        </div>

        {/* 快捷分區切換 */}
        <div className="flex items-center gap-1 p-1 bg-stone-100 rounded-2xl border border-stone-200 self-start sm:self-center text-xs">
          <button
            type="button"
            onClick={() => handleSelectZone('all')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              activeZone === 'all'
                ? 'bg-white text-stone-900 shadow-2xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            全部
          </button>
          <button
            type="button"
            onClick={() => handleSelectZone('left')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              activeZone === 'left'
                ? 'bg-amber-500 text-stone-950 shadow-2xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            提問端
          </button>
          <button
            type="button"
            onClick={() => handleSelectZone('center')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              activeZone === 'center'
                ? 'bg-rose-600 text-white shadow-2xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            平台
          </button>
          <button
            type="button"
            onClick={() => handleSelectZone('right')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              activeZone === 'right'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            答題端
          </button>
        </div>
      </div>

      {/* 核心佈局：左側數線軸 + 右上角即時角色說明面板 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* 左側：橫向數線軸 (7 個節點) */}
        <div className="lg:col-span-7 space-y-3.5">
          <div className="p-4 sm:p-5 rounded-3xl bg-stone-900 text-white shadow-md border border-stone-800 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-800 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></div>
                <span className="text-xs font-black tracking-wider text-stone-300">
                  點擊角色 點亮/說明
                </span>
              </div>
              <span className="text-[11px] text-amber-300/90 font-mono font-bold">
                當前選中：{activeRole.name} (#{activeRole.positionIndex})
              </span>
            </div>

            {/* 提問端・平台・答題端 三大分區按鈕（點擊點亮對應角色） */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs font-bold">
              <button
                type="button"
                onClick={() => handleSelectZone('left')}
                className={`p-2.5 rounded-xl border transition-all text-left cursor-pointer ${
                  activeZone === 'left' || (activeZone === 'all' && activeRole.zone === 'left')
                    ? 'bg-amber-500/20 border-amber-400 text-amber-300 ring-1 ring-amber-400/50'
                    : 'bg-stone-800/60 border-stone-700 text-stone-400 hover:text-stone-200'
                }`}
              >
                <span className="text-[10px] font-mono text-amber-400 font-bold block">提問端</span>
                <span className="text-xs font-black block mt-0.5">提問、需求、委託方</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectZone('center')}
                className={`p-2.5 rounded-xl border transition-all text-center cursor-pointer ${
                  activeZone === 'center' || (activeZone === 'all' && activeRole.zone === 'center')
                    ? 'bg-rose-500/20 border-rose-400 text-rose-300 ring-1 ring-rose-400/50'
                    : 'bg-stone-800/60 border-stone-700 text-stone-400 hover:text-stone-200'
                }`}
              >
                <span className="text-[10px] font-mono text-rose-400 font-bold block">平台</span>
                <span className="text-xs font-black block mt-0.5">媒合、認證、管理方</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectZone('right')}
                className={`p-2.5 rounded-xl border transition-all text-right cursor-pointer ${
                  activeZone === 'right' || (activeZone === 'all' && activeRole.zone === 'right')
                    ? 'bg-blue-500/20 border-blue-400 text-blue-300 ring-1 ring-blue-400/50'
                    : 'bg-stone-800/60 border-stone-700 text-stone-400 hover:text-stone-200'
                }`}
              >
                <span className="text-[10px] font-mono text-blue-400 font-bold block">答題端</span>
                <span className="text-xs font-black block mt-0.5">解答、提案、接案方</span>
              </button>
            </div>

            {/* 橫向數線主軌道 */}
            <div className="relative py-6 px-1">
              <div className="absolute top-1/2 left-3 right-3 h-1.5 -translate-y-1/2 bg-gradient-to-r from-amber-500 via-rose-500 to-emerald-500 rounded-full opacity-80 shadow-inner"></div>

              {/* 7 個數線節點 */}
              <div className="relative grid grid-cols-7 gap-1 items-center">
                {SPECTRUM_NODES.map((role) => {
                  const isSelected = selectedRoleId === role.id;
                  const isZoneActive =
                    activeZone === 'all' || activeZone === role.zone;
                  const IconComp = role.icon;

                  return (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => handleSelectRole(role)}
                      className={`group relative flex flex-col items-center text-center transition-all p-1.5 rounded-2xl cursor-pointer ${
                        isSelected
                          ? 'bg-white/15 ring-2 ring-amber-400 scale-105 z-10'
                          : isZoneActive
                          ? 'hover:bg-white/10 hover:scale-102 opacity-100'
                          : 'opacity-35 hover:opacity-75'
                      }`}
                    >
                      <div
                        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center font-black text-xs shadow-md transition-all border-2 ${
                          isSelected
                            ? `${role.dotColor} text-white border-white scale-110 shadow-lg`
                            : isZoneActive
                            ? `${role.dotColor} text-white border-stone-800 group-hover:border-amber-300`
                            : 'bg-stone-800 text-stone-400 border-stone-700'
                        }`}
                      >
                        <IconComp className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                      </div>

                      <div className="mt-2 space-y-0.5 w-full">
                        <span className="text-[9px] font-mono font-bold text-stone-400 block">
                          #{role.positionIndex}
                        </span>
                        <span
                          className={`text-[11px] font-black block truncate transition-colors ${
                            isSelected
                              ? 'text-amber-300 font-extrabold'
                              : 'text-stone-200 group-hover:text-white'
                          }`}
                          title={role.name}
                        >
                          {role.name}
                        </span>
                        <span className="text-[8.5px] text-stone-400 block truncate scale-90 -mt-0.5">
                          {role.id === 'discussion_asker'
                            ? '需求端'
                            : role.id === 'discussion_solver'
                            ? '解答端'
                            : role.roleType.slice(0, 4)}
                        </span>
                      </div>

                      {isSelected && (
                        <div className="absolute -bottom-2 w-2 h-2 bg-amber-400 rotate-45"></div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 備註提示 */}
            <div className="p-2.5 bg-stone-950/80 rounded-2xl border border-stone-800/80 text-[11px] text-stone-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>
                <strong>雙軌切換</strong>：單一帳號可自由切換提問與接案身分，點擊上方角色即可查看詳細權責與專屬守則。
              </span>
            </div>
          </div>

          {/* 角色標籤快速點選 */}
          <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
            <span className="text-xs font-black text-stone-700 block flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-amber-600" />
              <span>快速點選切換角色：</span>
            </span>
            <div className="flex flex-wrap gap-1.5">
              {SPECTRUM_NODES.map((role) => {
                const isSelected = selectedRoleId === role.id;
                const IconComp = role.icon;
                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => handleSelectRole(role)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      isSelected
                        ? `${role.dotColor} text-white shadow-xs`
                        : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    <IconComp className="w-3.5 h-3.5" />
                    <span>
                      #{role.positionIndex} {role.name}
                      {role.id === 'discussion_asker'
                        ? '（需求）'
                        : role.id === 'discussion_solver'
                        ? '（解答）'
                        : ''}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 右上角：即時角色說明與守則面板 */}
        <div className="lg:col-span-5 lg:sticky lg:top-20 space-y-4 animate-in fade-in duration-200">
          <div
            className={`p-5 sm:p-6 rounded-3xl bg-white border-2 shadow-xs space-y-4 ${activeRole.activeRing}`}
          >
            {/* 角色頭部 */}
            <div className="flex items-start justify-between gap-3 border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div
                  className={`p-2.5 rounded-2xl ${activeRole.dotColor} text-white shadow-xs`}
                >
                  <activeRole.icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-mono font-bold text-stone-400">
                      #{activeRole.positionIndex}
                    </span>
                    <h3 className="text-base font-black text-stone-900">
                      {activeRole.name}
                    </h3>
                  </div>
                  <span className="text-[11px] font-mono text-stone-400 block">
                    {activeRole.nameEn}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span
                  className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${activeRole.badgeClass} block`}
                >
                  {activeRole.roleType}
                </span>
                <span className="text-[10px] font-bold text-stone-500 mt-0.5 block">
                  {activeRole.zoneShort}・{activeRole.zoneTitle}
                </span>
              </div>
            </div>

            {/* 定位標語 */}
            <div
              className={`p-2.5 rounded-xl border text-xs font-bold leading-relaxed ${activeRole.lineAccent}`}
            >
              {activeRole.tagline}
            </div>

            {/* 角色定義 */}
            <p className="text-xs text-stone-600 leading-relaxed bg-stone-50 p-2.5 rounded-xl border border-stone-100">
              {activeRole.coreDefinition}
            </p>

            {/* 核心權能 */}
            <div className="space-y-1.5">
              <span className="text-xs font-black text-stone-900 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>核心權能與交付：</span>
              </span>
              <ul className="space-y-1 text-xs text-stone-600 pl-1">
                {activeRole.keyPowers.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-emerald-500 font-bold">•</span>
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 金流與法規 */}
            <div className="space-y-1.5 pt-2 border-t border-stone-100">
              <span className="text-xs font-black text-stone-900 flex items-center gap-1">
                <Scale className="w-3.5 h-3.5 text-amber-600" />
                <span>金流與權益機制：</span>
              </span>
              <ul className="space-y-1 text-xs text-stone-500 pl-1">
                {activeRole.financialAndLegal.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-amber-500 font-bold">✓</span>
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 各角色專屬社群守則 */}
            <div className="space-y-2 pt-2.5 border-t border-stone-100 bg-amber-50/40 p-3 rounded-2xl border border-amber-200/60">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                  <span>【{activeRole.name}】專屬守則：</span>
                </span>
                <button
                  type="button"
                  onClick={handleOpenGuidelines}
                  className="text-[10.5px] font-black px-2 py-0.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-950 hover:text-amber-900 border border-amber-300 hover:border-amber-400 transition-all cursor-pointer flex items-center gap-1 shadow-2xs group active:scale-95"
                  title="點擊查閱完整［社群守則］與內容管理規範"
                >
                  <span>［社群守則］</span>
                  <ArrowUpRight className="w-3 h-3 text-amber-700 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </button>
              </div>
              <ul className="space-y-1.5 text-[11px] text-stone-700 pl-1">
                {activeRole.communityRules.map((rule, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-amber-600 font-bold">§{idx + 1}</span>
                    <span className="leading-relaxed">{rule}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 專屬按鈕 */}
            {activeRole.actionButton && (
              <div className="pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={activeRole.actionButton.onClick}
                  className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-98"
                >
                  <Headphones className="w-3.5 h-3.5" />
                  <span>{activeRole.actionButton.text}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 底部返回目錄按鈕 */}
      {showBackToList && onBack && (
        <div className="pt-2 flex justify-center">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-stone-900 text-white text-xs font-bold hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>返回其他說明目錄</span>
          </button>
        </div>
      )}
    </div>
  );
};
