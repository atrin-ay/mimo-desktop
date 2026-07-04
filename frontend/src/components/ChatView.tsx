import { useRef, useEffect, useState } from "react";
import { motion } from "motion/react";
import { Terminal } from "lucide-react";
import { OrbState, InteractionMode, Message } from "../types";
import { translations } from "../utils/translations";
import Orb from "./Orb";
import ExecutionCard from "./ExecutionCard";
import ChatInput from "./ChatInput";

interface ChatViewProps {
  messages: Message[];
  orbState: OrbState;
  setOrbState: (s: OrbState) => void;
  isLoading: boolean;
  interactionMode: InteractionMode;
  setInteractionMode: (m: InteractionMode) => void;
  onExecute: (cmd: string) => void;
  onAnswer: (answer: string) => void;
  onStop: () => void;
  language: "en" | "fa";
}

export default function ChatView({
  messages,
  orbState,
  setOrbState,
  isLoading,
  interactionMode,
  setInteractionMode,
  onExecute,
  onAnswer,
  onStop,
  language,
}: ChatViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const userScrolledUp = useRef(false);
  const t = translations[language];

  // Track scroll position
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    userScrolledUp.current = !atBottom;
  }, []);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    userScrolledUp.current = !atBottom;
  };

  // Auto-scroll on new messages
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (!userScrolledUp.current) {
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight;
      });
    }
  }, [messages]);

  // Also scroll on text streaming (frequent updates)
  useEffect(() => {
    if (!userScrolledUp.current) {
      const el = scrollRef.current;
      if (el) {
        requestAnimationFrame(() => {
          el.scrollTop = el.scrollHeight;
        });
      }
    }
  }, [messages.map(m => m.text).join("")]);

  const getOrbStatusText = () => {
    if (orbState === OrbState.Thinking) return language === "fa" ? "در حال تفکر..." : "Thinking...";
    if (orbState === OrbState.Executing) return language === "fa" ? "در حال اجرا..." : "Executing...";
    if (orbState === OrbState.Listening) return language === "fa" ? "در حال شنود..." : "Listening...";
    if (orbState === OrbState.Streaming) return language === "fa" ? "در حال پاسخ‌دهی..." : "Streaming...";
    if (orbState === OrbState.Completed) return language === "fa" ? "تکمیل شد" : "Completed";
    if (orbState === OrbState.Error) return language === "fa" ? "خطا" : "Error";
    return language === "fa" ? "آماده" : "Ready";
  };

  return (
    <div className="relative h-[calc(100vh-64px)] flex flex-col overflow-hidden select-none">
      {/* Background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-neural-cyan/4 rounded-full filter blur-[120px] pointer-events-none mix-blend-screen" />
      <div className="absolute bottom-1/3 left-1/3 w-[400px] h-[400px] bg-electric-blue/4 rounded-full filter blur-[100px] pointer-events-none mix-blend-screen" />

      {/* SCROLLABLE MESSAGES AREA — takes all available space between header and input */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 overflow-y-auto px-4 md:px-12 py-4 space-y-4 scrollbar-thin select-text z-10"
      >
        {/* Orb header (scrolls with messages) */}
        <div className="max-w-4xl mx-auto mb-2">
          <div className="p-3 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center justify-between backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="relative flex items-center justify-center bg-black/40 rounded-full w-10 h-10 border border-white/10 overflow-hidden shrink-0">
                <Orb state={orbState} size={50} onClick={() => {}} />
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] font-mono tracking-widest text-neural-cyan uppercase">
                  MIMO
                </span>
                <span className="text-xs font-semibold text-white/90 font-sans mt-0.5">
                  {getOrbStatusText()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.map((msg) => (
            <ExecutionCard key={msg.id} message={msg} language={language} onAnswer={onAnswer} />
          ))}

          {/* Loading dots when waiting for first event */}
          {isLoading && messages.every((m) => m.sender !== "agent" || m.status === "done") && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 py-2 px-3"
            >
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-neural-cyan/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-neural-cyan/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-neural-cyan/60 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
              <span className="text-[10px] text-titanium/40 font-mono">
                {language === "fa" ? "شروع..." : "Starting..."}
              </span>
            </motion.div>
          )}
        </div>
      </div>

      {/* FIXED INPUT AREA — pinned to bottom, never scrolls */}
      <div className="shrink-0 px-4 md:px-12 pb-4 pt-2 z-20 bg-gradient-to-t from-[#050505] via-[#050505]/80 to-transparent">
        <ChatInput
          onSubmit={onExecute}
          isLoading={isLoading}
          orbState={orbState}
          setOrbState={setOrbState}
          interactionMode={interactionMode}
          setInteractionMode={setInteractionMode}
          onStop={onStop}
          language={language}
        />
      </div>
    </div>
  );
}
