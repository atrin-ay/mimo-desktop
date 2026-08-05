/**
 * Fixture: Question event with structured options
 *
 * Events: step_start → question (with 2+ options) → text → step_finish
 * This exercises the question message creation path.
 */
import type { StreamEvent } from "../../../api";

export const input: StreamEvent[] = [
  { type: "step_start", timestamp: 1000 },
  {
    type: "question",
    timestamp: 1200,
    text: "Which framework should we use?",
    options: [
      { label: "React", description: "A JavaScript library for building user interfaces" },
      { label: "Vue", description: "A progressive JavaScript framework" },
    ],
    properties: {
      id: "q_abc123",
      questions: [
        {
          question: "Which framework should we use?",
          header: "Framework Choice",
          options: [
            { label: "React", description: "A JavaScript library for building user interfaces" },
            { label: "Vue", description: "A progressive JavaScript framework" },
          ],
          multiple: false,
          custom: true,
        },
      ],
    },
  },
  { type: "text", timestamp: 1400, part: { text: "Please choose above." } },
  { type: "step_finish", timestamp: 1500 },
];

export const expected = {
  agentText: "Please choose above.",
  reasoningText: "",
  perMessageEventsCount: 1, // step_start
  perMessageArtifactsCount: 0,
  orbStateTransitions: ["Executing", "Streaming", "Streaming"],
  globalActivityCount: 1,
  messageUpdateCount: 2, // text + step_finish
  questionMessage: {
    sender: "system",
    isQuestion: true,
    questionOptions: ["React", "Vue"],
    questionRequestID: "q_abc123",
    questionHeader: "Framework Choice",
    questionMultiple: false,
    questionCustom: true,
  },
};
