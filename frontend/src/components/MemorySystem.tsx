import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Database,
  GitFork,
  CheckCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
  Lightbulb,
  Target,
  FileCode,
  GitBranch,
} from "lucide-react";
import {
  getBrain,
  getSuggestions,
  approveSuggestion,
  ignoreSuggestion,
  type ProjectBrain,
  type Suggestion,
} from "../api";

interface MemorySystemProps {
  projectId?: string;
}

export default function MemorySystem({ projectId }: MemorySystemProps) {
  const [brain, setBrain] = useState<ProjectBrain | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["state", "knowledge"])
  );

  useEffect(() => {
    if (!projectId) {
      setLoading(false);
      return;
    }

    loadData();
  }, [projectId]);

  const loadData = async () => {
    if (!projectId) return;

    setLoading(true);
    setError(null);

    try {
      const [brainData, suggestionsData] = await Promise.all([
        getBrain(projectId),
        getSuggestions(projectId, "pending"),
      ]);

      setBrain(brainData);
      setSuggestions(suggestionsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load brain data");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (suggestionId: string) => {
    try {
      await approveSuggestion(suggestionId);
      setSuggestions((prev) => prev.filter((s) => s.id !== suggestionId));
      // Reload brain to reflect changes
      if (projectId) {
        const updatedBrain = await getBrain(projectId);
        setBrain(updatedBrain);
      }
    } catch (err) {
      console.error("Failed to approve suggestion:", err);
    }
  };

  const handleIgnore = async (suggestionId: string) => {
    try {
      await ignoreSuggestion(suggestionId);
      setSuggestions((prev) => prev.filter((s) => s.id !== suggestionId));
    } catch (err) {
      console.error("Failed to ignore suggestion:", err);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  if (!projectId) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 py-6 md:px-8 select-none">
        <div className="flex items-center gap-2 text-titanium/50">
          <Database size={16} />
          <span className="text-sm font-mono">No project selected</span>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 py-6 md:px-8 select-none">
        <div className="flex items-center gap-2 text-titanium/50">
          <RefreshCw size={16} className="animate-spin" />
          <span className="text-sm font-mono">Loading brain data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 py-6 md:px-8 select-none">
        <div className="flex items-center gap-2 text-red-400">
          <AlertTriangle size={16} />
          <span className="text-sm font-mono">{error}</span>
        </div>
      </div>
    );
  }

  if (!brain) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 py-6 md:px-8 select-none">
        <div className="flex items-center gap-2 text-titanium/50">
          <Database size={16} />
          <span className="text-sm font-mono">No brain data yet — start chatting to build context</span>
        </div>
      </div>
    );
  }

  const { state, knowledge } = brain;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6 md:px-8 select-none">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-4 border-b border-white/5">
        <div>
          <h2 className="text-xl font-display font-medium text-white flex items-center gap-2">
            <Database className="text-neural-cyan" size={20} />
            Project Brain
          </h2>
          <p className="text-xs text-titanium/50 font-mono mt-0.5">
            VERSION {brain.version} • LAST UPDATED {new Date(brain.updatedAt).toLocaleString()}
          </p>
        </div>

        <button
          onClick={loadData}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-mono text-titanium/60 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
        >
          <RefreshCw size={12} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Brain Content */}
        <div className="lg:col-span-8 space-y-4">
          {/* State Section */}
          <BrainSection
            title="Project State"
            icon={<Target size={14} className="text-neural-cyan" />}
            expanded={expandedSections.has("state")}
            onToggle={() => toggleSection("state")}
          >
            <div className="space-y-3">
              {state.currentGoal && (
                <BrainField label="Current Goal" value={state.currentGoal} icon={<Target size={12} />} />
              )}
              {state.currentTask && (
                <BrainField label="Working On" value={state.currentTask} icon={<FileCode size={12} />} />
              )}
              {state.nextStep && (
                <BrainField label="Next Step" value={state.nextStep} icon={<ChevronRight size={12} />} />
              )}
              {state.activeFeature && (
                <BrainField label="Active Feature" value={state.activeFeature} icon={<GitBranch size={12} />} />
              )}
              {state.currentFile && (
                <BrainField label="Current File" value={state.currentFile} icon={<FileCode size={12} />} />
              )}

              {state.tasks.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-xs font-mono text-titanium/60 mb-2">TASKS</h4>
                  <div className="space-y-1">
                    {state.tasks.map((task) => (
                      <div key={task.id} className="flex items-center gap-2 text-sm">
                        {task.status === "done" ? (
                          <CheckCircle size={12} className="text-green-400" />
                        ) : task.status === "doing" ? (
                          <Clock size={12} className="text-yellow-400" />
                        ) : (
                          <div className="w-3 h-3 rounded-full border border-titanium/30" />
                        )}
                        <span
                          className={
                            task.status === "done"
                              ? "text-titanium/40 line-through"
                              : "text-white/80"
                          }
                        >
                          {task.title}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {state.knownIssues.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-xs font-mono text-titanium/60 mb-2">KNOWN ISSUES</h4>
                  <div className="space-y-1">
                    {state.knownIssues.map((issue) => (
                      <div key={issue.id} className="flex items-center gap-2 text-sm">
                        <AlertTriangle
                          size={12}
                          className={
                            issue.severity === "critical"
                              ? "text-red-400"
                              : issue.severity === "high"
                              ? "text-orange-400"
                              : "text-yellow-400"
                          }
                        />
                        <span className="text-white/80">{issue.title}</span>
                        <span className="text-[10px] font-mono text-titanium/40 ml-auto">
                          {issue.severity}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!state.currentGoal &&
                !state.currentTask &&
                !state.nextStep &&
                state.tasks.length === 0 && (
                  <p className="text-xs text-titanium/40 italic">
                    No state captured yet — brain will update as you chat
                  </p>
                )}
            </div>
          </BrainSection>

          {/* Knowledge Section */}
          <BrainSection
            title="Project Knowledge"
            icon={<Lightbulb size={14} className="text-purple-400" />}
            expanded={expandedSections.has("knowledge")}
            onToggle={() => toggleSection("knowledge")}
          >
            <div className="space-y-4">
              {knowledge.overview && (
                <div>
                  <h4 className="text-xs font-mono text-titanium/60 mb-1">OVERVIEW</h4>
                  <p className="text-sm text-white/80">{knowledge.overview}</p>
                </div>
              )}

              {knowledge.decisions.length > 0 && (
                <div>
                  <h4 className="text-xs font-mono text-titanium/60 mb-2">DECISIONS</h4>
                  <div className="space-y-2">
                    {knowledge.decisions.map((decision, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-white/[0.02] border border-white/5 rounded-lg"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-white/90">{decision.title}</span>
                          <span className="text-[10px] font-mono text-titanium/40">
                            {new Date(decision.date).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-xs text-titanium/60 mt-1">{decision.rationale}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {knowledge.architecture.length > 0 && (
                <div>
                  <h4 className="text-xs font-mono text-titanium/60 mb-2">ARCHITECTURE</h4>
                  <div className="space-y-2">
                    {knowledge.architecture.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-white/[0.02] border border-white/5 rounded-lg"
                      >
                        <span className="text-sm font-medium text-white/90">{item.title}</span>
                        <p className="text-xs text-titanium/60 mt-1">{item.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {knowledge.techChoices.length > 0 && (
                <div>
                  <h4 className="text-xs font-mono text-titanium/60 mb-2">TECH CHOICES</h4>
                  <div className="space-y-1">
                    {knowledge.techChoices.map((tc, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-sm">
                        <span className="text-neural-cyan font-medium">{tc.area}:</span>
                        <span className="text-white/80">{tc.choice}</span>
                        <span className="text-titanium/40">— {tc.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {knowledge.conventions.length > 0 && (
                <div>
                  <h4 className="text-xs font-mono text-titanium/60 mb-2">CONVENTIONS</h4>
                  <ul className="space-y-1">
                    {knowledge.conventions.map((c, idx) => (
                      <li key={idx} className="text-sm text-white/80 flex items-start gap-2">
                        <span className="text-titanium/40">•</span>
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {knowledge.rules.length > 0 && (
                <div>
                  <h4 className="text-xs font-mono text-titanium/60 mb-2">RULES</h4>
                  <ul className="space-y-1">
                    {knowledge.rules.map((r, idx) => (
                      <li key={idx} className="text-sm text-white/80 flex items-start gap-2">
                        <span className="text-titanium/40">•</span>
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {knowledge.userPreferences.length > 0 && (
                <div>
                  <h4 className="text-xs font-mono text-titanium/60 mb-2">USER PREFERENCES</h4>
                  <ul className="space-y-1">
                    {knowledge.userPreferences.map((p, idx) => (
                      <li key={idx} className="text-sm text-white/80 flex items-start gap-2">
                        <span className="text-titanium/40">•</span>
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {!knowledge.overview &&
                knowledge.decisions.length === 0 &&
                knowledge.architecture.length === 0 && (
                  <p className="text-xs text-titanium/40 italic">
                    No knowledge captured yet — brain will learn as you chat
                  </p>
                )}
            </div>
          </BrainSection>
        </div>

        {/* Suggestions Panel */}
        <div className="lg:col-span-4">
          <div className="liquid-glass rounded-2xl border border-white/5 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-mono text-titanium/60 flex items-center gap-1.5">
                <Eye size={12} className="text-purple-400" />
                PENDING SUGGESTIONS
              </h3>
              <span className="text-[10px] font-mono text-titanium/40 bg-white/5 px-2 py-0.5 rounded">
                {suggestions.length}
              </span>
            </div>

            {suggestions.length === 0 ? (
              <p className="text-xs text-titanium/40 text-center py-8">
                No pending suggestions
              </p>
            ) : (
              <div className="space-y-3">
                <AnimatePresence>
                  {suggestions.map((suggestion) => (
                    <motion.div
                      key={suggestion.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="p-3 bg-white/[0.02] border border-white/5 rounded-lg"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-400">
                          {suggestion.section}
                        </span>
                        <span className="text-[10px] font-mono text-titanium/40">
                          {suggestion.operation}
                        </span>
                      </div>

                      {suggestion.reason && (
                        <p className="text-xs text-titanium/60 mb-2">{suggestion.reason}</p>
                      )}

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(suggestion.id)}
                          className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-[10px] font-mono text-green-400 bg-green-500/10 hover:bg-green-500/20 rounded transition-colors"
                        >
                          <CheckCircle size={10} />
                          Save
                        </button>
                        <button
                          onClick={() => handleIgnore(suggestion.id)}
                          className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-[10px] font-mono text-titanium/60 bg-white/5 hover:bg-white/10 rounded transition-colors"
                        >
                          <EyeOff size={10} />
                          Ignore
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function BrainSection({
  title,
  icon,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="liquid-glass rounded-2xl border border-white/5 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-2 text-xs font-mono text-titanium/60">
          {icon}
          <span>{title}</span>
        </div>
        {expanded ? (
          <ChevronDown size={14} className="text-titanium/40" />
        ) : (
          <ChevronRight size={14} className="text-titanium/40" />
        )}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function BrainField({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-titanium/40 mt-0.5">{icon}</span>
      <div>
        <span className="text-[10px] font-mono text-titanium/60 uppercase">{label}</span>
        <p className="text-sm text-white/80">{value}</p>
      </div>
    </div>
  );
}
