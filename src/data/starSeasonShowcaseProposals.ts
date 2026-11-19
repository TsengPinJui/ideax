/**
 * 創星季「想解方」提案區的展示用提案：1 則官方提案範例（仿真帳號示範提案已移除）。
 *
 * - 只存在程式中，不寫入 competition_proposals，因此不會出現在審核後台、募資排名與決選名單。
 * - 「提案範例」在畫面上標示；仿真示範提案不另外標示。兩者都不能注資、按讚或留言，不影響真實參賽者。
 * - 引用的痛點皆為仿真帳號提出的痛點（q-vp-pain-*），不引用真實用戶的內容。
 * - 仿真示範提案的提案帳號為展示專用（u-sim-*），名稱採英文數字混合。
 */
import type { StarSeasonProposal } from '../types/competition';

export type ShowcaseKind = 'example' | 'simulated';

export type ShowcaseProposal = StarSeasonProposal & {
  isShowcase: true;
  showcaseKind: ShowcaseKind;
};

const CREATED_AT = '2026-11-14T10:00:00+08:00';

export const STAR_SEASON_SHOWCASE_PROPOSALS: ShowcaseProposal[] = [
  {
    id: 'showcase-example-dental-standby',
    isShowcase: true,
    showcaseKind: 'example',
    appName: '補位快',
    title: '補位快：牙醫大療程爽約的即時候補與訂金保留系統',
    stage: 'solution',
    track: 'biomedical',
    summary:
      '針對牙醫診所植牙、根管等大療程臨時爽約，造成整段診間與助理空轉的問題，「補位快」結合三件事：預約時收取可退的保留訂金、看診前 24 小時與 3 小時兩段式確認，以及依「可到院時間」排序的候補名單。病患一取消，系統立刻推播給 30 分鐘內能到的候補病患，先確認者補上空檔，目標是把大療程空轉時段降低一半。',
    description:
      '【這是一份提案範例】示範一份完整提案該寫哪些內容：先說清楚引用的痛點、解方怎麼運作、為什麼做得到、誰會買單、怎麼賺錢。正式提案請依自己的構想撰寫。\n\n' +
      '一、要解決的痛點\n引用痛點「牙醫診所自費植牙跟顯微根管常被臨時放鳥，留了一個半小時診間跟助理全空轉」。大療程需要事先保留 60～90 分鐘、備好器械，一旦病患在看診前才取消，櫃檯幾乎不可能臨時找到人補上。\n\n' +
      '二、解方怎麼運作\n1. 預約保留訂金：大療程預約時以線上支付收取小額訂金，準時到診全額折抵療程費；提前 24 小時取消全額退回；臨時爽約才不退。\n2. 兩段式確認：看診前 24 小時與 3 小時各推播一次，病患一鍵「確認／改期」，把爽約提早轉成「可預期的取消」。\n3. 智慧候補名單：病患登記候補時填寫「最快多久能到」，取消一發生就依到院時間與療程類型推播給合適的候補者，先按確認者取得時段。\n4. 櫃檯儀表板：即時顯示今日高風險時段（未完成確認的大療程），讓櫃檯提早準備替補。\n\n' +
      '三、預期成效\n以「大療程空轉時段減半」為驗證目標，並追蹤三個指標：爽約率、取消後被補上的比例、補位所需時間。',
    technicalFeasibility:
      '核心功能以現成服務組合即可完成：LINE 官方帳號推播與確認按鈕、線上金流的訂金預授權與退款、雲端資料庫管理預約與候補。第一步先以 1～2 家合作診所做 8 週試行，人工搭配試算表驗證流程，確認有效後再開發與診所預約系統串接的版本。主要難點在病患個資保護，規劃只存放預約所需的最少資料並設定存取權限。',
    marketAnalysis:
      '目標客群是有植牙、矯正、顯微根管等自費大療程的牙醫診所，其次是醫美、復健、寵物醫院等同樣需要長時段預約的院所。現有預約系統多數只有提醒功能，沒有「訂金＋候補即時補位」的組合；差異在於直接處理「臨時取消後補不上人」這一段。',
    businessModelFinancials:
      '採月訂閱制：基本方案每間診所每月固定費用，含推播確認與候補名單；進階方案加上訂金代收與數據報表，另收每筆訂金的小額手續費。成本主要是推播訊息費、金流手續費與雲端主機費。試行期免費換取成效數據與診所推薦，之後以「多補回的時段產值」說明訂閱價值。',
    sourcePainPointProposalId: 'q-vp-pain-14',
    sourcePainPointTitle: '牙醫診所自費植牙跟顯微根管常被臨時放鳥，留了一個半小時診間跟助理全空轉',
    tags: ['提案範例', '牙醫診所', '約診爽約', '候補補位'],
    authorId: 'ideax-showcase-official',
    authorName: 'IdeaX 創點子團隊',
    authorRole: 'enterprise',
    teamName: 'IdeaX 創點子團隊（提案範例）',
    proposalProgressStage: '初步構想',
    showCardImage: false,
    status: 'approved',
    supportPoints: 0,
    supporterCount: 0,
    likeCount: 0,
    commentsCount: 0,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
  },
];

export const isShowcaseProposal = (p: any): boolean =>
  Boolean(p && (p.isShowcase === true || (typeof p.id === 'string' && p.id.startsWith('showcase-'))));

export const isShowcaseExample = (p: any): boolean =>
  isShowcaseProposal(p) && p?.showcaseKind === 'example';

export const showcaseLabel = (p: any): string =>
  p?.showcaseKind === 'example' ? '提案範例' : '仿真示範';

/** 展示用提案不能注資、按讚、留言時的提示 */
export const SHOWCASE_BLOCK_MESSAGE = 'ℹ️ 此提案不參與募資與評選，無法注資、按讚或留言。';
