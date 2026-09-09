import React from 'react';
import { Type, Palette, Layout, Sparkles, Sliders, Smartphone, Monitor, Square } from 'lucide-react';

export const STYLE_PRESETS = [
  {
    id: 'hormozi',
    name: 'Hormozi Viral',
    badge: 'Trending',
    style: {
      fontFamily: 'Poppins',
      fontSize: 32,
      fontWeight: '800',
      textColor: '#facc15',
      bgColor: 'rgba(0, 0, 0, 0.9)',
      showBg: true,
      bgPadding: 14,
      strokeWidth: 3,
      strokeColor: '#000000',
      shadowBlur: 10,
      shadowColor: 'rgba(0,0,0,0.9)',
      position: 'middle',
      customY: 65,
      textTransform: 'uppercase'
    }
  },
  {
    id: 'mrbeast',
    name: 'MrBeast Punch',
    badge: 'Popular',
    style: {
      fontFamily: 'Bebas Neue',
      fontSize: 36,
      fontWeight: '700',
      textColor: '#ffffff',
      bgColor: 'transparent',
      showBg: false,
      strokeWidth: 4,
      strokeColor: '#000000',
      shadowBlur: 12,
      shadowColor: '#0284c7',
      position: 'middle',
      customY: 70,
      textTransform: 'uppercase'
    }
  },
  {
    id: 'netflix',
    name: 'Netflix Classic',
    badge: 'Clean',
    style: {
      fontFamily: 'Inter',
      fontSize: 26,
      fontWeight: '600',
      textColor: '#ffffff',
      bgColor: 'rgba(0, 0, 0, 0.75)',
      showBg: true,
      bgPadding: 10,
      strokeWidth: 0,
      strokeColor: '#000000',
      shadowBlur: 4,
      shadowColor: 'rgba(0,0,0,0.6)',
      position: 'bottom',
      customY: 86,
      textTransform: 'none'
    }
  },
  {
    id: 'indic-gold',
    name: 'Indic Heritage Gold',
    badge: 'Authentic',
    style: {
      fontFamily: 'Noto Sans Oriya',
      fontSize: 28,
      fontWeight: '700',
      textColor: '#fbbf24',
      bgColor: 'rgba(15, 23, 42, 0.85)',
      showBg: true,
      bgPadding: 12,
      strokeWidth: 1,
      strokeColor: '#78350f',
      shadowBlur: 6,
      shadowColor: 'rgba(251, 191, 36, 0.3)',
      position: 'bottom',
      customY: 85,
      textTransform: 'none'
    }
  },
  {
    id: 'cyber-neon',
    name: 'Cyberpunk Neon',
    badge: 'Stylized',
    style: {
      fontFamily: 'Outfit',
      fontSize: 30,
      fontWeight: '800',
      textColor: '#22d3ee',
      bgColor: 'rgba(15, 23, 42, 0.9)',
      showBg: true,
      bgPadding: 12,
      strokeWidth: 2,
      strokeColor: '#0369a1',
      shadowBlur: 16,
      shadowColor: '#22d3ee',
      position: 'bottom',
      customY: 84,
      textTransform: 'none'
    }
  }
];

export default function StyleCustomizer({
  style,
  onChangeStyle,
  aspectRatio = '9:16',
  onChangeAspectRatio,
  currentLang
}) {
  const updateStyle = (key, value) => {
    onChangeStyle({ ...style, [key]: value });
  };

  const applyPreset = (presetStyle) => {
    onChangeStyle({ ...style, ...presetStyle });
  };

  return (
    <div className="bg-[#0b1120] border border-white/10 rounded-2xl p-5 space-y-6 card-3d">
      
      {/* Aspect Ratio & Format Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Canvas Format
          </h4>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onChangeAspectRatio?.('9:16')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              aspectRatio === '9:16'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-white/5'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            9:16 Reels
          </button>

          <button
            onClick={() => onChangeAspectRatio?.('16:9')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              aspectRatio === '16:9'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-white/5'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            16:9 YouTube
          </button>

          <button
            onClick={() => onChangeAspectRatio?.('1:1')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              aspectRatio === '1:1'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-white/5'
            }`}
          >
            <Square className="w-3.5 h-3.5" />
            1:1 Post
          </button>
        </div>
      </div>

      {/* Real-World Creator Presets */}
      <div className="space-y-2.5">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          Pro Creator Caption Templates
        </label>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {STYLE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset.style)}
              className="group p-2.5 rounded-xl text-left bg-slate-900/90 hover:bg-slate-800 border border-white/10 hover:border-indigo-500/50 transition-all cursor-pointer flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {preset.badge}
                </span>
              </div>
              <span className="text-xs font-semibold text-white group-hover:text-indigo-300 truncate">
                {preset.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Typography & Font Settings */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-400 flex items-center gap-1">
            <Type className="w-3.5 h-3.5 text-indigo-400" />
            Font Family
          </label>
          <select
            value={style.fontFamily}
            onChange={(e) => updateStyle('fontFamily', e.target.value)}
            className="w-full glass-input text-xs cursor-pointer"
          >
            <option value="Inter" className="bg-slate-900">Inter (Modern Clean)</option>
            <option value="Poppins" className="bg-slate-900">Poppins (Viral Bold)</option>
            <option value="Outfit" className="bg-slate-900">Outfit (Studio Tech)</option>
            <option value="Bebas Neue" className="bg-slate-900">Bebas Neue (Punchy Titles)</option>
            <option value="Noto Sans Oriya" className="bg-slate-900 font-odia">Noto Sans Odia (ଓଡ଼ିଆ)</option>
            <option value="Noto Sans Devanagari" className="bg-slate-900 font-hindi">Noto Sans Devanagari (हिन्दी)</option>
            <option value="Noto Sans Telugu" className="bg-slate-900 font-telugu">Noto Sans Telugu (తెలుగు)</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-400">Weight</label>
          <select
            value={style.fontWeight}
            onChange={(e) => updateStyle('fontWeight', e.target.value)}
            className="w-full glass-input text-xs cursor-pointer"
          >
            <option value="600" className="bg-slate-900">Semi-Bold (600)</option>
            <option value="700" className="bg-slate-900">Bold (700)</option>
            <option value="800" className="bg-slate-900">Heavy Extra-Bold (800)</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-400">Letter Case</label>
          <select
            value={style.textTransform || 'none'}
            onChange={(e) => updateStyle('textTransform', e.target.value)}
            className="w-full glass-input text-xs cursor-pointer"
          >
            <option value="none" className="bg-slate-900">As Written</option>
            <option value="uppercase" className="bg-slate-900">UPPERCASE (Hormozi)</option>
            <option value="lowercase" className="bg-slate-900">lowercase</option>
          </select>
        </div>
      </div>

      {/* Colors, Outlines & Background */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="space-y-1.5 bg-slate-900/60 p-2.5 rounded-xl border border-white/5">
          <label className="text-[11px] font-semibold text-slate-400">Text Color</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={style.textColor?.startsWith('#') ? style.textColor : '#ffffff'}
              onChange={(e) => updateStyle('textColor', e.target.value)}
              className="w-7 h-7 rounded cursor-pointer bg-transparent border-0"
            />
            <span className="text-xs font-mono text-slate-300">{style.textColor}</span>
          </div>
        </div>

        <div className="space-y-1.5 bg-slate-900/60 p-2.5 rounded-xl border border-white/5">
          <label className="text-[11px] font-semibold text-slate-400">Outline Color</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={style.strokeColor?.startsWith('#') ? style.strokeColor : '#000000'}
              onChange={(e) => updateStyle('strokeColor', e.target.value)}
              className="w-7 h-7 rounded cursor-pointer bg-transparent border-0"
            />
            <span className="text-xs font-mono text-slate-300">{style.strokeColor}</span>
          </div>
        </div>

        <div className="space-y-1.5 bg-slate-900/60 p-2.5 rounded-xl border border-white/5 col-span-2">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-semibold text-slate-400">Pill Background</label>
            <button
              onClick={() => updateStyle('showBg', !style.showBg)}
              className="text-[11px] text-indigo-400 hover:underline cursor-pointer"
            >
              {style.showBg ? 'On' : 'Off'}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={style.bgColor?.startsWith('#') ? style.bgColor : '#000000'}
              onChange={(e) => updateStyle('bgColor', e.target.value)}
              className="w-7 h-7 rounded cursor-pointer bg-transparent border-0"
              disabled={!style.showBg}
            />
            <span className="text-xs text-slate-300">
              {style.showBg ? 'Box Backdrop Active' : 'Transparent Backdrop'}
            </span>
          </div>
        </div>
      </div>

      {/* Sliders */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Font Size</span>
            <span className="font-mono text-indigo-400">{style.fontSize}px</span>
          </div>
          <input
            type="range"
            min="20"
            max="50"
            value={style.fontSize}
            onChange={(e) => updateStyle('fontSize', parseInt(e.target.value))}
            className="w-full accent-indigo-500 cursor-pointer"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Stroke Width</span>
            <span className="font-mono text-indigo-400">{style.strokeWidth}px</span>
          </div>
          <input
            type="range"
            min="0"
            max="8"
            value={style.strokeWidth}
            onChange={(e) => updateStyle('strokeWidth', parseInt(e.target.value))}
            className="w-full accent-indigo-500 cursor-pointer"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Position Y</span>
            <span className="font-mono text-indigo-400">{style.customY}%</span>
          </div>
          <input
            type="range"
            min="15"
            max="92"
            value={style.customY}
            onChange={(e) => updateStyle('customY', parseInt(e.target.value))}
            className="w-full accent-indigo-500 cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
}
