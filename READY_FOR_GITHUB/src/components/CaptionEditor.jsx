import React, { useState } from 'react';
import { Plus, Trash2, Clock, Play, Search, Split, Sparkles, User, Copy, Check, RefreshCw, FileText, Mic, Wand2, ArrowRight } from 'lucide-react';
import { formatSecondsToTime, parseTimeToSeconds } from '../utils/subtitleHelpers';
import { translateText } from '../utils/translator';
import { autoSyncScriptToAudio } from '../utils/audioTranscriber';

export default function CaptionEditor({
  segments,
  onUpdateSegments,
  currentTime,
  onSeekToTime,
  currentLang,
  sourceLang = 'auto',
  videoDuration = 15
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [translatingId, setTranslatingId] = useState(null);
  const [showScriptModal, setShowScriptModal] = useState(false);
  const [rawScriptInput, setRawScriptInput] = useState('');

  const handleTextChange = (id, newText) => {
    const updated = segments.map((seg) =>
      seg.id === id ? { ...seg, text: newText } : seg
    );
    onUpdateSegments(updated);
  };

  const handleTimeChange = (id, field, value) => {
    const seconds = parseTimeToSeconds(value);
    const updated = segments.map((seg) =>
      seg.id === id ? { ...seg, [field]: seconds } : seg
    );
    onUpdateSegments(updated);
  };

  const handleAddSegment = () => {
    const lastSeg = segments[segments.length - 1];
    const newStart = lastSeg ? parseFloat((lastSeg.endTime + 0.2).toFixed(2)) : 0.5;
    const newEnd = parseFloat((newStart + 3.0).toFixed(2));
    const newSeg = {
      id: Date.now(),
      startTime: newStart,
      endTime: newEnd,
      text: 'Type new subtitle caption...'
    };
    onUpdateSegments([...segments, newSeg]);
  };

  const handleDeleteSegment = (id) => {
    if (segments.length <= 1) {
      alert("At least one caption segment is required.");
      return;
    }
    const updated = segments.filter((seg) => seg.id !== id);
    onUpdateSegments(updated);
  };

  const handleSplitSegment = (seg) => {
    const midTime = parseFloat(((seg.startTime + seg.endTime) / 2).toFixed(2));
    const words = seg.text.split(' ');
    const half = Math.ceil(words.length / 2);
    const text1 = words.slice(0, half).join(' ');
    const text2 = words.slice(half).join(' ') || '...';

    const seg1 = { ...seg, endTime: midTime, text: text1 };
    const seg2 = {
      id: Date.now(),
      startTime: midTime,
      endTime: seg.endTime,
      text: text2
    };

    const index = segments.findIndex((s) => s.id === seg.id);
    const updated = [...segments];
    updated.splice(index, 1, seg1, seg2);
    onUpdateSegments(updated);
  };

  const handleTranslateSingleLine = async (seg) => {
    try {
      setTranslatingId(seg.id);
      const textToTranslate = seg.originalText || seg.text;
      const translated = await translateText(textToTranslate, sourceLang, currentLang);
      if (translated) {
        handleTextChange(seg.id, translated);
      }
    } catch (err) {
      console.warn("Single line translation error:", err);
    } finally {
      setTranslatingId(null);
    }
  };

  const handleApplyScript = () => {
    if (!rawScriptInput.trim()) return;
    const synced = autoSyncScriptToAudio(rawScriptInput, videoDuration);
    if (synced && synced.length > 0) {
      onUpdateSegments(synced);
      setShowScriptModal(false);
      setRawScriptInput('');
    }
  };

  const handleCopyTranscript = () => {
    const text = segments.map(s => s.text).join(' ');
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  let fontClass = '';
  if (currentLang === 'or') fontClass = 'font-odia text-amber-200';
  if (currentLang === 'hi') fontClass = 'font-hindi text-emerald-200';
  if (currentLang === 'te') fontClass = 'font-telugu text-cyan-200';

  const filteredSegments = segments.filter((seg) =>
    seg.text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-[#0b1120] border border-white/10 rounded-2xl p-5 space-y-4 flex flex-col h-[640px] card-3d">
      
      {/* Editor Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            Transcript & Timing Editor
          </h4>
          <span className="text-[11px] text-slate-400">
            {segments.length} lines • {currentLang.toUpperCase()}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowScriptModal(true)}
            className="px-2.5 py-1.5 rounded-lg bg-indigo-950/80 hover:bg-indigo-600 text-indigo-300 hover:text-white text-xs font-semibold border border-indigo-500/30 flex items-center gap-1 transition-all cursor-pointer"
            title="Paste real spoken audio script & auto-sync"
          >
            <Wand2 className="w-3.5 h-3.5 text-indigo-400" />
            <span>Auto-Sync Script</span>
          </button>

          <button
            onClick={handleCopyTranscript}
            className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-medium border border-white/5 flex items-center gap-1 transition-colors cursor-pointer"
            title="Copy full text transcript"
          >
            {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span className="hidden sm:inline">{isCopied ? 'Copied' : 'Copy'}</span>
          </button>

          <button
            onClick={handleAddSegment}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1 transition-all shadow-md shadow-indigo-600/30 cursor-pointer btn-3d"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Line
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Filter subtitle transcript..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full glass-input text-xs pl-8"
        />
      </div>

      {/* Segments List */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {filteredSegments.map((seg, idx) => {
          const isActive =
            currentTime >= seg.startTime && currentTime <= seg.endTime;
          const wordCount = seg.text.trim().split(/\s+/).filter(Boolean).length;
          const isLineTranslating = translatingId === seg.id;

          return (
            <div
              key={seg.id}
              className={`p-3.5 rounded-xl border transition-all ${
                isActive
                  ? 'bg-indigo-950/70 border-indigo-500 shadow-lg shadow-indigo-500/15 ring-1 ring-indigo-500/50'
                  : 'bg-slate-900/60 border-white/5 hover:border-white/20'
              }`}
            >
              {/* Segment Metadata & Timestamps */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-300">
                    #{idx + 1}
                  </span>

                  <input
                    type="text"
                    defaultValue={formatSecondsToTime(seg.startTime)}
                    onBlur={(e) =>
                      handleTimeChange(seg.id, 'startTime', e.target.value)
                    }
                    className="w-18 glass-input text-[11px] font-mono py-1 px-1 text-center text-indigo-300 bg-slate-950/80"
                    title="Start time"
                  />
                  <span className="text-slate-600 text-xs">-</span>
                  <input
                    type="text"
                    defaultValue={formatSecondsToTime(seg.endTime)}
                    onBlur={(e) =>
                      handleTimeChange(seg.id, 'endTime', e.target.value)
                    }
                    className="w-18 glass-input text-[11px] font-mono py-1 px-1 text-center text-indigo-300 bg-slate-950/80"
                    title="End time"
                  />

                  <span className="text-[10px] text-slate-500 hidden sm:inline">
                    ({wordCount} words)
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleTranslateSingleLine(seg)}
                    className={`p-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-indigo-300 transition-colors cursor-pointer ${isLineTranslating ? 'animate-spin text-indigo-400' : ''}`}
                    title="Re-translate this specific line"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => onSeekToTime(seg.startTime)}
                    className="p-1 rounded bg-slate-800/80 hover:bg-indigo-600 text-slate-300 hover:text-white transition-colors cursor-pointer"
                    title="Jump video to this subtitle"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                  </button>

                  <button
                    onClick={() => handleSplitSegment(seg)}
                    className="p-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-amber-400 transition-colors cursor-pointer"
                    title="Split line into two"
                  >
                    <Split className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleDeleteSegment(seg.id)}
                    className="p-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-rose-400 transition-colors cursor-pointer"
                    title="Delete segment"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Text Input */}
              <textarea
                rows={2}
                value={seg.text}
                onChange={(e) => handleTextChange(seg.id, e.target.value)}
                className={`w-full glass-input text-xs font-medium resize-none focus:ring-1 focus:ring-indigo-500 bg-slate-950/90 leading-relaxed ${fontClass}`}
                placeholder="Enter caption line..."
              />
            </div>
          );
        })}

        {filteredSegments.length === 0 && (
          <div className="text-center py-12 text-slate-500 text-xs">
            No subtitles matching "{searchQuery}".
          </div>
        )}
      </div>

      {/* Script Auto-Sync Modal */}
      {showScriptModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0b1120] border border-indigo-500/40 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl card-3d">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-indigo-400" />
                Paste Spoken Audio Script (Auto-Sync Timestamps)
              </h4>
              <button
                onClick={() => setShowScriptModal(false)}
                className="text-slate-400 hover:text-white text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Paste what is spoken in your video (in Hindi, Odia, Telugu, or English). The AI will automatically slice each sentence and sync it across your video timeline!
            </p>

            <textarea
              rows={6}
              value={rawScriptInput}
              onChange={(e) => setRawScriptInput(e.target.value)}
              placeholder="Example (Hindi/Odia/English):
नमस्ते दोस्तों! हमारे वीडियो में आपका स्वागत है।
आज हम एक शानदार एआई तकनीक सीखने जा रहे हैं।
इस वीडियो को लाइक और सब्सक्राइब जरूर करें।"
              className="w-full glass-input text-xs leading-relaxed"
            />

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowScriptModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>

              <button
                onClick={handleApplyScript}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 btn-3d cursor-pointer"
              >
                Auto-Sync to Video Timeline
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
