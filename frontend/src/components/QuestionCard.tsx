import { useState } from "react";
import { motion } from "motion/react";
import { HelpCircle, Check, Send } from "lucide-react";

interface QuestionCardProps {
  text: string;
  options?: string[];
  onAnswer: (answer: string) => void;
  language: "en" | "fa";
}

export default function QuestionCard({ text, options, onAnswer, language }: QuestionCardProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [customAnswer, setCustomAnswer] = useState("");
  const [answered, setAnswered] = useState(false);

  const handleSelect = (option: string) => {
    if (answered) return;
    setSelected(option);
    setAnswered(true);
    onAnswer(option);
  };

  const handleCustomSubmit = () => {
    if (!customAnswer.trim() || answered) return;
    setAnswered(true);
    onAnswer(customAnswer.trim());
  };

  const handleCustomKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCustomSubmit();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-[85%]"
    >
      <div className="bg-[#0c0c12]/80 border border-amber-400/15 rounded-2xl p-4 backdrop-blur-xl">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <HelpCircle size={14} className="text-amber-400 shrink-0" />
          <span className="text-[10px] font-mono text-amber-400/80 uppercase tracking-wider font-bold">
            {language === "fa" ? "سوال" : "Question"}
          </span>
        </div>

        {/* Question text */}
        <div className="text-xs md:text-sm text-white/90 leading-relaxed mb-3">
          {text}
        </div>

        {/* Clickable option buttons */}
        {options && options.length > 0 && (
          <div className="flex flex-col gap-2">
            {options.map((option, idx) => (
              <button
                key={idx}
                onClick={() => handleSelect(option)}
                disabled={answered}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-[12px] font-medium border transition-all duration-200 ${
                  selected === option
                    ? "bg-neural-cyan/15 border-neural-cyan/40 text-neural-cyan"
                    : answered
                    ? "bg-white/3 border-white/5 text-titanium/30 cursor-not-allowed"
                    : "bg-white/5 border-white/8 text-titanium/70 hover:bg-white/8 hover:border-white/15 hover:text-white cursor-pointer"
                }`}
              >
                <span className="flex items-center gap-2">
                  {selected === option ? (
                    <Check size={12} className="text-neural-cyan shrink-0" />
                  ) : (
                    <span className="w-3 h-3 rounded-full border border-white/20 shrink-0 flex items-center justify-center text-[8px] text-titanium/40">
                      {idx + 1}
                    </span>
                  )}
                  {option}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Free text input for custom answers */}
        {(!options || options.length === 0) && !answered && (
          <div className="flex items-center gap-2 mt-1">
            <input
              type="text"
              value={customAnswer}
              onChange={(e) => setCustomAnswer(e.target.value)}
              onKeyDown={handleCustomKeyDown}
              placeholder={language === "fa" ? "پاسخ خود را تایپ کنید..." : "Type your answer..."}
              className="flex-1 bg-white/5 border border-white/8 rounded-xl px-3 py-2 text-[12px] text-white placeholder-titanium/40 focus:outline-none focus:border-neural-cyan/30"
              autoFocus
            />
            <button
              onClick={handleCustomSubmit}
              disabled={!customAnswer.trim()}
              className="flex items-center justify-center w-8 h-8 rounded-xl bg-neural-cyan/20 border border-neural-cyan/30 text-neural-cyan hover:bg-neural-cyan/30 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Send size={14} />
            </button>
          </div>
        )}

        {/* Answered indicator */}
        {answered && (
          <div className="mt-2 text-[10px] font-mono text-neural-cyan/60 flex items-center gap-1">
            <Check size={10} />
            {language === "fa" ? "پاسخ ارسال شد" : "Answer sent"}
          </div>
        )}
      </div>
    </motion.div>
  );
}
