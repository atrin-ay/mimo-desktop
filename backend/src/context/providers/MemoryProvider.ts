/**
 * Memory Provider abstraction.
 *
 * Mirrors the AIProvider pattern but is specialized for memory operations.
 * The Memory Agent uses this to generate memory patches from context.
 */
export interface MemoryProvider {
  /** Human-readable provider name. */
  readonly name: string;

  /**
   * Generate a memory patch from the provided prompt.
   *
   * @param prompt - The assembled context (brain state + recent messages + task context)
   * @param projectId - The project ID; implementations that use provider-side sessions
   *   MUST NOT share sessions across different projectId values.
   * @returns The raw response string (should be a JSON MemoryPatch)
   */
  complete(prompt: string, projectId: string): Promise<string>;

  /** Check whether the provider is reachable / ready. */
  isAvailable(): Promise<boolean>;
}

export default MemoryProvider;
