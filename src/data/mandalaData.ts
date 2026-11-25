export type QuadrantId = 'mutation' | 'initiation' | 'civilization' | 'duality';

export type CenterId =
  | 'head'
  | 'ajna'
  | 'throat'
  | 'g'
  | 'ego'
  | 'sacral'
  | 'solar'
  | 'spleen'
  | 'root';

export interface GateInfo {
  gate: number;
  wheelIndex: number; // 0..63 starting from Gate 41
  angleRad: number;
  quadrant: QuadrantId;
  ichingName: string;
  hdTitle: string;
  gkShadow: string;
  gkGift: string;
  gkSiddhi: string;
  centerId: CenterId;
  lines: [number, number, number, number, number, number];
  bases: string;
  godhead: string;
  zodiac: string;
  trigram: string;
  codonRing: string;
  codonColor: string;
  aminoAcid: string;
  physiology: string;
}

export interface CenterInfo {
  id: CenterId;
  name: string;
  enName: string;
  position: [number, number, number]; // 3D 立體位置
  flatPos: [number, number]; // 鳥瞰圖平面位置 (x, z)
  shape: 'triangle-up' | 'triangle-down' | 'square' | 'diamond' | 'triangle-left' | 'triangle-right';
  color: string;
  theme: string;
  gates: number[];
}

export interface CodonRingInfo {
  name: string;
  enName: string;
  color: string;
  colorNote?: string;
  aminoAcid: string;
  gates: number[];
}

export const RING_RADII = {
  atriumMax: 22,
  physiology: 30,
  codonToken: 38,
  trigram: 45,
  zodiac: 52,
  godhead: 59,
  centerBlock: 66,
  gateNumber: 73,
  quadrant: 80,
  hexagram: 88,
  base: 95,
  // 走廊起迄半徑（整份 1/64 曼陀羅空間皆為走廊）
  corridorInner: 22,
  corridorOuter: 88,
} as const;

export const MANDALA_RADIUS = RING_RADII.hexagram;

export const RAVE_MANDALA_ORDER: number[] = [
  41, 19, 13, 49, 30, 55, 37, 63, 22, 36, 25, 17, 21, 51, 42, 3,
  27, 24, 2, 23, 8, 20, 16, 35, 45, 12, 15, 52, 39, 53, 62, 56,
  31, 33, 7, 4, 29, 59, 40, 64, 47, 6, 46, 18, 48, 57, 32, 50,
  28, 44, 1, 43, 14, 34, 9, 5, 26, 11, 10, 58, 38, 54, 61, 60,
];

export const QUADRANT_META: Record<QuadrantId, { name: string; shortName: string; theme: string; color: string }> = {
  initiation: {
    name: '第一象限：起始',
    shortName: '第一象限：起始',
    theme: '透過心智與覺察實現目的',
    color: '#0284c7',
  },
  civilization: {
    name: '第二象限：文明',
    shortName: '第二象限：文明',
    theme: '透過顯化與形式實現目的',
    color: '#d97706',
  },
  duality: {
    name: '第三象限：二元',
    shortName: '第三象限：二元',
    theme: '透過關係與連結實現目的',
    color: '#db2777',
  },
  mutation: {
    name: '第四象限：突變',
    shortName: '第四象限：突變',
    theme: '透過轉化與接納實現目的',
    color: '#7c3aed',
  },
};

// 十六神格（對齊海報：idx 62,63,0,1 = 守輪者；idx 2,3,4,5 (13,49,30,55) = 迦梨）
const GODHEADS_FROM_IDX_62: string[] = [
  '守輪者',
  '迦梨',
  '密特拉',
  '米迦勒',
  '雅努斯',
  '麥雅',
  '拉克希米',
  '帕爾瓦蒂',
  '瑪特',
  '托特',
  '哈爾摩尼亞',
  '基督',
  '密涅瓦',
  '黑帝斯',
  '普羅米修斯',
  '毗濕奴',
];

// 十二星座（對齊海報：Gate 55 落於 雙魚）
const ZODIACS: string[] = [
  '♒ 水瓶',
  '♓ 雙魚',
  '♈ 牡羊',
  '♉ 金牛',
  '♊ 雙子',
  '♋ 巨蟹',
  '♌ 獅子',
  '♍ 處女',
  '♎ 天秤',
  '♏ 天蠍',
  '♐ 射手',
  '♑ 魔羯',
];

// 易經八卦（對齊海報：idx 4..11 包含 30,55,37,63,22,36,25,17 = 離卦）
const TRIGRAMS_FROM_IDX_4: string[] = [
  '☲ 離卦(火)',
  '☳ 震卦(雷)',
  '☷ 坤卦(地)',
  '☶ 艮卦(山)',
  '☵ 坎卦(水)',
  '☴ 巽卦(風)',
  '☰ 乾卦(天)',
  '☱ 兌卦(澤)',
];

export const CODON_RINGS: CodonRingInfo[] = [
  { name: '煉金術之環', enName: 'Alchemy', color: '#ee6123', aminoAcid: 'Glycine 甘胺酸', gates: [6, 40, 47, 64] },
  { name: '命運之環', enName: 'Destiny', color: '#b6e3f1', aminoAcid: 'Asparagine 天門冬醯胺', gates: [34, 43] },
  { name: '神性之環', enName: 'Divinity', color: '#a1469a', aminoAcid: 'Proline 脯(ㄆㄨˊ)胺酸', gates: [22, 36, 37, 63] },
  { name: '火之環', enName: 'Fire', color: '#e8232a', aminoAcid: 'Lysine 離胺酸', gates: [1, 14] },
  { name: '蓋亞之環', enName: 'Gaia', color: '#08af92', aminoAcid: 'Isoleucine 異白胺酸', gates: [19, 60, 61] },
  { name: '人性之環', enName: 'Humanity', color: '#e26384', aminoAcid: 'Arginine 精胺酸', gates: [10, 17, 21, 25, 38, 51] },
  { name: '啟迪者之環', enName: 'Illuminati', color: '#f3ab1c', aminoAcid: 'Glutamic acid 麩胺酸', gates: [44, 50] },
  { name: '幻象之環', enName: 'Illusion', color: '#0d5546', aminoAcid: 'Aspartic acid 天門冬胺酸', gates: [28, 32] },
  { name: '生死之環', enName: 'Life & Death', color: '#254898', aminoAcid: 'Leucine 白胺酸', gates: [3, 20, 23, 24, 27, 42] },
  { name: '光之環', enName: 'Light', color: '#faf7b1', aminoAcid: 'Threonine 蘇胺酸', gates: [5, 9, 11, 26] },
  { name: '物質之環', enName: 'Matter', color: '#915a32', aminoAcid: 'Alanine 丙胺酸', gates: [18, 46, 48, 57] },
  { name: '奇蹟之環', enName: 'Miracles', color: '#12ac4c', aminoAcid: 'Tryptophan 色胺酸', gates: [35] },
  { name: '不回首之環*', enName: 'No Return', color: '#a1a1a1', aminoAcid: 'Tyrosine 酪胺酸', gates: [31, 62] },
  { name: '起源之環', enName: 'Origin', color: '#050707', aminoAcid: 'Methionine 蛋胺酸', gates: [41] },
  { name: '豐盛之環', enName: 'Prosperity', color: '#c19d31', aminoAcid: 'Cysteine 半胱胺酸', gates: [16, 45] },
  { name: '淨化之環*', enName: 'Purification', color: '#ffffff', aminoAcid: 'Glutamine 麩醯胺酸', gates: [13, 30] },
  { name: '秘密之環', enName: 'Secrets', color: '#a71e23', colorNote: '配白色', aminoAcid: 'Terminator 終止密碼子', gates: [12] },
  { name: '探索之環', enName: 'Seeking', color: '#ec248f', aminoAcid: 'Serine 絲胺酸', gates: [15, 39, 52, 53, 54, 58] },
  { name: '試煉之環*', enName: 'Trials', color: '#a71e23', aminoAcid: 'Stop-Codons 終止密碼子', gates: [33, 56] },
  { name: '同盟之環', enName: 'Union', color: '#b56dac', aminoAcid: 'Valine 纈(ㄒㄧㄝˊ)胺酸', gates: [4, 7, 29, 59] },
  { name: '水之環', enName: 'Water', color: '#16b6ea', aminoAcid: 'Phenylalanine 苯丙胺酸', gates: [2, 8] },
  { name: '旋風之環', enName: 'Whirlwind', color: '#51358b', aminoAcid: 'Histidine 組胺酸', gates: [49, 55] },
];

export const CENTERS: CenterInfo[] = [
  {
    id: 'head',
    name: '頭頂中心',
    enName: 'Head',
    position: [0, 11.2, 0],
    flatPos: [0, -14.5],
    shape: 'triangle-down',
    color: '#8B6DAE',
    theme: '靈感與心智壓力｜個性水晶居於其上方',
    gates: [64, 61, 63],
  },
  {
    id: 'ajna',
    name: '心智中心',
    enName: 'Ajna',
    position: [0, 8.2, 0],
    flatPos: [0, -9.8],
    shape: 'triangle-up',
    color: '#2e58a7',
    theme: '概念化、思考與建構觀點',
    gates: [47, 24, 4, 17, 43, 11],
  },
  {
    id: 'throat',
    name: '喉嚨中心',
    enName: 'Throat',
    position: [0, 4.9, 0],
    flatPos: [0, -4.6],
    shape: 'square',
    color: '#70C7D9',
    theme: '顯化、表達與行動的出口',
    gates: [62, 23, 56, 35, 12, 45, 33, 8, 31, 20, 16],
  },
  {
    id: 'g',
    name: '自性中心',
    enName: 'G Center',
    position: [0, 1.4, 0],
    flatPos: [0, 1.0],
    shape: 'diamond',
    color: '#8dc44a',
    theme: '愛、方向與自我認同｜磁單極所在核心',
    gates: [7, 1, 13, 10, 15, 2, 46, 25],
  },
  {
    id: 'ego',
    name: '心臟中心',
    enName: 'Heart / Ego',
    position: [3.1, -0.2, 0.6],
    flatPos: [5.2, 3.2],
    shape: 'triangle-down',
    color: '#e0e43d',
    theme: '意志力、自我價值與物質承諾',
    gates: [21, 51, 26, 40],
  },
  {
    id: 'spleen',
    name: '脾臟中心',
    enName: 'Spleen',
    position: [-4.4, -2.5, 0.3],
    flatPos: [-8.2, 7.2],
    shape: 'triangle-right',
    color: '#e0e43d',
    theme: '當下直覺、生存本能與健康警覺',
    gates: [48, 57, 44, 50, 32, 28, 18],
  },
  {
    id: 'sacral',
    name: '薦骨中心',
    enName: 'Sacral',
    position: [0, -3.2, 0],
    flatPos: [0, 7.8],
    shape: 'square',
    color: '#f0832c',
    theme: '生命動能、創造力與持續回應',
    gates: [5, 14, 29, 59, 9, 3, 42, 27, 34],
  },
  {
    id: 'solar',
    name: '情緒中心',
    enName: 'Solar Plexus',
    position: [4.4, -2.5, 0.3],
    flatPos: [8.2, 7.2],
    shape: 'triangle-left',
    color: '#e0e43d',
    theme: '情緒波浪、感受深度與清明等待',
    gates: [36, 22, 37, 6, 49, 55, 30],
  },
  {
    id: 'root',
    name: '根中心',
    enName: 'Root',
    position: [0, -6.9, 0],
    flatPos: [0, 14.2],
    shape: 'square',
    color: '#e7141b',
    theme: '腎上腺素驅動力與落地壓力',
    gates: [53, 60, 52, 19, 39, 41, 58, 38, 54],
  },
];

export interface ChannelInfo {
  id: string;
  gates: [number, number];
  centers: [CenterId, CenterId];
  name: string;
}

export const CHANNELS: ChannelInfo[] = [
  // Head ↔ Ajna
  { id: '64-47', gates: [64, 47], centers: ['head', 'ajna'], name: '抽象通道' },
  { id: '61-24', gates: [61, 24], centers: ['head', 'ajna'], name: '覺察通道' },
  { id: '63-4', gates: [63, 4], centers: ['head', 'ajna'], name: '邏輯通道' },
  // Ajna ↔ Throat
  { id: '17-62', gates: [17, 62], centers: ['ajna', 'throat'], name: '組織通道' },
  { id: '43-23', gates: [43, 23], centers: ['ajna', 'throat'], name: '架構通道' },
  { id: '11-56', gates: [11, 56], centers: ['ajna', 'throat'], name: '好奇通道' },
  // Throat ↔ G
  { id: '31-7', gates: [31, 7], centers: ['throat', 'g'], name: '創始者通道' },
  { id: '8-1', gates: [8, 1], centers: ['throat', 'g'], name: '靈感通道' },
  { id: '33-13', gates: [33, 13], centers: ['throat', 'g'], name: '浪子通道' },
  // Throat ↔ Ego / Spleen / Sacral / Solar
  { id: '45-21', gates: [45, 21], centers: ['throat', 'ego'], name: '金錢線通道' },
  { id: '16-48', gates: [16, 48], centers: ['throat', 'spleen'], name: '才華通道' },
  { id: '20-57', gates: [20, 57], centers: ['throat', 'spleen'], name: '腦波通道' },
  { id: '20-34', gates: [20, 34], centers: ['throat', 'sacral'], name: '魅力通道' },
  { id: '20-10', gates: [20, 10], centers: ['throat', 'g'], name: '覺醒通道' },
  { id: '35-36', gates: [35, 36], centers: ['throat', 'solar'], name: '無常通道' },
  { id: '12-22', gates: [12, 22], centers: ['throat', 'solar'], name: '開放通道' },
  // G ↔ Ego / Spleen / Sacral
  { id: '25-51', gates: [25, 51], centers: ['g', 'ego'], name: '發起通道' },
  { id: '10-57', gates: [10, 57], centers: ['g', 'spleen'], name: '完美形式通道' },
  { id: '10-34', gates: [10, 34], centers: ['g', 'sacral'], name: '探索通道' },
  { id: '15-5', gates: [15, 5], centers: ['g', 'sacral'], name: '韻律通道' },
  { id: '2-14', gates: [2, 14], centers: ['g', 'sacral'], name: '脈動通道' },
  { id: '46-29', gates: [46, 29], centers: ['g', 'sacral'], name: '發現通道' },
  // Ego ↔ Spleen / Solar
  { id: '26-44', gates: [26, 44], centers: ['ego', 'spleen'], name: '投降通道' },
  { id: '40-37', gates: [40, 37], centers: ['ego', 'solar'], name: '社群通道' },
  // Spleen ↔ Sacral / Root
  { id: '57-34', gates: [57, 34], centers: ['spleen', 'sacral'], name: '力量通道' },
  { id: '50-27', gates: [50, 27], centers: ['spleen', 'sacral'], name: '保存通道' },
  { id: '32-54', gates: [32, 54], centers: ['spleen', 'root'], name: '蛻變通道' },
  { id: '28-38', gates: [28, 38], centers: ['spleen', 'root'], name: '掙扎通道' },
  { id: '18-58', gates: [18, 58], centers: ['spleen', 'root'], name: '批判通道' },
  // Sacral ↔ Solar / Root
  { id: '59-6', gates: [59, 6], centers: ['sacral', 'solar'], name: '親密通道' },
  { id: '42-53', gates: [42, 53], centers: ['sacral', 'root'], name: '成熟通道' },
  { id: '3-60', gates: [3, 60], centers: ['sacral', 'root'], name: '突變通道' },
  { id: '9-52', gates: [9, 52], centers: ['sacral', 'root'], name: '專注通道' },
  // Solar ↔ Root
  { id: '49-19', gates: [49, 19], centers: ['solar', 'root'], name: '整合通道' },
  { id: '55-39', gates: [55, 39], centers: ['solar', 'root'], name: '情緒通道' },
  { id: '30-41', gates: [30, 41], centers: ['solar', 'root'], name: '夢想家通道' },
];

export const CENTER_LINKS: Array<[CenterId, CenterId]> = [
  ['head', 'ajna'],
  ['ajna', 'throat'],
  ['throat', 'g'],
  ['throat', 'ego'],
  ['throat', 'spleen'],
  ['throat', 'solar'],
  ['throat', 'sacral'],
  ['g', 'ego'],
  ['g', 'spleen'],
  ['g', 'sacral'],
  ['ego', 'spleen'],
  ['ego', 'solar'],
  ['spleen', 'sacral'],
  ['spleen', 'root'],
  ['sacral', 'solar'],
  ['sacral', 'root'],
  ['solar', 'root'],
];

const GATE_METADATA: Record<number, [string, string, string, string, string, string, string]> = {
  1: ['乾為天', '自我表達的創意', '熵減/失能', '清新', '美', '111111', '肝臟右葉'],
  2: ['坤為地', '高我的方向導航', '迷失', '定向', '合一', '000000', '胸骨'],
  3: ['水雷屯', '秩序化與突變起點', '混亂', '革新', '純真', '100010', '子宮／前列腺囊'],
  4: ['山水蒙', '邏輯解答與公式化', '偏執', '理解', '寬恕', '010001', '左眼・腦下垂體'],
  5: ['水天需', '固定節奏與等待', '急躁', '耐心', '無時間性', '111010', '薦骨神經叢'],
  6: ['天水訟', '摩擦與親密邊界', '衝突', '外交', '和平', '010111', '臟腑經絡（腎、胰）'],
  7: ['地水師', '未來導向的領導', '分裂', '指引', '德行', '010000', '肝臟左葉'],
  8: ['水地比', '原創貢獻與風格', '平庸', '風格', '精純', '000010', '咽・甲狀腺'],
  9: ['風天小畜', '微觀專注與細節', '慣性', '決心', '無敵', '111011', '腸繫膜叢・腰神經節'],
  10: ['天澤履', '自愛與真實行為', '自我執著', '自然', '存在', '110111', '肝臟與血液'],
  11: ['地天泰', '點子庫與視覺想像', '模糊', '理想主義', '光明', '111000', '右眼・腦下垂體'],
  12: ['天地否', '謹慎表達與氛圍感', '虛榮', '辨別', '純潔', '000111', '喉・甲狀腺'],
  13: ['天火同人', '傾聽者與歷史記憶', '失調', '洞察', '同理', '101111', '內在之耳'],
  14: ['火天大有', '力量技能與資源顯化', '妥協', '勝任', '豐盛', '111101', '卵巢／睪丸'],
  15: ['地山謙', '極端節奏與包容', '乏味', '磁力', '綻放', '001000', '血液循環'],
  16: ['雷地豫', '熱情技藝與反覆精進', '冷漠', '多才', '精通', '000100', '氣管・副甲狀腺'],
  17: ['澤雷隨', '觀點組織與系統思維', '意見', '遠見', '全知', '100110', '頂葉皮質'],
  18: ['山風蠱', '修正模式與品管直覺', '批判', '完整', '完美', '011001', '鼻・免疫系統'],
  19: ['地澤臨', '敏感需求與族群連結', '共依賴', '敏感', '奉獻', '110000', '左腎上腺'],
  20: ['風地觀', '當下臨在與即時覺知', '膚淺', '自信', '臨在', '000011', '甲狀腺・喉結'],
  21: ['火雷噬嗑', '掌控資源與自主權', '控制', '權威', '勇氣', '100101', '左心耳／心室'],
  22: ['山火賁', '優雅開放與情緒感染', '不名譽', '優雅', '恩典', '101001', '顏面神經'],
  23: ['山地剝', '化繁為簡與突破語言', '複雜', '簡約', '本質', '000001', '食道・甲狀腺'],
  24: ['地雷復', '反覆思索與頓悟回歸', '上癮', '發明', '靜默', '100000', '腹側紋狀體・新皮質'],
  25: ['天雷無妄', '無條件的愛與本心', '收縮', '接納', '宇宙之愛', '100111', '血液與心膜'],
  26: ['山天大畜', '說服力與價值傳遞', '傲慢', '巧思', '無形', '111001', '胸腺'],
  27: ['山雷頤', '滋養照顧與守護界線', '自私', '利他', '無私', '100001', '小腸・消化'],
  28: ['澤風大過', '為意義而戰的冒險家', '無目的', '全貌', '永恆', '011110', '細胞凋亡・免疫系統'],
  29: ['坎為水', '全力投入與說「是」', '半途而廢', '承諾', '奉獻', '010010', '肚臍／肛門括約肌'],
  30: ['離為火', '渴望燃燒與體驗之火', '渴望', '輕盈', '狂喜', '101101', '神經叢・腎胰'],
  31: ['澤山咸', '民主引導與影響力', '傲慢', '領導', '謙卑', '001110', '肺・甲狀腺'],
  32: ['雷風恆', '延續直覺與辨識價值', '失敗恐懼', '保存', '敬畏', '011100', '骨髓・淋巴'],
  33: ['天山遯', '退隱沉澱與提煉故事', '遺忘', '正念', '啟示', '001111', '副甲狀腺'],
  34: ['雷天大壯', '純粹獨立的生命動能', '強迫', '力量', '威嚴', '111100', '陰莖／陰道'],
  35: ['火地晉', '渴望變化與多元體驗', '飢渴', '冒險', '無限', '000101', '喉・副甲狀腺'],
  36: ['地火明夷', '穿越危機與情緒成熟', '動盪', '人道', '慈悲', '101000', '右杏仁核'],
  37: ['風火家人', '契約信任與社群歸屬', '軟弱', '平等', '溫柔', '101011', '迷走神經'],
  38: ['火澤睽', '破妄戰士與追尋意義', '掙扎', '堅毅', '榮耀', '110101', '右腎上腺'],
  39: ['水山蹇', '挑釁破冰與喚醒靈性', '挑釁', '動能', '解放', '001010', '結腸'],
  40: ['雷水解', '獨處充電與邊界付出', '枯竭', '決斷', '神聖意志', '010100', '胃・腦幹網狀結構'],
  41: ['山澤損', '起始密碼子與想像源頭', '幻想', '預期', '流溢', '110001', '尾椎骨・會陰'],
  42: ['風雷益', '完成循環與圓滿收尾', '期待', '超然', '慶祝', '100011', '泌尿生殖隔'],
  43: ['澤天夬', '突破性洞見與獨特心智', '耳聾', '洞見', '頓悟', '111110', '腦幹・延腦'],
  44: ['天風姤', '嗅出模式與團隊識人', '干預', '團隊合作', '共時', '011111', '淋巴結'],
  45: ['澤地萃', '資源匯聚與統御格局', '支配', '協同', '共融', '000110', '甲狀腺'],
  46: ['地風升', '肉身覺知與好運體質', '嚴肅', '喜悅', '狂喜', '011000', '竇房結・肺'],
  47: ['澤水困', '整合碎片與實現頓悟', '壓迫', '轉化', '昇華', '010110', '前額葉皮質・橫膈膜'],
  48: ['水風井', '深度底蘊與解決方案', '不足感', '機智', '智慧', '011010', '肥大細胞'],
  49: ['澤火革', '原則革新與情感革命', '反應', '革命', '重生', '101110', '左杏仁核'],
  50: ['火風鼎', '價值守護與文化責任', '腐敗', '平衡', '和諧', '011101', '膽囊'],
  51: ['震為雷', '震撼覺醒與無畏先鋒', '激動', '開創', '覺醒', '100100', '右心耳／心室'],
  52: ['艮為山', '靜止專注與定力之山', '壓力', '克制', '靜止', '001001', '攝護腺・會陰'],
  53: ['風山漸', '啟動循環與開端壓力', '不成熟', '擴張', '超豐盛', '001011', '腎上腺皮質'],
  54: ['雷澤歸妹', '野心驅動與向上轉化', '貪婪', '抱負', '揚升', '110100', '腎上腺髓質'],
  55: ['雷火豐', '靈魂自由與情緒豐盛', '受害者', '自由', '自由本身', '101100', '背神經節'],
  56: ['火山旅', '說書人與經驗漫遊', '分心', '豐富', '陶醉', '001101', '甲狀腺'],
  57: ['巽為風', '穿透當下的敏銳直覺', '不安', '直覺', '清明', '011011', '淋巴系統'],
  58: ['兌為澤', '生命喜悅與持續優化', '不滿', '活力', '極樂', '110110', '脊髓'],
  59: ['風水渙', '打破隔閡與深度連結', '不誠實', '親密', '透明', '010011', '生殖腺'],
  60: ['水澤節', '接納限制與靜候突變', '限制', '務實', '正義', '110010', '背神經節'],
  61: ['風澤中孚', '內在真理與神祕探索', '精神錯亂', '靈感', '神聖性', '110011', 'vmPFC・松果體'],
  62: ['雷山小過', '精準命名與細節表達', '理智化', '精確', '無瑕', '001100', '氣管・甲狀腺'],
  63: ['水火既濟', '邏輯懷疑與求證精神', '懷疑', '探究', '真理', '101010', '松果體'],
  64: ['火水未濟', '穿越混亂與影像整合', '困惑', '想像', '光明', '010101', '腦脊髓液・松果體'],
};

function findCenterForGate(gate: number): CenterId {
  const found = CENTERS.find((c) => c.gates.includes(gate));
  return found ? found.id : 'g';
}

function getQuadrantForWheelIndex(idx: number): QuadrantId {
  if (idx >= 2 && idx <= 17) return 'initiation';
  if (idx >= 18 && idx <= 33) return 'civilization';
  if (idx >= 34 && idx <= 49) return 'duality';
  return 'mutation';
}

function linesToCodonBases(lines: [number, number, number, number, number, number]): string {
  const pairToBase = (a: number, b: number) => {
    if (a === 1 && b === 1) return 'A';
    if (a === 1 && b === 0) return 'C';
    if (a === 0 && b === 1) return 'G';
    return 'U';
  };
  return `${pairToBase(lines[0], lines[1])}${pairToBase(lines[2], lines[3])}${pairToBase(lines[4], lines[5])}`;
}

function findCodonRingForGate(gate: number): CodonRingInfo {
  return CODON_RINGS.find((r) => r.gates.includes(gate)) ?? CODON_RINGS[0];
}

export const MANDALA_GATES: GateInfo[] = RAVE_MANDALA_ORDER.map((gate, wheelIndex) => {
  const meta = GATE_METADATA[gate];
  // 精準對齊海報鳥瞰方位：Gate 10/11 位於 12 點鐘 (-Z)，逆時針展開（Gate 55 位於左上 10 點鐘）
  const angleRad = -Math.PI / 2 - ((wheelIndex - 57.5) / 64) * Math.PI * 2;
  const lines = meta[5].split('').map((ch) => Number(ch)) as [
    number,
    number,
    number,
    number,
    number,
    number,
  ];
  const codonInfo = findCodonRingForGate(gate);

  const godheadIdx = Math.floor(((wheelIndex + 2) % 64) / 4);
  const zodiacIdx = Math.floor((((wheelIndex + 2) % 64) / 64) * 12) % 12;
  const trigramIdx = Math.floor(((wheelIndex - 4 + 64) % 64) / 8);

  return {
    gate,
    wheelIndex,
    angleRad,
    quadrant: getQuadrantForWheelIndex(wheelIndex),
    ichingName: meta[0],
    hdTitle: meta[1],
    gkShadow: meta[2],
    gkGift: meta[3],
    gkSiddhi: meta[4],
    centerId: findCenterForGate(gate),
    lines,
    bases: linesToCodonBases(lines),
    godhead: GODHEADS_FROM_IDX_62[godheadIdx],
    zodiac: ZODIACS[zodiacIdx],
    trigram: TRIGRAMS_FROM_IDX_4[trigramIdx],
    codonRing: codonInfo.name,
    codonColor: codonInfo.color,
    aminoAcid: codonInfo.aminoAcid,
    physiology: meta[6],
  };
});

export const GATE_BY_NUMBER: Record<number, GateInfo> = Object.fromEntries(
  MANDALA_GATES.map((g) => [g.gate, g])
);

export function getGateWorldPosition(gateNumber: number, radius = MANDALA_RADIUS): [number, number, number] {
  const info = GATE_BY_NUMBER[gateNumber];
  if (!info) return [radius, 0, 0];
  return [Math.cos(info.angleRad) * radius, 0, Math.sin(info.angleRad) * radius];
}
