import React, { useState, useRef, useEffect } from "react";
import { motion } from "motion/react";
import { Send, Mic, Terminal, Square } from "lucide-react";
import { OrbState, AgentName } from "../types";
import { translations } from "../utils/translations";
import { ModelInfo } from "../api";

interface ChatInputProps {
  onSubmit: (prompt: string) => void;
  isLoading: boolean;
  orbState: OrbState;
  setOrbState: (state: OrbState) => void;
  agent: AgentName;
  setAgent: (agent: AgentName) => void;
  model: string;
  setModel: (model: string) => void;
  models: ModelInfo[];
  modelsLoading: boolean;
  onStop: () => void;
  language: "en" | "fa";
}

const PLACEHOLDERS_EN = [
  "Inject goal, command, or neural pipeline instruction...",
  "Ask MiMo to analyze, build, or optimize...",
  "Describe what you want to create...",
];

const PLACEHOLDERS_FA = [
  "هدف، دستور یا فرمان خط لوله عصبی را وارد کنید...",
  "از میمو بخواهید تحلیل، بسازد یا بهینه‌سازی کند...",
  "توضیح دهید چه چیزی می‌خواهید بسازید...",
];

const AGENT_LABELS: Record<string, { en: string; fa: string }> = {
  build: { en: "Build", fa: "ساخت" },
  plan: { en: "Plan", fa: "برنامه" },
  compose: { en: "Compose", fa: "ترکیب" },
};

export default function ChatInput({
  onSubmit,
  isLoading,
  orbState,
  setOrbState,
  agent,
  setAgent,
  model,
  setModel,
  models,
  modelsLoading,
  onStop,
  language,
}: ChatInputProps) {
  const [prompt, setPrompt] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (prompt) return;
    const iv = setInterval(() => {
      setPlaceholderIdx((p) => {
        const list = language === "fa" ? PLACEHOLDERS_FA : PLACEHOLDERS_EN;
        return (p + 1) % list.length;
      });
    }, 3000);
    return () => clearInterval(iv);
  }, [prompt, language]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!prompt.trim() || isLoading) return;
    onSubmit(prompt);
    setPrompt("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const toggleVoice = () => {
    if (isListening) {
      setOrbState(OrbState.Idle);
      setIsListening(false);
    } else {
      setOrbState(OrbState.Listening);
      setIsListening(true);
    }
  };

  const placeholders = language === "fa" ? PLACEHOLDERS_FA : PLACEHOLDERS_EN;
  const t = translations[language];

  return (
    <div className="w-full max-w-3xl mx-auto z-30">
      {/* Tiny mode & model indicator — just a label, doesn't change input shape */}
      <div className="flex items-center gap-2 mb-1.5 px-1">
        <select
          value={agent}
          onChange={(e) => setAgent(e.target.value as AgentName)}
          className="bg-transparent border-none text-[10px] font-mono text-titanium/50 uppercase tracking-wider cursor-pointer focus:outline-none hover:text-titanium/70 transition-colors"
        >
          {Object.entries(AGENT_LABELS).map(([agentName, labels]) => (
            <option key={agentName} value={agentName} className="bg-[#111] text-white">
              {language === "fa" ? labels.fa : labels.en}
            </option>
          ))}
        </select>

        <div className="w-px h-3 bg-titanium/20" />

        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          disabled={modelsLoading}
          className="bg-transparent border-none text-[10px] font-mono text-titanium/50 uppercase tracking-wider cursor-pointer focus:outline-none hover:text-titanium/70 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {modelsLoading ? (
            <option className="bg-[#111] text-white">Loading...</option>
          ) : (
            models.map((m) => (
              <option key={m.id} value={m.id} className="bg-[#111] text-white">
                {m.name}
              </option>
            ))
          )}
        </select>
      </div>

      {/* Input container — EXACT copy of HomeScreen input */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative bg-[#0F0F0F]/65 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl p-2 focus-within:border-neural-cyan/40 focus-within:shadow-[0_0_50px_rgba(93,247,255,0.06)] transition-all duration-300"
      >
        <form onSubmit={handleSubmit} className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 border border-white/5 text-titanium/60 shrink-0">
            <Terminal size={18} />
          </div>
          <input
            ref={inputRef}
            type="text"
            value={prompt}
            onChange={(e) => {
              setPrompt(e.target.value);
              if (orbState === OrbState.Idle) setOrbState(OrbState.Listening);
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholders[placeholderIdx]}
            className={`flex-1 bg-transparent border-none text-white placeholder-titanium/45 focus:outline-none focus:ring-0 text-sm md:text-base ${
              language === "fa" ? "font-fa" : "font-sans"
            }`}
          />
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={toggleVoice}
              className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-300 border ${
                isListening
                  ? "bg-red-500/20 border-red-500/50 text-red-400 animate-pulse"
                  : "bg-white/5 border-white/5 hover:bg-white/10 text-titanium/80"
              }`}
              title="Voice"
            >
              <Mic size={18} />
            </button>
            {isLoading ? (
              <button
                type="button"
                onClick={onStop}
                className="flex items-center gap-1.5 px-4 h-10 rounded-xl font-medium text-xs bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30 transition-all duration-300 cursor-pointer"
              >
                <Square size={11} fill="currentColor" />
                <span>{language === "fa" ? "توقف" : "Stop"}</span>
              </button>
            ) : (
              <button
                type="submit"
                disabled={!prompt.trim()}
                className={`flex items-center gap-1.5 px-4 h-10 rounded-xl font-medium text-xs transition-all duration-300 ${
                  prompt.trim()
                    ? "bg-neural-cyan text-black hover:bg-white font-semibold cursor-pointer shadow-[0_0_15px_rgba(93,247,255,0.35)]"
                    : "bg-white/5 border border-white/5 text-titanium/40 cursor-not-allowed"
                }`}
              >
                <span>{t.synthesizeBtn}</span>
                <Send
                  size={13}
                  className={language === "fa" ? "rotate-180" : ""}
                />
              </button>
            )}
          </div>
        </form>
      </motion.div>
    </div>
  );
}
