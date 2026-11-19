import { GoogleGenAI, Type } from '@google/genai';

function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export interface ModerationResult {
  status: 'approved' | 'pending' | 'flagged';
  isAdEligible: boolean;
  suggestedWarning: string | null;
  reason: string;
}

const SPAM_PATTERNS = [
  /https?:\/\/[^\s]+/i,
  /\b(buy now|crypto|casino|betting|loan offer|whatsapp me|telegram @)\b/i,
  /(.)\1{10,}/,
];

const SEVERE_KEYWORDS = [
  /\b(kill myself|commit suicide|end my life)\b/i,
  /\b(bomb|terrorist attack)\b/i,
];

export async function moderateStoryContent(
  title: string,
  content: string,
  languageCode: string,
  userWarning?: string | null
): Promise<ModerationResult> {
  const combined = `${title}\n${content}`;

  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(combined)) {
      return {
        status: 'pending',
        isAdEligible: false,
        suggestedWarning: userWarning || null,
        reason: 'Automated check flagged promotional links or repetitive spam patterns for review.',
      };
    }
  }

  for (const pattern of SEVERE_KEYWORDS) {
    if (pattern.test(combined)) {
      return {
        status: 'flagged',
        isAdEligible: false,
        suggestedWarning: userWarning || 'Emotional Crisis & Sensitive Themes',
        reason: 'Flagged for gentle safety review due to crisis-related phrasing.',
      };
    }
  }

  const ai = getAiClient();
  if (!ai) {
    return {
      status: 'approved',
      isAdEligible: !userWarning,
      suggestedWarning: userWarning || null,
      reason: 'Passed baseline safety verification.',
    };
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `Evaluate this anonymous story submission (language code: ${languageCode}) for safety on an emotional storytelling sanctuary.
Title: ${title}
Story: ${content.slice(0, 3000)}

Classify carefully:
- "approved": authentic personal emotional writing, grief, heartbreak, loneliness, family, healing, struggles (even if sad or vulnerable).
- "pending": commercial spam, gibberish, or borderline harassment needing human review.
- "flagged": hate speech, graphic violence, explicit sexual content, doxxing (phone numbers/addresses/full names of private individuals), or immediate self-harm instructions.
Also decide "isAdEligible": false if the content deals with trauma, abuse, grief, self-harm, or sensitive topics unsuitable for Google AdSense; true if safe and contemplative.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            status: {
              type: Type.STRING,
              description: 'One of: approved, pending, flagged',
            },
            isAdEligible: {
              type: Type.BOOLEAN,
              description: 'Whether this story is safe for general AdSense monetization.',
            },
            suggestedWarning: {
              type: Type.STRING,
              description: 'Short content warning label if sensitive, or empty string if none.',
            },
            reason: {
              type: Type.STRING,
              description: 'Brief moderation summary.',
            },
          },
          required: ['status', 'isAdEligible', 'reason'],
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim());
    const status =
      parsed.status === 'flagged' || parsed.status === 'pending' ? parsed.status : 'approved';
    const warning = userWarning || (parsed.suggestedWarning ? String(parsed.suggestedWarning) : null);

    return {
      status,
      isAdEligible: Boolean(parsed.isAdEligible) && !warning && status === 'approved',
      suggestedWarning: warning,
      reason: String(parsed.reason || 'Checked by automated safety filter.'),
    };
  } catch (error) {
    console.error('Gemini moderation fallback triggered:', error);
    return {
      status: 'approved',
      isAdEligible: !userWarning,
      suggestedWarning: userWarning || null,
      reason: 'Passed baseline safety verification.',
    };
  }
}

export async function translateStoryText(
  title: string,
  content: string,
  targetLanguage: 'English' | 'Hindi' | 'Hinglish'
): Promise<{ title: string; content: string }> {
  const ai = getAiClient();
  if (!ai) {
    throw new Error('Translation service is currently unavailable.');
  }

  const targetInstruction =
    targetLanguage === 'Hindi'
      ? 'Translate faithfully into natural, empathetic Hindi (Devanagari script), preserving the emotional tone and line breaks.'
      : targetLanguage === 'Hinglish'
        ? 'Translate faithfully into natural, warm Hinglish (conversational Hindi written in Roman script mixed naturally with English), preserving emotional nuance and paragraph breaks.'
        : 'Translate faithfully into natural, empathetic English, preserving the emotional nuance and paragraph breaks.';

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: `${targetInstruction}\n\nTitle: ${title}\n\nStory:\n${content}`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          content: { type: Type.STRING },
        },
        required: ['title', 'content'],
      },
    },
  });

  const parsed = JSON.parse((response.text ?? '{}').trim());
  if (!parsed.title || !parsed.content) {
    throw new Error('Could not generate translation.');
  }
  return { title: String(parsed.title), content: String(parsed.content) };
}

export const AVAILABLE_TTS_VOICES = [
  { id: 'Kore', label: 'Kore — Calm & Reflective' },
  { id: 'Zephyr', label: 'Zephyr — Warm & Gentle' },
  { id: 'Charon', label: 'Charon — Deep & Grounded' },
  { id: 'Puck', label: 'Puck — Clear & Conversational' },
] as const;

export async function generateSpeechAudio(
  text: string,
  languageName: string,
  voiceName = 'Kore'
): Promise<{ audioBase64: string; mimeType: string } | null> {
  const ai = getAiClient();
  if (!ai) {
    return null;
  }

  const safeVoice = AVAILABLE_TTS_VOICES.some((v) => v.id === voiceName) ? voiceName : 'Kore';
  // Keep TTS segment concise for reliable low-latency WAV generation
  const trimmedText = text.trim().slice(0, 2200);

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: trimmedText,
              speechMetadata: {
                style: `Calm, empathetic, unhurried storytelling narration in ${languageName}`,
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: safeVoice },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) return null;

    return {
      audioBase64: base64Audio,
      mimeType: 'audio/wav',
    };
  } catch (error) {
    console.error('Gemini TTS generation error:', error);
    return null;
  }
}

export interface VoiceAnalysisResult {
  transcript: string;
  title: string;
  categorySlug: string;
  languageCode: string;
  contentWarning: string;
  detectedEmotionLabel: string;
  instructionFollowed: string;
}

const VALID_CATEGORY_SLUGS = [
  'love-breakup',
  'betrayal',
  'loneliness',
  'family',
  'friendship',
  'life-struggles',
  'memories',
  'regrets',
  'healing',
  'student-life',
  'unspoken-feelings',
  'life-experiences',
  'other',
] as const;

export async function analyzeVoiceFeeling(params: {
  audioBase64: string;
  mimeType: string;
  userInstruction?: string;
  autoCreateHeadingAndEmotion?: boolean;
  validLanguageCodes?: string[];
}): Promise<VoiceAnalysisResult> {
  const ai = getAiClient();
  if (!ai) {
    throw new Error('Voice understanding service is currently unavailable.');
  }

  const safeMime = params.mimeType.startsWith('audio/') ? params.mimeType : 'audio/webm';

  // Step 1: Transcribe the speaker's real voice faithfully in its original language & script
  const transcriptionResponse = await ai.models.generateContent({
    model: 'gemini-3.5-transcribe',
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: safeMime,
            data: params.audioBase64,
          },
        },
        {
          text: 'Transcribe this personal voice recording verbatim in the exact spoken language and natural script (Devanagari for Hindi if spoken clearly in Hindi, Roman/Hinglish if mixed Hindi-English, English if English, or the native regional script). Preserve every genuine emotional expression without censoring or rewriting.',
        },
      ],
    },
  });

  const rawTranscript = (transcriptionResponse.text ?? '').trim();
  if (!rawTranscript) {
    throw new Error('Could not hear clear speech in the recording. Please speak a little closer to the mic and try again.');
  }

  const autoGenerate = params.autoCreateHeadingAndEmotion !== false;
  const userInstruction = (params.userInstruction || '').trim();
  const validLangs = params.validLanguageCodes?.length
    ? params.validLanguageCodes.join(', ')
    : 'en, hi, hinglish, bn, ta, te, mr, gu, kn, ml, pa, ur, or, as';

  // Step 2: Analyze emotion, category, language, heading, and respect any spoken or typed instructions
  const analysisResponse = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: `You are helping someone express a raw personal feeling on AVheard ("Feelings, Not a Story.").
Here is the exact transcript of their voice recording:
"""
${rawTranscript}
"""

User's optional written instruction: "${userInstruction || 'None provided'}"
Auto-generate heading & emotion requested: ${autoGenerate ? 'YES' : 'NO (only detect basic category if obvious, leave title empty unless they asked inside their voice)'}

Rules:
1. Check if the speaker gave instructions either inside the transcript itself (e.g., "heading rakhna...", "make the title...", "do not make a heading", "keep my exact words") OR in the written instruction above. Follow their instruction faithfully.
2. "transcript": Keep the speaker's real feeling text intact in its original script & language. Only remove obvious spoken command meta-instructions if they explicitly asked for formatting/heading instructions at the very start or end (otherwise keep their full feeling).
3. "categorySlug": Choose the SINGLE best emotional room from: ${VALID_CATEGORY_SLUGS.join(', ')}.
4. "languageCode": Choose the closest language code from: ${validLangs}. Use "hinglish" if it's natural conversational Hindi+English in Roman script.
5. "title": ${
      autoGenerate
        ? 'Create a short, poetic, heartfelt heading (4 to 10 words) in the same language/script as the feeling, reflecting its true emotion (or follow the user instruction if they specified one).'
        : 'Leave as empty string "" unless the user explicitly asked for a specific title in their instruction.'
    }
6. "detectedEmotionLabel": 2-4 words describing the emotional tone heard (e.g. "Heavy & Unspoken", "Warm Family Longing", "Quiet Healing").
7. "contentWarning": Short gentle label only if heavy distress/abuse/grief is present, else "".
8. "instructionFollowed": Brief 1-sentence note confirming how their voice and any instructions were handled.`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          transcript: { type: Type.STRING },
          title: { type: Type.STRING },
          categorySlug: { type: Type.STRING },
          languageCode: { type: Type.STRING },
          contentWarning: { type: Type.STRING },
          detectedEmotionLabel: { type: Type.STRING },
          instructionFollowed: { type: Type.STRING },
        },
        required: [
          'transcript',
          'title',
          'categorySlug',
          'languageCode',
          'detectedEmotionLabel',
          'instructionFollowed',
        ],
      },
    },
  });

  const parsed = JSON.parse((analysisResponse.text ?? '{}').trim());
  const categorySlug = VALID_CATEGORY_SLUGS.includes(parsed.categorySlug)
    ? parsed.categorySlug
    : 'unspoken-feelings';

  return {
    transcript: String(parsed.transcript || rawTranscript).trim(),
    title: String(parsed.title || '').trim(),
    categorySlug,
    languageCode: String(parsed.languageCode || 'en').trim(),
    contentWarning: String(parsed.contentWarning || '').trim(),
    detectedEmotionLabel: String(parsed.detectedEmotionLabel || 'Heartfelt Expression').trim(),
    instructionFollowed: String(
      parsed.instructionFollowed || 'Detected emotion and heading from your voice.'
    ).trim(),
  };
}

