/**
 * Fixture: Error handling during streaming
 *
 * Events: step_start → tool_use(bash, running) → error
 * This exercises the error path: running events get marked as error,
 * orbState transitions to Error.
 */
import type { StreamEvent } from "../../../api";

export const input: StreamEvent[] = [
  { type: "step_start", timestamp: 1000 },
  {
    type: "tool_use",
    timestamp: 1100,
    part: {
      tool: "bash",
      state: { status: "running", input: { command: "npm run build" } },
    },
  },
  { type: "error", timestamp: 1200, message: "Provider stream failed" },
];

export const expected = {
  agentText: "",
  reasoningText: "",
  perMessageEventsCount: 2, // step_start + tool_use
  perMessageArtifactsCount: 0,
  orbStateTransitions: ["Executing", "Executing", "Error"],
  globalActivityCount: 2, // step_start + tool_use
  messageUpdateCount: 1, // tool_use
  finalError: {
    perMessageEventsHaveError: true, // running events marked as error
    orbState: "Error",
  },
};
