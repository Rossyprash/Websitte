export interface CategoryTheme {
  touchColor: string;
  darkTouchColor: string;
  lightBgHex: string;
  darkBgHex: string;
  borderHex: string;
  hoverTintHex: string;
  watercolorPrimary: string;
  watercolorSecondary: string;
  watercolorAccent: string;
  emotionLabel: string;
}

export const DEFAULT_AMBIENT_WATERCOLOR = {
  primary: 'rgba(104, 178, 206, 0.30)', // Cool Serene Sky Azure
  secondary: 'rgba(128, 204, 186, 0.34)', // Calm Eucalyptus Mint
  accent: 'rgba(164, 182, 226, 0.28)', // Gentle Horizon Periwinkle
};

export const CATEGORY_THEMES: Record<string, CategoryTheme> = {
  'love-breakup': {
    touchColor: '#6E5A8A',
    darkTouchColor: '#C9B8E2',
    lightBgHex: '#EAE4F4',
    darkBgHex: '#282238',
    borderHex: '#C5B8DC',
    hoverTintHex: 'rgba(110, 90, 138, 0.20)',
    watercolorPrimary: 'rgba(148, 128, 184, 0.42)',
    watercolorSecondary: 'rgba(196, 182, 224, 0.48)',
    watercolorAccent: 'rgba(126, 168, 196, 0.36)',
    emotionLabel: 'Soft Lotus',
  },
  betrayal: {
    touchColor: '#48607A',
    darkTouchColor: '#A8C0D9',
    lightBgHex: '#E0E8F1',
    darkBgHex: '#1F2A36',
    borderHex: '#B4C6D8',
    hoverTintHex: 'rgba(72, 96, 122, 0.20)',
    watercolorPrimary: 'rgba(104, 136, 168, 0.42)',
    watercolorSecondary: 'rgba(170, 194, 218, 0.48)',
    watercolorAccent: 'rgba(128, 166, 186, 0.36)',
    emotionLabel: 'Deep River Slate',
  },
  loneliness: {
    touchColor: '#3A629D',
    darkTouchColor: '#A6C2F2',
    lightBgHex: '#DCE8F8',
    darkBgHex: '#1F2A40',
    borderHex: '#AEC7EA',
    hoverTintHex: 'rgba(58, 98, 157, 0.22)',
    watercolorPrimary: 'rgba(108, 148, 219, 0.44)',
    watercolorSecondary: 'rgba(174, 200, 245, 0.50)',
    watercolorAccent: 'rgba(142, 168, 218, 0.40)',
    emotionLabel: 'Rainy Sky',
  },
  family: {
    touchColor: '#3D7856',
    darkTouchColor: '#9CD8B5',
    lightBgHex: '#DCF0E4',
    darkBgHex: '#1D3326',
    borderHex: '#AAD4BC',
    hoverTintHex: 'rgba(61, 120, 86, 0.20)',
    watercolorPrimary: 'rgba(98, 168, 128, 0.42)',
    watercolorSecondary: 'rgba(168, 218, 188, 0.48)',
    watercolorAccent: 'rgba(122, 186, 174, 0.38)',
    emotionLabel: 'Forest Moss',
  },
  friendship: {
    touchColor: '#2A7C7C',
    darkTouchColor: '#92DAD8',
    lightBgHex: '#DAF1F0',
    darkBgHex: '#1A3435',
    borderHex: '#A4D6D5',
    hoverTintHex: 'rgba(42, 124, 124, 0.20)',
    watercolorPrimary: 'rgba(84, 174, 174, 0.42)',
    watercolorSecondary: 'rgba(158, 220, 218, 0.48)',
    watercolorAccent: 'rgba(116, 188, 204, 0.38)',
    emotionLabel: 'Coastal Seafoam',
  },
  'life-struggles': {
    touchColor: '#3E5F7B',
    darkTouchColor: '#A2C0DA',
    lightBgHex: '#DEE9F2',
    darkBgHex: '#1F2B35',
    borderHex: '#B3C7D8',
    hoverTintHex: 'rgba(62, 95, 123, 0.22)',
    watercolorPrimary: 'rgba(112, 150, 182, 0.44)',
    watercolorSecondary: 'rgba(180, 204, 224, 0.50)',
    watercolorAccent: 'rgba(136, 162, 184, 0.38)',
    emotionLabel: 'Fjord Mist',
  },
  memories: {
    touchColor: '#5F52A3',
    darkTouchColor: '#C2B7EE',
    lightBgHex: '#E6E3F8',
    darkBgHex: '#272340',
    borderHex: '#C1BBE8',
    hoverTintHex: 'rgba(95, 82, 163, 0.20)',
    watercolorPrimary: 'rgba(138, 126, 208, 0.42)',
    watercolorSecondary: 'rgba(196, 190, 240, 0.48)',
    watercolorAccent: 'rgba(154, 168, 216, 0.38)',
    emotionLabel: 'Wisteria Breeze',
  },
  regrets: {
    touchColor: '#515D8F',
    darkTouchColor: '#B5C0EA',
    lightBgHex: '#E2E6F5',
    darkBgHex: '#22273C',
    borderHex: '#B8C0E0',
    hoverTintHex: 'rgba(81, 93, 143, 0.20)',
    watercolorPrimary: 'rgba(122, 136, 188, 0.42)',
    watercolorSecondary: 'rgba(182, 192, 232, 0.48)',
    watercolorAccent: 'rgba(134, 168, 196, 0.36)',
    emotionLabel: 'Twilight Indigo',
  },
  healing: {
    touchColor: '#2B7D58',
    darkTouchColor: '#92DDB9',
    lightBgHex: '#DAF2E5',
    darkBgHex: '#1B3629',
    borderHex: '#A9DAC0',
    hoverTintHex: 'rgba(43, 125, 88, 0.22)',
    watercolorPrimary: 'rgba(94, 188, 144, 0.44)',
    watercolorSecondary: 'rgba(166, 228, 196, 0.50)',
    watercolorAccent: 'rgba(124, 194, 164, 0.38)',
    emotionLabel: 'Eucalyptus Sage',
  },
  'student-life': {
    touchColor: '#28719C',
    darkTouchColor: '#92CCEE',
    lightBgHex: '#DBEBF7',
    darkBgHex: '#1B303C',
    borderHex: '#A9CEE8',
    hoverTintHex: 'rgba(40, 113, 156, 0.22)',
    watercolorPrimary: 'rgba(94, 168, 214, 0.44)',
    watercolorSecondary: 'rgba(168, 216, 244, 0.50)',
    watercolorAccent: 'rgba(128, 188, 222, 0.38)',
    emotionLabel: 'Morning Cerulean',
  },
  'unspoken-feelings': {
    touchColor: '#5E5896',
    darkTouchColor: '#BCB6EB',
    lightBgHex: '#E5E3F6',
    darkBgHex: '#25233D',
    borderHex: '#BEB9E3',
    hoverTintHex: 'rgba(94, 88, 150, 0.20)',
    watercolorPrimary: 'rgba(136, 130, 196, 0.42)',
    watercolorSecondary: 'rgba(194, 190, 238, 0.48)',
    watercolorAccent: 'rgba(144, 174, 212, 0.38)',
    emotionLabel: 'Wild Iris',
  },
  'life-experiences': {
    touchColor: '#397365',
    darkTouchColor: '#9AD4C5',
    lightBgHex: '#DCEEE9',
    darkBgHex: '#1C322D',
    borderHex: '#ABD1C7',
    hoverTintHex: 'rgba(57, 115, 101, 0.20)',
    watercolorPrimary: 'rgba(96, 164, 148, 0.42)',
    watercolorSecondary: 'rgba(166, 216, 204, 0.48)',
    watercolorAccent: 'rgba(130, 182, 188, 0.38)',
    emotionLabel: 'Cedar Pine',
  },
  other: {
    touchColor: '#4C6882',
    darkTouchColor: '#B0CAE0',
    lightBgHex: '#E1EAF2',
    darkBgHex: '#222D38',
    borderHex: '#B7CADB',
    hoverTintHex: 'rgba(76, 104, 130, 0.20)',
    watercolorPrimary: 'rgba(120, 154, 186, 0.42)',
    watercolorSecondary: 'rgba(188, 210, 230, 0.48)',
    watercolorAccent: 'rgba(142, 182, 200, 0.36)',
    emotionLabel: 'Pearl Sky',
  },
};

const CUSTOM_THEME_PALETTE: CategoryTheme[] = [
  CATEGORY_THEMES.healing,
  CATEGORY_THEMES['student-life'],
  CATEGORY_THEMES.friendship,
  CATEGORY_THEMES.family,
  CATEGORY_THEMES.loneliness,
  CATEGORY_THEMES.memories,
  CATEGORY_THEMES['life-experiences'],
  CATEGORY_THEMES['unspoken-feelings'],
];

export function getCategoryTheme(slug: string): CategoryTheme {
  if (CATEGORY_THEMES[slug]) {
    return CATEGORY_THEMES[slug];
  }
  let hash = 0;
  for (let i = 0; i < slug.length; i++) {
    hash = (hash * 31 + slug.charCodeAt(i)) >>> 0;
  }
  const base = CUSTOM_THEME_PALETTE[hash % CUSTOM_THEME_PALETTE.length];
  return {
    ...base,
    emotionLabel: 'Community Emotion',
  };
}
