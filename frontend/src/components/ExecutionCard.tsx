import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronRight, User, Check } from "lucide-react";
import { Message, OrbState } from "../types";
import OrbIndicator from "./OrbIndicator";
import ExecutionTimeline from "./ExecutionTimeline";
import ArtifactCard from "./ArtifactCard";
import MultipleChoiceQuestion from "./MultipleChoiceQuestion";
import ThinkingIndicator from "./ThinkingIndicator";

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
  const [detailsOpen, setDetailsOpen] = useState(false);
  const isUser = message.sender === "user";
  const isSystem = message.sender === "system";
  const isStreaming = message.status === "streaming";

  const hasStructuredOptions =
    message.isQuestion &&
    message.questionOptions &&
    message.questionOptions.length >= 2;

  // ─── System messages ─────────────────────────────────────────────────
  if (isSystem) {
    if (hasStructuredOptions) {
      return (
        <MultipleChoiceQuestion
          question={message.text}
          options={message.questionOptions!}
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

  // ─── User messages ───────────────────────────────────────────────────
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

  // ─── Agent messages ──────────────────────────────────────────────────

  const hasEvents = message.events && message.events.length > 0;
  const hasArtifacts = message.artifacts && message.artifacts.length > 0;
  const hasReasoning = message.reasoning && message.reasoning.length > 0;
  const hasText = message.text && message.text.length > 0;

  // Orb state and status
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

  // Thinking: only when streaming, no text, AND no events yet
  const isThinking = isStreaming && !hasText && !hasEvents;

  // Show live timeline when streaming and events exist (not thinking)
  const showLiveTimeline = isStreaming && hasEvents && !isThinking;

  // Show details section after completion (collapsible)
  const showDetailsSection = !isStreaming && (hasEvents || hasReasoning);

  const showMultipleChoice = hasStructuredOptions && !isStreaming;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="flex flex-col gap-2 text-left w-full max-w-[80%]"
    >
      {/* ─── Main Card ─── */}
      <div className="bg-[#0c0c12]/80 border border-white/6 rounded-2xl p-4 backdrop-blur-xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-3">
          <OrbIndicator state={orbStateForCard} size={32} />
          <span className="text-[13px] font-bold text-white/90 tracking-wide">MiMo</span>

          <AnimatePresence mode="wait">
            <motion.span
              key={statusKey}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.25 }}
              className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider ${status.color} ${status.bg}`}
            >
              {statusKey === "done" ? (
                <span className="flex items-center gap-1">
                  <Check size={9} strokeWidth={3} />
                  {status.label}
                </span>
              ) : (
                status.label
              )}
            </motion.span>
          </AnimatePresence>

          <span className="text-[10px] font-mono text-white/25 ml-auto tabular-nums">
            {message.timestamp}
          </span>
        </div>

        {/* ─── Content Area ─── */}
        <AnimatePresence mode="wait">
          {isThinking ? (
            /* THINKING — only when no events and no text yet */
            <motion.div
              key="thinking"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
            >
              <ThinkingIndicator language={language} />
            </motion.div>
          ) : (
            /* RESPONSE + LIVE EVENTS */
            <motion.div
              key="response"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-3"
            >
              {/* Artifacts */}
              {hasArtifacts && (
                <div className="space-y-1.5">
                  <div className="text-[9px] font-mono tracking-wider text-titanium/50 uppercase px-1">Generated Files</div>
                  {message.artifacts.map((art) => (
                    <ArtifactCard key={art.id} artifact={art} />
                  ))}
                </div>
              )}

              {/* Response text — primary focus */}
              {hasText && (
                <div className="px-1 py-1 text-xs md:text-[13px] leading-relaxed text-white/85 whitespace-pre-line">
                  {message.text}
                </div>
              )}

              {/* Streaming cursor */}
              {isStreaming && hasText && (
                <motion.div
                  className="w-1.5 h-1.5 rounded-full bg-neural-cyan/60"
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
              )}

              {/* LIVE EXECUTION TIMELINE — visible during streaming */}
              {showLiveTimeline && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <ExecutionTimeline events={message.events} />
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Post-completion: single collapsible Details section ─── */}
        {showDetailsSection && (
          <div className="mt-3 pt-3 border-t border-white/5">
            <button
              onClick={() => setDetailsOpen(!detailsOpen)}
              className="flex items-center gap-1.5 text-[10px] font-mono text-titanium/40 hover:text-titanium/60 transition-colors cursor-pointer px-1 group"
            >
              <motion.span
                animate={{ rotate: detailsOpen ? 90 : 0 }}
                transition={{ duration: 0.2 }}
                className="inline-flex"
              >
                <ChevronRight size={11} />
              </motion.span>
              <span className="group-hover:text-titanium/70 transition-colors">
                {detailsOpen
                  ? (language === "fa" ? "بستن جزئیات" : "Hide details")
                  : (language === "fa" ? "مشاهده جزئیات" : "Execution Details")}
              </span>
              {hasEvents && (
                <span className="text-[9px] text-titanium/25 ml-1">
                  {message.events.length} {message.events.length === 1 ? "step" : "steps"}
                </span>
              )}
            </button>

            <AnimatePresence>
              {detailsOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <div className="mt-2 space-y-3">
                    {/* Execution timeline */}
                    {hasEvents && <ExecutionTimeline events={message.events} />}

                    {/* Reasoning text */}
                    {hasReasoning && (
                      <div className="pt-2 border-t border-white/5">
                        <div className="text-[9px] font-mono tracking-wider text-titanium/50 uppercase px-1 mb-1.5">Reasoning</div>
                        <div className="p-3 bg-purple-400/[0.04] border border-purple-400/10 rounded-xl text-[11px] text-titanium/60 font-mono leading-relaxed whitespace-pre-line max-h-[200px] overflow-y-auto">
                          {message.reasoning}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Multiple-choice question — below card */}
      {showMultipleChoice && (
        <MultipleChoiceQuestion
          question={message.text}
          options={message.questionOptions!}
          onAnswer={onAnswer || (() => {})}
          language={language}
        />
      )}
    </motion.div>
  );
}
