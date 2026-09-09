import React, { useState } from 'react';
import { Download, FileText, Video, Sparkles, CheckCircle2, Loader2, Copy, Check, Smartphone, Monitor } from 'lucide-react';
import confetti from 'canvas-confetti';
import { generateSRT, generateVTT, generateTXT, downloadFile } from '../utils/subtitleHelpers';
import { exportCaptionedVideo } from '../utils/videoExporter';
import { SUPPORTED_LANGUAGES } from '../utils/translator';

export default function ExportModal({
  segments,
  style,
  videoRef,
  currentLang,
  videoFileName = 'video_captioned'
}) {
  const [isExportingVideo, setIsExportingVideo] = useState(false);
  const [videoExportProgress, setVideoExportProgress] = useState(0);
  const [exportStatusMessage, setExportStatusMessage] = useState('');
  const [copiedType, setCopiedType] = useState(null);
  const [exportFormat, setExportFormat] = useState('9:16');

  const langInfo = SUPPORTED_LANGUAGES.find((l) => l.code === currentLang) || SUPPORTED_LANGUAGES[0];
  const safeName = videoFileName.replace(/\.[^/.]+$/, "");

  const handleDownloadSRT = () => {
    const content = generateSRT(segments);
    downloadFile(content, `${safeName}_${currentLang}.srt`, 'text/plain;charset=utf-8');
    triggerCelebration();
  };

  const handleDownloadVTT = () => {
    const content = generateVTT(segments);
    downloadFile(content, `${safeName}_${currentLang}.vtt`, 'text/vtt;charset=utf-8');
    triggerCelebration();
  };

  const handleDownloadTXT = () => {
    const content = generateTXT(segments, true);
    downloadFile(content, `${safeName}_${currentLang}_transcript.txt`, 'text/plain;charset=utf-8');
    triggerCelebration();
  };

  const handleCopySRT = () => {
    const content = generateSRT(segments);
    navigator.clipboard.writeText(content);
    setCopiedType('srt');
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleExportVideo = async () => {
    if (!videoRef.current) {
      alert("Video element not found");
      return;
    }

    try {
      setIsExportingVideo(true);
      setVideoExportProgress(0);
      setExportStatusMessage("Starting 3D video render pipeline...");

      const result = await exportCaptionedVideo(
        videoRef.current,
        segments,
        style,
        (progress) => setVideoExportProgress(progress),
        (msg) => setExportStatusMessage(msg)
      );

      const a = document.createElement('a');
      a.href = result.url;
      a.download = `${safeName}_captioned_${exportFormat.replace(':', '_')}_${currentLang}.${result.extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      triggerCelebration();
    } catch (err) {
      console.error("Video export error:", err);
      alert("Error generating captioned video: " + err.message);
    } finally {
      setIsExportingVideo(false);
    }
  };

  const triggerCelebration = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (e) {}
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 animate-fadeIn perspective-container">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Ready to Export
        </div>
        <h3 className="text-2xl sm:text-3xl font-bold text-white font-['Outfit']">
          Export <span className="gradient-text">Captions & Video</span>
        </h3>
        <p className="text-sm text-slate-400">
          Target Language: <span className="text-indigo-300 font-bold">{langInfo.name} ({langInfo.nativeName})</span> • {segments.length} Synchronized Lines
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        
        {/* SRT Card */}
        <div className="bg-[#0b1120] rounded-2xl p-6 flex flex-col justify-between space-y-4 border border-white/10 hover:border-indigo-500/40 card-3d">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-950/70 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-white">SRT Subtitle</h4>
              <p className="text-xs text-slate-400 mt-1">
                Standard SubRip file for YouTube, Premiere, DaVinci, VLC.
              </p>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <button
              onClick={handleDownloadSRT}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md shadow-indigo-500/20 btn-3d"
            >
              <Download className="w-3.5 h-3.5" />
              Download .SRT
            </button>
            <button
              onClick={handleCopySRT}
              className="w-full py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-medium text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              {copiedType === 'srt' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedType === 'srt' ? 'Copied!' : 'Copy to Clipboard'}
            </button>
          </div>
        </div>

        {/* VTT Card */}
        <div className="bg-[#0b1120] rounded-2xl p-6 flex flex-col justify-between space-y-4 border border-white/10 hover:border-violet-500/40 card-3d">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-violet-950/70 border border-violet-500/30 flex items-center justify-center text-violet-400">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-white">WebVTT Subtitle</h4>
              <p className="text-xs text-slate-400 mt-1">
                Modern HTML5 WebVTT caption file for video players.
              </p>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <button
              onClick={handleDownloadVTT}
              className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md shadow-violet-500/20 btn-3d"
            >
              <Download className="w-3.5 h-3.5" />
              Download .VTT
            </button>
            <button
              onClick={handleDownloadTXT}
              className="w-full py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-medium text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              Download Plain Text (.TXT)
            </button>
          </div>
        </div>

        {/* Captioned Video Card (Burned-in) */}
        <div className="bg-[#0b1120] rounded-2xl p-6 flex flex-col justify-between space-y-4 border border-pink-500/40 bg-gradient-to-b from-pink-950/30 to-slate-900/80 shadow-xl shadow-pink-500/10 card-3d">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-pink-950/80 border border-pink-500/40 flex items-center justify-center text-pink-400">
              <Video className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="text-lg font-bold text-white">Burned-in Video</h4>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-pink-500/20 text-pink-300 border border-pink-500/30">
                  {exportFormat} Format
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Renders custom fonts, styles & Indic text directly onto video frames.
              </p>
            </div>

            <div className="flex items-center gap-2 bg-slate-950/90 p-1 rounded-xl border border-white/10">
              <button
                onClick={() => setExportFormat('9:16')}
                className={`flex-1 py-1 text-[11px] font-bold rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer ${
                  exportFormat === '9:16' ? 'bg-pink-600 text-white' : 'text-slate-400'
                }`}
              >
                <Smartphone className="w-3 h-3" />
                9:16 Shorts
              </button>
              <button
                onClick={() => setExportFormat('16:9')}
                className={`flex-1 py-1 text-[11px] font-bold rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer ${
                  exportFormat === '16:9' ? 'bg-pink-600 text-white' : 'text-slate-400'
                }`}
              >
                <Monitor className="w-3 h-3" />
                16:9 YouTube
              </button>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <button
              onClick={handleExportVideo}
              disabled={isExportingVideo}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-pink-600/30 disabled:opacity-50 btn-3d-pink"
            >
              {isExportingVideo ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Rendering ({videoExportProgress}%)...
                </>
              ) : (
                <>
                  <Video className="w-4 h-4" />
                  Burn & Download Video ({exportFormat})
                </>
              )}
            </button>

            {isExportingVideo && (
              <div className="space-y-1.5">
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-pink-500 to-rose-500 h-full transition-all duration-200"
                    style={{ width: `${videoExportProgress}%` }}
                  />
                </div>
                <p className="text-[11px] text-pink-300 text-center animate-pulse">
                  {exportStatusMessage}
                </p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
