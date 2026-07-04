import { motion, AnimatePresence } from "motion/react";
import { ActivityEntry } from "../types";

interface ExecutionTimelineProps {
  events: ActivityEntry[];
}

export default function ExecutionTimeline({ events }: ExecutionTimelineProps) {
  if (events.length === 0) return null;

  return (
    <div className="mb-3">
      {/* Section header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px]">⚙️</span>
        <span className="text-[11px] font-semibold tracking-wide text-white/80">
          Execution
        </span>
      </div>

      {/* Timeline */}
      <div className="relative pl-[7px]">
        {/* Vertical connecting line */}
        <div
          className="absolute left-[3px] top-[6px] w-[2px] rounded-full bg-white/8"
          style={{
            height: `calc(100% - 12px)`,
          }}
        />

        <AnimatePresence initial={false}>
          {events.map((entry, idx) => {
            const isLast = idx === events.length - 1;
            const isRunning = entry.status === "running";
            const isDone = entry.status === "completed";
            const isError = entry.status === "error";

            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.05 }}
                className="relative flex items-center gap-3 py-[7px] pr-2"
              >
                {/* Circle indicator */}
                <div className="relative z-10 shrink-0">
                  {isRunning ? (
                    /* Spinning loader for active step */
                    <div className="w-[14px] h-[14px] rounded-full border-2 border-neural-cyan/30 border-t-neural-cyan animate-spin" />
                  ) : isDone ? (
                    /* Green filled circle with checkmark */
                    <div className="w-[14px] h-[14px] rounded-full bg-emerald-500 flex items-center justify-center shadow-[0_0_8px_rgba(34,197,94,0.4)]">
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                        <path d="M1.5 4L3.5 6L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  ) : isError ? (
                    /* Red circle with X */
                    <div className="w-[14px] h-[14px] rounded-full bg-red-500 flex items-center justify-center shadow-[0_0_8px_rgba(239,68,68,0.4)]">
                      <svg width="7" height="7" viewBox="0 0 7 7" fill="none">
                        <path d="M1.5 1.5L5.5 5.5M5.5 1.5L1.5 5.5" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
                      </svg>
                    </div>
                  ) : (
                    /* Empty circle for pending */
                    <div className="w-[14px] h-[14px] rounded-full border-2 border-white/15" />
                  )}
                </div>

                {/* Status icon (checkmark or pending dot) */}
                <div className="shrink-0 w-4 flex justify-center">
                  {isDone && (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="text-emerald-400">
                      <path d="M2 5L4.5 7.5L8 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                  {isRunning && (
                    <div className="w-[5px] h-[5px] rounded-full bg-neural-cyan animate-pulse" />
                  )}
                  {!isDone && !isRunning && !isError && (
                    <div className="w-[5px] h-[5px] rounded-full bg-white/10" />
                  )}
                </div>

                {/* Label */}
                <div className="flex-1 min-w-0">
                  <span
                    className={`text-[12px] font-medium ${
                      isRunning
                        ? "text-white/90"
                        : isDone
                        ? "text-white/70"
                        : "text-white/40"
                    }`}
                  >
                    {entry.label}
                    {entry.detail && (
                      <span className="text-white/40 ml-1">{entry.detail}</span>
                    )}
                  </span>
                </div>

                {/* Timestamp on the right */}
                <span className="text-[10px] font-mono text-white/25 shrink-0 tabular-nums">
                  {formatTimestamp(entry.timestamp)}
                </span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  const s = d.getSeconds().toString().padStart(2, "0");
  return `${h}:${m}:${s}`;
}
