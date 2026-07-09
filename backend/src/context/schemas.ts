import { z } from 'zod';

/**
 * Zod schemas for Memory Patch validation.
 * Used by the Memory Agent to validate its output before applying.
 */

export const patchChangeSchema = z.object({
  target: z.enum(['state', 'knowledge']),
  section: z.string().min(1),
  operation: z.enum(['replace', 'append', 'add', 'update', 'remove', 'complete']),
  value: z.any().optional(),
  match: z.record(z.any()).optional(),
});

export const memoryPatchSchema = z.object({
  update: z.boolean(),
  reason: z.string().min(1),
  changes: z.array(patchChangeSchema),
});

export type PatchChangeValidated = z.infer<typeof patchChangeSchema>;
export type MemoryPatchValidated = z.infer<typeof memoryPatchSchema>;

/**
 * Validate a memory patch from the Memory Agent.
 * Returns the validated patch or null if invalid.
 */
export function validateMemoryPatch(raw: unknown): MemoryPatchValidated | null {
  const result = memoryPatchSchema.safeParse(raw);
  if (result.success) {
    return result.data;
  }
  return null;
}

/**
 * Extract JSON from a string that may contain markdown fences or explanatory text.
 * Tries multiple strategies:
 * 1. Direct JSON parse
 * 2. Extract from ```json ... ``` fences
 * 3. Extract from ``` ... ``` fences
 * 4. Find first { ... } block
 */
function extractJson(text: string): unknown | null {
  // Strategy 1: Direct parse
  try {
    return JSON.parse(text);
  } catch {
    // Continue to next strategy
  }

  // Strategy 2: Extract from ```json ... ``` fences
  const jsonFenceMatch = text.match(/```json\s*\n([\s\S]*?)\n\s*```/);
  if (jsonFenceMatch) {
    try {
      return JSON.parse(jsonFenceMatch[1]);
    } catch {
      // Continue
    }
  }

  // Strategy 3: Extract from ``` ... ``` fences
  const fenceMatch = text.match(/```\s*\n([\s\S]*?)\n\s*```/);
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1]);
    } catch {
      // Continue
    }
  }

  // Strategy 4: Find first { ... } block (matching braces)
  const braceStart = text.indexOf('{');
  if (braceStart !== -1) {
    let depth = 0;
    let inString = false;
    let escape = false;

    for (let i = braceStart; i < text.length; i++) {
      const ch = text[i];

      if (escape) {
        escape = false;
        continue;
      }

      if (ch === '\\') {
        escape = true;
        continue;
      }

      if (ch === '"') {
        inString = !inString;
        continue;
      }

      if (inString) continue;

      if (ch === '{') depth++;
      if (ch === '}') {
        depth--;
        if (depth === 0) {
          const candidate = text.substring(braceStart, i + 1);
          try {
            return JSON.parse(candidate);
          } catch {
            // Continue looking
          }
        }
      }
    }
  }

  return null;
}

/**
 * Safe validation with JSON parsing.
 * Accepts JSON wrapped in markdown fences or surrounded by explanatory text.
 * Returns the validated patch or null if invalid.
 */
export function safeValidateMemoryPatch(raw: string): MemoryPatchValidated | null {
  try {
    const parsed = extractJson(raw);
    if (parsed === null) return null;
    return validateMemoryPatch(parsed);
  } catch {
    return null;
  }
}
