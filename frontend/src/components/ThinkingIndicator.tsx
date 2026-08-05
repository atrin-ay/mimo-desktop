import { motion } from "motion/react";

interface ThinkingIndicatorProps {
  language: "en" | "fa";
}

/**
 * Compact thinking card shown while the model is generating.
 * Smoothly morphs into the response card when the first token arrives.
 */
export default function ThinkingIndicator({ language }: ThinkingIndicatorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4, transition: { duration: 0.2 } }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="flex items-center gap-3 px-4 py-3"
    >
      {/* Soft pulsing dot */}
      <div className="relative flex items-center justify-center w-5 h-5">
        <motion.div
          className="absolute inset-0 rounded-full bg-neural-cyan/20"
          animate={{
            scale: [1, 1.4, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <div className="w-2 h-2 rounded-full bg-neural-cyan/70" />
      </div>

      {/* Thinking text */}
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] font-medium text-titanium/50">
          {language === "fa" ? "در حال تفکر" : "Thinking"}
        </span>
        <motion.span
          className="text-[11px] text-titanium/40"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          ...
        </motion.span>
      </div>
    </motion.div>
  );
}
