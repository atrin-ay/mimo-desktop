import { useState } from "react";
import { motion } from "motion/react";
import {
  FileCode,
  FileText,
  Image,
  ExternalLink,
  Download,
  Copy,
  Check,
} from "lucide-react";
import { Artifact } from "../types";

interface ArtifactCardProps {
  artifact: Artifact;
}

const TYPE_ICONS = {
  code: FileCode,
  file: FileText,
  image: Image,
};

const EXT_LANGUAGES: Record<string, string> = {
  js: "JavaScript",
  jsx: "React JSX",
  ts: "TypeScript",
  tsx: "React TSX",
  py: "Python",
  rs: "Rust",
  go: "Go",
  java: "Java",
  cpp: "C++",
  c: "C",
  rb: "Ruby",
  php: "PHP",
  vue: "Vue",
  svelte: "Svelte",
  css: "CSS",
  html: "HTML",
  json: "JSON",
  md: "Markdown",
  yaml: "YAML",
  yml: "YAML",
  toml: "TOML",
  sh: "Shell",
  bash: "Bash",
};

export default function ArtifactCard({ artifact }: ArtifactCardProps) {
  const [copied, setCopied] = useState(false);
  const Icon = TYPE_ICONS[artifact.type] || FileText;
  const langLabel = artifact.language
    ? EXT_LANGUAGES[artifact.language] || artifact.language.toUpperCase()
    : null;

  const handleCopy = async () => {
    if (artifact.content) {
      await navigator.clipboard.writeText(artifact.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([artifact.content || ""], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = artifact.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 px-3 py-2.5 bg-white/[0.03] border border-white/8 rounded-xl backdrop-blur-md group hover:bg-white/[0.05] hover:border-white/12 transition-all"
    >
      <div className="w-8 h-8 rounded-lg bg-neural-cyan/10 border border-neural-cyan/15 flex items-center justify-center shrink-0">
        <Icon size={14} className="text-neural-cyan" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-white/90 truncate">
            {artifact.name}
          </span>
          {langLabel && (
            <span className="text-[8px] font-mono text-neural-cyan/70 bg-neural-cyan/10 px-1.5 py-0.5 rounded uppercase shrink-0">
              {langLabel}
            </span>
          )}
        </div>
        {artifact.path && (
          <div className="text-[9px] font-mono text-titanium/35 truncate mt-0.5">
            {artifact.path}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        {artifact.content && (
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-lg hover:bg-white/10 text-titanium/50 hover:text-white transition-all cursor-pointer"
            title="Copy content"
          >
            {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
          </button>
        )}
        <button
          onClick={handleDownload}
          className="p-1.5 rounded-lg hover:bg-white/10 text-titanium/50 hover:text-white transition-all cursor-pointer"
          title="Download"
        >
          <Download size={12} />
        </button>
        {artifact.path && (
          <button
            className="p-1.5 rounded-lg hover:bg-white/10 text-titanium/50 hover:text-white transition-all cursor-pointer"
            title="Open in workspace"
          >
            <ExternalLink size={12} />
          </button>
        )}
      </div>
    </motion.div>
  );
}
