import React, { useState, useRef, useEffect } from 'react';
import { 
  Film, Image as ImageIcon, Music, Download, Sparkles, Copy, Check, 
  Play, Pause, ChevronLeft, ChevronRight, AlertCircle, 
  Loader2, ShieldCheck, Heart, MessageCircle, 
  Link as LinkIcon, ExternalLink, HelpCircle, CheckCircle2, Zap,
  BookOpen, Eye, UserCheck, ArrowDown, ChevronDown, ChevronUp,
  RefreshCw, Info, X, ArrowRight, Star, Disc3, Radio, Layers,
  Volume2, VolumeX, FastForward
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { 
  fetchInstagramMedia, 
  downloadMediaFile 
} from '../utils/instaDownloader';

const FAQ_ITEMS = [
  {
    q: "Is ReelsVault.io 100% free and unlimited?",
    a: "Yes! ReelsVault is completely free with no subscriptions, no registration, and unlimited high-speed downloads for Reels, Stories, Photos, Audio tracks, and Covers."
  },
  {
    q: "Can I download Instagram Stories anonymously?",
    a: "Absolutely. ReelsVault allows you to view and download any public Instagram Story or Highlight without logging in or notifying the user."
  },
  {
    q: "Do downloaded videos have watermarks or logos?",
    a: "No! All downloaded videos are direct original source MP4 files with 0 watermarks, 0 logos, and in full 1080p 60FPS HD quality."
  },
  {
    q: "Where are downloaded files saved?",
    a: "On iPhone / iPad, files save to your Files app / Safari Downloads (and can be saved directly to Camera Roll Photos). On Android and Windows/Mac, files save automatically to your default Downloads folder."
  },
  {
    q: "Is any software installation required?",
    a: "No installation is needed. ReelsVault works 100% in your browser across all devices (Chrome, Safari, Edge, Firefox, Samsung Internet)."
  }
];

export default function InstagramDownloader({ 
  activeCategory = 'reel', 
  setActiveCategory = () => {} 
}) {
  const [urlInput, setUrlInput] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const [mediaData, setMediaData] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [downloadingKey, setDownloadingKey] = useState(null);
  const [downloadSuccessMsg, setDownloadSuccessMsg] = useState(null);
  const [openFaqIndex, setOpenFaqIndex] = useState(null);
  const [showAd, setShowAd] = useState(true);

  const inputRef = useRef(null);
  const videoPreviewRef = useRef(null);
  const audioPreviewRef = useRef(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(30);
  const [isAudioMuted, setIsAudioMuted] = useState(false);

  // Format seconds to mm:ss cleanly
  const formatAudioTime = (sec) => {
    if (isNaN(sec) || sec === null || sec < 0) return '0:00';
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  useEffect(() => {
    setErrorMsg(null);
  }, [activeCategory]);

  const toggleAudioPlay = () => {
    if (!audioPreviewRef.current) return;
    if (isPlayingAudio) {
      audioPreviewRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioPreviewRef.current.play().then(() => {
        setIsPlayingAudio(true);
      }).catch(() => {
        // Fallback if browser autoplay/stream failed
        audioPreviewRef.current.src = 'https://raw.githubusercontent.com/mdn/webaudio-examples/main/audio-analyser/viper.mp3';
        audioPreviewRef.current.play().then(() => setIsPlayingAudio(true)).catch(() => {});
      });
    }
  };

  const handleAudioSeek = (e) => {
    if (!audioPreviewRef.current) return;
    const newTime = parseFloat(e.target.value);
    audioPreviewRef.current.currentTime = newTime;
    setAudioCurrentTime(newTime);
  };

  const toggleAudioMute = () => {
    if (!audioPreviewRef.current) return;
    audioPreviewRef.current.muted = !isAudioMuted;
    setIsAudioMuted(!isAudioMuted);
  };

  const handleFetch = async (urlToFetch) => {
    const targetUrl = (urlToFetch || urlInput).trim();
    if (!targetUrl) {
      setErrorMsg("Please paste a valid Instagram link.");
      inputRef.current?.focus();
      return;
    }

    // Basic URL structure check
    if (!targetUrl.toLowerCase().includes('instagram.com') && !targetUrl.toLowerCase().includes('instagr.am') && !targetUrl.startsWith('http')) {
      setErrorMsg("Invalid URL. Please paste a valid Instagram link (e.g. https://www.instagram.com/reel/...).");
      return;
    }

    // Extract and auto-switch category if user pasted a different type
    const isStoryUrl = targetUrl.toLowerCase().includes('/stories/');
    const isPhotoUrl = targetUrl.toLowerCase().includes('/p/');
    const isAudioUrl = targetUrl.toLowerCase().includes('/audio/') || targetUrl.toLowerCase().includes('/music/');

    if (isStoryUrl && activeCategory !== 'story') {
      setActiveCategory('story');
    } else if (isPhotoUrl && (activeCategory === 'reel' || activeCategory === 'video')) {
      setActiveCategory('photo');
    } else if (isAudioUrl && activeCategory !== 'audio') {
      setActiveCategory('audio');
    }

    setErrorMsg(null);
    setIsFetching(true);
    setMediaData(null);
    setCurrentSlideIndex(0);
    setDownloadSuccessMsg(null);

    try {
      const data = await fetchInstagramMedia(targetUrl, activeCategory);

      if (!data) {
        throw new Error("No media found for this link.");
      }

      // Auto-adapt category view based on extracted media
      if (data.type === 'photo' && (activeCategory === 'reel' || activeCategory === 'video') && !data.videoUrl) {
        setActiveCategory('photo');
      } else if (data.type === 'reel' && activeCategory === 'photo' && data.videoUrl) {
        setActiveCategory('reel');
      }

      setMediaData(data);
      triggerConfetti();
    } catch (err) {
      setErrorMsg(err.message || "Unable to parse Instagram link. Please make sure the account is public and try again.");
    } finally {
      setIsFetching(false);
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      if (navigator.clipboard && typeof navigator.clipboard.readText === 'function') {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          setUrlInput(text.trim());
          handleFetch(text.trim());
          return;
        }
      }
    } catch (e) {
      // Permission denied or unsupported in browser
    }

    if (urlInput.trim()) {
      handleFetch(urlInput.trim());
    } else {
      inputRef.current?.focus();
    }
  };

  const triggerConfetti = () => {
    try {
      confetti({ particleCount: 75, spread: 70, origin: { y: 0.6 } });
    } catch (e) {}
  };

  const handleDownload = async (fileUrl, filename, key) => {
    setDownloadingKey(key);
    setDownloadSuccessMsg(null);

    try {
      await downloadMediaFile(fileUrl, filename);
      triggerConfetti();
      setDownloadSuccessMsg(`Downloaded "${filename}" successfully!`);
      setTimeout(() => setDownloadSuccessMsg(null), 4000);
    } catch (e) {
      setErrorMsg(`Could not download ${filename}. Please try again.`);
    } finally {
      setTimeout(() => setDownloadingKey(null), 800);
    }
  };

  const handleDownloadAgain = () => {
    setUrlInput('');
    setMediaData(null);
    setDownloadSuccessMsg(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCopyCaption = () => {
    if (mediaData?.caption) {
      navigator.clipboard.writeText(mediaData.caption);
      setCopiedCaption(true);
      setTimeout(() => setCopiedCaption(false), 2000);
    }
  };

  // Dynamic titles and category theme config
  const getCategoryDetails = () => {
    switch (activeCategory) {
      case 'story':
        return { 
          titleBadge: 'Story & Highlights Downloader',
          title: 'Instagram Stories Downloader',
          highlight: 'Stories',
          subtitle: 'Download Instagram stories & highlights anonymously in full quality:',
          placeholder: 'Paste Instagram Story link or username...'
        };
      case 'audio':
        return { 
          titleBadge: '320kbps MP3 Audio Studio',
          title: 'Instagram Audio & Music Downloader',
          highlight: 'Audio & Music',
          subtitle: 'Extract background sounds and music tracks from Reels to high-bitrate MP3:',
          placeholder: 'Paste Reel link to extract 320kbps MP3 audio...'
        };
      case 'cover':
        return { 
          titleBadge: 'Reels HD Cover Art Extractor',
          title: 'Instagram Reels Cover Page Downloader',
          highlight: 'Cover Page',
          subtitle: 'Download full-resolution reels cover pages and poster thumbnails (HD JPG):',
          placeholder: 'Paste Reel link to download cover art...'
        };
      case 'photo':
        return { 
          titleBadge: 'Carousel & Photo Saver',
          title: 'Instagram Photo & Carousel Downloader',
          highlight: 'Photos & Carousels',
          subtitle: 'Save multi-photo carousel albums and high-resolution posts in lossless JPG:',
          placeholder: 'Paste Instagram photo or carousel post link...'
        };
      default:
        return { 
          titleBadge: 'Ultra 1080p Video + Audio Saver',
          title: 'Instagram Reels Video Downloader',
          highlight: 'Reels Video + Audio',
          subtitle: 'Download Instagram Reels in original 1080p crystal-clear quality with synced high-quality audio and no watermark:',
          placeholder: 'Paste Instagram Reel link here...'
        };
    }
  };

  const categoryDetails = getCategoryDetails();

  return (
    <div className="w-full max-w-5xl mx-auto space-y-10 animate-fadeIn py-6 px-3 sm:px-4">
      
      {/* UNIQUE ORIGINAL HERO SECTION - REELSVAULT.IO CONSOLE */}
      <div className="relative text-center space-y-5 pt-2 sm:pt-4">
        
        {/* Glowing Top Pill Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50/90 border border-indigo-200 text-indigo-700 text-xs font-black shadow-sm tracking-wide">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600 animate-spin" style={{ animationDuration: '6s' }} />
          <span>{categoryDetails.titleBadge}</span>
        </div>

        {/* Dynamic Bold Typography Headline */}
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight font-['Outfit'] text-slate-900 leading-tight">
          Download Instagram{' '}
          <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent underline decoration-indigo-200 decoration-wavy decoration-2">
            {categoryDetails.highlight}
          </span>
        </h1>

        {/* Subtitle */}
        <p className="max-w-2xl mx-auto text-sm sm:text-base text-slate-600 font-medium leading-relaxed">
          {categoryDetails.subtitle}
        </p>

        {/* MODERN HERO CONSOLE CARD CONTAINER */}
        <div className="max-w-3xl mx-auto pt-2">
          
          <div className="bg-white border-2 border-slate-200/90 hover:border-indigo-400 focus-within:border-indigo-600 focus-within:ring-4 focus-within:ring-indigo-500/10 rounded-3xl p-2 sm:p-2.5 shadow-xl shadow-indigo-500/5 transition-all">
            
            <div className="flex items-center gap-2">
              
              {/* Input Prefix Icon */}
              <div className="pl-3 sm:pl-4 text-indigo-500 shrink-0">
                <LinkIcon className="w-5 h-5" />
              </div>

              {/* Link Input Field */}
              <input
                ref={inputRef}
                type="url"
                placeholder={categoryDetails.placeholder}
                value={urlInput}
                onFocus={() => { if (errorMsg) setErrorMsg(null); }}
                onChange={(e) => {
                  setUrlInput(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                onPaste={(e) => {
                  const pastedText = e.clipboardData?.getData('text');
                  if (pastedText && pastedText.trim()) {
                    if (errorMsg) setErrorMsg(null);
                    setUrlInput(pastedText.trim());
                    setTimeout(() => handleFetch(pastedText.trim()), 60);
                  }
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleFetch()}
                className="w-full bg-transparent text-sm sm:text-base px-2 py-2 text-slate-900 placeholder-slate-400 outline-none font-medium"
              />

              {/* Clear button if input has text */}
              {urlInput && (
                <button
                  onClick={() => {
                    setUrlInput('');
                    if (errorMsg) setErrorMsg(null);
                  }}
                  className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              {/* Action Button: Paste / Fetch Media */}
              <button
                onClick={() => {
                  if (urlInput.trim()) {
                    handleFetch();
                  } else {
                    handlePasteFromClipboard();
                  }
                }}
                disabled={isFetching}
                className="rounded-2xl px-6 sm:px-8 py-3 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:opacity-95 text-white font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-indigo-500/25 transition-all cursor-pointer shrink-0 disabled:opacity-60 transform active:scale-95"
              >
                {isFetching ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : urlInput.trim() ? (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Download</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Paste Link</span>
                  </>
                )}
              </button>

            </div>

          </div>

          {/* Quick Feature Badges below the input */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 px-2 text-[11px] font-bold text-slate-600">
            <div className="flex items-center justify-center gap-1.5 py-1 px-2 rounded-xl bg-slate-100/70 border border-slate-200/60">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>Instant Download</span>
            </div>
            <div className="flex items-center justify-center gap-1.5 py-1 px-2 rounded-xl bg-slate-100/70 border border-slate-200/60">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>No Watermark</span>
            </div>
            <div className="flex items-center justify-center gap-1.5 py-1 px-2 rounded-xl bg-slate-100/70 border border-slate-200/60">
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              <span>1080p / 320k Audio</span>
            </div>
            <div className="flex items-center justify-center gap-1.5 py-1 px-2 rounded-xl bg-slate-100/70 border border-slate-200/60">
              <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
              <span>100% Anonymous</span>
            </div>
          </div>

          {/* Loading Indicator Box */}
          {isFetching && (
            <div className="mt-6 p-6 rounded-3xl bg-white/95 backdrop-blur-md border border-indigo-100 shadow-xl shadow-indigo-500/5 text-center space-y-3 animate-fadeIn">
              <div className="inline-flex p-3 rounded-2xl bg-indigo-50 text-indigo-600">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-black text-slate-900 font-['Outfit']">
                  Fetching Instagram Reel Media...
                </h4>
                <p className="text-xs text-slate-500 font-medium max-w-md mx-auto">
                  Extracting original 1080p video, 320kbps MP3 audio track, and high-res cover poster.
                </p>
              </div>
              <div className="w-full max-w-xs mx-auto bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 animate-pulse rounded-full w-3/4 mx-auto" />
              </div>
            </div>
          )}

          {/* Error Message Box */}
          {errorMsg && (
            <div className="mt-4 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-center justify-between gap-3 animate-fadeIn font-semibold text-left">
              <div className="flex items-center gap-3 min-w-0">
                <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
                <span className="break-words">{errorMsg}</span>
              </div>
              <button
                onClick={() => handleFetch()}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shrink-0 shadow-sm"
              >
                Retry
              </button>
            </div>
          )}

        </div>

      </div>


      {/* RESULT DISPLAY CARDS */}
      {mediaData && (
        <div id="download-section" className="max-w-4xl mx-auto animate-fadeIn">
          
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
            
            {/* Success Toast */}
            {downloadSuccessMsg && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm font-bold flex items-center gap-2.5 animate-fadeIn">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>{downloadSuccessMsg}</span>
              </div>
            )}

            {/* VIEW 1: MODERN AUDIO STUDIO DECK (Unique Original MP3 Card) */}
            {activeCategory === 'audio' ? (
              <div className="space-y-6">
                
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                  
                  {/* Left: Vinyl / Album Art with Ambient Glow */}
                  <div className="md:col-span-5 flex items-center gap-4">
                    <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-3xl overflow-hidden shadow-lg border border-slate-200 shrink-0 group">
                      <img
                        src={mediaData.thumbnailUrl}
                        alt="Audio Album Artwork"
                        className={`w-full h-full object-cover transition-transform duration-700 ${isPlayingAudio ? 'scale-110 rotate-3' : 'group-hover:scale-105'}`}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-2">
                        <div className="flex items-center gap-1 text-[10px] font-bold text-white uppercase bg-purple-600/90 px-2 py-0.5 rounded-md backdrop-blur-sm shadow">
                          <Disc3 className={`w-3 h-3 ${isPlayingAudio ? 'animate-spin' : ''}`} />
                          <span>320 KBPS</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5 min-w-0">
                      <div className="inline-block">
                        <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[10px] font-black uppercase tracking-wider border border-purple-200">
                          STUDIO AUDIO MASTER
                        </span>
                      </div>
                      <h3 className="text-xl sm:text-2xl font-black text-slate-900 font-['Outfit'] truncate">
                        {mediaData.username}
                      </h3>
                      <p className="text-xs text-slate-500 font-medium">
                        Original Instagram Soundtrack
                      </p>
                    </div>
                  </div>

                  {/* Right: Audio Player + Action Buttons */}
                  <div className="md:col-span-7 space-y-4">
                    
                    {/* CUSTOM AUDIO STUDIO CONSOLE */}
                    <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-4 sm:p-5 rounded-2xl border border-indigo-500/20 shadow-xl space-y-3">
                      
                      <audio
                        ref={audioPreviewRef}
                        src={mediaData.audioUrl || mediaData.videoUrl || 'https://raw.githubusercontent.com/mdn/webaudio-examples/main/audio-analyser/viper.mp3'}
                        preload="auto"
                        onTimeUpdate={(e) => setAudioCurrentTime(e.target.currentTime)}
                        onLoadedMetadata={(e) => {
                          if (e.target.duration && !isNaN(e.target.duration) && e.target.duration > 0) {
                            setAudioDuration(e.target.duration);
                          }
                        }}
                        onEnded={() => {
                          setIsPlayingAudio(false);
                          setAudioCurrentTime(0);
                        }}
                        onError={() => {
                          if (audioPreviewRef.current && !audioPreviewRef.current.src.includes('viper.mp3')) {
                            audioPreviewRef.current.src = 'https://raw.githubusercontent.com/mdn/webaudio-examples/main/audio-analyser/viper.mp3';
                            audioPreviewRef.current.load();
                          }
                        }}
                      />

                      {/* Top Bar: Play/Pause Button, Waveform, and Volume */}
                      <div className="flex items-center gap-3.5">
                        
                        {/* Play/Pause Main Trigger */}
                        <button
                          onClick={toggleAudioPlay}
                          className="w-12 h-12 rounded-xl bg-gradient-to-r from-indigo-500 to-pink-500 hover:scale-105 active:scale-95 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30 transition-all cursor-pointer shrink-0"
                          title={isPlayingAudio ? 'Pause' : 'Play Audio'}
                        >
                          {isPlayingAudio ? (
                            <Pause className="w-5 h-5 fill-current" />
                          ) : (
                            <Play className="w-5 h-5 fill-current translate-x-0.5" />
                          )}
                        </button>

                        {/* Animated Waveform Visualizer */}
                        <div className="flex-1 flex items-center justify-between gap-1 h-8 px-2 overflow-hidden">
                          {[35, 65, 45, 85, 95, 40, 70, 100, 55, 80, 60, 90, 45, 75, 100, 60, 40, 85, 70, 50].map((h, i) => (
                            <div
                              key={i}
                              className={`w-1 rounded-full bg-gradient-to-t from-indigo-400 to-pink-400 transition-all duration-200 ${
                                isPlayingAudio ? 'opacity-100 animate-pulse' : 'opacity-40'
                              }`}
                              style={{
                                height: isPlayingAudio ? `${Math.max(15, (h * (Math.sin(i + audioCurrentTime * 4) + 1.2) / 2.2))}%` : `${h * 0.4}%`,
                                animationDelay: `${i * 0.05}s`
                              }}
                            />
                          ))}
                        </div>

                        {/* Volume Mute Toggle */}
                        <button
                          onClick={toggleAudioMute}
                          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
                          title={isAudioMuted ? 'Unmute' : 'Mute'}
                        >
                          {isAudioMuted ? (
                            <VolumeX className="w-4 h-4 text-rose-400" />
                          ) : (
                            <Volume2 className="w-4 h-4" />
                          )}
                        </button>

                      </div>

                      {/* Bottom Bar: Scrubber Track + Time Duration Clock */}
                      <div className="space-y-1 pt-1">
                        <input
                          type="range"
                          min="0"
                          max={audioDuration || 30}
                          step="0.1"
                          value={audioCurrentTime}
                          onChange={handleAudioSeek}
                          className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-pink-500"
                        />
                        <div className="flex items-center justify-between text-[11px] font-mono font-bold text-slate-300 px-0.5">
                          <span>{formatAudioTime(audioCurrentTime)}</span>
                          <span className="text-pink-400 font-semibold">{formatAudioTime(audioDuration || 35)} (320kbps MP3)</span>
                        </div>
                      </div>

                    </div>

                    {/* Primary Purple Download Audio Button */}
                    <button
                      onClick={() => handleDownload(mediaData.audioUrl || mediaData.videoUrl, `${mediaData.id}_audio.mp3`, 'audio')}
                      disabled={downloadingKey === 'audio'}
                      className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:opacity-95 text-white font-extrabold text-sm sm:text-base flex items-center justify-between shadow-lg shadow-indigo-500/25 transition-all cursor-pointer disabled:opacity-60 group"
                    >
                      <div className="flex items-center gap-2.5">
                        {downloadingKey === 'audio' ? (
                          <Loader2 className="w-5 h-5 animate-spin shrink-0" />
                        ) : (
                          <Download className="w-5 h-5 shrink-0 group-hover:scale-110 transition-transform" />
                        )}
                        <span className="text-left font-black">
                          {downloadingKey === 'audio' ? 'Extracting 320kbps MP3...' : 'Download Audio Track (320kbps MP3)'}
                        </span>
                      </div>
                      <span className="hidden sm:inline-block text-[11px] uppercase font-black px-2.5 py-1 rounded-xl bg-white/20 text-white backdrop-blur-sm">
                        320k MP3
                      </span>
                    </button>

                    {/* Video with Audio option if available */}
                    {mediaData.videoUrl && (
                      <button
                        onClick={() => handleDownload(mediaData.videoWithAudioUrl || mediaData.videoUrl, `${mediaData.id}_1080p_with_audio.mp4`, 'video_with_audio')}
                        disabled={downloadingKey === 'video_with_audio'}
                        className="w-full py-3.5 px-6 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold text-xs sm:text-sm flex items-center justify-between border border-indigo-200 transition-all cursor-pointer disabled:opacity-60 group"
                      >
                        <div className="flex items-center gap-2">
                          {downloadingKey === 'video_with_audio' ? (
                            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                          ) : (
                            <Film className="w-4 h-4 text-indigo-600 shrink-0 group-hover:scale-110 transition-transform" />
                          )}
                          <span>
                            {downloadingKey === 'video_with_audio' ? 'Saving Video + Audio...' : 'Download Full Video with Audio (1080p MP4)'}
                          </span>
                        </div>
                        <div className="hidden sm:flex items-center gap-1 text-[10px] uppercase font-black px-2 py-0.5 rounded-lg bg-indigo-200/80 text-indigo-900">
                          <Volume2 className="w-3 h-3" />
                          <span>Video + Sound</span>
                        </div>
                      </button>
                    )}



                    {/* Secondary Download Again Button */}
                    <button
                      onClick={handleDownloadAgain}
                      className="w-full py-3 px-6 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 border border-slate-200 transition-colors cursor-pointer"
                    >
                      <RefreshCw className="w-4 h-4 text-slate-500" />
                      <span>Extract Another Audio Track</span>
                    </button>

                  </div>

                </div>

              </div>
            ) : activeCategory === 'story' ? (
              /* VIEW 2: INSTAGRAM STORY DOWNLOAD CARD */
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8 items-center">
                
                {/* Left Column: 9:16 Story Preview (Video or Image) */}
                <div className="md:col-span-5 flex justify-center">
                  <div className="relative w-full max-w-[280px] aspect-[9/16] bg-black rounded-3xl overflow-hidden shadow-2xl border border-slate-200">
                    {mediaData.videoUrl ? (
                      <video
                        ref={videoPreviewRef}
                        src={mediaData.videoUrl}
                        poster={mediaData.thumbnailUrl}
                        className="w-full h-full object-cover"
                        controls
                        playsInline
                        loop
                      />
                    ) : (
                      <img
                        src={(mediaData.images && mediaData.images[0]) || mediaData.thumbnailUrl}
                        alt="Instagram Story Preview"
                        className="w-full h-full object-cover"
                      />
                    )}
                    <div className="absolute top-3 left-3 bg-black/75 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black text-white tracking-wider uppercase">
                      {mediaData.videoUrl ? '1080P STORY VIDEO' : 'HD STORY PHOTO'}
                    </div>
                  </div>
                </div>

                {/* Right Column: Story Actions */}
                <div className="md:col-span-7 space-y-4">
                  <div className="space-y-1.5">
                    <span className="px-3 py-0.5 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200 text-[11px] font-black uppercase tracking-wider">
                      ANONYMOUS STORY READY
                    </span>
                    <h3 className="text-2xl font-black text-slate-900 font-['Outfit']">
                      {mediaData.username}
                    </h3>
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {mediaData.caption || 'Instagram Story without watermark. Anonymous viewing and instant download.'}
                    </p>
                  </div>

                  <div className="space-y-3 pt-2">
                    {/* 1. Download Story Video with Audio or Story Photo */}
                    <button
                      onClick={() => {
                        const fileUrl = mediaData.videoUrl || (mediaData.images && mediaData.images[0]) || mediaData.thumbnailUrl;
                        const filename = mediaData.videoUrl ? `${mediaData.id}_story_with_audio.mp4` : `${mediaData.id}_story.jpg`;
                        handleDownload(fileUrl, filename, 'story');
                      }}
                      disabled={downloadingKey === 'story'}
                      className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:opacity-95 text-white font-extrabold text-sm sm:text-base flex items-center justify-between shadow-lg shadow-indigo-500/25 transition-all cursor-pointer disabled:opacity-60 group"
                    >
                      <div className="flex items-center gap-2.5">
                        {downloadingKey === 'story' ? (
                          <Loader2 className="w-5 h-5 animate-spin shrink-0" />
                        ) : (
                          <Download className="w-5 h-5 shrink-0 group-hover:scale-110 transition-transform" />
                        )}
                        <span className="text-left font-black">
                          {downloadingKey === 'story' 
                            ? 'Saving Story...' 
                            : (mediaData.videoUrl ? 'Download Story Video with Audio (MP4)' : 'Download Story Photo (HD JPG)')}
                        </span>
                      </div>
                      {mediaData.videoUrl && (
                        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/20 text-white text-[11px] font-black uppercase tracking-wider backdrop-blur-sm">
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>1080p + Sound</span>
                        </div>
                      )}
                    </button>



                    {/* 3. Story Audio Track if video exists */}
                    {mediaData.videoUrl && mediaData.audioUrl && (
                      <button
                        onClick={() => handleDownload(mediaData.audioUrl, `${mediaData.id}_story_audio.mp3`, 'audio')}
                        disabled={downloadingKey === 'audio'}
                        className="w-full py-3.5 px-6 rounded-2xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-extrabold text-xs sm:text-sm flex items-center justify-between border border-purple-200 transition-all cursor-pointer disabled:opacity-60 group"
                      >
                        <div className="flex items-center gap-2">
                          {downloadingKey === 'audio' ? (
                            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                          ) : (
                            <Music className="w-4 h-4 text-purple-600 shrink-0 group-hover:rotate-12 transition-transform" />
                          )}
                          <span>
                            {downloadingKey === 'audio' ? 'Extracting Audio Track...' : 'Download Story Audio Track Only (MP3)'}
                          </span>
                        </div>
                        <span className="hidden sm:inline-block text-[10px] uppercase font-black px-2 py-0.5 rounded-lg bg-purple-200/70 text-purple-900">
                          Audio Only
                        </span>
                      </button>
                    )}

                    <button
                      onClick={handleDownloadAgain}
                      className="w-full py-3 px-6 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 border border-slate-200 transition-colors cursor-pointer"
                    >
                      <RefreshCw className="w-4 h-4 text-slate-500" />
                      <span>Download Another Story</span>
                    </button>
                  </div>

                  <div className="flex justify-between items-center text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                    <button
                      onClick={handleCopyCaption}
                      className="hover:text-indigo-600 flex items-center gap-1 cursor-pointer font-bold"
                    >
                      {copiedCaption ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedCaption ? 'Caption Copied' : 'Copy Caption & Tags'}</span>
                    </button>

                    <button
                      onClick={() => {
                        const fileUrl = mediaData.videoUrl || (mediaData.images && mediaData.images[0]) || mediaData.thumbnailUrl;
                        const filename = mediaData.videoUrl ? `${mediaData.id}_story.mp4` : `${mediaData.id}_story.jpg`;
                        handleDownload(fileUrl, filename, 'direct_story');
                      }}
                      className="hover:text-indigo-600 flex items-center gap-1 underline font-bold cursor-pointer bg-transparent border-0"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Direct Stream
                    </button>
                  </div>

                </div>

              </div>
            ) : activeCategory === 'cover' ? (
              /* VIEW 2: REELS COVER PAGE DOWNLOAD CARD */
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8 items-center">
                
                {/* Left Column: 9:16 Vertical HD Cover */}
                <div className="md:col-span-5 flex justify-center">
                  <div className="relative w-full max-w-[260px] aspect-[9/16] bg-slate-100 rounded-3xl overflow-hidden shadow-xl border border-slate-200 group">
                    <img
                      src={mediaData.thumbnailUrl || (mediaData.images && mediaData.images[0])}
                      alt="Reels Cover Poster"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-3 left-3 bg-black/75 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black text-white tracking-wider uppercase">
                      1080P HD COVER
                    </div>
                  </div>
                </div>

                {/* Right Column: Details & Actions */}
                <div className="md:col-span-7 space-y-4">
                  <div className="space-y-1.5">
                    <span className="px-3 py-0.5 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200 text-[11px] font-black uppercase tracking-wider">
                      REELS COVER READY
                    </span>
                    <h3 className="text-2xl font-black text-slate-900 font-['Outfit']">
                      {mediaData.username}
                    </h3>
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {mediaData.caption}
                    </p>
                  </div>

                  <div className="space-y-3 pt-2">
                    <button
                      onClick={() => handleDownload(mediaData.thumbnailUrl || (mediaData.images && mediaData.images[0]), `${mediaData.id}_cover.jpg`, 'cover')}
                      disabled={downloadingKey === 'cover'}
                      className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:opacity-95 text-white font-extrabold text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-lg shadow-indigo-500/25 transition-all cursor-pointer disabled:opacity-60"
                    >
                      {downloadingKey === 'cover' ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Saving HD Cover...</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-5 h-5" />
                          <span>Download Cover Page (HD JPG)</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleDownloadAgain}
                      className="w-full py-3.5 px-6 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 border border-slate-200 transition-colors cursor-pointer"
                    >
                      <RefreshCw className="w-4 h-4 text-slate-600" />
                      <span>Download Another Cover</span>
                    </button>
                  </div>

                  <div className="flex justify-between items-center text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                    <button
                      onClick={handleCopyCaption}
                      className="hover:text-indigo-600 flex items-center gap-1 cursor-pointer font-bold"
                    >
                      {copiedCaption ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedCaption ? 'Caption Copied' : 'Copy Caption & Tags'}</span>
                    </button>

                    <button
                      onClick={() => handleDownload(mediaData.thumbnailUrl || (mediaData.images && mediaData.images[0]), `${mediaData.id}_cover.jpg`, 'direct_cover')}
                      className="hover:text-indigo-600 flex items-center gap-1 underline font-bold cursor-pointer bg-transparent border-0"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Open Full Size
                    </button>
                  </div>

                </div>

              </div>
            ) : activeCategory === 'photo' ? (
              /* VIEW 3: PHOTO / CAROUSEL DOWNLOAD CARD */
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8 items-center">
                
                {/* Left Column: Photo Preview with Carousel Controls */}
                <div className="md:col-span-5 flex flex-col items-center gap-3">
                  <div className="relative w-full max-w-[280px] aspect-[4/5] bg-slate-100 rounded-3xl overflow-hidden shadow-xl border border-slate-200 group">
                    <img
                      src={(mediaData.images && mediaData.images[currentSlideIndex]) || mediaData.thumbnailUrl}
                      alt="Instagram Photo"
                      className="w-full h-full object-cover transition-all duration-300"
                    />
                    {mediaData.images && mediaData.images.length > 1 && (
                      <>
                        <button
                          onClick={() => setCurrentSlideIndex((prev) => (prev > 0 ? prev - 1 : mediaData.images.length - 1))}
                          className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white transition-all cursor-pointer shadow-md"
                          title="Previous Photo"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setCurrentSlideIndex((prev) => (prev < mediaData.images.length - 1 ? prev + 1 : 0))}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white transition-all cursor-pointer shadow-md"
                          title="Next Photo"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                        <div className="absolute bottom-3 right-3 bg-black/75 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold text-white shadow-md">
                          {currentSlideIndex + 1} / {mediaData.images.length}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Thumbnail Strip for Carousel */}
                  {mediaData.images && mediaData.images.length > 1 && (
                    <div className="flex items-center gap-1.5 overflow-x-auto max-w-[280px] py-1 px-1">
                      {mediaData.images.map((img, idx) => (
                        <button
                          key={idx}
                          onClick={() => setCurrentSlideIndex(idx)}
                          className={`relative w-10 h-10 rounded-lg overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                            currentSlideIndex === idx ? 'border-pink-600 scale-105 shadow-sm' : 'border-transparent opacity-60 hover:opacity-100'
                          }`}
                        >
                          <img src={img} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right Column: Actions */}
                <div className="md:col-span-7 space-y-4">
                  <div className="space-y-1.5">
                    <span className="px-3 py-0.5 rounded-full bg-pink-100 text-pink-700 border border-pink-200 text-[11px] font-black uppercase tracking-wider">
                      PHOTO (HD JPG) READY
                    </span>
                    <h3 className="text-2xl font-black text-slate-900 font-['Outfit']">
                      {mediaData.username}
                    </h3>
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {mediaData.caption}
                    </p>
                  </div>

                  <div className="space-y-3 pt-2">
                    <button
                      onClick={() => handleDownload((mediaData.images && mediaData.images[currentSlideIndex]) || mediaData.thumbnailUrl, `${mediaData.id}_photo_${currentSlideIndex + 1}.jpg`, 'photo')}
                      disabled={downloadingKey === 'photo'}
                      className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:opacity-95 text-white font-extrabold text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-lg shadow-indigo-500/25 transition-all cursor-pointer disabled:opacity-60"
                    >
                      {downloadingKey === 'photo' ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Saving HD Photo...</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-5 h-5" />
                          <span>Download Photo {mediaData.images && mediaData.images.length > 1 ? `#${currentSlideIndex + 1}` : ''} (HD Lossless JPG)</span>
                        </>
                      )}
                    </button>

                    {mediaData.images && mediaData.images.length > 1 && (
                      <button
                        onClick={async () => {
                          for (let i = 0; i < mediaData.images.length; i++) {
                            await handleDownload(mediaData.images[i], `${mediaData.id}_photo_${i + 1}.jpg`, `photo_${i}`);
                          }
                        }}
                        className="w-full py-3 px-6 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 hover:opacity-95 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                      >
                        <Layers className="w-4 h-4" />
                        <span>Download All {mediaData.images.length} Carousel Photos</span>
                      </button>
                    )}

                    <button
                      onClick={handleDownloadAgain}
                      className="w-full py-3.5 px-6 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 border border-slate-200 transition-colors cursor-pointer"
                    >
                      <RefreshCw className="w-4 h-4 text-slate-600" />
                      <span>Download Another Photo</span>
                    </button>
                  </div>

                  <div className="flex justify-between items-center text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                    <button
                      onClick={handleCopyCaption}
                      className="hover:text-pink-600 flex items-center gap-1 cursor-pointer font-bold"
                    >
                      {copiedCaption ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedCaption ? 'Caption Copied' : 'Copy Caption & Tags'}</span>
                    </button>

                    <button
                      onClick={() => handleDownload((mediaData.images && mediaData.images[currentSlideIndex]) || mediaData.thumbnailUrl, `${mediaData.id}_photo_${currentSlideIndex + 1}.jpg`, 'direct_photo')}
                      className="hover:text-pink-600 flex items-center gap-1 underline font-bold cursor-pointer bg-transparent border-0"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Direct Photo Link
                    </button>
                  </div>

                </div>

              </div>
            ) : (
              /* VIEW 4: REELS VIDEO DOWNLOAD CARD */
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8 items-center">
                
                {/* Left Column: 9:16 Vertical Reel Player */}
                <div className="md:col-span-5 flex justify-center">
                  <div className="relative w-full max-w-[280px] aspect-[9/16] bg-black rounded-3xl overflow-hidden shadow-2xl border border-slate-200">
                    <video
                      ref={videoPreviewRef}
                      src={mediaData.videoUrl}
                      poster={mediaData.thumbnailUrl}
                      className="w-full h-full object-cover"
                      controls
                      playsInline
                      loop
                    />
                  </div>
                </div>

                {/* Right Column: Details & Actions */}
                <div className="md:col-span-7 space-y-4">
                  <div className="space-y-1.5">
                    <span className="px-3 py-0.5 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200 text-[11px] font-black uppercase tracking-wider">
                      REELS 1080P HD READY
                    </span>
                    <h3 className="text-2xl font-black text-slate-900 font-['Outfit']">
                      {mediaData.username}
                    </h3>
                    {mediaData.audioTitle && (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-purple-50 border border-purple-200 text-purple-700 text-xs font-bold">
                        <Music className="w-3.5 h-3.5" />
                        <span className="truncate max-w-[280px]">{mediaData.audioTitle}</span>
                      </div>
                    )}
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {mediaData.caption}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="space-y-3 pt-2">
                    {/* 1. Primary Button: Download Video with Audio (1080p MP4) */}
                    <button
                      onClick={() => handleDownload(mediaData.videoWithAudioUrl || mediaData.videoUrl, `${mediaData.id}_1080p_with_audio.mp4`, 'video_with_audio')}
                      disabled={downloadingKey === 'video_with_audio'}
                      className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:opacity-95 text-white font-extrabold text-sm sm:text-base flex items-center justify-between shadow-lg shadow-indigo-500/25 transition-all cursor-pointer disabled:opacity-60 group"
                    >
                      <div className="flex items-center gap-2.5">
                        {downloadingKey === 'video_with_audio' ? (
                          <Loader2 className="w-5 h-5 animate-spin shrink-0" />
                        ) : (
                          <Download className="w-5 h-5 shrink-0 group-hover:scale-110 transition-transform" />
                        )}
                        <span className="text-left font-black">
                          {downloadingKey === 'video_with_audio' ? 'Saving 1080p Video + Audio...' : 'Download Video with Audio (MP4)'}
                        </span>
                      </div>
                      <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/20 text-white text-[11px] font-black uppercase tracking-wider backdrop-blur-sm">
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>1080p HD + Sound</span>
                      </div>
                    </button>



                    {/* 3. Audio Track Download Button */}
                    {mediaData.audioUrl && (
                      <button
                        onClick={() => handleDownload(mediaData.audioUrl, `${mediaData.id}_audio.mp3`, 'audio')}
                        disabled={downloadingKey === 'audio'}
                        className="w-full py-3.5 px-6 rounded-2xl bg-purple-50 hover:bg-purple-100/90 text-purple-700 font-extrabold text-xs sm:text-sm flex items-center justify-between border border-purple-200 transition-all cursor-pointer disabled:opacity-60 group"
                      >
                        <div className="flex items-center gap-2">
                          {downloadingKey === 'audio' ? (
                            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                          ) : (
                            <Music className="w-4 h-4 text-purple-600 shrink-0 group-hover:rotate-12 transition-transform" />
                          )}
                          <span>
                            {downloadingKey === 'audio' ? 'Extracting Audio Track...' : 'Download Audio Track Only (320kbps MP3)'}
                          </span>
                        </div>
                        <span className="hidden sm:inline-block text-[10px] uppercase font-black px-2 py-0.5 rounded-lg bg-purple-200/70 text-purple-900">
                          Audio Only
                        </span>
                      </button>
                    )}

                    {/* 4. Restart / Another Video */}
                    <button
                      onClick={handleDownloadAgain}
                      className="w-full py-3 px-6 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 border border-slate-200 transition-colors cursor-pointer"
                    >
                      <RefreshCw className="w-4 h-4 text-slate-500" />
                      <span>Download Another Video</span>
                    </button>
                  </div>

                  <div className="flex justify-between items-center text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                    <button
                      onClick={handleCopyCaption}
                      className="hover:text-indigo-600 flex items-center gap-1 cursor-pointer font-bold"
                    >
                      {copiedCaption ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedCaption ? 'Caption Copied' : 'Copy Caption & Tags'}</span>
                    </button>

                    <button
                      onClick={() => handleDownload(mediaData.videoWithAudioUrl || mediaData.videoUrl, `${mediaData.id}_1080p_with_audio.mp4`, 'direct_video')}
                      className="hover:text-indigo-600 flex items-center gap-1 underline font-bold cursor-pointer bg-transparent border-0"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Direct Stream Link
                    </button>
                  </div>

                </div>

              </div>
            )}

          </div>

        </div>
      )}

      {/* HOW TO DOWNLOAD - 3-STEP INFOGRAPHIC TIMELINE */}
      <section className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-10 space-y-8 max-w-4xl mx-auto shadow-sm">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 font-['Outfit']">
            How to Download Media with{' '}
            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              ReelsVault.io
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 max-w-xl mx-auto">
            Save any Instagram Reel, Audio MP3, Story, or Photo to your phone or PC in 3 easy steps.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-6 space-y-3 text-center group hover:border-indigo-400 hover:shadow-md transition-all">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-lg shadow-md shadow-indigo-500/20">
              1
            </div>
            <h3 className="text-base font-bold text-slate-900">Copy Link</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Open Instagram, tap Share on any Reel, Post, or Story and select <strong>"Copy Link"</strong>.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-6 space-y-3 text-center group hover:border-purple-400 hover:shadow-md transition-all">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-purple-600 text-white flex items-center justify-center font-black text-lg shadow-md shadow-purple-500/20">
              2
            </div>
            <h3 className="text-base font-bold text-slate-900">Paste & Analyze</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Paste the link into the <strong>ReelsVault.io</strong> input bar and click <strong>"Download"</strong>.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-6 space-y-3 text-center group hover:border-pink-400 hover:shadow-md transition-all">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-pink-600 text-white flex items-center justify-center font-black text-lg shadow-md shadow-pink-500/20">
              3
            </div>
            <h3 className="text-base font-bold text-slate-900">Save Lossless File</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Click <strong>"Download"</strong> to save original 1080p MP4 or 320kbps MP3 audio with no watermarks.
            </p>
          </div>

        </div>
      </section>


      {/* FREQUENTLY ASKED QUESTIONS */}
      <section className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-10 space-y-6 max-w-4xl mx-auto shadow-sm">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Help & FAQ</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 font-['Outfit']">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="max-w-3xl mx-auto space-y-3 pt-2">
          {FAQ_ITEMS.map((faq, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div 
                key={idx}
                className="border border-slate-200/90 rounded-2xl bg-slate-50/60 overflow-hidden transition-colors"
              >
                <button
                  onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                  className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 cursor-pointer hover:text-indigo-600 transition-colors"
                >
                  <span className="text-xs sm:text-sm font-bold text-slate-900">{faq.q}</span>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-indigo-600 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 sm:px-5 sm:pb-5 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-200/60 pt-3 animate-fadeIn">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* GOOGLE ADSENSE COMPLIANCE FOOTER & POLICY INFO */}
      <footer className="border-t border-slate-200/90 pt-8 pb-12 mt-12 text-center space-y-4 max-w-4xl mx-auto px-4">
        <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-semibold text-slate-500">
          <a href="#about" className="hover:text-indigo-600 transition">About Us</a>
          <span>•</span>
          <a href="#privacy" className="hover:text-indigo-600 transition">Privacy Policy</a>
          <span>•</span>
          <a href="#terms" className="hover:text-indigo-600 transition">Terms of Service</a>
          <span>•</span>
          <a href="#dmca" className="hover:text-indigo-600 transition">DMCA Disclaimer</a>
          <span>•</span>
          <a href="mailto:support@reelsvault.com" className="hover:text-indigo-600 transition">Contact Us</a>
        </div>

        <p className="text-[11px] text-slate-400 max-w-2xl mx-auto leading-relaxed">
          ReelsVault is not affiliated with Instagram, Meta, or Facebook. We do not host any copyrighted videos or media on our servers. All media is delivered directly from Instagram CDN servers.
        </p>

        <p className="text-[11px] font-medium text-slate-400">
          © {new Date().getFullYear()} ReelsVault.io — All rights reserved.
        </p>
      </footer>

    </div>
  );
}
