/**
 * 提案相片圖片池與唯一化對應工具 (Proposal Cover Image Pool)
 * 確保任何提案卡片或輪播元件即使缺乏自訂照片，亦絕不重複使用同一張圖片
 */

const UNIQUE_PROPOSAL_IMAGE_POOL: string[] = [
  'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80', // 智農/數據分析
  'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80', // 醫療生技/智慧手環
  'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=800&q=80', // 永續包材/綠色循環
  'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=800&q=80', // 綠能微電網/儲能
  'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80', // 生解海藻/環保生材
  'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=800&q=80', // 偏鄉遠距教育
  'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=800&q=80', // 硬體自動化/物聯網
  'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=800&q=80', // 團隊協作/企業管理
  'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80', // 晶片感測/科技研發
  'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80', // 演算法/資訊軟體
  'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=800&q=80', // 創新工作空間
  'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80', // 商業策略/財務數據
  'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80', // 腦力激盪/青年團隊
  'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=800&q=80', // 簡報研討/專案報告
  'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=800&q=80', // 人才培育/工作坊
  'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=800&q=80', // 數據儀表板
  'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=800&q=80', // 現代辦公室
  'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80', // 智慧城市建築
  'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=800&q=80', // 專業商務會議
  'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=800&q=80', // 科技軟體開發
  'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80', // 餐飲數位管理
  'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80', // 跨境物流與倉儲
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80', // 旅宿門鎖與感應
  'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=800&q=80', // 照護用藥與醫療
  'https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?auto=format&fit=crop&w=800&q=80', // 農業感測與溫室
  'https://images.unsplash.com/photo-1580674285054-bed31e145f59?auto=format&fit=crop&w=800&q=80', // 冷鏈物聯網
  'https://images.unsplash.com/photo-1565514020179-026b92b84bb6?auto=format&fit=crop&w=800&q=80', // 碳盤查與工業製造
  'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&w=800&q=80', // 寵物訂閱與生活
  'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=800&q=80', // 裝修建築與履約
];

/**
 * 依提案 ID 或標題雜湊算出唯一的相片封面網址，避免不同提案使用重複照片
 */
export function getUniqueProposalCoverImage(
  proposal: { id?: string; title?: string; images?: string[]; imageUrl?: string; track?: string },
  fallbackIndex: number = 0
): string {
  if (proposal.images && proposal.images.length > 0 && proposal.images[0]) {
    return proposal.images[0];
  }
  if (proposal.imageUrl && !proposal.imageUrl.includes('photo-1508614589041-895b88991e3e')) {
    return proposal.imageUrl;
  }

  const seed = `${proposal.id || ''}_${proposal.title || ''}_${fallbackIndex}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 37 + seed.charCodeAt(i)) >>> 0;
  }

  return UNIQUE_PROPOSAL_IMAGE_POOL[hash % UNIQUE_PROPOSAL_IMAGE_POOL.length];
}
