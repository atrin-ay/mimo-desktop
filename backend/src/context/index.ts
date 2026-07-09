/**
 * Context Manager module.
 *
 * The public API surface:
 * - contextManager: the facade for chat flow integration
 */

export { contextManager } from './ContextManager';
export { memoryObserver } from './observer/MemoryObserver';
export { memoryAgent } from './agent/MemoryAgent';
export { patchApplier } from './brain/PatchApplier';
export { brainMarkdownWriter } from './brain/BrainMarkdownWriter';
export { suggestionRepository } from './suggestions/SuggestionRepository';
export { suggestionService } from './suggestions/SuggestionService';

// Types
export type {
  BrainState,
  BrainKnowledge,
  ProjectBrain,
  MemoryPatch,
  Suggestion,
} from './types';
