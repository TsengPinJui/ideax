/**
 * 實境漫遊的彩蛋：和 3D 地圖同一套詩句、同一本收集冊（38 格；水濂洞的兩顆只在實境漫遊）
 * 詩句要和 3D 地圖一字不差，收集冊才會認得是同一格
 */

export type EggId =
  | 'peach'
  | 'boat'
  | 'threePools'
  | 'bridge'
  | 'farmland'
  | 'mountain'
  | 'cave'
  | 'waterfall'
  | 'pond'
  | 'koi'
  | 'waterwheel'
  | 'villager'
  | 'fisherman'
  | 'buffalo'
  | 'egret'
  | 'willow'
  | 'pagoda'
  | 'mist'
  | 'bulb'
  | 'bigBulb'
  | 'soso'
  | 'baimiao'
  | 'duohui'
  | 'agent007'
  | 'bear'
  | 'shuilian'
  | 'stoneEgg';

export const EGG_VERSES = {
  peach: '「忽逢桃花林，夾岸數百步，中無雜樹，芳草鮮美，落英繽紛。」',
  bulb: '「找到了小燈泡！當燈泡亮起，就是又有好點子了！」',
  /** 主廣場的大燈泡（和小燈泡分開算一格） */
  bigBulb: '「大燈泡亮起來了！滿城的好點子都被照亮了！」',
  fisher: '「見漁人，乃大驚，問所從來。」',
  threePools: '「夜深寒水月千片，塔影三雙秋一期。」',
  bridge: '「此處無斷橋，更有佳人哭斷腸...」',
  farmland: '「土地平曠，屋舍儼然，有良田、美池、桑竹之屬。」',
  mist: '「坐看雲起時」',
  mountain: ['「山不在高，有仙則靈」', '「我是山神，最怕愚公」'],
  cave: '「初極狹，纔通人。復行數十步，豁然開朗。」',
  waterfall: '「垂涎三尺」—— 日照香爐生紫煙，遙看瀑布掛前川。飛流直下三千尺，疑是銀河落九天！好點子如飛瀑奔騰不息～',
  pond: '「切勿竭澤而漁！」',
  pagoda: [
    '「白日依山盡，黃湯入嘴留，芋頭西米露，端上此塔樓」',
    '「西泠西畔舊雷家，廢塔凋零夕照斜。一角紅云生古艷，半空青影帶殘霞。」',
    '「塔影初收日色昏，隔牆人語近甘園。南山遊遍分歸路，半入錢唐半暗門。」',
  ],
  waterwheel: '「我是諸葛亮發明的 - 龍骨水車」',
  villager: '「阡陌交通，雞犬相聞。其中往來種作，男女衣著，悉如外人。黃髮垂髫，並怡然自樂。」',
  ox: '「媽~媽~~俺是老子的牛」',
  egret: '「我不是梅妻鶴子，我是閒雲野鶴」',
  fish: ['「屈原不是我殺的」', '「你有粽子嗎?」'],
  tao: '「我是五柳，恭喜你找到了藏在這的陶淵明」',
  quyuan: '「非五柳之歸隱兮，實靈均之沉憂(我不是陶淵明，在下人稱屈原)」',
  willowN: ['', '「我是一柳」', '「我是二柳」', '「我是三柳」', '「我是四柳」'],
  soso: '「找到了搜搜！駕著筋斗雲，一眨眼就幫你尋遍天下機會！」',
  baimiao: '「找到了白喵！哈基米～讓我先打個滾再幫你媒合專家喵！」',
  duohui: '「找到了多慧！25小時全年無休，有任何問題都包在我身上！」',
  agent007: '「找到了007！躺在翰林院屋頂吹風，全島情報都在我的雷達裡！」',
  bear: '「找到了大熊！敲敲打打修修補補，再難的技術都能幫你落地！」',
  /** 北山飛瀑後面的水濂洞（西遊記第一回） */
  shuilian: '「花果山福地，水簾洞洞天。」',
  /** 水濂洞口的仙石 */
  stoneEgg: '「靈根育孕源流出，心性修持大道生。」—— 這顆仙石裡，說不定正孕育著下一個好點子！',
  boatNight: '「夜半鐘聲到客船」',
  nightOutside: '「六橋金粉人初散，十里鶯花夢乍醒。斷續聽來何處好，碧煙明月冷泉亭。」',
  clearNight: '「月景尤不可言，花態柳情，山容水意，別是一種趣味。此樂留與山僧遊客受用，安可為俗士道哉！」',
} as const;

const pickOne = (arr: readonly string[]) => arr[Math.floor(Math.random() * arr.length)];

/** 柳樹：第一次點到的柳樹依序是一柳～四柳，第五棵化成陶淵明，第六棵是屈原（和 3D 地圖一樣） */
const willowNum = new Map<string, number>();

export function eggVerse(egg: EggId, ctx: { night: boolean; clear: boolean; id?: string }): string {
  const V = EGG_VERSES;
  switch (egg) {
    case 'boat':
      return ctx.night ? V.boatNight : V.fisher;
    case 'fisherman':
      return ctx.night && ctx.clear ? V.clearNight : V.fisher;
    case 'villager':
      return ctx.night ? V.nightOutside : V.villager;
    case 'mountain':
      return pickOne(V.mountain);
    case 'pagoda':
      return pickOne(V.pagoda);
    case 'koi':
      return pickOne(V.fish);
    case 'buffalo':
      return V.ox;
    case 'willow': {
      const id = ctx.id || 'w';
      let n = willowNum.get(id);
      if (!n) {
        n = willowNum.size + 1;
        willowNum.set(id, n);
      }
      if (n <= 4) return V.willowN[n];
      return n === 5 ? V.tao : V.quyuan;
    }
    case 'threePools':
    case 'bridge':
    case 'farmland':
    case 'cave':
    case 'waterfall':
    case 'pond':
    case 'waterwheel':
    case 'egret':
    case 'peach':
    case 'mist':
    case 'bulb':
    case 'bigBulb':
    case 'soso':
    case 'baimiao':
    case 'duohui':
    case 'agent007':
    case 'bear':
    case 'shuilian':
    case 'stoneEgg':
      return (V as any)[egg === 'peach' ? 'peach' : egg];
  }
}
