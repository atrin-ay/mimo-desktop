/**
 * Signal detection for memory updates.
 *
 * Pure-heuristic regex/keyword matching — no LLM calls.
 * Returns signals that indicate whether an exchange contains
 * memory-worthy content (decisions, goals, tech choices, etc.).
 */

export interface ExchangeSignals {
  hasDecision: boolean;
  hasGoal: boolean;
  hasNextStep: boolean;
  hasTechChoice: boolean;
  hasTaskUpdate: boolean;
  hasFileReference: boolean;
  hasConvention: boolean;
  hasError: boolean;
  confidence: number;
}

const DECISION_PATTERNS = [
  /let'?s\s+(use|go\s+with|choose|pick|adopt|implement|switch\s+to)/i,
  /decided?\s+(to|on|that)/i,
  /we'?ll?\s+(use|go\s+with|need|must|should)/i,
  /prefer(ence)?\s+(is|was|for)\s+/i,
  /i'?ll?\s+(use|go\s+with|implement|create|build)/i,
  /choosing?\s+/i,
  /decision:\s*/i,
];

const GOAL_PATTERNS = [
  /(?:current|main|primary)\s+goal/i,
  /we'?re?\s+(trying|working|building|aiming)\s+to/i,
  /the\s+(goal|objective|aim)\s+(is|was)/i,
  /need\s+to\s+(implement|build|create|fix|add)/i,
  /next\s+(up|step|thing)\s+(is|we|to)/i,
];

const NEXT_STEP_PATTERNS = [
  /next\s+(step|thing|up|we|I|to)/i,
  /then\s+(we|I|need|will|should)/i,
  /after\s+this/i,
  /first\s+(let|we|I|step)/i,
];

const TECH_CHOICE_PATTERNS = [
  /(?:use|using|using)\s+(?:the\s+)?(?:new\s+)?(?:tech|library|framework|package|tool)/i,
  /(?:switch|migrat|mov)(?:e|ing)\s+to\s+/i,
  /(?:install|add|import)\s+/i,
  /\b(npm|yarn|pnpm|bun)\s+install\b/i,
  /\b(?:use|using)\s+(?:a\s+)?(?:pattern|architecture|approach|design)\b/i,
];

const TASK_UPDATE_PATTERNS = [
  /(?:done|completed|finished|working\s+on)\s+/i,
  /(?:task|step)\s+\d+/i,
  /(?:todo|to-do|to\s+do)\s*:/i,
  /(?:bug|fix|issue)\s*:/i,
];

const FILE_REFERENCE_PATTERNS = [
  /\b\w+\.(ts|tsx|js|jsx|py|rs|go|java|css|html|json|yaml|yml|md)\b/,
  /(?:file|folder|directory)\s+['"`]/i,
  /(?:src|lib|app|backend|frontend)\//i,
];

const CONVENTION_PATTERNS = [
  /(?:always|never|don'?t|do\s+not)\s+(?:use|create|add|remove|change)/i,
  /(?:convention|rule|preference)\s*:/i,
  /(?:we\s+always|we\s+never|i\s+prefer|i\s+like)/i,
];

const ERROR_PATTERNS = [
  /(?:error|bug|broken|crash|fail|exception)\s+/i,
  /(?:doesn'?t|don'?t|won'?t|can'?t)\s+work/i,
  /(?:fix|fixed|fixing)\s+/i,
];

/**
 * Analyze an exchange (user + assistant messages) for memory-relevant signals.
 */
export function analyzeExchange(
  userContent: string,
  assistantContent: string,
): ExchangeSignals {
  const combined = `${userContent} ${assistantContent}`;

  const hasDecision = DECISION_PATTERNS.some((p) => p.test(combined));
  const hasGoal = GOAL_PATTERNS.some((p) => p.test(combined));
  const hasNextStep = NEXT_STEP_PATTERNS.some((p) => p.test(combined));
  const hasTechChoice = TECH_CHOICE_PATTERNS.some((p) => p.test(combined));
  const hasTaskUpdate = TASK_UPDATE_PATTERNS.some((p) => p.test(combined));
  const hasFileReference = FILE_REFERENCE_PATTERNS.some((p) => p.test(combined));
  const hasConvention = CONVENTION_PATTERNS.some((p) => p.test(combined));
  const hasError = ERROR_PATTERNS.some((p) => p.test(combined));

  // Calculate confidence (0-1) based on number of signals
  const signalCount = [
    hasDecision,
    hasGoal,
    hasNextStep,
    hasTechChoice,
    hasTaskUpdate,
    hasFileReference,
    hasConvention,
    hasError,
  ].filter(Boolean).length;

  const confidence = Math.min(signalCount / 3, 1); // Max confidence at 3+ signals

  return {
    hasDecision,
    hasGoal,
    hasNextStep,
    hasTechChoice,
    hasTaskUpdate,
    hasFileReference,
    hasConvention,
    hasError,
    confidence,
  };
}

/**
 * Determine if an exchange should trigger a memory update.
 * Returns true if confidence exceeds threshold.
 */
export function shouldUpdateMemory(signals: ExchangeSignals, threshold = 0.3): boolean {
  return signals.confidence >= threshold;
}
