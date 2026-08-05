/**
 * Fixture: Basic text streaming sequence
 *
 * Events: step_start → text (3 chunks) → step_finish
 * This exercises the most common path — simple text accumulation.
 */
import type { StreamEvent } from "../../../api";

export const input: StreamEvent[] = [
  { type: "step_start", timestamp: 1000 },
  { type: "text", timestamp: 1100, part: { text: "Hello " } },
  { type: "text", timestamp: 1200, part: { text: "world" } },
  { type: "text", timestamp: 1300, part: { text: "!" } },
  { type: "step_finish", timestamp: 1400 },
];

/**
 * Expected accumulator state after processing ALL events in sequence.
 * Timestamps and IDs are structural — tests check structure, not exact values.
 */
export const expected = {
  agentText: "Hello world!",
  reasoningText: "",
  perMessageEventsCount: 1, // step_start creates 1 event
  perMessageArtifactsCount: 0,
  orbStateTransitions: ["Executing", "Streaming", "Streaming", "Streaming"],
  globalActivityCount: 1, // step_start adds 1 global activity
  messageUpdateCount: 4, // text events produce message updates
  finalMessageUpdate: {
    text: "Hello world!",
    status: "done",
  },
};
