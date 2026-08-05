/**
 * Fixture: Tool use with artifact creation
 *
 * Events: step_start → tool_use(bash, running) → tool_use(bash, completed)
 *   → tool_use(write, completed, .ts file) → text → step_finish
 * This exercises tool icon lookup, status transitions, and artifact detection.
 */
import type { StreamEvent } from "../../../api";

export const input: StreamEvent[] = [
  { type: "step_start", timestamp: 1000 },
  {
    type: "tool_use",
    timestamp: 1100,
    part: {
      tool: "bash",
      state: { status: "running", input: { command: "npm test" } },
    },
  },
  {
    type: "tool_use",
    timestamp: 1200,
    part: {
      tool: "bash",
      state: { status: "completed", input: { command: "npm test" } },
    },
  },
  {
    type: "tool_use",
    timestamp: 1300,
    part: {
      tool: "write",
      state: {
        status: "completed",
        input: { filePath: "src/components/App.tsx" },
      },
    },
  },
  { type: "text", timestamp: 1400, part: { text: "Done!" } },
  { type: "step_finish", timestamp: 1500 },
];

export const expected = {
  agentText: "Done!",
  reasoningText: "",
  perMessageEventsCount: 4, // step_start + 3 tool_use
  perMessageArtifactsCount: 1, // write tool with .tsx file
  orbStateTransitions: ["Executing", "Executing", "Executing", "Executing", "Streaming"],
  globalActivityCount: 4, // step_start + 3 tool_use
  messageUpdateCount: 5, // 3 tool_use + 1 text + 1 step_finish
  finalMessageUpdate: {
    text: "Done!",
    status: "done",
  },
  artifact: {
    type: "code",
    name: "App.tsx",
    path: "src/components/App.tsx",
    language: "tsx",
  },
};
