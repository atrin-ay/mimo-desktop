import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown, ChevronRight, User } from "lucide-react";
import { Message, OrbState } from "../types";
import OrbIndicator from "./OrbIndicator";
import ExecutionTimeline from "./ExecutionTimeline";
import ArtifactCard from "./ArtifactCard";
import QuestionCard from "./QuestionCard";
import { detectQuestion } from "../utils/questionDetector";

interface ExecutionCardProps {
  message: Message;
  language: "en" | "fa";
  onAnswer?: (answer: string) => void;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  streaming: { label: "EXECUTING", color: "text-emerald-400", bg: "bg-emerald-400/15 border-emerald-400/25" },
  done: { label: "COMPLETED", color: "text-emerald-400", bg: "bg-emerald-400/15 border-emerald-400/25" },
  pending: { label: "PENDING", color: "text-titanium/50", bg: "bg-white/5 border-white/8" },
  error: { label: "ERROR", color: "text-red-400", bg: "bg-red-400/15 border-red-400/25" },
};

export default function ExecutionCard({ message, language, onAnswer }: ExecutionCardProps) {
  const [reasoningOpen, setReasoningOpen] = useState(false);
  const isUser = message.sender === "user";
  const isSystem = message.sender === "system";
  const isStreaming = message.status === "streaming";

  // Detect questions from the question event OR from text parsing
  const detectedQuestion = useMemo(() => {
    if (message.isQuestion) {
      return { isQuestion: true, questionText: message.text, options: message.questionOptions || [] };
    }
    // Only try to detect from text when the message is fully done
    if (message.sender === "agent" && message.status === "done" && message.text) {
      return detectQuestion(message.text);
    }
    return null;
  }, [message.isQuestion, message.text, message.questionOptions, message.sender, message.status]);

  // System messages
  if (isSystem) {
    if (message.isQuestion) {
      return (
        <QuestionCard
          text={message.text}
          options={message.questionOptions}
          onAnswer={onAnswer || (() => {})}
          language={language}
        />
      );
    }
    return (
      <div className="flex justify-center my-2.5">
        <div className="px-3.5 py-1.5 bg-white/3 border border-white/5 rounded-full text-[10px] font-mono text-titanium/50 tracking-wider backdrop-blur-md flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-neural-cyan animate-pulse" />
          {message.text}
        </div>
      </div>
    );
  }

  // User messages
  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex gap-3 ml-auto flex-row-reverse text-right w-fit max-w-[65%]"
      >
        <div className="w-7 h-7 rounded-lg border border-white/10 flex items-center justify-center bg-white/5 shrink-0 text-xs text-titanium/40 mt-1">
          <User size={12} />
        </div>
        <div className="flex flex-col">
          <span className="text-[8px] font-mono text-titanium/40 mb-1">
            {message.timestamp}
          </span>
          <div className="px-4 py-3 bg-neural-cyan/[0.08] border border-neural-cyan/25 rounded-2xl rounded-tr-none text-xs md:text-sm text-white leading-relaxed shadow-[0_4px_15px_rgba(93,247,255,0.04)] w-fit max-w-full break-words">
            {message.text}
          </div>
        </div>
      </motion.div>
    );
  }

  // Agent messages
  const hasEvents = message.events && message.events.length > 0;
  const hasArtifacts = message.artifacts && message.artifacts.length > 0;
  const hasReasoning = message.reasoning && message.reasoning.length > 0;

  let orbStateForCard = OrbState.Idle;
  let statusKey = "pending";
  if (isStreaming) {
    if (message.events?.some((e) => e.type === "tool" && e.status === "running")) {
      orbStateForCard = OrbState.Executing;
      statusKey = "streaming";
    } else if (message.events?.some((e) => e.type === "reasoning")) {
      orbStateForCard = OrbState.Thinking;
      statusKey = "streaming";
    } else {
      orbStateForCard = OrbState.Streaming;
      statusKey = "streaming";
    }
  } else if (message.status === "done") {
    orbStateForCard = OrbState.Completed;
    statusKey = "done";
  }

  const status = STATUS_CONFIG[statusKey] || STATUS_CONFIG.pending;

  // If a question was detected, render it as a QuestionCard below the execution card
  const showQuestion = detectedQuestion && !isStreaming;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="flex flex-col gap-2 text-left w-full max-w-[80%]"
    >
      {/* Execution Card Container */}
      <div className="bg-[#0c0c12]/80 border border-white/6 rounded-2xl p-4 backdrop-blur-xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <OrbIndicator state={orbStateForCard} size={32} />
          <span className="text-[13px] font-bold text-white/90 tracking-wide">MiMo</span>
          <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider ${status.color} ${status.bg}`}>
            {status.label}
          </span>
          <span className="text-[10px] font-mono text-white/25 ml-auto tabular-nums">
            {message.timestamp}
          </span>
        </div>

        {hasEvents && <ExecutionTimeline events={message.events} />}

        {hasArtifacts && (
          <div className="mt-2 space-y-1.5">
            <div className="text-[9px] font-mono tracking-wider text-titanium/50 uppercase px-1">Generated Files</div>
            {message.artifacts.map((art) => (
              <ArtifactCard key={art.id} artifact={art} />
            ))}
          </div>
        )}

        {hasReasoning && (
          <div className="mt-2 pt-2 border-t border-white/5">
            <button
              onClick={() => setReasoningOpen(!reasoningOpen)}
              className="flex items-center gap-1.5 text-[10px] font-mono text-titanium/40 hover:text-titanium/60 transition-colors cursor-pointer px-1"
            >
              {reasoningOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
              <span>View Reasoning</span>
            </button>
            <AnimatePresence>
              {reasoningOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="mt-1.5 p-3 bg-purple-400/[0.04] border border-purple-400/10 rounded-xl text-[11px] text-titanium/60 font-mono leading-relaxed whitespace-pre-line max-h-[200px] overflow-y-auto">
                    {message.reasoning}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Response text — always shown */}
      {(message.text || (isStreaming && !message.text)) && (
        <div className="px-4 py-3 bg-[#0c0c12]/60 border border-white/5 rounded-2xl rounded-tl-none text-xs md:text-[13px] leading-relaxed backdrop-blur-md whitespace-pre-line text-white/85">
          {message.text}
          {isStreaming && !message.text && (
            <div className="flex items-center gap-1.5 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-neural-cyan/60 animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-neural-cyan/60 animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-neural-cyan/60 animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          )}
        </div>
      )}

      {/* Question card — shown BELOW the response text if detected */}
      {showQuestion && (
        <QuestionCard
          text={detectedQuestion!.questionText}
          options={detectedQuestion!.options}
          onAnswer={onAnswer || (() => {})}
          language={language}
        />
      )}
    </motion.div>
  );
}
