import React, { useEffect } from 'react';
import { BookOpen, Clock, Calendar, User, ArrowLeft, Share2, Tag, CheckCircle2, ChevronRight } from 'lucide-react';
import { GUIDES_DATA } from '../data/guidesData';

export default function GuideArticle({ slug, onNavigate, onSelectGuide }) {
  const guide = GUIDES_DATA.find(g => g.slug === slug) || GUIDES_DATA[0];

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = `${guide.title} — ReelsVault Creator Hub`;
  }, [guide]);

  // Related guides (exclude current)
  const relatedGuides = GUIDES_DATA.filter(g => g.slug !== guide.slug).slice(0, 3);

  // Helper parser for markdown-like content to clean semantic HTML
  const renderMarkdownContent = (rawText) => {
    const lines = rawText.split('\n');
    const elements = [];
    let inTable = false;
    let tableRows = [];
    let listItems = [];

    const flushList = () => {
      if (listItems.length > 0) {
        elements.push(
          <ul key={`list-${elements.length}`} className="list-disc list-inside space-y-2 pl-2 my-4 text-slate-700 leading-relaxed text-sm">
            {listItems.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        );
        listItems = [];
      }
    };

    const flushTable = () => {
      if (tableRows.length > 0) {
        const headerRow = tableRows[0];
        const bodyRows = tableRows.slice(2); // skip separator row
        elements.push(
          <div key={`table-wrapper-${elements.length}`} className="my-6 overflow-x-auto border border-slate-200/90 rounded-2xl shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-900 font-extrabold">
                  {headerRow.map((cell, idx) => (
                    <th key={idx} className="p-3.5 whitespace-nowrap">{cell}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 bg-white">
                {bodyRows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-slate-50/50 transition-colors">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="p-3.5 text-slate-700 font-medium">
                        {cell.includes('**') ? <strong>{cell.replace(/\*\*/g, '')}</strong> : cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        tableRows = [];
        inTable = false;
      }
    };

    lines.forEach((line, index) => {
      const trimmed = line.trim();

      // Check Table
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        flushList();
        inTable = true;
        const cells = trimmed.slice(1, -1).split('|').map(c => c.trim());
        tableRows.push(cells);
        return;
      } else if (inTable) {
        flushTable();
      }

      // Check Headings
      if (trimmed.startsWith('## ')) {
        flushList();
        elements.push(
          <h2 key={index} className="text-xl sm:text-2xl font-black text-slate-900 font-['Outfit'] mt-8 mb-3 pt-4 border-t border-slate-100">
            {trimmed.replace('## ', '')}
          </h2>
        );
      } else if (trimmed.startsWith('### ')) {
        flushList();
        elements.push(
          <h3 key={index} className="text-base sm:text-lg font-bold text-slate-900 font-['Outfit'] mt-6 mb-2">
            {trimmed.replace('### ', '')}
          </h3>
        );
      } else if (trimmed.startsWith('- [x] ') || trimmed.startsWith('- [ ] ')) {
        // Checklist
        const isChecked = trimmed.startsWith('- [x] ');
        const text = trimmed.replace(/- \[[x ]\] /, '');
        elements.push(
          <div key={index} className="flex items-center gap-2.5 my-1 text-xs sm:text-sm font-medium text-slate-700">
            <CheckCircle2 className={`w-4 h-4 ${isChecked ? 'text-emerald-500' : 'text-slate-300'}`} />
            <span>{text}</span>
          </div>
        );
      } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        // Bullet list
        listItems.push(trimmed.slice(2).replace(/\*\*(.*?)\*\*/g, '$1'));
      } else if (/^\d+\.\s/.test(trimmed)) {
        // Numbered list
        flushList();
        elements.push(
          <div key={index} className="flex items-start gap-2.5 my-2 text-xs sm:text-sm text-slate-700 pl-1">
            <span className="font-bold text-indigo-600 shrink-0">{trimmed.match(/^\d+\./)[0]}</span>
            <span>{trimmed.replace(/^\d+\.\s*/, '')}</span>
          </div>
        );
      } else if (trimmed.startsWith('---')) {
        flushList();
        elements.push(<hr key={index} className="my-6 border-slate-200/80" />);
      } else if (trimmed.length > 0) {
        flushList();
        elements.push(
          <p key={index} className="my-3 text-xs sm:text-sm text-slate-600 leading-relaxed">
            {trimmed}
          </p>
        );
      }
    });

    flushList();
    flushTable();

    return elements;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12 space-y-8 animate-fadeIn">
      {/* Breadcrumbs */}
      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
        <button onClick={() => onNavigate('home')} className="hover:text-indigo-600 transition cursor-pointer">
          Home
        </button>
        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
        <button onClick={() => onNavigate('guides')} className="hover:text-indigo-600 transition cursor-pointer">
          Creator Guides
        </button>
        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
        <span className="text-slate-900 font-bold truncate max-w-xs">{guide.category}</span>
      </div>

      {/* Article Header Card */}
      <header className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-10 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-extrabold border border-indigo-200/60">
            {guide.category}
          </span>
          <span className="inline-flex items-center gap-1 text-xs text-slate-400 font-medium ml-2">
            <Clock className="w-3.5 h-3.5" />
            {guide.readTime}
          </span>
        </div>

        <h1 className="text-2xl sm:text-4xl font-black text-slate-900 font-['Outfit'] tracking-tight leading-tight">
          {guide.title}
        </h1>

        <p className="text-xs sm:text-sm text-slate-500 font-normal leading-relaxed">
          {guide.excerpt}
        </p>

        {/* Author / Date Meta Bar */}
        <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
              RV
            </div>
            <div>
              <div className="font-bold text-slate-900">{guide.author}</div>
              <div className="text-[11px] text-slate-400">Media Research & Engineering</div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
            <Calendar className="w-3.5 h-3.5" />
            <span>Last Updated: {guide.publishedDate}</span>
          </div>
        </div>
      </header>

      {/* Main Article Body */}
      <article className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-10 shadow-xs">
        <div className="prose prose-slate max-w-none">
          {renderMarkdownContent(guide.content)}
        </div>
      </article>

      {/* Share / Tags Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <Tag className="w-4 h-4 text-slate-400 mr-1" />
          {guide.keywords.map((kw, i) => (
            <span key={i} className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-[11px] font-semibold">
              #{kw}
            </span>
          ))}
        </div>
        <button
          onClick={() => {
            if (navigator.share) {
              navigator.share({ title: guide.title, url: window.location.href });
            } else {
              navigator.clipboard.writeText(window.location.href);
              alert("Guide URL copied to clipboard!");
            }
          }}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer"
        >
          <Share2 className="w-4 h-4" />
          <span>Share Guide</span>
        </button>
      </div>

      {/* Related Guides Section */}
      <section className="space-y-4">
        <h3 className="text-xl font-black text-slate-900 font-['Outfit']">
          Related Creator Tutorials
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {relatedGuides.map((rg) => (
            <div
              key={rg.slug}
              onClick={() => onSelectGuide(rg.slug)}
              className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between space-y-3"
            >
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                  {rg.category}
                </span>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition leading-snug">
                  {rg.title}
                </h4>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">
                {rg.readTime}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom Tool CTA */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 text-center space-y-3">
        <h3 className="text-lg sm:text-xl font-bold font-['Outfit']">Need to Extract Video or Audio Now?</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Try the ReelsVault high-speed downloader. 1080p Full HD MP4, 320kbps MP3 Audio, Stories, and Photos with No Watermark.
        </p>
        <button
          onClick={() => onNavigate('home')}
          className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm transition cursor-pointer"
        >
          Open Downloader Engine
        </button>
      </div>
    </div>
  );
}
