import React from 'react';
import { Languages, Sparkles, CheckCircle2, ArrowRight, Loader2, ArrowLeftRight, Check } from 'lucide-react';
import { SUPPORTED_LANGUAGES, detectLanguage } from '../utils/translator';

export default function LanguageSelector({
  sourceLanguage,
  setSourceLanguage,
  targetLanguage,
  setTargetLanguage,
  onTranslateAll,
  isTranslating,
  translationProgress,
  segmentCount,
  sampleSegments = []
}) {
  const sampleOriginal = sampleSegments[0]?.text || "Welcome to our video caption generator!";
  const detected = detectLanguage(sampleOriginal);

  const sourceLangObj = SUPPORTED_LANGUAGES.find(l => l.code === (sourceLanguage === 'auto' ? detected : sourceLanguage)) || SUPPORTED_LANGUAGES[0];
  const targetLangObj = SUPPORTED_LANGUAGES.find(l => l.code === targetLanguage) || SUPPORTED_LANGUAGES[1];

  const handleSwap = () => {
    if (sourceLanguage !== 'auto') {
      const temp = sourceLanguage;
      setSourceLanguage(targetLanguage);
      setTargetLanguage(temp);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-fadeIn perspective-container">
      
      {/* Header section */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
          <Languages className="w-3.5 h-3.5" />
          AI Indic & Multilingual Translation
        </div>
        <h3 className="text-2xl sm:text-3xl font-bold text-white font-['Outfit']">
          Select <span className="gradient-text">Translation Languages</span>
        </h3>
        <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
          Upload video in Hindi, English, Odia, or Telugu and generate synchronized captions in your desired target language without errors.
        </p>
      </div>

      {/* Language Pair Selector (Source -> Target) */}
      <div className="bg-[#0b1120] border border-white/10 rounded-2xl p-5 space-y-5 shadow-xl card-3d">
        <div className="grid grid-cols-1 md:grid-cols-11 gap-4 items-center">
          
          {/* Source Language Column */}
          <div className="md:col-span-5 space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Original Video Audio / Spoken Language</span>
              <span className="text-[10px] text-indigo-400 font-mono">
                Detected: {detected.toUpperCase()}
              </span>
            </label>

            <select
              value={sourceLanguage}
              onChange={(e) => setSourceLanguage(e.target.value)}
              className="w-full glass-input text-xs font-semibold py-3 cursor-pointer"
            >
              <option value="auto" className="bg-slate-900">✨ Auto-Detect ({detected === 'hi' ? 'Hindi' : detected === 'or' ? 'Odia' : detected === 'te' ? 'Telugu' : 'English'})</option>
              <option value="hi" className="bg-slate-900">🇮🇳 Hindi (हिन्दी)</option>
              <option value="or" className="bg-slate-900 font-odia">🇮🇳 Odia (ଓଡ଼ିଆ)</option>
              <option value="te" className="bg-slate-900 font-telugu">🇮🇳 Telugu (తెలుగు)</option>
              <option value="en" className="bg-slate-900">🇬🇧 English</option>
            </select>
          </div>

          {/* Swap Button */}
          <div className="md:col-span-1 flex justify-center pt-4 md:pt-6">
            <button
              onClick={handleSwap}
              className="w-10 h-10 rounded-xl bg-slate-800/80 hover:bg-indigo-600 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer border border-white/5"
              title="Swap languages"
            >
              <ArrowLeftRight className="w-4 h-4" />
            </button>
          </div>

          {/* Target Language Column */}
          <div className="md:col-span-5 space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Generate Captions In (Target Language)
            </label>

            <select
              value={targetLanguage}
              onChange={(e) => setTargetLanguage(e.target.value)}
              className="w-full glass-input text-xs font-semibold py-3 border-indigo-500/50 text-indigo-200 cursor-pointer"
            >
              <option value="or" className="bg-slate-900 font-odia">🇮🇳 Odia (ଓଡ଼ିଆ)</option>
              <option value="hi" className="bg-slate-900 font-hindi">🇮🇳 Hindi (हिन्दी)</option>
              <option value="te" className="bg-slate-900 font-telugu">🇮🇳 Telugu (తెలుగు)</option>
              <option value="en" className="bg-slate-900">🇬🇧 English</option>
            </select>
          </div>

        </div>

        {/* Live Translation Preview snippet */}
        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-white/5 space-y-1">
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>Sample Line Preview ({sourceLangObj.name} &rarr; {targetLangObj.name}):</span>
            <span className="font-mono text-indigo-400">{segmentCount} lines will be converted</span>
          </div>
          <p className="text-xs text-slate-300 italic">
            "{sampleOriginal}"
          </p>
        </div>
      </div>

      {/* Target Language Quick Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {SUPPORTED_LANGUAGES.map((lang) => {
          const isSelected = targetLanguage === lang.code;

          return (
            <div
              key={lang.code}
              onClick={() => setTargetLanguage(lang.code)}
              className={`p-4 rounded-2xl border cursor-pointer transition-all card-3d ${
                isSelected
                  ? 'bg-indigo-950/70 border-indigo-500 shadow-lg shadow-indigo-500/20 scale-[1.02]'
                  : 'bg-slate-900/60 border-white/5 hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xl">{lang.flag}</span>
                {isSelected && <Check className="w-4 h-4 text-indigo-400" />}
              </div>
              <h5 className="text-sm font-bold text-white leading-tight">
                {lang.name}
              </h5>
              <span className="text-xs font-semibold text-indigo-300 block mt-0.5">
                {lang.nativeName}
              </span>
            </div>
          );
        })}
      </div>

      {/* Action / Execute Translation Button */}
      <div className="bg-[#0b1120] border border-white/10 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 card-3d">
        <div className="space-y-0.5 text-center sm:text-left">
          <h5 className="text-sm font-semibold text-white flex items-center justify-center sm:justify-start gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            Translate {segmentCount} Subtitle Segments to {targetLangObj.name} ({targetLangObj.nativeName})
          </h5>
          <p className="text-xs text-slate-400">
            Preserves exact millisecond timestamps and word sync.
          </p>
        </div>

        <button
          onClick={onTranslateAll}
          disabled={isTranslating}
          className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-violet-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-bold text-xs flex items-center justify-center gap-2 disabled:opacity-50 transition-all cursor-pointer shadow-lg shadow-indigo-500/25 btn-3d"
        >
          {isTranslating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Translating to {targetLangObj.name} ({translationProgress}%)...
            </>
          ) : (
            <>
              <Languages className="w-4 h-4" />
              Generate & Apply Translations
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>

      {isTranslating && (
        <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-white/10">
          <div
            className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 h-full transition-all duration-200"
            style={{ width: `${translationProgress}%` }}
          />
        </div>
      )}
    </div>
  );
}
