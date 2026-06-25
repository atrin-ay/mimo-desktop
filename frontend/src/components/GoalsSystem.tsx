import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Target, 
  CheckCircle, 
  Clock, 
  Activity, 
  ShieldCheck, 
  Cpu, 
  Sparkles, 
  MessageSquare, 
  Play, 
  AlertTriangle,
  ChevronDown
} from "lucide-react";
import { Goal } from "../types";

export default function GoalsSystem() {
  const [goals, setGoals] = useState<Goal[]>([
    {
      id: "1",
      title: "Consolidated Micro-Frontend Architecture",
      description: "Design and bundle an automated low-latency micro-frontend environment supporting real-time WebSockets, Web Worker compilers and sandbox execution directories.",
      status: "active",
      progress: 0.65,
      confidence: 0.98,
      judgeValidation: "[JUDGE_PASS] All 14 security sandboxing rules and context leakage tests verified. Code compiled safely."
    },
    {
      id: "2",
      title: "Solana Deflationary Tokenomics Vesting Wrapper",
      description: "Draft highly protective Anchor programs containing mathematical cliff-aligned vesting schedules. Run extensive gas optimization reviews.",
      status: "active",
      progress: 0.28,
      confidence: 0.94,
      judgeValidation: "[JUDGE_PENDING] Critical testing coverage is at 45%. Awaiting mathematical overflow verification from Cipher-9."
    },
    {
      id: "3",
      title: "Automated API Gateway proxy & TLS Handshaker",
      description: "Secure gateway proxy bindings inside isolated Linux enclaves. Enabled multi-threaded SSL handshaking under 0.8ms.",
      status: "completed",
      progress: 1.0,
      confidence: 0.99,
      judgeValidation: "[JUDGE_PASS] Complete suite verified. Deployment successful to production load balancing clusters."
    }
  ]);

  const [activeSubSteps, setActiveSubSteps] = useState<{ goalId: string; label: string; done: boolean }[]>([
    { goalId: "1", label: "Analyze context layout structures", done: true },
    { goalId: "1", label: "Implement Web Worker async compiler loop", done: true },
    { goalId: "1", label: "Formulate layout constraints & fluid UI", done: false },
    { goalId: "1", label: "Review sandbox parameters with Judge", done: false },
    
    { goalId: "2", label: "Configure Anchor program workspace", done: true },
    { goalId: "2", label: "Formulate cliff vesting structures", done: false },
    { goalId: "2", label: "Audit overflow risks with Cipher-9 Core", done: false }
  ]);

  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(goals[0] || null);

  const simulateGoalExecution = (goalId: string) => {
    // Step-by-step progress simulation to showcase dynamic 2030 interaction
    setGoals(prev => prev.map(g => {
      if (g.id === goalId && g.progress < 1) {
        const nextProgress = Math.min(g.progress + 0.1, 1);
        const status = nextProgress >= 1 ? "completed" : "active";
        const judgeVal = nextProgress >= 1 
          ? "[JUDGE_PASS] Interactive execution loops completed successfully. Safe deployment simulated."
          : g.judgeValidation;

        return {
          ...g,
          progress: parseFloat(nextProgress.toFixed(2)),
          status,
          judgeValidation: judgeVal
        };
      }
      return g;
    }));

    // Update first non-done step of this goal to done
    const firstUndoneIndex = activeSubSteps.findIndex(step => step.goalId === goalId && !step.done);
    if (firstUndoneIndex !== -1) {
      setActiveSubSteps(prev => prev.map((step, idx) => idx === firstUndoneIndex ? { ...step, done: true } : step));
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6 md:px-8 select-none">
      
      {/* Upper navigation header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-4 border-b border-white/5">
        <div>
          <h2 className="text-xl font-display font-medium text-white flex items-center gap-2">
            <Target className="text-neural-cyan" size={20} />
            Goal Synthesis & Execution
          </h2>
          <p className="text-xs text-titanium/50 font-mono mt-0.5">
            AUTONOMOUS MILESTONES • INDEPENDENT EVALUATOR MATRIX • MULTI-STAGE TRACKING
          </p>
        </div>

        <div className="text-[11px] font-mono bg-white/3 px-3 py-1.5 border border-white/5 rounded-xl text-titanium/70">
          GLOBAL CONFIDENCE AVERAGE: <span className="text-neural-cyan font-bold">97.4%</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Left Column: Active Goals list */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="text-[10px] font-mono tracking-widest text-titanium/40 uppercase">
            Active Milestone Pipelines
          </div>

          {goals.map((goal) => (
            <div
              key={goal.id}
              onClick={() => setSelectedGoal(goal)}
              className={`p-5 rounded-2xl border transition-all duration-300 cursor-pointer flex flex-col gap-3 ${
                selectedGoal?.id === goal.id 
                  ? "bg-gradient-to-br from-neural-cyan/10 to-transparent border-neural-cyan/35 shadow-[0_0_20px_rgba(93,247,255,0.04)]"
                  : "liquid-glass border-white/5 hover:border-white/10"
              }`}
            >
              <div className="flex justify-between items-start">
                <h3 className="text-sm font-semibold text-white/95 line-clamp-1">{goal.title}</h3>
                
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded flex items-center gap-1"
                  style={{
                    backgroundColor: 
                      goal.status === "completed" ? "rgba(34, 197, 94, 0.1)" : "rgba(93, 247, 255, 0.1)",
                    color: 
                      goal.status === "completed" ? "#22C55E" : "#5DF7FF"
                  }}
                >
                  {goal.status}
                </span>
              </div>

              <p className="text-xs text-titanium/55 leading-relaxed line-clamp-2">
                {goal.description}
              </p>

              {/* Progress and indicators */}
              <div className="space-y-1.5 mt-2">
                <div className="flex justify-between text-[10px] font-mono">
                  <span className="text-titanium/40 uppercase">Synthesis Completion Rate</span>
                  <span className="text-white font-medium">{(goal.progress * 100).toFixed(0)}%</span>
                </div>
                <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                  <div 
                    className="bg-neural-cyan h-full rounded-full transition-all duration-300" 
                    style={{ 
                      width: `${goal.progress * 100}%`,
                      backgroundColor: goal.status === "completed" ? "#22C55E" : "#5DF7FF"
                    }} 
                  />
                </div>
              </div>

              {/* Metrics line */}
              <div className="flex items-center justify-between pt-3 border-t border-white/5 text-[10px] font-mono text-titanium/40">
                <span className="flex items-center gap-1">
                  <Cpu size={10} /> CONFIDENCE: {(goal.confidence * 100).toFixed(0)}%
                </span>
                <span>ID: GOAL_0{goal.id}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Right Column: Goal detailed sub-step tracking & automated validation */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-6">
          
          <AnimatePresence mode="wait">
            {selectedGoal && (
              <motion.div
                key={selectedGoal.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-5 liquid-glass rounded-2xl border border-white/5 flex-1 flex flex-col justify-between h-full"
              >
                <div className="space-y-4">
                  <div className="pb-3 border-b border-white/5 flex justify-between items-center">
                    <span className="text-xs font-semibold text-white">SUB-STEP EXECUTION TREE</span>
                    <button
                      onClick={() => simulateGoalExecution(selectedGoal.id)}
                      className="px-3 py-1 bg-neural-cyan hover:bg-white text-black font-semibold text-[10px] rounded-lg flex items-center gap-1 transition-colors"
                    >
                      <Play size={8} />
                      Synthesize Step
                    </button>
                  </div>

                  {/* Description segment */}
                  <div>
                    <h4 className="text-xs font-semibold text-white/95">{selectedGoal.title}</h4>
                    <p className="text-[11px] text-titanium/55 mt-1 leading-relaxed">
                      {selectedGoal.description}
                    </p>
                  </div>

                  {/* Checklist pipeline of sub-steps */}
                  <div className="space-y-2.5">
                    <h5 className="text-[9px] font-mono tracking-widest text-neural-cyan uppercase">PROGRESSION PIPELINE:</h5>
                    <div className="space-y-2">
                      {activeSubSteps
                        .filter(step => step.goalId === selectedGoal.id)
                        .map((step, idx) => (
                          <div 
                            key={idx} 
                            className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                              step.done 
                                ? "bg-emerald-500/5 border-emerald-500/10 text-emerald-400" 
                                : "bg-white/[0.01] border-white/5 text-titanium/60"
                            }`}
                          >
                            <span className="truncate max-w-[200px]">{step.label}</span>
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded uppercase">
                              {step.done ? "PASS" : "WAITING"}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Judge Auto-Validation Section */}
                  <div className="pt-3 border-t border-white/5 space-y-1.5">
                    <h5 className="text-[9px] font-mono tracking-widest text-purple-400 uppercase flex items-center gap-1">
                      <ShieldCheck size={11} />
                      Automated Cognitive Evaluator (Judge)
                    </h5>
                    
                    <div className={`p-3 rounded-xl border font-mono text-[10px] leading-relaxed ${
                      selectedGoal.status === "completed" 
                        ? "bg-emerald-500/5 border-emerald-500/10 text-emerald-400"
                        : "bg-amber-500/5 border-amber-500/10 text-amber-400"
                    }`}>
                      {selectedGoal.judgeValidation}
                    </div>
                  </div>

                </div>

                <div className="text-[9px] font-mono text-titanium/30 text-center pt-4 border-t border-white/5 mt-6">
                  EVALUATIONS AUTOMATED BY MIMO AUTONOMOUS VALIDATION SUITES
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>

      </div>
    </div>
  );
}
