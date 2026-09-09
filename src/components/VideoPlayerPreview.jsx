import React, { useRef, useEffect, useState } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Maximize, Gauge, Smartphone, Monitor, Square } from 'lucide-react';
import { formatSecondsToTime } from '../utils/subtitleHelpers';

export default function VideoPlayerPreview({
  videoSrc,
  segments,
  style,
  currentTime,
  setCurrentTime,
  videoRef,
  currentLang,
  aspectRatio = '9:16',
  onChangeAspectRatio,
  isPlaying,
  setIsPlaying
}) {
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [activeSegment, setActiveSegment] = useState(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      const current = segments.find(
        (seg) =>
          video.currentTime >= seg.startTime && video.currentTime <= seg.endTime
      );
      setActiveSegment(current || null);
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
    };

    const handleEnded = () => {
      setIsPlaying?.(false);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('ended', handleEnded);
    };
  }, [segments, videoRef, setCurrentTime, setIsPlaying]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play();
      setIsPlaying?.(true);
    } else {
      video.pause();
      setIsPlaying?.(false);
    }
  };

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      setIsMuted(val === 0);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleSpeedChange = (rate) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
      setPlaybackRate(rate);
    }
  };

  const handleFullscreen = () => {
    const videoContainer = document.getElementById('studio-canvas-container');
    if (videoContainer) {
      if (!document.fullscreenElement) {
        videoContainer.requestFullscreen().catch(console.error);
      } else {
        document.exitFullscreen();
      }
    }
  };

  let activeWordIndex = -1;
  if (activeSegment) {
    const segDuration = activeSegment.endTime - activeSegment.startTime;
    const elapsed = currentTime - activeSegment.startTime;
    const words = activeSegment.text.split(' ');
    if (segDuration > 0 && words.length > 0) {
      activeWordIndex = Math.min(
        words.length - 1,
        Math.floor((elapsed / segDuration) * words.length)
      );
    }
  }

  let aspectClass = 'aspect-[9/16] max-w-[340px]';
  if (aspectRatio === '16:9') {
    aspectClass = 'aspect-video max-w-2xl';
  } else if (aspectRatio === '1:1') {
    aspectClass = 'aspect-square max-w-[440px]';
  }

  let computedFontFamily = style.fontFamily;
  if (currentLang === 'or') computedFontFamily = '"Noto Sans Oriya", ' + style.fontFamily;
  if (currentLang === 'hi') computedFontFamily = '"Noto Sans Devanagari", ' + style.fontFamily;
  if (currentLang === 'te') computedFontFamily = '"Noto Sans Telugu", ' + style.fontFamily;

  return (
    <div className="bg-[#0b1120] border border-white/10 rounded-2xl p-4 sm:p-5 space-y-4 card-3d">
      
      {/* Studio Monitor Header with 9:16 / 16:9 Format Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-white">
            Program Canvas Preview
          </h4>
        </div>

        {/* 9:16 Aspect Ratio Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-950/90 p-1 rounded-xl border border-white/10">
          <button
            onClick={() => onChangeAspectRatio?.('9:16')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              aspectRatio === '9:16'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
            title="9:16 Reels & TikTok Vertical Ratio"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>9:16 Reels</span>
          </button>

          <button
            onClick={() => onChangeAspectRatio?.('16:9')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              aspectRatio === '16:9'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
            title="16:9 YouTube Landscape Ratio"
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>16:9 YouTube</span>
          </button>

          <button
            onClick={() => onChangeAspectRatio?.('1:1')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              aspectRatio === '1:1'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
            title="1:1 Square Post Ratio"
          >
            <Square className="w-3.5 h-3.5" />
            <span>1:1 Post</span>
          </button>
        </div>
      </div>

      {/* Video Canvas Stage with Safe Zones */}
      <div className="flex justify-center bg-[#050811] rounded-2xl p-3 sm:p-6 border border-white/5 overflow-hidden">
        <div
          id="studio-canvas-container"
          className={`relative w-full ${aspectClass} mx-auto bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/15 group select-none flex items-center justify-center transition-all duration-300`}
        >
          <video
            ref={videoRef}
            src={videoSrc}
            className="w-full h-full object-cover cursor-pointer"
            onClick={togglePlay}
            playsInline
          />

          {/* Social Media Safe Zone Guide overlay for 9:16 */}
          {aspectRatio === '9:16' && (
            <div className="absolute inset-0 pointer-events-none border border-dashed border-white/20 m-3 rounded-xl flex flex-col justify-between p-2">
              <span className="text-[9px] font-mono text-white/40">📱 9:16 TikTok / Reels Safe Zone</span>
              <span className="text-[9px] font-mono text-white/40 self-end">UI Controls Safe</span>
            </div>
          )}

          {/* Live Synchronized Captions Overlay */}
          {activeSegment && activeSegment.text && (
            <div
              className="absolute left-0 right-0 px-4 pointer-events-none flex justify-center transition-all duration-150 z-20"
              style={{
                top: `${style.customY || (aspectRatio === '9:16' ? 75 : 82)}%`,
                transform: 'translateY(-50%)'
              }}
            >
              <div
                className="text-center transition-all inline-block"
                style={{
                  fontFamily: computedFontFamily,
                  fontSize: `${aspectRatio === '9:16' ? Math.max(17, style.fontSize - 4) : style.fontSize}px`,
                  fontWeight: style.fontWeight,
                  color: style.textColor,
                  backgroundColor: style.showBg ? style.bgColor : 'transparent',
                  padding: style.showBg ? `${style.bgPadding || 10}px 18px` : '0',
                  borderRadius: '10px',
                  textShadow: style.strokeWidth > 0 
                    ? `-1.5px -1.5px 0 ${style.strokeColor}, 1.5px -1.5px 0 ${style.strokeColor}, -1.5px 1.5px 0 ${style.strokeColor}, 1.5px 1.5px 0 ${style.strokeColor}, 0 4px ${style.shadowBlur}px ${style.shadowColor || 'rgba(0,0,0,0.8)'}`
                    : `0 3px ${style.shadowBlur}px ${style.shadowColor || 'rgba(0,0,0,0.8)'}`,
                  textTransform: style.textTransform || 'none',
                  maxWidth: '92%',
                  lineHeight: 1.35,
                  wordWrap: 'break-word'
                }}
              >
                {activeSegment.text.split(' ').map((word, wIdx) => {
                  const isCurrentWord = wIdx === activeWordIndex;
                  return (
                    <span
                      key={wIdx}
                      className={`inline-block mr-1.5 transition-transform duration-100 ${
                        isCurrentWord ? 'scale-110 text-amber-300 font-extrabold underline decoration-amber-400/50 underline-offset-4' : ''
                      }`}
                    >
                      {word}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Play/Pause Center Indicator */}
          {!isPlaying && (
            <div
              onClick={togglePlay}
              className="absolute inset-0 bg-black/40 flex items-center justify-center cursor-pointer group-hover:bg-black/25 transition-colors z-10"
            >
              <div className="w-14 h-14 rounded-full bg-indigo-600/90 text-white flex items-center justify-center shadow-xl shadow-indigo-500/40 hover:scale-110 transition-transform btn-3d">
                <Play className="w-6 h-6 fill-current ml-1" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mini Controls Bar */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2">
          <button
            onClick={toggleMute}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="w-16 accent-indigo-500 cursor-pointer h-1 rounded bg-slate-800"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded-lg border border-white/5">
            <Gauge className="w-3.5 h-3.5 text-slate-400 mr-1" />
            {[1, 1.25, 1.5, 2].map((rate) => (
              <button
                key={rate}
                onClick={() => handleSpeedChange(rate)}
                className={`px-1.5 py-0.5 text-[11px] rounded font-medium transition-colors cursor-pointer ${
                  playbackRate === rate
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>

          <button
            onClick={handleFullscreen}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Fullscreen"
          >
            <Maximize className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
