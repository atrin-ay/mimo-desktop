import { analyzeExchange, shouldUpdateMemory, type ExchangeSignals } from './signals';

export interface ObserverResult {
  shouldUpdate: boolean;
  signals: ExchangeSignals;
}

/**
 * Cheap, pure-heuristic gate for memory updates.
 *
 * Analyzes exchanges for memory-relevant signals without any LLM calls.
 * Returns whether the exchange should trigger a memory agent run.
 */
export const memoryObserver = {
  /**
   * Evaluate an exchange for memory update relevance.
   *
   * @param userContent - The user's message
   * @param assistantContent - The assistant's response
   * @param threshold - Minimum confidence to trigger update (default: 0.3)
   * @returns Observer result with shouldUpdate flag and signals
   */
  evaluate(
    userContent: string,
    assistantContent: string,
    threshold = 0.3,
  ): ObserverResult {
    const signals = analyzeExchange(userContent, assistantContent);
    const shouldUpdate = shouldUpdateMemory(signals, threshold);

    return { shouldUpdate, signals };
  },
};

export default memoryObserver;
