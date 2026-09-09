import React from 'react';
import { Upload, Mic, Languages, Edit3, Download, CheckCircle2 } from 'lucide-react';

const STEPS = [
  { id: 1, name: 'Upload Video', icon: Upload, desc: 'MP4, WebM, MOV' },
  { id: 2, name: 'Speech-to-Text', icon: Mic, desc: 'Audio AI extraction' },
  { id: 3, name: 'Select Language', icon: Languages, desc: 'EN, Odia, Hindi, Telugu' },
  { id: 4, name: 'Caption Studio', icon: Edit3, desc: 'Edit text & styles' },
  { id: 5, name: 'Preview & Export', icon: Download, desc: 'SRT, VTT, Video' },
];

export default function WorkflowStepper({ currentStep, setStep, isProcessing }) {
  return (
    <div className="w-full max-w-5xl mx-auto mb-6 px-2">
      <div className="bg-[#0b1120] border border-white/10 rounded-2xl p-3 sm:p-4 card-3d">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {STEPS.map((step) => {
            const Icon = step.icon;
            const isCurrent = currentStep === step.id;
            const isCompleted = currentStep > step.id;
            const isClickable = !isProcessing && (isCompleted || isCurrent);

            return (
              <button
                key={step.id}
                onClick={() => isClickable && setStep(step.id)}
                disabled={!isClickable}
                className={`relative flex items-center gap-2.5 p-2.5 rounded-xl text-left transition-all duration-300 cursor-pointer ${
                  isCurrent
                    ? 'bg-gradient-to-r from-indigo-600/30 to-violet-600/30 border border-indigo-500/50 shadow-lg shadow-indigo-500/10'
                    : isCompleted
                    ? 'bg-slate-900/60 border border-emerald-500/30 hover:border-emerald-500/50'
                    : 'bg-slate-900/30 border border-white/5 opacity-50 cursor-not-allowed'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                    isCurrent
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/40'
                      : isCompleted
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Icon className="w-3.5 h-3.5" />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                      Step {step.id}
                    </span>
                  </div>
                  <h4
                    className={`text-xs font-bold truncate ${
                      isCurrent ? 'text-white' : isCompleted ? 'text-slate-200' : 'text-slate-400'
                    }`}
                  >
                    {step.name}
                  </h4>
                </div>

                {isCurrent && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-1 bg-indigo-500 rounded-full shadow-sm shadow-indigo-400" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
