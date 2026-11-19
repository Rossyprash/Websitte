import { count } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { adConfig, categories, languages, stories } from '../db/schema.ts';
import { buildExcerpt, estimateReadingTime } from './security.ts';

let seedPromise: Promise<void> | null = null;
let seeded = false;

export const INITIAL_CATEGORIES = [
  {
    slug: 'love-breakup',
    name: 'Love & Breakup',
    nameHi: 'प्रेम और जुदाई',
    nameHinglish: 'Pyaar aur Judai',
    description: 'Stories of devotion, parting ways, and the quiet ache after goodbye.',
    sortOrder: 1,
  },
  {
    slug: 'betrayal',
    name: 'Betrayal',
    nameHi: 'विश्वासघात',
    nameHinglish: 'Dhokha aur Vishwasghat',
    description: 'When trust breaks silently and you have to rebuild what remains.',
    sortOrder: 2,
  },
  {
    slug: 'loneliness',
    name: 'Loneliness',
    nameHi: 'अकेलापन',
    nameHinglish: 'Akelapan',
    description: 'Feeling unseen in crowded rooms, late-night trains, and quiet apartments.',
    sortOrder: 3,
  },
  {
    slug: 'family',
    name: 'Family',
    nameHi: 'परिवार',
    nameHinglish: 'Parivar',
    description: 'Unspoken expectations, generational warmth, distance, and duty.',
    sortOrder: 4,
  },
  {
    slug: 'friendship',
    name: 'Friendship',
    nameHi: 'दोस्ती',
    nameHinglish: 'Dosti',
    description: 'Bonds that carried us through storms, or slowly drifted apart.',
    sortOrder: 5,
  },
  {
    slug: 'life-struggles',
    name: 'Life Struggles',
    nameHi: 'जीवन संघर्ष',
    nameHinglish: 'Zindagi ki Jung',
    description: 'Financial pressure, exhaustion, starting over, and holding on.',
    sortOrder: 6,
  },
  {
    slug: 'memories',
    name: 'Memories',
    nameHi: 'यादें',
    nameHinglish: 'Yaadein',
    description: 'Old verandahs, monsoon evenings, voices we still remember clearly.',
    sortOrder: 7,
  },
  {
    slug: 'regrets',
    name: 'Regrets',
    nameHi: 'पछतावा',
    nameHinglish: 'Pachtava',
    description: 'Words left unsaid, apologies never sent, and roads not taken.',
    sortOrder: 8,
  },
  {
    slug: 'healing',
    name: 'Healing',
    nameHi: 'सुकून और उबरना',
    nameHinglish: 'Sukoon aur Healing',
    description: 'Small mornings when grief feels lighter and breath returns.',
    sortOrder: 9,
  },
  {
    slug: 'student-life',
    name: 'Student Life',
    nameHi: 'छात्र जीवन',
    nameHinglish: 'Student Life',
    description: 'Hostel corridors, exam pressure, small-town dreams, and quiet resilience.',
    sortOrder: 10,
  },
  {
    slug: 'unspoken-feelings',
    name: 'Unspoken Feelings',
    nameHi: 'अनकहे जज़्बात',
    nameHinglish: 'Ankahe Jazbaat',
    description: 'Confessions meant for no particular inbox, finally given a voice.',
    sortOrder: 11,
  },
  {
    slug: 'life-experiences',
    name: 'Life Experiences',
    nameHi: 'जीवन के अनुभव',
    nameHinglish: 'Zindagi ke Tajurbe',
    description: 'Ordinary moments that quietly changed how you look at the world.',
    sortOrder: 12,
  },
  {
    slug: 'other',
    name: 'Other',
    nameHi: 'अन्य',
    nameHinglish: 'Anya',
    description: 'Personal reflections that belong outside every single label.',
    sortOrder: 13,
  },
];

// All 22 Eighth Schedule Indian Languages + English + Hinglish + Other Unicode
export const INITIAL_LANGUAGES = [
  { code: 'en', name: 'English (India)', nativeName: 'English', ttsSupported: true },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', ttsSupported: true },
  { code: 'hinglish', name: 'Hinglish', nativeName: 'Hinglish', ttsSupported: true },
  { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া', ttsSupported: false },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', ttsSupported: true },
  { code: 'brx', name: 'Bodo', nativeName: "बर'", ttsSupported: false },
  { code: 'doi', name: 'Dogri', nativeName: 'डोगरी', ttsSupported: false },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', ttsSupported: true },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', ttsSupported: true },
  { code: 'ks', name: 'Kashmiri', nativeName: 'कॉशुर / کٲشُر', ttsSupported: false },
  { code: 'kok', name: 'Konkani', nativeName: 'कोंकणी', ttsSupported: false },
  { code: 'mai', name: 'Maithili', nativeName: 'मैथिली', ttsSupported: false },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', ttsSupported: true },
  { code: 'mni', name: 'Manipuri', nativeName: 'মৈতৈলোন্', ttsSupported: false },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', ttsSupported: true },
  { code: 'ne', name: 'Nepali', nativeName: 'नेपाली', ttsSupported: false },
  { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ', ttsSupported: false },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', ttsSupported: true },
  { code: 'sa', name: 'Sanskrit', nativeName: 'संस्कृतम्', ttsSupported: false },
  { code: 'sat', name: 'Santali', nativeName: 'ᱥᱟᱱᱛᱟᱲᱤ', ttsSupported: false },
  { code: 'sd', name: 'Sindhi', nativeName: 'سنڌي', ttsSupported: false },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', ttsSupported: true },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', ttsSupported: true },
  { code: 'ur', name: 'Urdu', nativeName: 'اُردُو', ttsSupported: true },
  { code: 'other', name: 'Other Unicode Script', nativeName: 'Unicode / Other', ttsSupported: false },
];

const INITIAL_STORIES = [
  {
    slug: 'the-platform-bench-at-six-thirty',
    title: 'The Platform Bench That Still Knows My Name',
    content: `Every evening at six-thirty, the local train slows down before entering Dadar, and for three seconds the yellow light of the third platform crosses my window. For four years, you waited right beside the bookstall with two cups of cutting chai cooling between your palms.

We never had dramatic arguments. We simply ran out of courage at the same time—you afraid to leave a home that needed you, and I afraid to ask you to choose a life that was still uncertain.

Last week I stood on that same platform after three winters away. The bookstall now sells phone chargers alongside paperbacks. Nobody there recognized me, yet I sat on the iron bench for twenty minutes just so the evening would not feel wasted. I think healing is not forgetting; it is finally being able to sit beside an old memory without wanting to board a train away from yourself.`,
    languageCode: 'en',
    categorySlug: 'love-breakup',
    isFeatured: true,
    isStoryOfTheDay: true,
    isAdEligible: true,
    supportCount: 148,
    viewCount: 920,
    trendingScore: 310,
  },
  {
    slug: 'pita-ji-ki-purani-diary-aur-khamoshi',
    title: 'पिताजी की पुरानी डायरी और वो अनकहा धन्यवाद',
    content: `घर की अलमारी साफ करते हुए मुझे पिताजी की 2008 वाली नीली डायरी मिली। बाहर से साधारण दिखने वाली उस डायरी के हर पन्ने पर मेरे स्कूल की फीस, बस के किराए और महीने के राशन का हिसाब लिखा था।

लेकिन आख़िरी पन्ने पर, बिना किसी तारीख के, बस एक लाइन लिखी थी — "आज बेटे ने पहली बार अपने हिस्से की मिठाई छोटी बहन के लिए बचाई, लगा कि मेहनत सफल हो गई।"

हम दोनों ने कभी एक-दूसरे से गले लगकर बात नहीं की। हमारी पीढ़ी में प्यार अक्सर चुपचाप निभाई गई ज़िम्मेदारियों में छिपा रहता था। आज जब मैं खुद कमाने लगा हूँ, तो समझ आता है कि उनकी सख़्ती के पीछे कितनी थकान और कितनी परवाह छुपी थी। काश मैं एक दिन बिना झिझक कह पाता — आपने बहुत कुछ अकेले संभाला, पापा।`,
    languageCode: 'hi',
    categorySlug: 'family',
    isFeatured: true,
    isStoryOfTheDay: false,
    isAdEligible: true,
    supportCount: 214,
    viewCount: 1180,
    trendingScore: 390,
  },
  {
    slug: 'hostel-room-304-and-the-2am-maggi',
    title: 'Hostel Room 304, 2 AM Maggi, aur Vo Ek Call Jo Nahi Ki',
    content: `Third year ke end mein jab sab placements ki race mein lage the, main har raat 2 baje balcony mein khada hoke apni family ki EMI calculate karta rehta tha. Sab ko lagta tha main bas silent type hoon, par sach yeh tha ki dar ke maare neend hi nahi aati thi.

Ek raat mere roommate ne bina kuch pooche do cup chai banayi aur bola, "Bhai, aaj padhai band kar, bas baith." Us ek sentence ne mujhe us raat tootne se bacha liya.

Aaj main ek acchi city mein job kar raha hoon, par hum dono alag shehron mein busy ho gaye hain. Kai baar phone uthata hoon aur phir rakh deta hoon yeh soch ke ki ab kya bolunga. Agar tum kabhi yeh padho, toh bas itna jaan lena — tumhari us raat ki khamosh dosti ne meri poori zindagi sambhal li.`,
    languageCode: 'hinglish',
    categorySlug: 'friendship',
    isFeatured: false,
    isStoryOfTheDay: false,
    isAdEligible: true,
    supportCount: 176,
    viewCount: 845,
    trendingScore: 280,
  },
  {
    slug: 'bristi-shesher-chithi-kolkata',
    title: 'বৃষ্টি শেষের না-পাঠানো চিঠি',
    content: `কলকাতার এই ছোট মেসবাড়ির জানলার পাশে বসে যখন বিকেলের বৃষ্টি দেখি, তখন মনে হয় শহরটা আসলে কাউকে ভোলে না—শুধু সময়গুলোকে আলাদা আলাদা তাকে তুলে রাখে।

গত তিন বছর ধরে নিজের সাথে একটা বোঝাপড়া করার চেষ্টা করছি। যে স্বপ্নগুলো নিয়ে বাড়ি ছেড়েছিলাম, তার অর্ধেক হয়তো বদলে গেছে, কিন্তু মনের ভেতরের মানুষটা এখনো সেই পুরনো গলির মোড়ে দাঁড়িয়ে আছে। আজ প্রথমবার মনে হলো, সব উত্তর আজই খুঁজে না পেলেও চলে। বেঁচে থাকাটাও কখনো কখনো একটা নীরব সাহস।`,
    languageCode: 'bn',
    categorySlug: 'healing',
    isFeatured: true,
    isStoryOfTheDay: false,
    isAdEligible: true,
    supportCount: 94,
    viewCount: 510,
    trendingScore: 190,
  },
  {
    slug: 'mazhai-iravu-marina-kadarkarai',
    title: 'மழை இரவில் சொல்லாமல் விட்ட வார்த்தைகள்',
    content: `சென்னைக்கு வேலை தேடி வந்த முதல் ஆறு மாதங்கள் என் வாழ்க்கையின் மிக அமைதியான, ஆனால் கனமான நாட்கள். அறையில் மின்விசிறியின் சத்தம் மட்டுமே துணை. அம்மாவுக்கு போன் செய்யும்போதெல்லாம் "நான் நன்றாக இருக்கிறேன்" என்று மட்டும் சொல்வேன்.

உண்மையில், தனிமை என்பது யாரும் இல்லாதது அல்ல; நம் மனதில் உள்ளதை முழுமையாகப் புரிந்துகொள்ள ஒருவர் அருகில் இல்லாததுதான். இன்று அந்த நாட்களைத் திரும்பிப் பார்க்கும்போது, என்னை நானே கட்டிப்பிடித்துக் கொள்ள வேண்டும் போலிருக்கிறது. அந்த தனிமையில்தான் என் உண்மையான வலிமை பிறந்தது.`,
    languageCode: 'ta',
    categorySlug: 'loneliness',
    isFeatured: false,
    isStoryOfTheDay: false,
    isAdEligible: true,
    supportCount: 112,
    viewCount: 612,
    trendingScore: 225,
  },
  {
    slug: 'paus-pune-aani-apoorna-swapna',
    title: 'पुण्याच्या पहिल्या पावसात हरवलेलं एक स्वप्न',
    content: `स्पर्धा परीक्षांच्या त्या तीन वर्षांत मी स्वतःला इतकं हरवून बसलो होतो की, आरशात पाहतानाही ओळख पटत नव्हती. निकाल न लागल्यावर नातेवाईकांचे प्रश्न आणि मनातली अपराधी भावना रात्रभर जागी ठेवायची.

पण गेल्या महिन्यात एका लहानशा डिझाइन स्टुडिओत काम मिळालं. पगार मोठा नाही, पण संध्याकाळी घरी येताना मनावर दडपण नसतं. अपयश म्हणजे आयुष्याचा शेवट नसतो—कधी कधी ते आपल्या खऱ्या वाटेची सुरुवात असते.`,
    languageCode: 'mr',
    categorySlug: 'student-life',
    isFeatured: false,
    isStoryOfTheDay: false,
    isAdEligible: true,
    supportCount: 89,
    viewCount: 440,
    trendingScore: 170,
  },
  {
    slug: 'khamosh-raaton-ka-sabr-urdu',
    title: 'خاموش راتوں کا صبر اور ایک نیا سویرا',
    content: `زندگی میں کچھ موڑ ایسے آتے ہیں جہاں انسان کے پاس کہنے کو بہت کچھ ہوتا ہے، مگر سننے والا کوئی نہیں ملتا۔ میں نے برسوں اپنے اندر کی اداسی کو مسکراہٹ کے پیچھے چھپایا تاکہ گھر والوں کو فکر نہ ہو۔

لیکن آج جب میں نے پہلی بار اپنے دل کا بوجھ لفظوں میں اتارا ہے، تو لگتا ہے جیسے بند کمرے کی کھڑکی کھل گئی ہو۔ ہر درد کو نام دینا ضروری نہیں ہوتا، بس اسے قبول کر لینا ہی شفا کا پہلا قدم ہے۔`,
    languageCode: 'ur',
    categorySlug: 'unspoken-feelings',
    isFeatured: false,
    isStoryOfTheDay: false,
    isAdEligible: true,
    supportCount: 105,
    viewCount: 495,
    trendingScore: 205,
  },
  {
    slug: 'the-apology-i-wrote-seven-years-late',
    title: 'The Apology I Wrote Seven Years Too Late',
    content: `In our final year of college, I chose pride over honesty when our team fell apart. I let a close friend carry the blame for a mistake that started with my silence. We stopped speaking the week after convocation.

Seven years later, I typed out a three-paragraph message, stared at the send button for forty minutes, and finally pressed it without expecting forgiveness. He replied two days later with just four words: "Thank you for saying it."

Regret does not disappear when we confess it, but carrying it in the dark makes it heavier than it needs to be.`,
    languageCode: 'en',
    categorySlug: 'regrets',
    contentWarning: 'Emotional Distress',
    isFeatured: false,
    isStoryOfTheDay: false,
    isAdEligible: false,
    supportCount: 132,
    viewCount: 730,
    trendingScore: 245,
  },
];

export async function ensureSeeded(): Promise<void> {
  if (seeded) return;
  if (seedPromise) return seedPromise;

  seedPromise = (async () => {
    try {
      const [{ value: catCount }] = await db.select({ value: count() }).from(categories);
      if (Number(catCount) === 0) {
        await db.insert(categories).values(INITIAL_CATEGORIES).onConflictDoNothing();
      }

      const [{ value: langCount }] = await db.select({ value: count() }).from(languages);
      if (Number(langCount) === 0) {
        await db.insert(languages).values(INITIAL_LANGUAGES).onConflictDoNothing();
      }

      const [{ value: adCount }] = await db.select({ value: count() }).from(adConfig);
      if (Number(adCount) === 0) {
        await db.insert(adConfig).values({
          adsenseEnabled: false,
          publisherId: '',
          homeSlotId: '',
          categorySlotId: '',
          listingSlotId: '',
          storyDetailSlotId: '',
          excludeContentWarned: true,
        });
      }

      const [{ value: storyCount }] = await db.select({ value: count() }).from(stories);
      if (Number(storyCount) === 0) {
        const rows = INITIAL_STORIES.map((s) => ({
          ...s,
          excerpt: buildExcerpt(s.content),
          readingTimeMinutes: estimateReadingTime(s.content),
          status: 'approved',
        }));
        await db.insert(stories).values(rows).onConflictDoNothing();
      }

      seeded = true;
    } catch (error) {
      console.error('Lazy seed check error:', error);
    } finally {
      seedPromise = null;
    }
  })();

  return seedPromise;
}
