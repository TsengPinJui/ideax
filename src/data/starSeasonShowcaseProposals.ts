/**
 * 創星季「想解方」提案區的展示用提案：1 則官方提案範例 + 2 則仿真帳號示範提案。
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
  {
    id: 'showcase-sim-groupbuy-reconcile',
    isShowcase: true,
    showcaseKind: 'simulated',
    appName: '團帳通',
    title: '團帳通：社區 LINE 團購的自動喊單統計與轉帳對帳小幫手',
    stage: 'solution',
    track: 'ict',
    summary:
      '團媽在 LINE 記事本收「+1」、再一張張對網銀截圖末五碼，每週要花十幾個小時。「團帳通」把喊單改成 LINE 內的點選表單，自動彙整每戶品項與金額；鄰居轉帳後上傳截圖，系統辨識金額與末五碼並自動勾稽，改名也不會對錯人。團媽只需處理系統標出的少數異常，對帳時間目標縮短到原本的兩成以內。',
    description:
      '一、引用痛點\n「在社區 LINE 群開團購，每禮拜核對上百筆『+1』跟轉帳末五碼核到眼花」。真正的麻煩在於喊單、付款、領貨三份資料各自分散，只要有人改 LINE 名稱就對不起來。\n\n' +
      '二、解方\n1. 喊單表單：團媽貼出商品連結，鄰居在 LINE 內點選品項與數量，系統以「戶號＋固定代號」記錄，不受改名影響。\n2. 截圖對帳：鄰居上傳轉帳截圖，系統辨識金額與帳號末五碼，自動配對到訂單；金額不符或重複上傳會標成異常。\n3. 領貨清單：到貨時自動產生每戶取貨清單，領完一鍵打勾，未領的自動提醒。\n\n' +
      '三、使用情境\n團媽週一開團、週三截單，週四打開「異常清單」只處理三、五筆有問題的訂單，其餘全部自動對好。',
    technicalFeasibility:
      '以 No-Code 工具快速組合：LINE 官方帳號與 LIFF 表單收單、試算表當資料庫、OCR 服務辨識截圖金額與末五碼，再用自動化流程串起來。先找 3 個社區團購群試用 4 週，記錄辨識正確率與團媽實際節省的時間，再決定是否改寫成正式系統。',
    marketAnalysis:
      '目標是社區大樓團媽、小農直送與網購代購團主。現有團購工具多半偏向電商開店，功能多、上手門檻高；本方案只解決「收單＋對帳＋領貨」三件事，讓不熟電腦的團媽也能用。',
    businessModelFinancials:
      '免費版提供每月有限筆數訂單；團量大的團媽升級月費方案，解鎖不限筆數與截圖自動對帳。成本為 OCR 辨識費與推播費，依使用量計價，可隨訂閱收入同步成長。',
    sourcePainPointProposalId: 'q-vp-pain-11',
    sourcePainPointTitle: '在社區 LINE 群開團購，每禮拜核對上百筆「+1」跟轉帳末五碼核到眼花',
    tags: ['社群團購', '自動對帳', 'LINE', 'No-Code'],
    authorId: 'u-sim-autolab23',
    authorName: 'AutoLab23',
    authorRole: 'solver',
    teamName: 'AutoLab23',
    proposalProgressStage: '正在計畫',
    showCardImage: false,
    status: 'approved',
    supportPoints: 0,
    supporterCount: 0,
    likeCount: 0,
    commentsCount: 0,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
  },
  {
    id: 'showcase-sim-shared-power-split',
    isShowcase: true,
    showcaseKind: 'simulated',
    appName: '公電分得清',
    title: '公電分得清：合租公寓免改配電的插座計量與自動分帳',
    stage: 'solution',
    track: 'mechanical_transport',
    summary:
      '合租公寓的客廳冷氣、烘衣機算公共電費，平均分攤總讓少用的人吃虧。「公電分得清」在公共大電器的插座加裝可計量的智慧插座，使用前室友用手機掃碼「認領」這次使用，系統依實際用電度數與時段分帳，月底自動產生每人帳單。不用敲牆、不用改配電箱，房東與房客都看得到透明紀錄。',
    description:
      '一、引用痛點\n「合租公寓夏天台電帳單一來室友就吵架，客廳冷氣跟烘衣機的公電怎麼分才公平？」房間有獨立電表，但公共電器沒有，只能平攤。\n\n' +
      '二、解方\n1. 計量插座：在冷氣、烘衣機等公共大電器加裝可計量用電的智慧插座（大電流電器使用合規的專用計量開關）。\n2. 掃碼認領：使用前掃描電器上的 QR Code，選擇自己的房號，系統記錄這段時間的用電度數。\n3. 自動分帳：未認領的用電依室友約定的規則平攤，其餘依實際使用歸戶；月底把台電帳單金額依比例拆成每人帳單。\n4. 透明紀錄：每位房客都能查看自己的用電明細，房東後台可管理多間物件。\n\n' +
      '三、預期成效\n把「公電怎麼分」從吵架變成有數據可看的帳單，降低房東處理租客糾紛的時間。',
    technicalFeasibility:
      '計量插座與計量開關已有成熟的商用產品，可透過 Wi-Fi 回傳用電資料；系統端只需開發掃碼認領、用電歸戶與帳單計算。大電流電器的安裝須由合格水電人員施作並符合用電安全規範。先在 2～3 間合租公寓試裝一個夏季，比對分帳結果與台電帳單的差距。',
    marketAnalysis:
      '目標客群是管理多間合租物件的二房東、共生公寓業者，以及學生合租族群。現有做法多是平攤或房東自訂固定公電費，缺少依實際使用分攤的工具；差異在於不必改配電，裝了就能用。',
    businessModelFinancials:
      '向房東收取硬體押金加每間物件月費；房客端免費使用。成本為計量硬體、雲端主機與安裝服務；硬體可由合作水電行安裝並分潤，降低前期投入。',
    sourcePainPointProposalId: 'q-vp-pain-13',
    sourcePainPointTitle: '合租公寓夏天台電帳單一來室友就吵架，客廳冷氣跟烘衣機的公電怎麼分才公平？',
    tags: ['合租生活', '智慧電表', '公電分攤', '物聯網'],
    authorId: 'u-sim-volt9kai',
    authorName: 'Volt9Kai',
    authorRole: 'solver',
    teamName: 'Volt9Kai',
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
