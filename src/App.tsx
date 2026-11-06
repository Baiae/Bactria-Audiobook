import { useEffect, useState, useRef } from "react";
import { Play, Pause, Square, Loader2, Volume2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface Chapter {
  id: string;
  title: string;
  text?: string;
}

export default function App() {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [chapterText, setChapterText] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>("");
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    fetch("/api/chapters")
      .then((res) => res.json())
      .then((data) => setChapters(data))
      .catch((err) => console.error("Failed to load chapters:", err));
  }, []);

  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  useEffect(() => {
    if (selectedChapterId) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      setIsPaused(false);
      setIsLoading(true);
      setChapterText("");

      fetch(`/api/chapters/${selectedChapterId}`)
        .then((res) => res.json())
        .then((data) => {
          setChapterText(data.text);
          setIsLoading(false);
        })
        .catch((err) => {
          console.error("Failed to load chapter text:", err);
          setIsLoading(false);
        });
    }
  }, [selectedChapterId]);

  const handlePlay = () => {
    if (isPlaying) {
      window.speechSynthesis.pause();
      setIsPlaying(false);
      setIsPaused(true);
    } else if (isPaused) {
      window.speechSynthesis.resume();
      setIsPlaying(true);
      setIsPaused(false);
    } else if (chapterText) {
      window.speechSynthesis.cancel();
      
      // Fix for Safari long text fallback: split into smaller chunks (sentences)
      let chunks = chapterText.match(/[^.!?]+[.!?]+/g);
      if (!chunks) {
        chunks = [chapterText];
      }

      chunks.forEach((chunk, index) => {
        const utterance = new SpeechSynthesisUtterance(chunk.trim());
        if (selectedVoice) {
          const voice = voices.find(v => v.name === selectedVoice);
          if (voice) {
            utterance.voice = voice;
            // CRITICAL: WebKit requires lang to match the voice's lang
            utterance.lang = voice.lang;
          }
        }
        
        // Reset state only on the last chunk
        if (index === chunks.length - 1) {
          utterance.onend = () => {
            setIsPlaying(false);
            setIsPaused(false);
          };
        }
        
        // Note: Safari can sometimes drop utterances if not referenced, but queueing usually works.
        // We omit utteranceRef here because we are queueing multiple.
        window.speechSynthesis.speak(utterance);
      });
      
      setIsPlaying(true);
      setIsPaused(false);
    }
  };

  const handleStop = () => {
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setIsPaused(false);
  };

  const activeChapter = chapters.find((c) => c.id === selectedChapterId);

  return (
    <div className="flex h-screen bg-[#050507] text-gray-200 font-sans relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#3b2d7d] opacity-20 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-[#7d4b2d] opacity-10 blur-[100px] pointer-events-none"></div>

      {/* Sidebar */}
      <div className="w-80 border-r border-white/5 flex flex-col h-full shrink-0 z-10 bg-[#050507]/50 backdrop-blur-sm">
        <div className="p-6 border-b border-white/5 relative z-10 flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_10px_#f97316]"></div>
            <span className="uppercase tracking-[0.3em] text-[10px] font-bold text-orange-500">Audiobook</span>
          </div>
          <h1 className="text-lg font-serif italic tracking-wide text-white/90">From Delphi to the Oxus</h1>
        </div>
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
          {chapters.map((chapter) => {
            const isActive = selectedChapterId === chapter.id;
            return (
              <button
                key={chapter.id}
                onClick={() => setSelectedChapterId(chapter.id)}
                className={`w-full text-left p-4 rounded-xl transition-colors cursor-pointer relative overflow-hidden group ${
                  isActive
                    ? "bg-white/10 border border-white/20 backdrop-blur-md shadow-2xl"
                    : "bg-white/5 border border-transparent hover:bg-white/[0.08]"
                }`}
              >
                {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-500"></div>}
                <div className="flex justify-between items-start mb-1">
                  <span className={`text-[10px] font-mono uppercase ${isActive ? "text-orange-400" : "opacity-30"}`}>
                    {chapter.id}
                  </span>
                </div>
                <p className={`text-sm font-medium ${isActive ? "text-white" : "opacity-60"}`}>
                  {chapter.title}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative z-10">
        {selectedChapterId ? (
          <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
            <header className="p-8 pb-4 flex items-center justify-between border-b border-white/5">
              <div>
                <h2 className="text-3xl font-serif text-white/90">{activeChapter?.title}</h2>
              </div>
            </header>

            {/* Audio Controls */}
            <div className="px-8 py-6 border-b border-white/5 flex items-center gap-8 sticky top-0 z-20 bg-[#050507]/80 backdrop-blur-md">
              <div className="flex items-center gap-6">
                <button
                  onClick={handlePlay}
                  disabled={isLoading || !chapterText}
                  className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_30px_rgba(255,255,255,0.15)] hover:shadow-[0_0_40px_rgba(255,255,255,0.25)] hover:scale-105 active:scale-95"
                >
                  {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
                </button>
                <button
                  onClick={handleStop}
                  disabled={!isPlaying && !isPaused}
                  className="w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 text-white/80 flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-white/10"
                >
                  <Square className="w-5 h-5" />
                </button>
              </div>

              <div className="h-12 w-px bg-white/10"></div>

              <div className="flex items-center gap-4 flex-1">
                <div className="flex flex-col">
                  <span className="text-[9px] uppercase tracking-tighter opacity-40 text-white">Voice Engine</span>
                  <div className="flex items-center gap-2 mt-1">
                    <Volume2 className="w-4 h-4 text-orange-500 opacity-80" />
                    <select
                      value={selectedVoice}
                      onChange={(e) => setSelectedVoice(e.target.value)}
                      className="bg-transparent text-xs font-mono text-white/90 border-b border-white/20 pb-1 focus:border-orange-500 focus:outline-none appearance-none cursor-pointer pr-4"
                    >
                      <option value="" className="bg-[#121215] text-white">System Default</option>
                      {voices.map((voice) => (
                        <option key={voice.name} value={voice.name} className="bg-[#121215] text-white">
                          {voice.name} ({voice.lang})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Reading Area */}
            <div className="flex-1 overflow-y-auto p-10 relative">
              <AnimatePresence mode="wait">
                {isLoading ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 flex flex-col items-center justify-center text-white/40 gap-4"
                  >
                    <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
                    <p className="text-sm font-mono tracking-widest uppercase">Generating narration...</p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="content"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.4 }}
                    className="max-w-2xl mx-auto pb-20"
                  >
                    {chapterText.split("\n\n").map((paragraph, idx) => (
                      <p key={idx} className="mb-8 leading-relaxed text-white/70 text-lg font-serif">
                        {paragraph}
                      </p>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-white/40">
            <div className="aspect-square w-64 mx-auto mb-12 relative">
               <div className="absolute inset-0 bg-gradient-to-tr from-orange-900 to-indigo-900 rounded-lg transform rotate-3 shadow-2xl opacity-20"></div>
               <div className="absolute inset-0 bg-[#121215] border border-white/10 rounded-lg shadow-2xl flex flex-col items-center justify-center p-8">
                 <div className="text-center">
                   <p className="text-[10px] uppercase tracking-[0.4em] opacity-40 mb-4">The Hellenistic World</p>
                   <p className="text-2xl font-serif leading-tight text-white/90">From Delphi<br/>to the<br/>Oxus</p>
                   <div className="h-[1px] w-12 bg-orange-500/50 mx-auto my-6"></div>
                   <Volume2 className="w-6 h-6 mx-auto opacity-40" />
                 </div>
               </div>
               <div className="absolute -bottom-4 -right-4 w-12 h-12 bg-orange-500 rounded-full blur-2xl opacity-10"></div>
            </div>
            <p className="text-sm font-mono uppercase tracking-widest">Select a chapter to begin</p>
          </div>
        )}
      </div>
    </div>
  );
}
