import React, { useState, useRef } from 'react';
import { 
  Upload, Film, Play, Sparkles, CheckCircle2, Video, 
  Link as LinkIcon, Camera, ArrowRight, ShieldCheck, 
  Flame, Globe, Zap, Clock, FileVideo, Radio, Sliders,
  Headphones, Layers, Music, Wand2, Box, Eye, Mic
} from 'lucide-react';
import { extractAudioPeaks } from '../utils/audioWaveform';

export const PRO_DEMO_VIDEOS = [
  {
    id: 'demo-hindi',
    title: 'Hindi to Odia Tech Breakdown',
    tag: 'Hindi Spoken 🇮🇳',
    category: 'AI & Tech',
    duration: '0:15',
    url: 'https://media.w3.org/2010/05/sintel/trailer.mp4',
    captions: [
      { id: 1, startTime: 0.5, endTime: 3.2, text: "नमस्ते दोस्तों, हमारे वीडियो कैप्शन जनरेटर में आपका स्वागत है।" },
      { id: 2, startTime: 3.5, endTime: 6.8, text: "आर्टिफिशियल इंटेलिजेंस आपकी आवाज को सटीक सबटाइटल में बदल देता है।" },
      { id: 3, startTime: 7.0, endTime: 10.5, text: "आप इन सबटाइटल्स को आसानी से ओडिया और तेलुगू में बदल सकते हैं।" },
      { id: 4, startTime: 11.0, endTime: 14.2, text: "तैयार कैप्शन वाला वीडियो सीधे डाउनलोड करें।" }
    ]
  },
  {
    id: 'demo-odia',
    title: 'Odia Native Masterclass',
    tag: 'Odia Spoken 🇮🇳',
    category: 'Education',
    duration: '0:15',
    url: 'https://vjs.zencdn.net/v/oceans.mp4',
    captions: [
      { id: 1, startTime: 0.8, endTime: 3.6, text: "ନମସ୍କାର ବନ୍ଧୁଗଣ, ଆମର ଏହି ସୁନ୍ଦର ଭିଡିଓକୁ ସ୍ୱାଗତ।" },
      { id: 2, startTime: 4.0, endTime: 7.2, text: "ପ୍ରକୃତିରେ ଆମ ମନକୁ ଶାନ୍ତି ଏବଂ ପ୍ରେରଣା ଦେବାର ଅଦ୍ଭୁତ ଶକ୍ତି ଅଛି।" },
      { id: 3, startTime: 7.8, endTime: 11.0, text: "ଚାଲନ୍ତୁ ଏବେ ହିଁ ଆମର ଏହି ଯାତ୍ରା ଆରମ୍ଭ କରିବା।" },
      { id: 4, startTime: 11.5, endTime: 14.5, text: "ଆମ ସହିତ ଯୋଡି ହୋଇ ଭିଡିଓ ଦେଖିଥିବାରୁ ଧନ୍ୟବାଦ।" }
    ]
  },
  {
    id: 'demo-story',
    title: 'Viral Shorts & Reel Creator',
    tag: 'Hormozi 3D Style',
    category: 'Reels',
    duration: '0:12',
    url: 'https://www.w3schools.com/html/mov_bbb.mp4',
    captions: [
      { id: 1, startTime: 0.5, endTime: 3.0, text: "Every viral short starts with an engaging hook." },
      { id: 2, startTime: 3.4, endTime: 6.5, text: "Dynamic animated captions multiply your video retention." },
      { id: 3, startTime: 7.0, endTime: 9.8, text: "Reach audiences in Odia, Hindi, Telugu, and English." },
      { id: 4, startTime: 10.2, endTime: 12.0, text: "Burn-in custom styles and download instantly!" }
    ]
  }
];

export default function VideoUploader({ onVideoSelected, isProcessing, processingStatus }) {
  const [activeTab, setActiveTab] = useState('upload');
  const [isDragging, setIsDragging] = useState(false);
  const [videoUrlInput, setVideoUrlInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [spokenLang, setSpokenLang] = useState('hi');

  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const liveVideoRef = useRef(null);
  const streamRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('video/')) {
        onVideoSelected(file, null, spokenLang);
      } else {
        alert('Please drop a valid video file (MP4, WebM, MOV).');
      }
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.type.startsWith('video/')) {
        onVideoSelected(file, null, spokenLang);
      }
    }
  };

  const handleUrlSubmit = (e) => {
    e.preventDefault();
    if (!videoUrlInput.trim()) return;
    onVideoSelected(videoUrlInput.trim(), null, spokenLang);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = stream;
        liveVideoRef.current.play();
      }

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      const chunks = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const file = new File([blob], "recorded_video.webm", { type: "video/webm" });
        setRecordedBlob(file);
        stream.getTracks().forEach(t => t.stop());
      };

      recorder.start();
      setIsRecording(true);
    } catch (err) {
      alert("Camera/Mic permission denied or not supported in this browser environment.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-10 animate-fadeIn py-2 perspective-container">
      
      {/* 3D Holographic Studio Hero Showcase */}
      <div className="relative rounded-3xl overflow-hidden border border-white/15 shadow-2xl bg-slate-950 card-3d group">
        <div className="relative h-[360px] sm:h-[420px] w-full overflow-hidden">
          <img
            src="/hero_3d_studio.jpg"
            alt="3D Holographic Video Editing Studio"
            className="w-full h-full object-cover object-center scale-100 group-hover:scale-105 transition-transform duration-700 opacity-65"
          />
          
          <div className="absolute inset-0 bg-gradient-to-t from-[#060913] via-[#060913]/75 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#060913]/90 via-[#060913]/55 to-transparent" />
          
          <div className="absolute top-6 right-6 hidden md:flex flex-col items-end gap-3 pointer-events-none animate-float-3d">
            <div className="px-4 py-2.5 rounded-2xl bg-slate-950/85 backdrop-blur-xl border border-cyan-500/40 shadow-2xl shadow-cyan-500/30 flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
              <span className="text-xs font-bold text-cyan-300 font-['Outfit']">
                ✨ 3D Spatial Audio & Multi-Script AI
              </span>
            </div>

            <div className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500/20 to-pink-500/20 backdrop-blur-xl border border-amber-500/40 text-amber-300 text-xs font-bold font-odia shadow-xl">
              🇮🇳 ଓଡ଼ିଆ • हिन्दी • తెలుగు • 🇬🇧 English
            </div>

            <div className="px-3 py-1.5 rounded-lg bg-indigo-950/90 border border-indigo-500/40 text-[11px] font-mono text-indigo-300">
              Hindi &rarr; Odia / Telugu Bidirectional
            </div>
          </div>
        </div>

        <div className="absolute inset-0 p-6 sm:p-10 flex flex-col justify-end space-y-4 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="px-3.5 py-1 rounded-full bg-indigo-500/25 border border-indigo-500/50 text-indigo-200 text-xs font-bold flex items-center gap-1.5 backdrop-blur-md shadow-md shadow-indigo-500/20">
              <Box className="w-3.5 h-3.5 text-indigo-400" />
              3D AI Video Caption Studio
            </span>
            <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold backdrop-blur-md flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Accurate Hindi &rarr; Odia Captions
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight font-['Outfit'] drop-shadow-lg">
            Auto-Generate <span className="gradient-text">Captions</span> with 3D Precision
          </h1>

          <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed drop-shadow">
            Convert spoken audio to accurate timestamped text, translate seamlessly between <span className="text-white font-semibold">Hindi, Odia (ଓଡ଼ିଆ), Telugu (తెలుగు) & English</span>, and burn custom styles directly onto your video.
          </p>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs text-slate-400 font-medium mr-1">Scripts:</span>
            <span className="px-3 py-1 rounded-xl bg-slate-900/95 border border-white/10 text-xs font-bold text-white shadow-md">
              🇬🇧 English
            </span>
            <span className="px-3 py-1 rounded-xl bg-slate-900/95 border border-amber-500/40 text-xs font-bold text-amber-300 font-odia shadow-md">
              🇮🇳 Odia (ଓଡ଼ିଆ)
            </span>
            <span className="px-3 py-1 rounded-xl bg-slate-900/95 border border-emerald-500/40 text-xs font-bold text-emerald-300 font-hindi shadow-md">
              🇮🇳 Hindi (हिन्दी)
            </span>
            <span className="px-3 py-1 rounded-xl bg-slate-900/95 border border-cyan-500/40 text-xs font-bold text-cyan-300 font-telugu shadow-md">
              🇮🇳 Telugu (తెలుగు)
            </span>
          </div>
        </div>
      </div>

      {/* Main 3D Studio Upload Hub Card */}
      <div className="bg-[#0b1120] border border-white/10 rounded-3xl p-4 sm:p-7 shadow-2xl card-3d relative overflow-hidden space-y-6">
        <div className="absolute top-0 right-1/4 w-96 h-48 bg-indigo-500/15 blur-3xl pointer-events-none rounded-full" />

        {/* Spoken Language Selector in Video */}
        <div className="bg-slate-950/80 p-3.5 sm:p-4 rounded-2xl border border-white/10 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Mic className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Spoken Audio Language in your video:
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setSpokenLang('hi')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                spokenLang === 'hi'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/30'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-white/5'
              }`}
            >
              🇮🇳 Hindi (हिन्दी)
            </button>
            <button
              onClick={() => setSpokenLang('or')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold font-odia transition-all cursor-pointer ${
                spokenLang === 'or'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-500/30'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-white/5'
              }`}
            >
              🇮🇳 Odia (ଓଡ଼ିଆ)
            </button>
            <button
              onClick={() => setSpokenLang('te')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold font-telugu transition-all cursor-pointer ${
                spokenLang === 'te'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-500/30'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-white/5'
              }`}
            >
              🇮🇳 Telugu (తెలుగు)
            </button>
            <button
              onClick={() => setSpokenLang('en')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                spokenLang === 'en'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-white/5'
              }`}
            >
              🇬🇧 English
            </button>
          </div>
        </div>

        {/* 3D Upload Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setActiveTab('upload')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'upload'
                  ? 'bg-indigo-600 text-white btn-3d'
                  : 'bg-slate-900/90 text-slate-400 hover:text-slate-200 border border-white/5'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              Upload Video File
            </button>

            <button
              onClick={() => setActiveTab('url')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'url'
                  ? 'bg-indigo-600 text-white btn-3d'
                  : 'bg-slate-900/90 text-slate-400 hover:text-slate-200 border border-white/5'
              }`}
            >
              <LinkIcon className="w-3.5 h-3.5" />
              Import Video URL
            </button>

            <button
              onClick={() => setActiveTab('record')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'record'
                  ? 'bg-indigo-600 text-white btn-3d'
                  : 'bg-slate-900/90 text-slate-400 hover:text-slate-200 border border-white/5'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              Record Video / Audio
            </button>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Fast In-browser Acoustic Processing</span>
          </div>
        </div>

        {/* Processing Loading Animation */}
        {isProcessing ? (
          <div className="py-12 sm:py-16 text-center space-y-6">
            <div className="relative inline-flex items-center justify-center">
              <div className="w-24 h-24 rounded-3xl bg-indigo-950/80 border border-indigo-500/50 flex items-center justify-center shadow-2xl shadow-indigo-500/30">
                <FileVideo className="w-10 h-10 text-indigo-400 animate-pulse" />
              </div>
              <div className="absolute -inset-2.5 border-2 border-indigo-500/20 border-t-indigo-400 rounded-[28px] animate-spin" />
            </div>

            <div className="space-y-2 max-w-md mx-auto">
              <h3 className="text-xl font-bold text-white font-['Outfit']">
                {processingStatus?.message || 'Processing Video Speech...'}
              </h3>
              <p className="text-xs text-slate-400">
                Extracting acoustic waveform and generating timestamped segments...
              </p>
            </div>

            <div className="flex items-center justify-center gap-1.5 h-10">
              <span className="sound-bar" />
              <span className="sound-bar" />
              <span className="sound-bar" />
              <span className="sound-bar" />
              <span className="sound-bar" />
              <span className="sound-bar" />
              <span className="sound-bar" />
              <span className="sound-bar" />
            </div>

            <div className="w-full max-w-sm mx-auto bg-slate-900 rounded-full h-2 overflow-hidden border border-white/10">
              <div
                className="bg-gradient-to-r from-indigo-500 via-violet-500 to-pink-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${processingStatus?.progress || 45}%` }}
              />
            </div>
          </div>
        ) : (
          <div>
            {/* TAB 1: File Dropzone */}
            {activeTab === 'upload' && (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`group rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-300 border-2 border-dashed ${
                  isDragging
                    ? 'border-indigo-500 bg-indigo-950/40 scale-[1.01]'
                    : 'border-slate-800 hover:border-indigo-500/60 bg-slate-950/40 hover:bg-slate-950/70'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={handleFileChange}
                />

                <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center group-hover:scale-110 group-hover:bg-indigo-600/20 transition-all duration-300 shadow-xl shadow-indigo-500/10 mb-4">
                  <Upload className="w-7 h-7 text-indigo-400 group-hover:text-indigo-300" />
                </div>

                <div className="space-y-1.5 max-w-md mx-auto">
                  <h3 className="text-xl sm:text-2xl font-bold text-white font-['Outfit']">
                    Drop your video here or <span className="gradient-text">Browse</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Spoken language selected: <span className="text-indigo-300 font-bold">{spokenLang === 'hi' ? 'Hindi (हिन्दी)' : spokenLang === 'or' ? 'Odia (ଓଡ଼ିଆ)' : spokenLang === 'te' ? 'Telugu (తెలుగు)' : 'English'}</span>
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 pt-5">
                  <span className="px-3 py-1 rounded-full bg-slate-900 border border-white/5 text-[11px] text-slate-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Multi-track Waveform
                  </span>
                  <span className="px-3 py-1 rounded-full bg-slate-900 border border-white/5 text-[11px] text-slate-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Hindi &rarr; Odia / Telugu
                  </span>
                  <span className="px-3 py-1 rounded-full bg-slate-900 border border-white/5 text-[11px] text-slate-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Direct Burn-in Video Export
                  </span>
                </div>
              </div>
            )}

            {/* TAB 2: Video URL Input */}
            {activeTab === 'url' && (
              <form onSubmit={handleUrlSubmit} className="py-8 sm:py-10 max-w-xl mx-auto space-y-4">
                <div className="space-y-1.5 text-center">
                  <h4 className="text-base font-bold text-white">Import Public Video URL</h4>
                  <p className="text-xs text-slate-400">Paste any direct `.mp4`, `.webm`, or media stream link.</p>
                </div>

                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://example.com/sample_video.mp4"
                    value={videoUrlInput}
                    onChange={(e) => setVideoUrlInput(e.target.value)}
                    className="flex-1 glass-input text-xs"
                    required
                  />
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer btn-3d"
                  >
                    Load Video
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            )}

            {/* TAB 3: Direct WebCam / Mic Recording */}
            {activeTab === 'record' && (
              <div className="py-6 text-center space-y-5 max-w-lg mx-auto">
                <div className="relative aspect-video bg-black rounded-2xl overflow-hidden border border-white/10 flex items-center justify-center">
                  <video ref={liveVideoRef} className="w-full h-full object-cover" muted autoPlay playsInline />
                  {!isRecording && !recordedBlob && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 gap-2">
                      <Radio className="w-8 h-8 text-rose-500 animate-pulse" />
                      <span className="text-xs text-slate-300">Ready to record video & audio directly</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-center gap-3">
                  {!isRecording ? (
                    <button
                      onClick={startRecording}
                      className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer btn-3d-pink"
                    >
                      <Radio className="w-4 h-4" />
                      Start Camera Recording
                    </button>
                  ) : (
                    <button
                      onClick={stopRecording}
                      className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-2 border border-rose-500 transition-all cursor-pointer animate-pulse"
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                      Stop & Process
                    </button>
                  )}

                  {recordedBlob && (
                    <button
                      onClick={() => onVideoSelected(recordedBlob, null, spokenLang)}
                      className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer btn-3d"
                    >
                      Use Recorded Video &rarr;
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 1-Click Pro Creator Demo Reels */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">
              Try Ready-to-Test Creator Clips (Includes Hindi & Odia Test)
            </h4>
          </div>
          <span className="text-[11px] text-slate-500">No upload required</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PRO_DEMO_VIDEOS.map((demo) => (
            <div
              key={demo.id}
              onClick={() => !isProcessing && onVideoSelected(demo.url, demo, demo.id.includes('hindi') ? 'hi' : demo.id.includes('odia') ? 'or' : 'en')}
              className="bg-[#0b1120] border border-white/10 hover:border-indigo-500/50 rounded-2xl p-4.5 cursor-pointer group transition-all duration-300 flex flex-col justify-between space-y-4 shadow-xl hover:shadow-indigo-500/20 card-3d"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold">
                    {demo.tag}
                  </span>
                  <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {demo.duration}
                  </span>
                </div>

                <h5 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">
                  {demo.title}
                </h5>

                <p className="text-xs text-slate-400">
                  Category: <span className="text-slate-300">{demo.category}</span> • 4 Dialogue Segments
                </p>
              </div>

              <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                <div className="w-8 h-8 rounded-lg bg-indigo-950/80 group-hover:bg-indigo-600 group-hover:text-white text-indigo-400 flex items-center justify-center transition-all">
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                </div>
                <span className="text-xs font-bold text-indigo-400 group-hover:text-indigo-300 flex items-center gap-1">
                  Open in Studio &rarr;
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
