import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  ScrollText, 
  Copy,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  Sparkles
} from 'lucide-react';
import { Reflection } from '@/src/lib/supabase';
import { GlassCard, Button } from './UI';
import Swal from 'sweetalert2';

interface ReflectionAdvisorProps {
  reflection: Reflection;
}

export function ReflectionAdvisor({ reflection }: ReflectionAdvisorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const generatePrompt = () => {
    let text = `[ RINGKASAN REFLEKSI ]\n`;
    text += `Judul: ${reflection.title}\n`;
    text += `Metode: ${reflection.mode}\n`;
    text += `Kepuasan: ${reflection.satisfaction_label}\n\n`;

    text += `[ DETAIL KONTEN ]\n`;
    const content = reflection.content as Record<string, string>;
    
    // Mapping labels based on mode for cleaner prompt
    const labels: Record<string, string> = {
      // GIBBS
      description: '1. Deskripsi Kejadian',
      feelings: '2. Perasaan & Pikiran',
      evaluation: '3. Evaluasi (Baik/Buruk)',
      analysis: '4. Analisis Situasi',
      conclusion: '5. Kesimpulan',
      action: '6. Rencana Tindakan',
      // ROLFE
      what: 'What? (Apa yang terjadi?)',
      soWhat: 'So What? (Apa maknanya?)',
      nowWhat: 'Now What? (Langkah selanjutnya?)',
      // 4L
      experience: 'Pengalaman/Kejadian',
      liked: 'Hal yang Disukai',
      learned: 'Hal yang Dipelajari',
      lacked: 'Hal yang Kurang',
      longed: 'Hal yang Diharapkan',
      // Action is shared
    };

    Object.entries(content).forEach(([key, value]) => {
      const label = labels[key] || key;
      // Strip HTML tags because content is from rich text editor
      const cleanValue = value.replace(/<[^>]*>?/gm, '').trim();
      text += `${label}:\n${cleanValue || '-'}\n\n`;
    });

    text += `\n--------------------------------\n`;
    text += `Berdasarkan refleksi diri saya di atas, saya ingin meminta saran/insight:\n`;
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
        text: 'Sekarang Anda bisa menempelkannya ke AI eksternal untuk mendapatkan insight lebih lanjut.',
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
      {/* Mini trigger button in detail view */}
      <Button 
        onClick={() => setIsOpen(true)} 
        variant="ghost" 
        className="h-10 px-4 bg-bca-blue/5 text-bca-blue font-bold text-xs flex items-center gap-2 hover:bg-bca-blue/10"
      >
        <Sparkles className="w-4 h-4" />
        <span>Prompt Maker</span>
      </Button>

      {/* Modal Overlay */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              className="relative w-full max-w-2xl max-h-[90vh] flex flex-col"
            >
              <GlassCard className="flex-1 flex flex-col p-0 overflow-hidden shadow-2xl border-white/20">
                {/* Header */}
                <div className="p-6 bg-slate-50/50 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-bca-blue flex items-center justify-center text-white shadow-lg shadow-bca-blue/20">
                      <ScrollText className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 tracking-tight">Reflection Prompt Maker</h3>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Get deeper insights from your reflections</p>
                    </div>
                  </div>
                  <button onClick={() => setIsOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-all">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Body Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white custom-scrollbar">
                  <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-4">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Salin rangkuman refleksi ini dan tempelkan ke **Gemini** atau AI favorit Anda untuk mendapatkan umpan balik objektif atau saran pengembangan diri berdasarkan apa yang Anda tulis.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <BookOpen className="w-3.5 h-3.5" />
                        Prompt Preview
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
                        <span>Prompt Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-5 h-5" />
                        <span>Copy Reflection Prompt</span>
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
