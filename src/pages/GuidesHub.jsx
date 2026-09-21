import React, { useState, useEffect } from 'react';
import { BookOpen, Clock, ArrowRight, Sparkles, Tag, ArrowLeft, Video, Scale, Music, Wrench, Layout } from 'lucide-react';
import { GUIDES_DATA } from '../data/guidesData';

const CATEGORY_ICONS = {
  'Video Production': Video,
  'Legal & Compliance': Scale,
  'Audio Engineering': Music,
  'Troubleshooting': Wrench,
  'Design & Dimensions': Layout
};

export default function GuidesHub({ onNavigate, onSelectGuide }) {
  const [selectedCategory, setSelectedCategory] = useState('All');

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "Creator Guides & Video Engineering Manuals — ReelsVault";
  }, []);

  const categories = ['All', 'Video Production', 'Legal & Compliance', 'Audio Engineering', 'Troubleshooting', 'Design & Dimensions'];

  const filteredGuides = selectedCategory === 'All' 
    ? GUIDES_DATA 
    : GUIDES_DATA.filter(g => g.category === selectedCategory);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12 space-y-8 animate-fadeIn">
      {/* Breadcrumb / Back Navigation */}
      <button 
        onClick={() => onNavigate('home')}
        className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-indigo-600 transition group cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        <span>Back to Downloader</span>
      </button>

      {/* Header Banner */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-10 shadow-xs space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200/60">
          <BookOpen className="w-4 h-4" />
          <span>Knowledge Base & Creator Hub</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 font-['Outfit'] tracking-tight">
          Creator Guides & Video Engineering Tutorials
        </h1>
        <p className="text-sm sm:text-base text-slate-600 font-normal max-w-3xl leading-relaxed">
          Comprehensive, research-backed guides covering Instagram video compression algorithms, copyright law, 320kbps audio mastering, and mobile troubleshooting.
        </p>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2 pt-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Guides Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredGuides.map((guide) => {
          const Icon = CATEGORY_ICONS[guide.category] || BookOpen;
          return (
            <article 
              key={guide.slug}
              onClick={() => onSelectGuide(guide.slug)}
              className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-xs hover:shadow-lg hover:border-indigo-300 transition-all flex flex-col justify-between space-y-4 cursor-pointer group"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-[11px] font-bold border border-indigo-100">
                    <Icon className="w-3.5 h-3.5" />
                    <span>{guide.category}</span>
                  </span>
                  <div className="flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{guide.readTime}</span>
                  </div>
                </div>

                <h2 className="text-lg sm:text-xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors leading-snug">
                  {guide.title}
                </h2>

                <p className="text-xs sm:text-sm text-slate-500 line-clamp-3 leading-relaxed">
                  {guide.excerpt}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-indigo-600">
                <span className="text-slate-400 font-normal text-[11px]">Published: {guide.publishedDate}</span>
                <span className="inline-flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  Read Full Guide <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </article>
          );
        })}
      </div>

      {/* Creator Help Box */}
      <div className="bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-500 rounded-3xl p-8 text-white text-center space-y-3 shadow-lg shadow-indigo-500/10">
        <h3 className="text-xl font-black font-['Outfit']">Ready to Download or Archive Your Media?</h3>
        <p className="text-xs sm:text-sm text-white/90 max-w-xl mx-auto">
          Use our high-speed media processing engine to extract 1080p MP4 videos, lossless MP3 tracks, or stories with zero watermarks.
        </p>
        <button
          onClick={() => onNavigate('home')}
          className="px-6 py-2.5 rounded-xl bg-white text-slate-900 font-extrabold text-xs sm:text-sm hover:bg-slate-100 transition shadow-md cursor-pointer"
        >
          Launch ReelsVault Engine →
        </button>
      </div>

    </div>
  );
}
