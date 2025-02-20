// Region configuration for QA generation
export interface Region {
  name: string;  // Region name in Chinese
  pinyin: string;  // Region name in pinyin (used for file naming)
  description: string;  // Brief description of the region
}

export const regions: Region[] = [
  {
    name: "赤壁",
    pinyin: "chibi",
    description: "湖北省咸宁市赤壁市，三国赤壁之战古战场所在地"
  },
  {
    name: "常州",
    pinyin: "changzhou",
    description: "江苏省常州市"
  }
  // Add more regions here as needed
];

// Get region by pinyin
export function getRegionByPinyin(pinyin: string): Region | undefined {
  return regions.find(region => region.pinyin === pinyin);
}

// Get region by Chinese name
export function getRegionByName(name: string): Region | undefined {
  return regions.find(region => region.name === name);
}

// Get file names for a region
export function getRegionFileNames(pinyin: string): { questionFile: string; qaFile: string } {
  return {
    questionFile: `${pinyin}_q_results.json`,
    qaFile: `${pinyin}_qa_results.json`
  };
} 