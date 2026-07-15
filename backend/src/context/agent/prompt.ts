import type { ProjectBrain, BrainState, BrainKnowledge } from '../types';

/**
 * Build the prompt for the Memory Agent.
 *
 * The agent receives:
 * - Current brain state + knowledge
 * - Recent conversation window
 * - Task context
 *
 * It should output a valid MemoryPatch JSON.
 */
export function buildMemoryAgentPrompt(
  brain: ProjectBrain,
  recentMessages: Array<{ role: string; content: string }>,
): string {
  const { state, knowledge } = brain;

  const sections: string[] = [];

  // System instruction
  sections.push(`You are a Memory Agent for a software project. Your job is to analyze recent conversation exchanges and update the project's "brain" — a structured representation of the project's current state and knowledge.

You will receive:
1. The current brain state and knowledge
2. Recent conversation messages

Your task:
- Analyze the conversation for NEW information that should be captured
- Generate a JSON MemoryPatch with incremental changes
- Only capture genuinely new information, don't repeat what's already in the brain
- For state changes (current goal, tasks, etc.): apply immediately
- For knowledge changes (decisions, architecture): create entries that need approval

OUTPUT FORMAT:
Return ONLY a valid JSON object matching this schema:
{
  "update": true/false,
  "reason": "brief explanation of what changed",
  "changes": [
    {
      "target": "state" or "knowledge",
      "section": "field name",
      "operation": "replace|append|add|update|remove|complete",
      "value": <new value>,
      "match": { <for complete/remove: fields to match> }
    }
  ]
}

If nothing new is found, return: {"update": false, "reason": "no new information", "changes": []}`);

  // Current brain state
  sections.push(`\n--- CURRENT BRAIN STATE ---`);
  sections.push(JSON.stringify(state, null, 2));

  // Current brain knowledge
  sections.push(`\n--- CURRENT BRAIN KNOWLEDGE ---`);
  sections.push(JSON.stringify(knowledge, null, 2));

  // Recent conversation
  sections.push(`\n--- RECENT CONVERSATION ---`);
  for (const msg of recentMessages) {
    sections.push(`[${msg.role}]: ${msg.content}`);
  }

  // State sections reference
  sections.push(`\n--- STATE SECTIONS REFERENCE ---`);
  sections.push(`currentGoal: string — the main goal we're working toward`);
  sections.push(`currentTask: string — what's being worked on right now`);
  sections.push(`currentFile: string — primary file being edited`);
  sections.push(`nextStep: string — what comes next after current task`);
  sections.push(`activeFeature: string — feature being implemented`);
  sections.push(`sessionProgress: string — summary of progress this session`);
  sections.push(`tasks: array of {id, title, status: "todo"|"doing"|"done"}`);
  sections.push(`knownIssues: array of {id, title, severity, status}`);

  // Knowledge sections reference
  sections.push(`\n--- KNOWLEDGE SECTIONS REFERENCE ---`);
  sections.push(`overview: string — what the project is`);
  sections.push(`architecture: array of {title, detail}`);
  sections.push(`decisions: array of {title, rationale, date}`);
  sections.push(`techChoices: array of {area, choice, reason}`);
  sections.push(`conventions: array of strings — coding conventions`);
  sections.push(`rules: array of strings — project rules`);
  sections.push(`userPreferences: array of strings — user preferences`);

  return sections.join('\n');
}

export default buildMemoryAgentPrompt;
