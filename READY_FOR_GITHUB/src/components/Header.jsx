import React from 'react';
import { Shield, Sparkles, Video, Music, Image as ImageIcon, BookOpen, Layers, ArrowDownToLine } from 'lucide-react';

export default function Header({ 
  activeCategory = 'reel',
  setActiveCategory
}) {
  const tabs = [
    { id: 'reel', label: 'Reels Video', icon: Video, badge: '1080p + Audio' },
    { id: 'story', label: 'Stories', icon: BookOpen, badge: 'Anon' },
    { id: 'photo', label: 'Photos', icon: ImageIcon, badge: 'HD' },
    { id: 'audio', label: 'Audio MP3', icon: Music, badge: '320k' },
    { id: 'cover', label: 'Reels Cover', icon: Layers, badge: 'JPG' }
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-2xl border-b border-slate-200/80 px-4 sm:px-8 py-3 transition-all">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4">
        
        {/* Unique Original Brand Logo: ReelsVault.io */}
        <div 
          onClick={() => setActiveCategory('reel')}
          className="flex items-center gap-3 cursor-pointer group select-none"
        >
          {/* Stylized Modern Vault Shield Icon */}
          <div className="relative w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#6366f1] via-[#8b5cf6] to-[#ec4899] p-[2px] shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-all">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/30 to-pink-500/30 opacity-70" />
              <ArrowDownToLine className="w-5 h-5 text-white relative z-10 group-hover:translate-y-0.5 transition-transform" />
            </div>
          </div>
          
          {/* Brand Typography */}
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-2xl font-black tracking-tight font-['Outfit'] text-slate-900">
                Reels<span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">Vault</span>
              </span>
              <span className="px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-black tracking-wider border border-indigo-200/60 uppercase">
                PRO
              </span>
            </div>
            <span className="text-[10px] text-slate-500 font-medium -mt-1 tracking-wide">
              Universal Instagram Media Engine
            </span>
          </div>
        </div>

        {/* Modern Segmented Navigation Tabs */}
        <div className="flex items-center gap-1 bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200/90 shadow-inner max-w-full overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeCategory === tab.id || (tab.id === 'reel' && activeCategory === 'video');
            return (
              <button
                key={tab.id}
                onClick={() => setActiveCategory(tab.id)}
                className={`relative px-3 sm:px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-white text-slate-900 shadow-md shadow-slate-300/50 border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-600' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
                <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-black ${
                  isActive 
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white' 
                    : 'bg-slate-200/80 text-slate-600'
                }`}>
                  {tab.badge}
                </span>
              </button>
            );
          })}
        </div>

      </div>
    </header>
  );
}
