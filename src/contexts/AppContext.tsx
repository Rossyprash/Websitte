import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { DICTIONARY, InterfaceLanguage, Translations } from '../lib/i18n.ts';

export interface CategoryItem {
  id: number;
  slug: string;
  name: string;
  nameHi: string;
  nameHinglish: string;
  description: string;
  sortOrder: number;
  isActive: boolean;
}

export interface LanguageItem {
  id: number;
  code: string;
  name: string;
  nativeName: string;
  ttsSupported: boolean;
  isActive: boolean;
}

export interface AdConfigItem {
  adsenseEnabled: boolean;
  publisherId: string;
  homeSlotId: string;
  categorySlotId: string;
  listingSlotId: string;
  storyDetailSlotId: string;
  excludeContentWarned: boolean;
}

export interface TtsVoiceOption {
  id: string;
  label: string;
}

interface AppContextValue {
  categories: CategoryItem[];
  languages: LanguageItem[];
  adConfig: AdConfigItem;
  ttsVoices: TtsVoiceOption[];
  totalStories: number;
  bootstrapLoading: boolean;
  refreshBootstrap: () => Promise<void>;
  interfaceLang: InterfaceLanguage;
  setInterfaceLang: (lang: InterfaceLanguage) => void;
  t: Translations;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  fontScale: number;
  setFontScale: (scale: number) => void;
  highContrast: boolean;
  toggleHighContrast: () => void;
  reducedMotion: boolean;
  toggleReducedMotion: () => void;
  visitorKey: string;
  activeEmotionSlug: string | null;
  setActiveEmotionSlug: (slug: string | null) => void;
  getCategoryName: (slug: string) => string;
  getLanguageName: (code: string) => string;
}

const AppContext = createContext<AppContextValue | null>(null);

const DEFAULT_AD_CONFIG: AdConfigItem = {
  adsenseEnabled: false,
  publisherId: '',
  homeSlotId: '',
  categorySlotId: '',
  listingSlotId: '',
  storyDetailSlotId: '',
  excludeContentWarned: true,
};

function getOrCreateVisitorKey(): string {
  try {
    const existing = localStorage.getItem('unheard_visitor_key');
    if (existing) return existing;
    const generated = `v_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
    localStorage.setItem('unheard_visitor_key', generated);
    return generated;
  } catch {
    return 'visitor_session';
  }
}

const BOOTSTRAP_CACHE_KEY = 'avheard_bootstrap_v1';

interface CachedBootstrap {
  categories?: CategoryItem[];
  languages?: LanguageItem[];
  adConfig?: AdConfigItem;
  ttsVoices?: TtsVoiceOption[];
  totalStories?: number;
}

function readCachedBootstrap(): CachedBootstrap | null {
  try {
    const raw = localStorage.getItem(BOOTSTRAP_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const initialCache = readCachedBootstrap();
  const [categories, setCategories] = useState<CategoryItem[]>(initialCache?.categories || []);
  const [languages, setLanguages] = useState<LanguageItem[]>(initialCache?.languages || []);
  const [adConfig, setAdConfig] = useState<AdConfigItem>(
    initialCache?.adConfig || DEFAULT_AD_CONFIG
  );
  const [ttsVoices, setTtsVoices] = useState<TtsVoiceOption[]>(
    initialCache?.ttsVoices || [
      { id: 'Kore', label: 'Kore — Calm & Reflective' },
      { id: 'Zephyr', label: 'Zephyr — Warm & Gentle' },
    ]
  );
  const [totalStories, setTotalStories] = useState(initialCache?.totalStories || 0);
  const [bootstrapLoading, setBootstrapLoading] = useState(!initialCache?.categories?.length);

  const [interfaceLang, setInterfaceLangState] = useState<InterfaceLanguage>(() => {
    try {
      const saved = localStorage.getItem('unheard_ui_lang');
      if (saved === 'hi' || saved === 'hinglish' || saved === 'en') return saved;
    } catch {}
    return 'en';
  });

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('unheard_theme');
      if (saved === 'dark' || saved === 'light') return saved;
    } catch {}
    return 'light';
  });

  const [fontScale] = useState<number>(1);

  const [highContrast, setHighContrast] = useState<boolean>(() => {
    try {
      return localStorage.getItem('unheard_high_contrast') === 'true';
    } catch {
      return false;
    }
  });

  const [reducedMotion] = useState<boolean>(false);

  const [visitorKey] = useState<string>(getOrCreateVisitorKey);
  const [activeEmotionSlug, setActiveEmotionSlug] = useState<string | null>(null);

  const refreshBootstrap = useCallback(async () => {
    try {
      const res = await fetch('/api/bootstrap');
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
        setLanguages(data.languages || []);
        setAdConfig(data.adConfig || DEFAULT_AD_CONFIG);
        if (data.ttsVoices) setTtsVoices(data.ttsVoices);
        setTotalStories(data.totalStories || 0);
        try {
          localStorage.setItem(
            BOOTSTRAP_CACHE_KEY,
            JSON.stringify({
              categories: data.categories || [],
              languages: data.languages || [],
              adConfig: data.adConfig || DEFAULT_AD_CONFIG,
              ttsVoices: data.ttsVoices,
              totalStories: data.totalStories || 0,
            })
          );
        } catch {}
      }
    } catch (err) {
      console.error('Bootstrap load error:', err);
    } finally {
      setBootstrapLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshBootstrap();
  }, [refreshBootstrap]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem('unheard_theme', theme);
    } catch {}
  }, [theme]);

  useEffect(() => {
    document.documentElement.style.setProperty('--font-scale', '1');
    try {
      localStorage.removeItem('unheard_font_scale');
    } catch {}
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (highContrast) root.classList.add('high-contrast');
    else root.classList.remove('high-contrast');
    try {
      localStorage.setItem('unheard_high_contrast', String(highContrast));
    } catch {}
  }, [highContrast]);

  useEffect(() => {
    document.documentElement.classList.remove('reduce-motion');
    try {
      localStorage.removeItem('unheard_reduced_motion');
    } catch {}
  }, []);

  const setInterfaceLang = (lang: InterfaceLanguage) => {
    setInterfaceLangState(lang);
    try {
      localStorage.setItem('unheard_ui_lang', lang);
    } catch {}
  };

  const toggleTheme = () => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  const setFontScale = () => {};
  const toggleHighContrast = () => setHighContrast((prev) => !prev);
  const toggleReducedMotion = () => {};

  const getCategoryName = useCallback(
    (slug: string) => {
      const cat = categories.find((c) => c.slug === slug);
      if (!cat) return slug;
      if (interfaceLang === 'hi') return cat.nameHi;
      if (interfaceLang === 'hinglish') return cat.nameHinglish;
      return cat.name;
    },
    [categories, interfaceLang]
  );

  const getLanguageName = useCallback(
    (code: string) => {
      const lang = languages.find((l) => l.code === code);
      return lang ? lang.nativeName : code;
    },
    [languages]
  );

  return (
    <AppContext.Provider
      value={{
        categories,
        languages,
        adConfig,
        ttsVoices,
        totalStories,
        bootstrapLoading,
        refreshBootstrap,
        interfaceLang,
        setInterfaceLang,
        t: DICTIONARY[interfaceLang],
        theme,
        toggleTheme,
        fontScale,
        setFontScale,
        highContrast,
        toggleHighContrast,
        reducedMotion,
        toggleReducedMotion,
        visitorKey,
        activeEmotionSlug,
        setActiveEmotionSlug,
        getCategoryName,
        getLanguageName,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
