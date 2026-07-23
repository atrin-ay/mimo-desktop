import { useState, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import { Check, HelpCircle } from "lucide-react";

interface MultipleChoiceQuestionProps {
  question: string;
  options: string[];
  onAnswer: (answer: string) => void;
  language: "en" | "fa";
}

const KEY_LABELS = ["A", "B", "C", "D", "E", "F", "G", "H"];

export default function MultipleChoiceQuestion({
  question,
  options,
  onAnswer,
  language,
}: MultipleChoiceQuestionProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);

  const handleSelect = useCallback(
    (option: string) => {
      if (answered) return;
      setSelected(option);
      setAnswered(true);
      onAnswer(option);
    },
    [answered, onAnswer]
  );

  // Keyboard shortcuts: A/B/C/D to select options
  useEffect(() => {
    if (answered) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const key = e.key.toUpperCase();
      const idx = KEY_LABELS.indexOf(key);
      if (idx >= 0 && idx < options.length) {
        e.preventDefault();
        handleSelect(options[idx]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [answered, options, handleSelect]);

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
            {language === "fa" ? "انتخاب کنید" : "Choose"}
          </span>
        </div>

        {/* Question text */}
        <div className="text-xs md:text-sm text-white/90 leading-relaxed mb-3">
          {question}
        </div>

        {/* Option buttons */}
        <div className="flex flex-col gap-2">
          {options.map((option, idx) => (
            <button
              key={idx}
              onClick={() => handleSelect(option)}
              disabled={answered}
              className={`group w-full text-left px-3 py-2.5 rounded-xl text-[12px] font-medium border transition-all duration-200 flex items-center gap-2.5 ${
                selected === option
                  ? "bg-neural-cyan/15 border-neural-cyan/40 text-neural-cyan"
                  : answered
                  ? "bg-white/3 border-white/5 text-titanium/30 cursor-not-allowed"
                  : "bg-white/5 border-white/8 text-titanium/70 hover:bg-white/8 hover:border-white/15 hover:text-white cursor-pointer"
              }`}
            >
              {/* Keyboard shortcut badge */}
              <span
                className={`w-5 h-5 rounded-md shrink-0 flex items-center justify-center text-[9px] font-mono font-bold border ${
                  selected === option
                    ? "bg-neural-cyan/20 border-neural-cyan/40 text-neural-cyan"
                    : "bg-white/5 border-white/10 text-titanium/40 group-hover:text-titanium/60 group-hover:border-white/15"
                }`}
              >
                {selected === option ? (
                  <Check size={10} />
                ) : (
                  KEY_LABELS[idx]
                )}
              </span>

              {/* Option text */}
              <span className="flex-1">{option}</span>
            </button>
          ))}
        </div>

        {/* Keyboard hint */}
        {!answered && (
          <div className="mt-3 text-[9px] font-mono text-titanium/30 flex items-center gap-1">
            {language === "fa"
              ? "کلید A تا ${KEY_LABELS[options.length - 1]} برای انتخاب سریع"
              : `Press ${KEY_LABELS[0]}${
                  options.length > 1
                    ? `–${KEY_LABELS[Math.min(options.length - 1, 3)]}`
                    : ""
                } to select`}
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
