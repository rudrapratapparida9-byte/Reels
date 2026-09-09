import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, Scissors, ZoomIn, ZoomOut, Volume2, Sparkles, Plus, SkipBack, SkipForward } from 'lucide-react';
import { formatSecondsToTime } from '../utils/subtitleHelpers';

export default function StudioTimeline({
  duration = 15,
  currentTime = 0,
  onSeek,
  isPlaying,
  onTogglePlay,
  segments = [],
  onUpdateSegments,
  waveformPeaks = [],
  selectedLang
}) {
  const timelineRef = useRef(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);

  const durationSafe = Math.max(duration || 15, 1);
  const totalPixels = 800 * zoomLevel;

  const handleTimelineClick = (e) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left + timelineRef.current.scrollLeft;
    const ratio = Math.max(0, Math.min(1, clickX / totalPixels));
    onSeek(ratio * durationSafe);
  };

  const handleMouseDown = (e) => {
    setIsDraggingPlayhead(true);
    handleTimelineClick(e);
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDraggingPlayhead || !timelineRef.current) return;
      const rect = timelineRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left + timelineRef.current.scrollLeft;
      const ratio = Math.max(0, Math.min(1, clickX / totalPixels));
      onSeek(ratio * durationSafe);
    };

    const handleMouseUp = () => {
      if (isDraggingPlayhead) setIsDraggingPlayhead(false);
    };

    if (isDraggingPlayhead) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingPlayhead, totalPixels, durationSafe, onSeek]);

  const handleSplitAtPlayhead = () => {
    const activeSeg = segments.find(s => currentTime > s.startTime + 0.3 && currentTime < s.endTime - 0.3);
    if (!activeSeg) return;

    const words = activeSeg.text.split(' ');
    const half = Math.ceil(words.length / 2);
    const seg1 = { ...activeSeg, endTime: parseFloat(currentTime.toFixed(2)), text: words.slice(0, half).join(' ') };
    const seg2 = {
      id: Date.now(),
      startTime: parseFloat(currentTime.toFixed(2)),
      endTime: activeSeg.endTime,
      text: words.slice(half).join(' ') || '...'
    };

    const index = segments.findIndex(s => s.id === activeSeg.id);
    const copy = [...segments];
    copy.splice(index, 1, seg1, seg2);
    onUpdateSegments(copy);
  };

  const playheadPixels = (currentTime / durationSafe) * totalPixels;

  const markers = [];
  const stepTime = zoomLevel > 1.8 ? 1 : 2;
  for (let t = 0; t <= durationSafe; t += stepTime) {
    markers.push(t);
  }

  return (
    <div className="bg-[#0b1120] border border-white/10 rounded-2xl p-3 sm:p-4 space-y-3 select-none card-3d">
      
      {/* Studio Timeline Toolbar */}
      <div className="flex items-center justify-between gap-3 text-xs border-b border-white/5 pb-2.5">
        <div className="flex items-center gap-2">
          <button
            onClick={onTogglePlay}
            className="w-8 h-8 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center transition-colors shadow-md shadow-indigo-600/30 cursor-pointer btn-3d"
            title={isPlaying ? "Pause (Space)" : "Play (Space)"}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
          </button>

          <button
            onClick={() => onSeek(Math.max(0, currentTime - 1))}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Step Back 1s"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onSeek(Math.min(durationSafe, currentTime + 1))}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Step Forward 1s"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>

          <div className="font-mono text-slate-300 bg-slate-900/90 px-2.5 py-1 rounded-md border border-white/5 text-[11px]">
            <span className="text-indigo-400 font-bold">{formatSecondsToTime(currentTime)}</span>
            <span className="text-slate-500"> / {formatSecondsToTime(durationSafe)}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSplitAtPlayhead}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-indigo-600/30 text-slate-300 hover:text-indigo-300 border border-white/5 flex items-center gap-1.5 transition-colors cursor-pointer text-xs"
            title="Split caption at playhead"
          >
            <Scissors className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Split at Playhead</span>
          </button>

          <div className="flex items-center gap-1.5 bg-slate-900/80 px-2 py-1 rounded-lg border border-white/5">
            <button
              onClick={() => setZoomLevel(Math.max(1, zoomLevel - 0.5))}
              className="p-1 hover:text-white text-slate-400 disabled:opacity-30 cursor-pointer"
              disabled={zoomLevel <= 1}
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono text-slate-400 w-7 text-center">
              {zoomLevel}x
            </span>
            <button
              onClick={() => setZoomLevel(Math.min(3, zoomLevel + 0.5))}
              className="p-1 hover:text-white text-slate-400 disabled:opacity-30 cursor-pointer"
              disabled={zoomLevel >= 3}
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Multi-track Timeline Area */}
      <div
        ref={timelineRef}
        onMouseDown={handleMouseDown}
        className="relative h-32 overflow-x-auto bg-[#070b14] rounded-xl border border-white/10 cursor-pointer overflow-y-hidden"
      >
        <div
          className="relative h-full"
          style={{ width: `${totalPixels}px`, minWidth: '100%' }}
        >
          {/* Time Ruler Ticks */}
          <div className="h-6 border-b border-white/10 flex items-center px-1 bg-slate-900/60 select-none">
            {markers.map((t) => {
              const leftPercent = (t / durationSafe) * 100;
              return (
                <div
                  key={t}
                  className="absolute flex flex-col items-start"
                  style={{ left: `${leftPercent}%` }}
                >
                  <span className="text-[9px] font-mono text-slate-400 -translate-x-1/2">
                    {formatSecondsToTime(t)}
                  </span>
                  <div className="w-[1px] h-2 bg-slate-700 mt-0.5" />
                </div>
              );
            })}
          </div>

          {/* Track 1: Audio Waveform */}
          <div className="h-12 border-b border-white/5 flex items-center px-1 relative bg-indigo-950/20">
            <span className="absolute left-2 text-[9px] font-semibold uppercase tracking-wider text-indigo-400/70 z-10">
              Audio Waveform
            </span>
            <div className="w-full h-full flex items-center gap-[2px] opacity-75 pt-3">
              {(waveformPeaks.length > 0 ? waveformPeaks : Array(120).fill(0.4)).map((peak, idx) => (
                <div
                  key={idx}
                  className="flex-1 bg-indigo-400/60 rounded-full"
                  style={{
                    height: `${Math.max(12, peak * 36)}px`,
                    backgroundColor: (idx / (waveformPeaks.length || 120)) <= (currentTime / durationSafe) ? '#818cf8' : '#312e81'
                  }}
                />
              ))}
            </div>
          </div>

          {/* Track 2: Caption Blocks */}
          <div className="h-14 relative p-1 bg-slate-900/30 flex items-center">
            <span className="absolute left-2 top-1 text-[9px] font-semibold uppercase tracking-wider text-slate-500">
              Captions ({selectedLang.toUpperCase()})
            </span>
            
            {segments.map((seg, idx) => {
              const startPercent = (seg.startTime / durationSafe) * 100;
              const widthPercent = ((seg.endTime - seg.startTime) / durationSafe) * 100;
              const isActive = currentTime >= seg.startTime && currentTime <= seg.endTime;

              return (
                <div
                  key={seg.id}
                  className={`absolute top-4 h-8 rounded-lg px-2 flex items-center overflow-hidden border transition-all text-[11px] font-medium ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white border-indigo-400 shadow-md shadow-indigo-500/30 z-20 scale-[1.02]'
                      : 'bg-slate-800/90 text-slate-200 border-white/10 hover:border-indigo-500/50'
                  }`}
                  style={{
                    left: `${startPercent}%`,
                    width: `${Math.max(4, widthPercent)}%`
                  }}
                  title={`[${formatSecondsToTime(seg.startTime)} - ${formatSecondsToTime(seg.endTime)}] ${seg.text}`}
                >
                  <span className="truncate">{seg.text}</span>
                </div>
              );
            })}
          </div>

          {/* Draggable Playhead */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-rose-500 z-30 pointer-events-none"
            style={{ left: `${playheadPixels}px` }}
          >
            <div className="w-3.5 h-3.5 -ml-[6px] bg-rose-500 rounded-sm rotate-45 shadow-lg shadow-rose-500/50 flex items-center justify-center" />
          </div>

        </div>
      </div>
    </div>
  );
}
