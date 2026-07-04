import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  Send,
  Mic,
  Cpu,
  Activity,
  Terminal,
  Plus,
} from "lucide-react";
import { OrbState, ActiveView, Goal, InteractionMode } from "../types";
import { translations } from "../utils/translations";
import Orb from "./Orb";

interface HomeScreenProps {
  orbState: OrbState;
  setOrbState: (state: OrbState) => void;
  onNavigate: (view: ActiveView) => void;
  onTriggerAction: (prompt: string) => void;
  activeGoals: Goal[];
  language: "en" | "fa";
  setLanguage: (lang: "en" | "fa") => void;
  interactionMode: InteractionMode;
  setInteractionMode: (mode: InteractionMode) => void;
}

export default function HomeScreen({
  orbState,
  setOrbState,
  onNavigate,
  onTriggerAction,
  activeGoals,
  language,
  setLanguage,
  interactionMode,
  setInteractionMode,
}: HomeScreenProps) {
  const [prompt, setPrompt] = useState("");
  const [isListening, setIsListening] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const t = translations[language];

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!prompt.trim()) return;
    onTriggerAction(prompt);
    setPrompt("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const toggleVoiceListen = () => {
    if (isListening) {
      setOrbState(OrbState.Idle);
      setIsListening(false);
    } else {
      setOrbState(OrbState.Listening);
      setIsListening(true);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-64px)] flex flex-col px-4 py-4 md:px-12 select-none overflow-y-auto">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-neural-cyan/4 rounded-full filter blur-[120px] pointer-events-none mix-blend-screen" />
      <div className="absolute bottom-1/3 left-1/3 w-[400px] h-[400px] bg-electric-blue/4 rounded-full filter blur-[100px] pointer-events-none mix-blend-screen" />

      <div className="flex-1 w-full max-w-4xl text-center mx-auto mt-4 z-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="inline-flex items-center gap-2 px-3 py-1 bg-white/3 border border-white/5 rounded-full text-xs text-titanium/80 tracking-wider backdrop-blur-md mb-6"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-neural-cyan animate-pulse" />
          {t.systemVersion}
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.1, ease: "easeOut" }}
          className="text-4xl md:text-6xl font-display font-light tracking-tight mb-3 text-luxury"
        >
          {t.whatAreWeBuilding}
          <span className="font-semibold text-accent-gradient font-heading tracking-tighter">
            {t.whatAreWeBuildingHighlight}
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2, delay: 0.3 }}
          className="text-sm md:text-base text-titanium/60 max-w-xl mx-auto font-sans mb-8"
        >
          {t.substrateDesc}
        </motion.p>
      </div>

      <div className="relative w-full max-w-5xl flex flex-col md:flex-row items-center justify-center gap-8 md:gap-14 my-6 mx-auto z-20">
        <div className="relative flex items-center justify-center">
          <AnimatePresence>
            {activeGoals.slice(0, 2).map((goal, index) => (
              <motion.div
                key={goal.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  y: [0, -10, 0],
                }}
                transition={{
                  opacity: { duration: 0.6, delay: 0.6 + index * 0.2 },
                  y: {
                    repeat: Infinity,
                    duration: 6,
                    ease: "easeInOut",
                    delay: index * 3,
                  },
                }}
                className={`absolute z-30 hidden lg:flex flex-col p-3 liquid-glass rounded-xl border border-neural-cyan/10 shadow-lg text-left max-w-[190px] pointer-events-auto cursor-pointer ${
                  index === 0 ? "-left-44 top-4" : "-right-44 bottom-10"
                }`}
              >
                <div className="flex items-center gap-1.5 text-[9px] font-mono tracking-wider text-neural-cyan uppercase">
                  <Activity size={10} className="animate-pulse" />
                  {language === "fa" ? "هدف خودمختار" : "Autonomous Goal"}
                </div>
                <div className="text-[11px] font-semibold text-white/90 mt-1 line-clamp-1">
                  {goal.title}
                </div>
                <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-white/5">
                  <span className="text-[9px] font-mono text-titanium/50">
                    CONFIDENCE
                  </span>
                  <span className="text-[10px] font-mono text-white font-semibold">
                    {(goal.confidence * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="w-full bg-white/5 h-1 rounded-full mt-1.5 overflow-hidden">
                  <div
                    className="bg-neural-cyan h-full rounded-full"
                    style={{ width: `${goal.progress * 100}%` }}
                  />
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          <div className="absolute w-[280px] h-[280px] rounded-full border border-dashed border-white/5 animate-spin" style={{ animationDuration: "120s" }} />
          <div className="absolute w-[320px] h-[320px] rounded-full border border-dotted border-neural-cyan/3 animate-spin" style={{ animationDuration: "180s", animationDirection: "reverse" }} />
          <Orb state={orbState} size={260} onClick={() => {}} />
        </div>

        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="hidden md:flex flex-col gap-3 w-56 text-right"
        >
          <div className="text-[10px] font-mono tracking-widest text-titanium/40 uppercase mb-1">
            {t.osTelemetry}
          </div>
          <div className="p-3 liquid-glass rounded-xl border border-white/5 text-left flex flex-col gap-2">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-titanium/50 font-mono">{t.telemetryCores}</span>
              <span className="text-white font-semibold font-mono">{t.telemetryCoresValue}</span>
            </div>
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-titanium/50 font-mono">{t.telemetryNodes}</span>
              <span className="text-white font-semibold font-mono">{t.telemetryNodesValue}</span>
            </div>
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-titanium/50 font-mono">{t.telemetrySpeed}</span>
              <span className="text-neural-cyan font-semibold font-mono">{t.telemetrySpeedValue}</span>
            </div>
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-titanium/50 font-mono">{t.telemetrySandbox}</span>
              <span className="text-emerald-400 font-semibold font-mono flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
                {t.telemetrySandboxValue}
              </span>
            </div>
          </div>
          <div
            className="p-3 bg-gradient-to-br from-neural-cyan/10 to-transparent border border-neural-cyan/15 rounded-xl text-left cursor-pointer hover:border-neural-cyan/30 transition-colors"
            onClick={() => onNavigate(ActiveView.Memory)}
          >
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-neural-cyan uppercase tracking-wider">
              <Cpu size={11} />
              {t.neuroLinkTitle}
            </div>
            <div className="text-[10px] text-white/80 mt-1 line-clamp-2">
              {t.neuroLinkDesc}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Input area */}
      <div className="w-full max-w-3xl mx-auto z-30 mt-4 mb-6">
        <div className="flex items-center gap-1.5 mb-2.5 px-1 overflow-x-auto scrollbar-none">
          {[
            {
              mode: InteractionMode.Direct,
              label: t.modeDirect,
              desc: t.modeDirectDesc,
              activeColor: "bg-neural-cyan/10 border-neural-cyan/40 text-neural-cyan shadow-[0_0_15px_rgba(93,247,255,0.15)]",
            },
            {
              mode: InteractionMode.Plan,
              label: t.modePlan,
              desc: t.modePlanDesc,
              activeColor: "bg-purple-400/10 border-purple-400/40 text-purple-400 shadow-[0_0_15px_rgba(192,132,252,0.15)]",
            },
            {
              mode: InteractionMode.Agent,
              label: t.modeAgent,
              desc: t.modeAgentDesc,
              activeColor: "bg-blue-400/10 border-blue-400/40 text-blue-400 shadow-[0_0_15px_rgba(96,165,250,0.15)]",
            },
          ].map((item) => (
            <button
              key={item.mode}
              type="button"
              onClick={() => setInteractionMode(item.mode)}
              className={`flex-1 min-w-[120px] p-2.5 rounded-xl text-left border transition-all duration-300 backdrop-blur-md flex flex-col gap-0.5 cursor-pointer ${
                interactionMode === item.mode
                  ? item.activeColor
                  : "bg-white/[0.02] border-white/5 text-titanium/50 hover:border-white/10 hover:bg-white/[0.04]"
              }`}
            >
              <span className="text-[11px] font-bold tracking-wide uppercase select-none">
                {item.label}
              </span>
              <span className="text-[9px] text-titanium/40 line-clamp-1 select-none">
                {item.desc}
              </span>
            </button>
          ))}
        </div>

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
              placeholder={t.placeholder}
              className={`flex-1 bg-transparent border-none text-white placeholder-titanium/45 focus:outline-none focus:ring-0 text-sm md:text-base ${
                language === "fa" ? "font-fa" : "font-sans"
              }`}
            />
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={toggleVoiceListen}
                className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-300 border ${
                  isListening
                    ? "bg-red-500/20 border-red-500/50 text-red-400 animate-pulse"
                    : "bg-white/5 border-white/5 hover:bg-white/10 text-titanium/80"
                }`}
                title="Voice"
              >
                <Mic size={18} />
              </button>
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
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
