import { useEffect, useRef, useState } from 'react';
import { Loader2, Pause, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { useApp } from '../contexts/AppContext.tsx';

interface AudioPlayerProps {
  storyId: number;
  title: string;
  content: string;
  languageCode: string;
  ttsSupported: boolean;
  realVoiceData?: string | null;
  realVoiceMime?: string | null;
}

const SPEECH_LANG_MAP: Record<string, string> = {
  en: 'en-IN',
  hi: 'hi-IN',
  hinglish: 'hi-IN',
  bn: 'bn-IN',
  ta: 'ta-IN',
  te: 'te-IN',
  mr: 'mr-IN',
  gu: 'gu-IN',
  kn: 'kn-IN',
  ml: 'ml-IN',
  pa: 'pa-IN',
  ur: 'ur-PK',
};

export function AudioPlayer({
  storyId,
  title,
  content,
  languageCode,
  ttsSupported,
  realVoiceData,
  realVoiceMime,
}: AudioPlayerProps) {
  const { ttsVoices, getLanguageName, reducedMotion } = useApp();
  const [selectedVoice, setSelectedVoice] = useState(ttsVoices[0]?.id || 'Kore');
  const [speed, setSpeed] = useState(1);
  const [status, setStatus] = useState<'idle' | 'loading' | 'playing' | 'paused'>('idle');
  const [mode, setMode] = useState<'real-voice' | 'studio' | 'browser' | 'text-only'>(
    realVoiceData ? 'real-voice' : ttsSupported ? 'studio' : 'browser'
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [showTranscript, setShowTranscript] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const browserUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [storyId]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  }, [speed]);

  const startBrowserFallback = (fallbackNotice?: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setMode('text-only');
      setStatus('idle');
      setNotice(
        `Voice playback is unavailable for ${getLanguageName(
          languageCode
        )} on this device. Full text reading and transcripts remain available below.`
      );
      return;
    }

    const voices = window.speechSynthesis.getVoices();
    const targetBcp47 = SPEECH_LANG_MAP[languageCode] || 'en-IN';
    const matchingVoice = voices.find((v) =>
      v.lang.toLowerCase().startsWith(targetBcp47.split('-')[0])
    );

    if (!ttsSupported && !matchingVoice && languageCode !== 'en') {
      setMode('text-only');
      setStatus('idle');
      setNotice(
        `Voice narration is not yet supported for ${getLanguageName(
          languageCode
        )}. Showing clear text-only reading mode.`
      );
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(`${title}. ${content}`);
    utterance.lang = targetBcp47;
    utterance.rate = speed;
    if (matchingVoice) utterance.voice = matchingVoice;

    utterance.onend = () => {
      setStatus('idle');
      setProgress(100);
    };
    utterance.onerror = () => {
      setMode('text-only');
      setStatus('idle');
      setNotice('Browser voice playback could not start; switched to text-only reading.');
    };

    browserUtteranceRef.current = utterance;
    setMode('browser');
    setNotice(fallbackNotice || 'Playing via built-in browser voice.');
    setStatus('playing');
    window.speechSynthesis.speak(utterance);
  };

  const handlePlayPause = async () => {
    if (mode === 'text-only') return;

    if (mode === 'browser' && 'speechSynthesis' in window) {
      if (status === 'playing') {
        window.speechSynthesis.pause();
        setStatus('paused');
        return;
      }
      if (status === 'paused') {
        window.speechSynthesis.resume();
        setStatus('playing');
        return;
      }
    }

    if (audioRef.current) {
      if (status === 'playing') {
        audioRef.current.pause();
        setStatus('paused');
        return;
      }
      if (status === 'paused') {
        await audioRef.current.play();
        setStatus('playing');
        return;
      }
    }

    if (mode === 'real-voice' && realVoiceData) {
      try {
        const binaryStr = atob(realVoiceData);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: realVoiceMime || 'audio/webm' });
        if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
        const url = URL.createObjectURL(blob);
        audioUrlRef.current = url;

        const audio = new Audio(url);
        audio.playbackRate = speed;
        audio.onloadedmetadata = () => setDuration(audio.duration || 0);
        audio.ontimeupdate = () => {
          setCurrentTime(audio.currentTime);
          if (audio.duration > 0) {
            setProgress((audio.currentTime / audio.duration) * 100);
          }
        };
        audio.onended = () => {
          setStatus('idle');
          setProgress(100);
        };
        audioRef.current = audio;
        setNotice("Playing the author's real recorded voice.");
        await audio.play();
        setStatus('playing');
        return;
      } catch {
        setMode(ttsSupported ? 'studio' : 'browser');
      }
    }

    if (!ttsSupported) {
      startBrowserFallback();
      return;
    }

    setStatus('loading');
    setNotice(null);

    try {
      const res = await fetch(`/api/stories/${storyId}/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voiceName: selectedVoice }),
      });
      const data = await res.json();

      if (!data.available || !data.audioBase64) {
        startBrowserFallback(data.reason);
        return;
      }

      const binaryStr = atob(data.audioBase64);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: data.mimeType || 'audio/wav' });
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
      const url = URL.createObjectURL(blob);
      audioUrlRef.current = url;

      const audio = new Audio(url);
      audio.playbackRate = speed;
      audio.onloadedmetadata = () => setDuration(audio.duration || 0);
      audio.ontimeupdate = () => {
        setCurrentTime(audio.currentTime);
        if (audio.duration > 0) {
          setProgress((audio.currentTime / audio.duration) * 100);
        }
      };
      audio.onended = () => {
        setStatus('idle');
        setProgress(100);
      };

      audioRef.current = audio;
      setMode('studio');
      setNotice(data.cached ? 'Playing cached studio voice.' : 'Studio voice ready.');
      await audio.play();
      setStatus('playing');
    } catch {
      startBrowserFallback('Switched to browser voice fallback.');
    }
  };

  const handleRestart = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
      setStatus('playing');
    } else if (mode === 'browser' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      startBrowserFallback();
    }
  };

  const handleVoiceChange = (voiceId: string) => {
    setSelectedVoice(voiceId);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setStatus('idle');
      setProgress(0);
    }
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = Math.floor(secs % 60);
    return `${mins}:${rem.toString().padStart(2, '0')}`;
  };

  return (
    <section
      aria-label="Feeling audio player"
      className="ios-liquid-glass my-6 rounded-[28px] border border-white/85 p-5 dark:border-white/10"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative inline-flex">
            {!reducedMotion && status === 'playing' && (
              <span
                aria-hidden="true"
                className="animate-breathe-ring pointer-events-none absolute -inset-1.5 rounded-full border border-[#3B828E]"
              />
            )}
            <button
              type="button"
              onClick={handlePlayPause}
              disabled={status === 'loading' || mode === 'text-only'}
              aria-label={status === 'playing' ? 'Pause audio' : 'Listen to this feeling'}
              className={`relative inline-flex min-h-[42px] items-center gap-2 rounded-full bg-[#3B828E] px-5 py-2 text-sm font-medium text-white shadow-[0_8px_20px_-8px_rgba(59,130,142,0.65)] transition-all hover:scale-[1.03] hover:bg-[#2E6A75] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap shrink-0 ${
                !reducedMotion && mode !== 'text-only' ? 'animate-breathe' : ''
              }`}
            >
            {status === 'loading' ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : mode === 'text-only' ? (
              <VolumeX className="h-4 w-4" aria-hidden="true" />
            ) : status === 'playing' ? (
              <Pause className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Play className="h-4 w-4" aria-hidden="true" />
            )}
            <span>
              {status === 'loading'
                ? 'Preparing voice…'
                : mode === 'text-only'
                  ? 'Text-only reading'
                  : status === 'playing'
                    ? 'Pause'
                    : status === 'paused'
                      ? 'Resume'
                      : 'Listen'}
            </span>
          </button>
          </div>

          {status !== 'idle' && mode !== 'text-only' && (
            <button
              type="button"
              onClick={handleRestart}
              aria-label="Restart voice playback"
              className="ios-glass-bubble inline-flex min-h-[42px] items-center gap-1.5 rounded-full border border-white/80 px-4 py-2 text-xs font-medium text-[#223142] transition-transform hover:scale-[1.03] dark:border-white/10 dark:text-[#EEF4F8] whitespace-nowrap shrink-0"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Restart</span>
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {ttsSupported && mode !== 'text-only' && (
            <label className="flex items-center gap-2 text-xs text-[#54657A] dark:text-[#A9BACB]">
              <span>Voice</span>
              <select
                value={selectedVoice}
                onChange={(e) => handleVoiceChange(e.target.value)}
                aria-label="Select narrator voice"
                className="ios-glass-bubble min-h-[38px] rounded-full border border-white/80 px-3.5 py-1.5 text-xs text-[#223142] dark:border-white/10 dark:text-[#EEF4F8]"
              >
                {ttsVoices.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="flex items-center gap-2 text-xs text-[#54657A] dark:text-[#A9BACB]">
            <span>Speed</span>
            <select
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              aria-label="Select playback speed"
              className="ios-glass-bubble min-h-[38px] rounded-full border border-white/80 px-3.5 py-1.5 text-xs text-[#223142] dark:border-white/10 dark:text-[#EEF4F8]"
            >
              <option value={0.75}>0.75x</option>
              <option value={1}>1.0x</option>
              <option value={1.25}>1.25x</option>
              <option value={1.5}>1.5x</option>
            </select>
          </label>

          <button
            type="button"
            onClick={() => setShowTranscript((prev) => !prev)}
            className="ios-glass-bubble min-h-[38px] rounded-full border border-white/80 px-4 py-1.5 text-xs font-medium text-[#223142] transition-transform hover:scale-[1.03] dark:border-white/10 dark:text-[#EEF4F8] whitespace-nowrap shrink-0"
          >
            {showTranscript ? 'Hide Transcript' : 'Accessible Transcript'}
          </button>
        </div>
      </div>

      {(mode === 'studio' || mode === 'real-voice') && duration > 0 && (
        <div className="mt-4">
          <div className="h-2 w-full overflow-hidden rounded-full bg-[#D7E3EC] dark:bg-[#362E2C]">
            <div
              className="h-full rounded-full bg-[#3B828E] transition-all duration-150"
              style={{ width: `${Math.min(100, progress)}%` }}
            />
          </div>
          <div className="mt-1.5 flex justify-between font-mono-tabular text-xs text-[#54657A] dark:text-[#A9BACB]">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[#54657A] dark:text-[#A9BACB]">
        <Volume2 className="h-3.5 w-3.5 shrink-0 text-[#3B828E]" aria-hidden="true" />
        <span>
          {notice ||
            (realVoiceData && mode === 'real-voice'
              ? `Real recorded voice shared by the author in ${getLanguageName(languageCode)}.`
              : ttsSupported
                ? `Voice playback available in ${getLanguageName(languageCode)} (Studio TTS with browser fallback).`
                : `Text-only reading recommended for ${getLanguageName(
                    languageCode
                  )}; browser voice is used only if supported on your device.`)}
        </span>
      </div>

      {showTranscript && (
        <div className="mt-4 rounded-2xl border border-white/80 bg-white/85 p-4 text-sm leading-relaxed text-[#223142] dark:border-white/10 dark:bg-[#121820] dark:text-[#E5DCD6]">
          <p className="mb-2 text-xs font-semibold tracking-wider text-[#3B828E] uppercase">
            Verbatim Spoken Transcript ({getLanguageName(languageCode)})
          </p>
          <p className="whitespace-pre-line">{`${title}\n\n${content}`}</p>
        </div>
      )}
    </section>
  );
}
