import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  ScrollText, 
  Copy,
  CheckCircle2,
  AlertCircle,
  FileText,
  Target,
  Zap
} from 'lucide-react';
import { Problem, RootCause, ActionPlan } from '@/src/lib/supabase';
import { GlassCard, Button } from './UI';
import Swal from 'sweetalert2';

interface ProblemAdvisorProps {
  problem: Problem;
  causes: RootCause[];
  plans: ActionPlan[];
}

export function ProblemAdvisor({ problem, causes, plans }: ProblemAdvisorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const generatePrompt = () => {
    // 1. Problem Summary
    let text = `[ RINGKASAN MASALAH ]\n`;
    text += `Judul: ${problem.title}\n`;
    text += `Kategori: ${problem.category}\n`;
    text += `Konteks: ${problem.context || '-'}\n`;
    text += `Dampak: ${problem.impact || '-'}\n`;
    text += `Signifikansi: ${problem.significance ? `Skala ${problem.significance}` : '-'}\n\n`;

    // 2. Root Cause Analysis (Hierarchical)
    text += `[ ANALISIS AKAR PENYEBAB (FISHBONE) ]\n`;
    if (causes.length > 0) {
      // Simple list for now, as root causes are hierarchical via parent_id
      causes.forEach(c => {
        text += `- ${c.cause}${c.is_highlighted ? ' (ROOT CAUSE)' : ''}\n`;
      });
    } else {
      text += `(Belum ada analisis penyebab dilakukan)\n`;
    }
    text += `\n`;

    // 3. Action Plan
    text += `[ RENCANA AKSI ]\n`;
    if (plans.length > 0) {
      plans.forEach((p, i) => {
        text += `${i + 1}. ${p.description}\n`;
        text += `   Status: ${p.status}\n`;
        text += `   Kontrol: ${p.is_controllable ? 'Dapat dikontrol' : 'Tidak dapat dikontrol'}\n`;
        text += `   Kelayakan: ${p.is_feasible ? 'Layak' : 'Akan sulit'}\n`;
      });
    } else {
      text += `(Belum ada rencana aksi dibuat)\n`;
    }

    text += `\n--------------------------------\n`;
    text += `Berdasarkan ringkasan diatas, saya ingin bertanya:\n`;
    text += `"TULISKAN PERTANYAANMU"`;

    return text;
  };

  const handleCopy = async () => {
    const prompt = generatePrompt();
    try {
      await navigator.clipboard.writeText(prompt);
      setIsCopied(true);
      
      Swal.fire({
        title: 'Prompt Copied!',
        text: 'Sekarang Anda bisa menempelkannya ke AI eksternal (seperti Gemini atau ChatGPT).',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
      });

      setTimeout(() => setIsCopied(false), 3000);
    } catch (err) {
      console.error('Failed to copy:', err);
      Swal.fire('Error', 'Gagal menyalin teks ke clipboard.', 'error');
    }
  };

  return (
    <>
      {/* Floating Button with Label */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 px-6 bg-bca-blue text-white rounded-full shadow-2xl flex items-center gap-3 z-[50] group"
      >
        <ScrollText className="w-6 h-6 group-hover:rotate-12 transition-transform" />
        <span className="font-bold text-sm tracking-wide">Prompt Maker</span>
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white animate-pulse" />
      </motion.button>

      {/* Modal Overlay */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[99]"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              className="relative w-full max-w-2xl max-h-[90vh] flex flex-col z-[100]"
            >
              <GlassCard className="flex-1 flex flex-col p-0 overflow-hidden shadow-2xl border-white/0">
                {/* Header */}
                <div className="p-6 bg-slate-50/50 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-bca-blue flex items-center justify-center text-white shadow-lg shadow-bca-blue/20">
                      <ScrollText className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 tracking-tight">Manual AI Prompt Maker</h3>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Generate comprehensive context for manual AI consultation</p>
                    </div>
                  </div>
                  <button onClick={() => setIsOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-all">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Body Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white custom-scrollbar">
                  <div className="p-4 bg-bca-blue/5 rounded-2xl border border-bca-blue/10 flex items-start gap-4">
                    <AlertCircle className="w-5 h-5 text-bca-blue shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Use this feature to summarize your entire problem analysis into a structured description. You can copy and paste the text directly into Gemini, ChatGPT, or Claude to receive professional guidance.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Target className="w-3.5 h-3.5" />
                        Preview Summary
                      </h4>
                    </div>
                    
                    <div className="relative group">
                      <pre className="w-full bg-slate-50 p-6 rounded-[24px] border border-slate-200 font-mono text-[11px] text-slate-700 whitespace-pre-wrap leading-relaxed max-h-[400px] overflow-y-auto custom-scrollbar shadow-inner">
                        {generatePrompt()}
                      </pre>
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="p-6 bg-slate-50/80 border-t border-slate-200 flex flex-col sm:flex-row gap-3">
                  <Button 
                    variant="ghost" 
                    onClick={() => setIsOpen(false)}
                    className="flex-1 order-2 sm:order-1"
                  >
                    Close
                  </Button>
                  <Button 
                    onClick={handleCopy}
                    className="flex-[2] order-1 sm:order-2 h-12 flex items-center justify-center gap-2 shadow-lg shadow-bca-blue/20"
                  >
                    {isCopied ? (
                      <>
                        <CheckCircle2 className="w-5 h-5" />
                        <span>Prompt Copied to Clipboard</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-5 h-5" />
                        <span>Copy This Prompt</span>
                      </>
                    )}
                  </Button>
                </div>
              </GlassCard>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

