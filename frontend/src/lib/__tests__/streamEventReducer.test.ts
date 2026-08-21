import { describe, it, expect, beforeEach } from "vitest";
import {
  reduceStreamEvent,
  resetActivityIdCounter,
  type StreamAccumulator,
} from "../streamEventReducer";
import { OrbState } from "../../types";
import * as fixtures from "./fixtures";

// ─── Helpers ────────────────────────────────────────────────────────────────

function emptyAccumulator(): StreamAccumulator {
  return {
    agentText: "",
    reasoningText: "",
    perMessageEvents: [],
    perMessageArtifacts: [],
    currentActivityId: "",
  };
}

/**
 * Process a sequence of events through the reducer, accumulating state.
 * Returns the final accumulator and collects all orbState transitions
 * and message update counts for assertion.
 */
function processSequence(events: import("../../api").StreamEvent[]) {
  let acc = emptyAccumulator();
  const orbStates: string[] = [];
  let messageUpdateCount = 0;
  let globalActivityCount = 0;
  let questionMessage: any = null;

  for (const event of events) {
    const result = reduceStreamEvent(event, acc);
    acc = result.accumulator;

    if (result.orbStateToSet) {
      orbStates.push(result.orbStateToSet);
    }
    if (result.messageUpdate) {
      messageUpdateCount++;
    }
    if (result.globalActivityToAdd) {
      globalActivityCount++;
    }
    if (result.questionMessage) {
      questionMessage = result.questionMessage;
    }
  }

  return { acc, orbStates, messageUpdateCount, globalActivityCount, questionMessage };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("reduceStreamEvent", () => {
  beforeEach(() => {
    resetActivityIdCounter();
  });

  describe("basicTextStream", () => {
    it("accumulates text chunks and transitions orbState correctly", () => {
      const { acc, orbStates, messageUpdateCount } = processSequence(fixtures.basicTextStream.input);

      expect(acc.agentText).toBe("Hello world!");
      expect(acc.reasoningText).toBe("");
      expect(acc.perMessageEvents).toHaveLength(1); // step_start
      expect(acc.perMessageArtifacts).toHaveLength(0);
      expect(orbStates).toEqual(fixtures.basicTextStream.expected.orbStateTransitions);
      expect(messageUpdateCount).toBe(fixtures.basicTextStream.expected.messageUpdateCount);
    });

    it("marks running events as completed when text arrives", () => {
      let acc = emptyAccumulator();

      // step_start creates a running event
      const r1 = reduceStreamEvent(fixtures.basicTextStream.input[0], acc);
      acc = r1.accumulator;
      expect(acc.perMessageEvents[0].status).toBe("running");

      // text marks it completed
      const r2 = reduceStreamEvent(fixtures.basicTextStream.input[1], acc);
      acc = r2.accumulator;
      expect(acc.perMessageEvents[0].status).toBe("completed");
    });
  });

  describe("toolUseWithArtifact", () => {
    it("creates events for each tool_use and detects artifact from write tool", () => {
      const { acc, orbStates, globalActivityCount, messageUpdateCount } = processSequence(fixtures.toolUseWithArtifact.input);

      expect(acc.agentText).toBe("Done!");
      expect(acc.perMessageEvents).toHaveLength(4); // step_start + 3 tool_use
      expect(acc.perMessageArtifacts).toHaveLength(1); // write with .tsx
      expect(globalActivityCount).toBe(fixtures.toolUseWithArtifact.expected.globalActivityCount);
      expect(messageUpdateCount).toBe(fixtures.toolUseWithArtifact.expected.messageUpdateCount);
    });

    it("creates correct artifact for .tsx file", () => {
      const { acc } = processSequence(fixtures.toolUseWithArtifact.input);
      const artifact = acc.perMessageArtifacts[0];

      expect(artifact.type).toBe("code");
      expect(artifact.name).toBe("App.tsx");
      expect(artifact.path).toBe("src/components/App.tsx");
      expect(artifact.language).toBe("tsx");
    });

    it("tool_use with running status does not create artifact", () => {
      const acc = emptyAccumulator();
      const result = reduceStreamEvent(fixtures.toolUseWithArtifact.input[1], acc); // bash running

      expect(result.accumulator.perMessageArtifacts).toHaveLength(0);
      expect(result.accumulator.perMessageEvents).toHaveLength(1);
    });

    it("tool_use with unknown tool uses default icon", () => {
      const acc = emptyAccumulator();
      const result = reduceStreamEvent(
        {
          type: "tool_use",
          timestamp: 1000,
          part: {
            tool: "unknown_tool",
            state: { status: "running" },
          },
        },
        acc
      );

      const ev = result.accumulator.perMessageEvents[0];
      expect(ev.toolName).toBe("unknown_tool");
      expect(ev.icon).toBe("⚙️"); // default fallback
    });
  });

  describe("questionEvent", () => {
    it("creates a question message with formatted options", () => {
      const { questionMessage } = processSequence(fixtures.questionEvent.input);

      expect(questionMessage).not.toBeNull();
      expect(questionMessage.sender).toBe("system");
      expect(questionMessage.isQuestion).toBe(true);
      expect(questionMessage.questionOptions).toEqual(["React", "Vue"]);
      expect(questionMessage.questionRequestID).toBe("q_abc123");
      expect(questionMessage.questionHeader).toBe("Framework Choice");
      expect(questionMessage.questionMultiple).toBe(false);
      expect(questionMessage.questionCustom).toBe(true);
    });

    it("does not create question message for fewer than 2 options", () => {
      const acc = emptyAccumulator();
      const result = reduceStreamEvent(
        {
          type: "question",
          timestamp: 1000,
          properties: {
            id: "q_123",
            questions: [
              {
                question: "Pick one",
                header: "Choice",
                options: [{ label: "Only option", description: "..." }],
              },
            ],
          },
        },
        acc
      );

      expect(result.questionMessage).toBeUndefined();
    });

    it("does not create question message when no question text", () => {
      const acc = emptyAccumulator();
      const result = reduceStreamEvent(
        {
          type: "question",
          timestamp: 1000,
          properties: {
            id: "q_456",
            questions: [
              {
                question: "",
                header: "Empty",
                options: [
                  { label: "A", description: "..." },
                  { label: "B", description: "..." },
                ],
              },
            ],
          },
        },
        acc
      );

      expect(result.questionMessage).toBeUndefined();
    });
  });

  describe("reasoningStream", () => {
    it("accumulates reasoning text separately from agent text", () => {
      const { acc, orbStates } = processSequence(fixtures.reasoningStream.input);

      expect(acc.agentText).toBe("I recommend React.");
      expect(acc.reasoningText).toBe("Let me think about this... I should use React.");
      expect(orbStates).toEqual(fixtures.reasoningStream.expected.orbStateTransitions);
    });

    it("reasoning events are added to perMessageEvents", () => {
      const { acc } = processSequence(fixtures.reasoningStream.input);

      const reasoningEvents = acc.perMessageEvents.filter((e) => e.type === "reasoning");
      expect(reasoningEvents).toHaveLength(2);
      expect(reasoningEvents[0].icon).toBe("🧠");
      expect(reasoningEvents[0].iconColor).toBe("#c084fc");
    });
  });

  describe("errorHandling", () => {
    it("marks running events as error and sets orbState to Error", () => {
      const { acc, orbStates, globalActivityCount } = processSequence(fixtures.errorHandling.input);

      expect(acc.agentText).toBe("");
      expect(orbStates[orbStates.length - 1]).toBe("Error");

      // The running tool_use event should be marked as error
      const errorEvents = acc.perMessageEvents.filter((e) => e.status === "error");
      expect(errorEvents.length).toBeGreaterThan(0);
    });
  });

  describe("multiEventSequence", () => {
    it("handles all legacy/frontend-friendly event types", () => {
      const { acc, orbStates, globalActivityCount, messageUpdateCount } = processSequence(fixtures.multiEventSequence.input);

      expect(acc.agentText).toBe("All done.");
      expect(acc.perMessageEvents).toHaveLength(fixtures.multiEventSequence.expected.perMessageEventsCount);
      expect(globalActivityCount).toBe(fixtures.multiEventSequence.expected.globalActivityCount);
      expect(messageUpdateCount).toBe(fixtures.multiEventSequence.expected.messageUpdateCount);
    });

    it("status event sets orbState based on agent type", () => {
      const acc = emptyAccumulator();

      const buildResult = reduceStreamEvent({ type: "status", timestamp: 1000, agent: "build" }, acc);
      expect(buildResult.orbStateToSet).toBe(OrbState.Executing);

      const planResult = reduceStreamEvent({ type: "status", timestamp: 1000, agent: "plan" }, acc);
      expect(planResult.orbStateToSet).toBe(OrbState.Thinking);

      const composeResult = reduceStreamEvent({ type: "status", timestamp: 1000, agent: "compose" }, acc);
      expect(composeResult.orbStateToSet).toBe(OrbState.Thinking);

      const unknownResult = reduceStreamEvent({ type: "status", timestamp: 1000, agent: "unknown" }, acc);
      expect(unknownResult.orbStateToSet).toBe(OrbState.Streaming);
    });

    it("file_change with completed status creates artifact", () => {
      const acc = emptyAccumulator();
      const result = reduceStreamEvent(
        {
          type: "file_change",
          timestamp: 1000,
          tool: "edit",
          detail: "src/App.tsx",
          status: "completed",
        },
        acc
      );

      expect(result.accumulator.perMessageArtifacts).toHaveLength(1);
      expect(result.accumulator.perMessageArtifacts[0].type).toBe("code");
      expect(result.accumulator.perMessageArtifacts[0].name).toBe("src/App.tsx");
    });

    it("state event creates step activity with correct icon", () => {
      const acc = emptyAccumulator();
      const result = reduceStreamEvent(
        {
          type: "state",
          timestamp: 1000,
          state: { status: "executing" } as any,
          label: "Building...",
        },
        acc
      );

      expect(result.globalActivityToAdd).toBeDefined();
      expect(result.globalActivityToAdd!.label).toBe("Building...");
      expect(result.globalActivityToAdd!.icon).toBe("⚙️");
    });
  });

  describe("raw event", () => {
    it("appends raw text to agentText", () => {
      const acc = emptyAccumulator();
      const result = reduceStreamEvent(
        { type: "raw", timestamp: 1000, text: "some output" },
        acc
      );

      expect(result.accumulator.agentText).toBe("some output");
      expect(result.messageUpdate).toEqual({ text: "some output" });
    });

    it("ignores raw event without text", () => {
      const acc = emptyAccumulator();
      const result = reduceStreamEvent(
        { type: "raw", timestamp: 1000 },
        acc
      );

      expect(result.accumulator.agentText).toBe("");
      expect(result.messageUpdate).toBeUndefined();
    });
  });

  describe("step_finish", () => {
    it("marks all running events as completed", () => {
      let acc = emptyAccumulator();

      // Add a running event
      const r1 = reduceStreamEvent(
        { type: "tool_use", timestamp: 1000, part: { tool: "bash", state: { status: "running" } } },
        acc
      );
      acc = r1.accumulator;
      expect(acc.perMessageEvents[0].status).toBe("running");

      // step_finish should mark it completed
      const r2 = reduceStreamEvent({ type: "step_finish", timestamp: 1100 }, acc);
      acc = r2.accumulator;
      expect(acc.perMessageEvents[0].status).toBe("completed");
      expect(r2.globalActivitiesToComplete).toBe(true);
    });
  });

  describe("stderr", () => {
    it("does not modify accumulator", () => {
      const acc = emptyAccumulator();
      const result = reduceStreamEvent(
        { type: "stderr", timestamp: 1000, text: "warning" },
        acc
      );

      expect(result.accumulator).toEqual(acc);
      expect(result.orbStateToSet).toBeUndefined();
      expect(result.messageUpdate).toBeUndefined();
    });
  });

  describe("unknown event type", () => {
    it("returns unchanged accumulator for unrecognized events", () => {
      const acc = emptyAccumulator();
      const result = reduceStreamEvent(
        { type: "unknown_type", timestamp: 1000 } as any,
        acc
      );

      expect(result.accumulator).toEqual(acc);
      expect(result.orbStateToSet).toBeUndefined();
      expect(result.messageUpdate).toBeUndefined();
    });
  });

  describe("artifact type detection", () => {
    it("detects image artifacts from file extension", () => {
      const acc = emptyAccumulator();
      const result = reduceStreamEvent(
        {
          type: "file_change",
          timestamp: 1000,
          detail: "logo.png",
          status: "completed",
        },
        acc
      );

      expect(result.accumulator.perMessageArtifacts[0].type).toBe("image");
    });

    it("detects code artifacts from file extension", () => {
      const acc = emptyAccumulator();
      const result = reduceStreamEvent(
        {
          type: "file_change",
          timestamp: 1000,
          detail: "utils.ts",
          status: "completed",
        },
        acc
      );

      expect(result.accumulator.perMessageArtifacts[0].type).toBe("code");
    });

    it("detects file artifacts for unknown extensions", () => {
      const acc = emptyAccumulator();
      const result = reduceStreamEvent(
        {
          type: "file_change",
          timestamp: 1000,
          detail: "data.csv",
          status: "completed",
        },
        acc
      );

      expect(result.accumulator.perMessageArtifacts[0].type).toBe("file");
    });
  });
});
