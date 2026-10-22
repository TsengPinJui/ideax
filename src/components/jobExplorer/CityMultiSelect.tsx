import React from 'react';
import { ChipMultiSelect } from './ChipMultiSelect';

/** 匯職缺：地區可以多選（不選＝不限） */
export const CITY_GROUPS: Array<{ name: string; cities: string[] }> = [
  { name: '北部', cities: ['台北市', '新北市', '基隆市', '桃園市', '新竹市', '新竹縣', '宜蘭縣'] },
  { name: '中部', cities: ['苗栗縣', '台中市', '彰化縣', '南投縣', '雲林縣'] },
  { name: '南部', cities: ['嘉義市', '嘉義縣', '台南市', '高雄市', '屏東縣'] },
  { name: '東部與離島', cities: ['花蓮縣', '台東縣', '澎湖縣', '金門縣', '連江縣'] },
  { name: '其他', cities: ['遠端工作'] },
];
export const ALL_CITIES = CITY_GROUPS.flatMap((g) => g.cities);
const GROUPS = CITY_GROUPS.map((g) => ({ name: g.name, items: g.cities }));

type Props = { value: string[]; onChange: (next: string[]) => void; disabled?: boolean };

export const CityMultiSelect: React.FC<Props> = (p) => <ChipMultiSelect prefix="地區" groups={GROUPS} {...p} />;

/** 匯職缺：職務類別可以複選（不選＝不限） */
export const JOB_CATEGORIES = ['門市／餐飲／零售', '軟體／AI工程', '產品／專案管理', '行銷／企劃／社群', '設計／UIUX', '業務／商務開發', '行政／人資／財會'];
export const CategoryMultiSelect: React.FC<Props> = (p) => <ChipMultiSelect prefix="職務類別" groups={[{ items: JOB_CATEGORIES }]} {...p} />;

export default CityMultiSelect;
