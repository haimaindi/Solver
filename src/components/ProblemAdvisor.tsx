import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Send, 
  X, 
  Bot, 
  User, 
  History, 
  Loader2, 
  ScrollText, 
  MessageSquare,
  AlertCircle 
} from 'lucide-react';
import { Problem, RootCause, ActionPlan, supabase, ProblemConsultation } from '@/src/lib/supabase';
import { GlassCard, Button, TextArea } from './UI';
import { consultProblem } from '../services/aiService';
import { format, parseISO } from 'date-fns';
import { cn } from '@/src/lib/utils';

// Helper to format Markdown-like responses (Bold, Italic, Lists)
const MarkdownFormatter = ({ content }: { content: string }) => {
  // Simple regex-based formatter for bold/italic and lists
  // Since we don't have react-markdown yet, we'll do basic replacement
  const lines = content.split('\n');
  return (
    <div className="space-y-3 prose prose-sm max-w-none text-slate-700 leading-relaxed font-normal">
      {lines.map((line, i) => {
        let formattedLine = line
          .replace(/\*\*(.*?)\*\*/g, '<strong class="font-black text-slate-900">$1</strong>')
          .replace(/\*(.*?)\*/g, '<em class="italic text-slate-600 text-[13px]">$1</em>');

        // Handle list items
        if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
          return (
            <div key={i} className="flex gap-2 pl-2">
              <span className="text-bca-blue font-bold">•</span>
              <span dangerouslySetInnerHTML={{ __html: formattedLine.trim().slice(2) }} />
            </div>
          );
        }

        // Handle numbered items
        const numMatch = line.trim().match(/^(\d+)\.\s+(.*)/);
        if (numMatch) {
          return (
            <div key={i} className="flex gap-2 pl-2">
              <span className="text-bca-blue font-bold">{numMatch[1]}.</span>
              <span dangerouslySetInnerHTML={{ __html: numMatch[2] }} />
            </div>
          );
        }

        // Handle headers/empty lines
        if (!line.trim()) return <div key={i} className="h-2" />;

        return <div key={i} dangerouslySetInnerHTML={{ __html: formattedLine }} />;
      })}
    </div>
  );
};

interface ProblemAdvisorProps {
  problem: Problem;
  causes: RootCause[];
  plans: ActionPlan[];
}

export function ProblemAdvisor({ problem, causes, plans }: ProblemAdvisorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<'chat' | 'history'>('chat');
  const [question, setQuestion] = useState('');
  const [isConsulting, setIsConsulting] = useState(false);
  const [currentAnswer, setCurrentAnswer] = useState<string | null>(null);
  const [history, setHistory] = useState<ProblemConsultation[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen, problem.id]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentAnswer, view]);

  const fetchHistory = async () => {
    setIsLoadingHistory(true);
    const { data, error } = await supabase
      .from('problem_consultations')
      .select('*')
      .eq('problem_id', problem.id)
      .order('created_at', { ascending: true });

    if (data) setHistory(data);
    if (error) console.error('Error fetching history:', error);
    setIsLoadingHistory(false);
  };

  const handleConsult = async () => {
    if (!question.trim() || isConsulting) return;

    const userId = localStorage.getItem('user_id');
    if (!userId) return;

    setIsConsulting(true);
    setCurrentAnswer(null);

    const result = await consultProblem(userId, problem, causes, plans, question);

    if (result.error) {
       setCurrentAnswer(`**CRITICAL ERROR:** ${result.error}\n\n*Please check your Gemini API keys in the Admin Panel or contact support.*`);
    } else {
       setCurrentAnswer(result.answer);
       // Refresh history to include new entry
       fetchHistory();
    }
    
    setIsConsulting(false);
    setQuestion('');
  };

  return (
    <>
      {/* Floating Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-bca-blue text-white rounded-full shadow-2xl flex items-center justify-center z-[50] group"
        title="Expert Analysis"
      >
        <Sparkles className="w-6 h-6 group-hover:animate-pulse" />
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white animate-bounce" />
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
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              className="relative w-full max-w-3xl h-[80vh] flex flex-col"
            >
              <GlassCard className="flex-1 flex flex-col p-0 overflow-hidden shadow-2xl border-white/20">
                {/* Header */}
                <div className="p-6 bg-slate-50/50 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-bca-blue flex items-center justify-center text-white shadow-lg shadow-bca-blue/20">
                      <Bot className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 tracking-tight">AI Expert Consultant</h3>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">GEMINI FLASH LATEST • {problem.title.slice(0, 30)}...</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setView(view === 'chat' ? 'history' : 'chat')}
                      className={cn(
                        "p-2.5 rounded-xl transition-all flex items-center gap-2 text-sm font-bold",
                        view === 'history' ? "bg-bca-blue text-white" : "text-slate-500 hover:bg-slate-100"
                      )}
                    >
                      {view === 'history' ? <Sparkles className="w-4 h-4" /> : <History className="w-4 h-4" />}
                      <span className="hidden sm:inline">{view === 'history' ? 'New Consult' : 'Session History'}</span>
                    </button>
                    <button onClick={() => setIsOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-all">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Body Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-white/30 custom-scrollbar">
                  {view === 'chat' ? (
                    <>
                      {/* Initial Guidance */}
                      <div className="space-y-4">
                        <div className="flex items-start gap-4">
                          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                            <Bot className="w-5 h-5" />
                          </div>
                          <GlassCard className="p-4 bg-emerald-50/50 border-emerald-100/50 max-w-[85%]">
                            <p className="text-sm text-slate-700 leading-relaxed font-medium">
                              Hello! I am your **Expert Problem Consultant**. I have reviewed your current analysis for <span className="text-bca-blue font-bold">"{problem.title}"</span>.
                              
                              Ask me anything about this problem. I will analyze your **Root Causes** and **Action Plans** to provide a structured, solution-oriented recommendation.
                            </p>
                          </GlassCard>
                        </div>
                      </div>

                      {/* Current Conversation Results */}
                      {currentAnswer && (
                        <div className="space-y-4 pt-4">
                           <div className="flex items-center gap-3">
                              <div className="h-[1px] flex-1 bg-slate-100" />
                              <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Live Consultation Result</span>
                              <div className="h-[1px] flex-1 bg-slate-100" />
                           </div>
                           <div className="flex items-start gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                              <div className="w-8 h-8 rounded-lg bg-bca-blue text-white flex items-center justify-center shrink-0 shadow-lg shadow-bca-blue/20">
                                <ScrollText className="w-5 h-5" />
                              </div>
                              <GlassCard className="p-6 bg-white border-slate-200/50 shadow-sm max-w-[90%] relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-bca-blue/5 rounded-full -mr-16 -mt-16 blur-3xl opacity-50" />
                                <MarkdownFormatter content={currentAnswer} />
                              </GlassCard>
                           </div>
                        </div>
                      )}

                      {/* Loading State */}
                      {isConsulting && (
                        <div className="flex items-start gap-4">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center shrink-0">
                            <Bot className="w-5 h-5" />
                          </div>
                          <div className="flex items-center gap-3 p-4 text-slate-400 italic text-sm">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Analyzing entire problem context & generating expert recommendations...
                          </div>
                        </div>
                      )}
                      <div ref={chatEndRef} />
                    </>
                  ) : (
                    <div className="space-y-6">
                      <div className="flex items-center gap-3 mb-4">
                        <History className="w-5 h-5 text-bca-blue" />
                        <h4 className="font-bold text-slate-900">Consultation History</h4>
                      </div>
                      
                      {isLoadingHistory ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4 text-slate-400">
                          <Loader2 className="w-10 h-10 animate-spin" />
                          <p className="text-sm font-medium">Retrieving archives...</p>
                        </div>
                      ) : history.length === 0 ? (
                        <div className="text-center py-20">
                          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                            <MessageSquare className="w-8 h-8" />
                          </div>
                          <p className="text-slate-400 text-sm font-medium">No previous sessions for this problem.</p>
                          <Button 
                            variant="ghost" 
                            className="mt-4 text-bca-blue"
                            onClick={() => setView('chat')}
                          >
                            Start First Consultation
                          </Button>
                        </div>
                      ) : (
                        history.map((session) => (
                          <motion.div 
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            key={session.id} 
                            className="space-y-4"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{format(parseISO(session.created_at), 'MMM d, h:mm a')}</span>
                              <div className="h-[1px] flex-1 bg-slate-100" />
                            </div>
                            
                            <div className="flex items-start gap-3 justify-end">
                              <GlassCard className="p-3 bg-slate-50 text-slate-700 text-xs font-bold max-w-[80%] border-slate-100">
                                {session.question}
                              </GlassCard>
                              <div className="w-6 h-6 rounded-md bg-slate-200 flex items-center justify-center text-slate-500">
                                <User className="w-4 h-4" />
                              </div>
                            </div>

                            <div className="flex items-start gap-3">
                              <div className="w-6 h-6 rounded-md bg-bca-blue/10 flex items-center justify-center text-bca-blue">
                                <Bot className="w-4 h-4" />
                              </div>
                              <GlassCard className="p-5 bg-white border-slate-100 shadow-sm max-w-[90%]">
                                <div className="text-[13px]">
                                   <MarkdownFormatter content={session.answer} />
                                </div>
                              </GlassCard>
                            </div>
                          </motion.div>
                        ))
                      )}
                      <div ref={chatEndRef} />
                    </div>
                  )}
                </div>

                {/* Footer Input */}
                {view === 'chat' && (
                  <div className="p-6 pt-2 bg-slate-50/50 border-t border-slate-200">
                    <div className="relative">
                      <TextArea 
                        placeholder="Apa rekomendasi terbaik untuk masalah ini berdasarkan action plan saya?"
                        className="pr-14 min-h-[100px] shadow-sm focus:ring-bca-blue/10 text-slate-700 text-sm py-4 border-slate-200"
                        value={question}
                        onChange={e => setQuestion(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleConsult();
                          }
                        }}
                      />
                      <button 
                        onClick={handleConsult}
                        disabled={!question.trim() || isConsulting}
                        className={cn(
                          "absolute right-3 bottom-3 w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-lg",
                          question.trim() && !isConsulting ? "bg-bca-blue text-white shadow-bca-blue/20" : "bg-slate-200 text-slate-400 cursor-not-allowed"
                        )}
                      >
                        {isConsulting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                      </button>
                    </div>
                    <div className="flex items-center gap-2 mt-3 px-1">
                      <AlertCircle className="w-3 h-3 text-slate-400" />
                      <p className="text-[10px] text-slate-400 font-medium">Expert advice is generated based on your provided context. Verify feasibility before execution.</p>
                    </div>
                  </div>
                )}
              </GlassCard>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
