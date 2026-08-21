/**
 * Fixture: Reasoning stream
 *
 * Events: step_start → reasoning → reasoning → text → step_finish
 * This exercises the reasoning text accumulation path.
 */
import type { StreamEvent } from "../../../api";

export const input: StreamEvent[] = [
  { type: "step_start", timestamp: 1000 },
  { type: "reasoning", timestamp: 1100, part: { text: "Let me think about this..." } },
  { type: "reasoning", timestamp: 1200, part: { text: " I should use React." } },
  { type: "text", timestamp: 1300, part: { text: "I recommend React." } },
  { type: "step_finish", timestamp: 1400 },
];

export const expected = {
  agentText: "I recommend React.",
  reasoningText: "Let me think about this... I should use React.",
  perMessageEventsCount: 3, // step_start + 2 reasoning
  perMessageArtifactsCount: 0,
  orbStateTransitions: ["Executing", "Thinking", "Thinking", "Streaming"],
  globalActivityCount: 1,
  messageUpdateCount: 4, // 2 reasoning + 1 text + 1 step_finish
  finalMessageUpdate: {
    text: "I recommend React.",
    reasoning: "Let me think about this... I should use React.",
    status: "done",
  },
};
