export type InterfaceLanguage = 'en' | 'hi' | 'hinglish';

export interface Translations {
  tagline: string;
  nav: {
    explore: string;
    categories: string;
    languages: string;
    write: string;
    about: string;
    signIn: string;
    saved: string;
    profile: string;
    admin: string;
  };
  hero: {
    kicker: string;
    title: string;
    subtitle: string;
    ctaRead: string;
    ctaWrite: string;
    ctaRandom: string;
  };
  discovery: {
    storyOfTheDay: string;
    featured: string;
    latest: string;
    trending: string;
    mostSupported: string;
    searchPlaceholder: string;
    allCategories: string;
    allLanguages: string;
    readStory: string;
    listenAvailable: string;
    textOnly: string;
    noResults: string;
  };
  write: {
    heading: string;
    subheading: string;
    titleLabel: string;
    contentLabel: string;
    languageLabel: string;
    categoryLabel: string;
    warningLabel: string;
    anonymousConfirm: string;
    privacyConfirm: string;
    submit: string;
    submitting: string;
    manageTab: string;
    publishTab: string;
  };
  story: {
    anonymousAuthor: string;
    backToExplore: string;
    translateLabel: string;
    showOriginal: string;
    supportHeading: string;
    commentsHeading: string;
    loginToComment: string;
    reportStory: string;
    shareStory: string;
    saveStory: string;
    savedStory: string;
  };
  accessibility: {
    themeLight: string;
    themeDark: string;
    fontSize: string;
    contrast: string;
    motion: string;
    interfaceLang: string;
  };
}

export const DICTIONARY: Record<InterfaceLanguage, Translations> = {
  en: {
    tagline: 'Feelings, Not a Story.',
    nav: {
      explore: 'Explore',
      categories: 'Categories',
      languages: 'Languages',
      write: 'Share Feeling',
      about: 'About',
      signIn: 'Sign In',
      saved: 'Saved',
      profile: 'Profile',
      admin: 'Admin',
    },
    hero: {
      kicker: 'Feelings, Not a Story.',
      title: 'A quiet sanctuary for raw human feelings—not polished stories.',
      subtitle:
        'Read and listen freely without creating an account. Let out unspoken emotions anonymously in any of India’s 22 scheduled languages, Hinglish, or English—held in their original script and truth.',
      ctaRead: 'Explore Feelings',
      ctaWrite: 'Share a Feeling',
      ctaRandom: 'Random Feeling',
    },
    discovery: {
      storyOfTheDay: 'Feeling of the Day',
      featured: 'Featured Feelings',
      latest: 'Latest Feelings',
      trending: 'Resonating Now',
      mostSupported: 'Most Supported',
      searchPlaceholder: 'Search feelings by title or emotion…',
      allCategories: 'All Categories',
      allLanguages: 'All Languages',
      readStory: 'Read feeling',
      listenAvailable: 'Voice available',
      textOnly: 'Text reading',
      noResults: 'No feelings matched your filters yet. Clear a filter or share the first feeling.',
    },
    write: {
      heading: 'Share your feeling anonymously',
      subheading:
        'This is a feeling, not a story—no plot or performance needed. No account required, and your original script stays untouched. Save your one-time token to edit or delete later.',
      titleLabel: 'Give this feeling a title',
      contentLabel: 'What are you feeling right now?',
      languageLabel: 'Writing language',
      categoryLabel: 'Emotional space',
      warningLabel: 'Optional content warning',
      anonymousConfirm: 'I confirm this feeling contains no personal phone numbers, addresses, or identifying details.',
      privacyConfirm: 'I understand automated safety checks protect the sanctuary and I agree to the Community Guidelines.',
      submit: 'Share Anonymously',
      submitting: 'Checking safety & sharing…',
      manageTab: 'Manage with Token',
      publishTab: 'Express a Feeling',
    },
    story: {
      anonymousAuthor: 'Anonymous Heart',
      backToExplore: 'Back to Explore',
      translateLabel: 'Optional reading translation',
      showOriginal: 'View Original Script',
      supportHeading: 'Send silent support',
      commentsHeading: 'Reflections & Gentle Responses',
      loginToComment: 'Sign in with Google to leave a thoughtful reflection or reply.',
      reportStory: 'Report feeling',
      shareStory: 'Share link',
      saveStory: 'Save feeling',
      savedStory: 'Saved',
    },
    accessibility: {
      themeLight: 'Light',
      themeDark: 'Dark',
      fontSize: 'Text size',
      contrast: 'High contrast',
      motion: 'Reduced motion',
      interfaceLang: 'Interface',
    },
  },
  hi: {
    tagline: 'यह कहानी नहीं, एक एहसास है।',
    nav: {
      explore: 'एहसास पढ़ें',
      categories: 'श्रेणियाँ',
      languages: 'भाषाएँ',
      write: 'एहसास लिखें',
      about: 'परिचय',
      signIn: 'साइन इन',
      saved: 'सहेजे गए',
      profile: 'प्रोफ़ाइल',
      admin: 'एडमिन',
    },
    hero: {
      kicker: 'AVheard — यह कहानी नहीं, एक एहसास है।',
      title: 'सजी-धजी कहानियों के लिए नहीं, सच्चे और अनकहे एहसासों के लिए एक शांत जगह।',
      subtitle:
        'बिना किसी अकाउंट के लोगों की भावनाएँ पढ़ें और सुनें। भारत की 22 अनुसूचित भाषाओं, हिंग्लिश या अंग्रेज़ी में अपना एहसास गुमनाम रूप से साझा करें—आपकी मूल भाषा और लिपि हमेशा सुरक्षित रहती है।',
      ctaRead: 'एहसास पढ़ें',
      ctaWrite: 'गुमनाम लिखें',
      ctaRandom: 'कोई एक एहसास',
    },
    discovery: {
      storyOfTheDay: 'आज का विशेष एहसास',
      featured: 'चयनित एहसास',
      latest: 'ताज़ा एहसास',
      trending: 'सबसे ज़्यादा महसूस किए गए',
      mostSupported: 'सर्वाधिक समर्थित',
      searchPlaceholder: 'शीर्षक या भावना से खोजें…',
      allCategories: 'सभी श्रेणियाँ',
      allLanguages: 'सभी भाषाएँ',
      readStory: 'पूरा एहसास पढ़ें',
      listenAvailable: 'आवाज़ उपलब्ध',
      textOnly: 'केवल पाठ',
      noResults: 'आपके फ़िल्टर से कोई एहसास नहीं मिला। फ़िल्टर हटाएँ या पहला एहसास लिखें।',
    },
    write: {
      heading: 'अपना एहसास गुमनाम साझा करें',
      subheading:
        'यहाँ कोई कहानी गढ़ने की ज़रूरत नहीं—बस जो दिल में है लिख दीजिए। किसी अकाउंट की आवश्यकता नहीं है और आपकी मूल लिपि वैसी ही रहती है।',
      titleLabel: 'इस एहसास का शीर्षक',
      contentLabel: 'इस वक़्त आप क्या महसूस कर रहे हैं?',
      languageLabel: 'लेखन की भाषा',
      categoryLabel: 'भावनात्मक श्रेणी',
      warningLabel: 'वैकल्पिक सामग्री चेतावनी',
      anonymousConfirm: 'मैं पुष्टि करता/करती हूँ कि इसमें किसी की व्यक्तिगत संपर्क जानकारी या पहचान शामिल नहीं है।',
      privacyConfirm: 'मैं समुदाय के दिशानिर्देशों और स्वचालित सुरक्षा जाँच से सहमत हूँ।',
      submit: 'गुमनाम साझा करें',
      submitting: 'सुरक्षा जाँच और साझा करना जारी…',
      manageTab: 'टोकन से प्रबंधित करें',
      publishTab: 'नया एहसास लिखें',
    },
    story: {
      anonymousAuthor: 'एक अनजान दिल',
      backToExplore: 'सभी एहसासों पर लौटें',
      translateLabel: 'वैकल्पिक अनुवाद',
      showOriginal: 'मूल लिपि देखें',
      supportHeading: 'मौन समर्थन भेजें',
      commentsHeading: 'समुदाय की प्रतिक्रियाएँ',
      loginToComment: 'टिप्पणी करने या उत्तर देने के लिए कृपया साइन इन करें।',
      reportStory: 'रिपोर्ट करें',
      shareStory: 'लिंक साझा करें',
      saveStory: 'सहेजें',
      savedStory: 'सहेजा गया',
    },
    accessibility: {
      themeLight: 'हल्का',
      themeDark: 'गहरा',
      fontSize: 'फ़ॉन्ट आकार',
      contrast: 'उच्च कंट्रास्ट',
      motion: 'कम गति',
      interfaceLang: 'भाषा',
    },
  },
  hinglish: {
    tagline: 'Feelings, Not a Story.',
    nav: {
      explore: 'Explore',
      categories: 'Categories',
      languages: 'Languages',
      write: 'Share Feeling',
      about: 'About',
      signIn: 'Sign In',
      saved: 'Saved',
      profile: 'Profile',
      admin: 'Admin',
    },
    hero: {
      kicker: 'Feelings, Not a Story.',
      title: 'Yeh koi banaawati kahani nahi, bas dil ki asli feelings ke liye ek shant jagah hai.',
      subtitle:
        'Bina account banaye logon ki feelings padhein aur sunein. Apne dil ka bojh anonymously share karein India ki 22 languages, Hinglish, ya English mein—original script aur sachai ke saath.',
      ctaRead: 'Feelings Padhein',
      ctaWrite: 'Feeling Share Karein',
      ctaRandom: 'Random Feeling',
    },
    discovery: {
      storyOfTheDay: 'Aaj Ki Khaas Feeling',
      featured: 'Featured Feelings',
      latest: 'Latest Feelings',
      trending: 'Dil Ko Chhoone Wali',
      mostSupported: 'Most Supported',
      searchPlaceholder: 'Title ya ehsaas se search karein…',
      allCategories: 'Sabhi Categories',
      allLanguages: 'Sabhi Languages',
      readStory: 'Poori feeling padhein',
      listenAvailable: 'Voice available',
      textOnly: 'Text reading',
      noResults: 'Koi feeling nahi mili. Filter reset karein ya pehli feeling likhein.',
    },
    write: {
      heading: 'Apni feeling anonymously share karein',
      subheading:
        'Yahan koi story likhne ka pressure nahi hai—bas jo dil mein hai likh dein. Login zaroori nahi hai, aur aapki original script waise hi rakhi jaati hai.',
      titleLabel: 'Feeling ka title',
      contentLabel: 'Abhi aap kaisa mehsoos kar rahe hain?',
      languageLabel: 'Writing language',
      categoryLabel: 'Category chunein',
      warningLabel: 'Optional content warning',
      anonymousConfirm: 'Main confirm karta/karti hoon ki ismein kisi ka phone number, address ya personal identity nahi hai.',
      privacyConfirm: 'Main Community Guidelines aur automated safety check se sehmat hoon.',
      submit: 'Anonymously Share Karein',
      submitting: 'Safety check aur share ho raha hai…',
      manageTab: 'Token se Manage Karein',
      publishTab: 'Nayi Feeling Likhein',
    },
    story: {
      anonymousAuthor: 'Anonymous Dil',
      backToExplore: 'Explore par wapas',
      translateLabel: 'Optional reading translation',
      showOriginal: 'Original Script Dekhein',
      supportHeading: 'Dil se support bhejein',
      commentsHeading: 'Community Reflections',
      loginToComment: 'Comment ya reply karne ke liye Google se Sign In karein.',
      reportStory: 'Report karein',
      shareStory: 'Link share karein',
      saveStory: 'Save karein',
      savedStory: 'Saved',
    },
    accessibility: {
      themeLight: 'Light',
      themeDark: 'Dark',
      fontSize: 'Text size',
      contrast: 'High contrast',
      motion: 'Reduced motion',
      interfaceLang: 'Language',
    },
  },
};
