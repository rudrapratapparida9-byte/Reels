import React, { useState, useRef } from 'react';
import { 
  Film, Image as ImageIcon, Music, Download, Sparkles, Copy, Check, 
  Play, Pause, ChevronLeft, ChevronRight, AlertCircle, 
  Loader2, ShieldCheck, Heart, MessageCircle, 
  Link as LinkIcon, ExternalLink, HelpCircle, CheckCircle2, Zap,
  BookOpen, Eye, UserCheck, ArrowDown, ChevronDown, ChevronUp,
  RefreshCw, Info, X, ArrowRight, Star, Disc3, Radio, Layers,
  Volume2, FastForward
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { 
  fetchInstagramMedia, 
  downloadMediaFile 
} from '../utils/instaDownloader';

const DEFAULT_MEDIA = {
  id: 'insta_sample',
  shortcode: 'sample',
  type: 'reel',
  title: 'Instagram Reel Preview (Ready to Download)',
  username: '@instagram_creator',
  userAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
  likes: '142.5K',
  comments: '1,840',
  caption: 'Paste any public Instagram link above to fetch high-resolution videos, stories, audio tracks, and covers without watermark! 🚀',
  url: 'https://www.instagram.com/reel/sample/',
  videoUrl: 'https://media.w3.org/2010/05/sintel/trailer.mp4',
  thumbnailUrl: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=1080&auto=format&fit=crop&q=80',
  images: ['https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=1080&auto=format&fit=crop&q=80'],
  audioTitle: 'Original Audio Track (320kbps MP3)',
  audioUrl: 'https://media.w3.org/2010/05/sintel/trailer.mp4',
  duration: 'HD 1080p'
};

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
  const [mediaData, setMediaData] = useState(DEFAULT_MEDIA);
  const [errorMsg, setErrorMsg] = useState(null);

  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [downloadingKey, setDownloadingKey] = useState(null);
  const [downloadSuccessMsg, setDownloadSuccessMsg] = useState(null);
  const [openFaqIndex, setOpenFaqIndex] = useState(null);
  const [showAd, setShowAd] = useState(true);

  const videoPreviewRef = useRef(null);

  const handleFetch = async (urlToFetch) => {
    const targetUrl = (urlToFetch || urlInput).trim();
    if (!targetUrl) {
      setErrorMsg("Please paste a valid Instagram link.");
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
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrlInput(text);
        handleFetch(text);
      }
    } catch (e) {
      if (urlInput.trim()) {
        handleFetch(urlInput);
      }
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
          titleBadge: 'Ultra 1080p 60FPS Video Saver',
          title: 'Instagram Reels Video Downloader',
          highlight: 'Reels Video',
          subtitle: 'Download Instagram Reels in original 1080p crystal-clear quality without watermark:',
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
                type="url"
                placeholder={categoryDetails.placeholder}
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleFetch()}
                className="w-full bg-transparent text-sm sm:text-base px-2 py-2 text-slate-900 placeholder-slate-400 outline-none font-medium"
              />

              {/* Clear button if input has text */}
              {urlInput && (
                <button
                  onClick={() => setUrlInput('')}
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

          {/* Error Message Box */}
          {errorMsg && (
            <div className="mt-4 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-center gap-3 animate-fadeIn font-semibold text-left">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
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
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-2">
                        <div className="flex items-center gap-1 text-[10px] font-bold text-white uppercase bg-purple-600/80 px-2 py-0.5 rounded-md backdrop-blur-sm">
                          <Disc3 className="w-3 h-3 animate-spin" />
                          <span>320 KBPS</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="inline-block">
                        <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[10px] font-black uppercase tracking-wider border border-purple-200">
                          STUDIO AUDIO MASTER
                        </span>
                      </div>
                      <h3 className="text-xl sm:text-2xl font-black text-slate-900 font-['Outfit']">
                        {mediaData.username}
                      </h3>
                      <p className="text-xs text-slate-500 font-medium">
                        Original Instagram Soundtrack
                      </p>
                    </div>
                  </div>

                  {/* Right: Audio Player + Action Buttons */}
                  <div className="md:col-span-7 space-y-3.5">
                    
                    {/* Native Audio Scrubber Player */}
                    {mediaData.audioUrl && (
                      <div className="bg-slate-100 p-3 rounded-2xl border border-slate-200">
                        <audio
                          controls
                          src={mediaData.audioUrl}
                          className="w-full h-10 outline-none"
                        />
                      </div>
                    )}

                    {/* Primary Purple Download Audio Button */}
                    <button
                      onClick={() => handleDownload(mediaData.audioUrl || mediaData.videoUrl, `${mediaData.id}_audio.mp3`, 'audio')}
                      disabled={downloadingKey === 'audio'}
                      className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:opacity-95 text-white font-extrabold text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-lg shadow-indigo-500/25 transition-all cursor-pointer disabled:opacity-60"
                    >
                      {downloadingKey === 'audio' ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Extracting 320kbps MP3...</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-5 h-5" />
                          <span>Download Audio Track (320kbps MP3)</span>
                        </>
                      )}
                    </button>

                    {/* Secondary Download Again Button */}
                    <button
                      onClick={handleDownloadAgain}
                      className="w-full py-3.5 px-6 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 border border-slate-200 transition-colors cursor-pointer"
                    >
                      <RefreshCw className="w-4 h-4 text-slate-600" />
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
                    <button
                      onClick={() => {
                        const fileUrl = mediaData.videoUrl || (mediaData.images && mediaData.images[0]) || mediaData.thumbnailUrl;
                        const filename = mediaData.videoUrl ? `${mediaData.id}_story.mp4` : `${mediaData.id}_story.jpg`;
                        handleDownload(fileUrl, filename, 'story');
                      }}
                      disabled={downloadingKey === 'story'}
                      className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:opacity-95 text-white font-extrabold text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-lg shadow-indigo-500/25 transition-all cursor-pointer disabled:opacity-60"
                    >
                      {downloadingKey === 'story' ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Saving Story...</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-5 h-5" />
                          <span>{mediaData.videoUrl ? 'Download Story Video (1080p MP4)' : 'Download Story Photo (HD JPG)'}</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleDownloadAgain}
                      className="w-full py-3.5 px-6 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 border border-slate-200 transition-colors cursor-pointer"
                    >
                      <RefreshCw className="w-4 h-4 text-slate-600" />
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

                    <a
                      href={mediaData.videoUrl || mediaData.thumbnailUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-indigo-600 flex items-center gap-1 underline font-bold"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Direct Stream
                    </a>
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

                    <a
                      href={mediaData.thumbnailUrl || (mediaData.images && mediaData.images[0])}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-indigo-600 flex items-center gap-1 underline font-bold"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Open Full Size
                    </a>
                  </div>

                </div>

              </div>
            ) : activeCategory === 'photo' ? (
              /* VIEW 3: PHOTO / CAROUSEL DOWNLOAD CARD */
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8 items-center">
                
                {/* Left Column: Photo Preview */}
                <div className="md:col-span-5 flex justify-center">
                  <div className="relative w-full max-w-[280px] aspect-[4/5] bg-slate-100 rounded-3xl overflow-hidden shadow-xl border border-slate-200">
                    <img
                      src={(mediaData.images && mediaData.images[currentSlideIndex]) || mediaData.thumbnailUrl}
                      alt="Instagram Photo"
                      className="w-full h-full object-cover"
                    />
                    {mediaData.images && mediaData.images.length > 1 && (
                      <div className="absolute bottom-3 right-3 bg-black/75 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold text-white">
                        {currentSlideIndex + 1} / {mediaData.images.length}
                      </div>
                    )}
                  </div>
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
                          <span>Download Photo (HD Lossless JPG)</span>
                        </>
                      )}
                    </button>

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

                    <a
                      href={(mediaData.images && mediaData.images[currentSlideIndex]) || mediaData.thumbnailUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-pink-600 flex items-center gap-1 underline font-bold"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Direct Photo Link
                    </a>
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
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {mediaData.caption}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="space-y-3 pt-2">
                    <button
                      onClick={() => handleDownload(mediaData.videoUrl, `${mediaData.id}_1080p.mp4`, 'video')}
                      disabled={downloadingKey === 'video'}
                      className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:opacity-95 text-white font-extrabold text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-lg shadow-indigo-500/25 transition-all cursor-pointer disabled:opacity-60"
                    >
                      {downloadingKey === 'video' ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Saving 1080p HD Video...</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-5 h-5" />
                          <span>Download 1080p Video (MP4)</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleDownloadAgain}
                      className="w-full py-3.5 px-6 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 border border-slate-200 transition-colors cursor-pointer"
                    >
                      <RefreshCw className="w-4 h-4 text-slate-600" />
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

                    <a
                      href={mediaData.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={`${mediaData.id}_1080p.mp4`}
                      className="hover:text-indigo-600 flex items-center gap-1 underline font-bold"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Direct Video Stream
                    </a>
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
