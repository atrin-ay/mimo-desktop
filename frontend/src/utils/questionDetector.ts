/**
 * Detect questions in agent response text.
 * Looks for numbered lines ending with ? or ؟
 * Also detects patterns like (Y = ?) or [Y/N] for yes/no options.
 */
export function detectQuestion(text: string): { isQuestion: boolean; questionText: string; options: string[] } | null {
  if (!text || text.length < 5) return null;

  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return null;

  // Find lines that end with ? or ؟ (the actual questions)
  const questionLines: string[] = [];
  let questionStartIdx = -1;

  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    if (line.endsWith("?") || line.endsWith("؟")) {
      questionLines.unshift(line);
      questionStartIdx = i;
    } else if (questionLines.length > 0) {
      // If we were collecting questions and hit a non-question line, stop
      // But allow instruction lines like "لطفاً مشخص کنید" right before questions
      if (line.length < 30 && !line.includes("**") && !line.includes("```")) {
        questionStartIdx = i;
        questionLines.unshift(line);
      } else {
        break;
      }
    }
  }

  if (questionLines.length === 0) return null;

  // Build the question display
  const questionText = questionLines.join("\n");

  // Extract options from each question line
  const allOptions: string[] = [];
  for (const qLine of questionLines) {
    // Detect patterns like (Y = ?) or [Y/N] or (Y/N)
    const ynMatch = qLine.match(/\(?\s*[Yy]\s*[=\/]\s*[Nn]?\s*\)?/) || qLine.match(/\[?\s*[Yy]\s*\/\s*[Nn]\s*\]?/);
    if (ynMatch) {
      allOptions.push("Yes");
      allOptions.push("No");
    }

    // Detect patterns like (Y = ه) for Persian yes/no
    const ynFaMatch = qLine.match(/\(?\s*Y\s*=\s*[^)]+\)?/);
    if (ynFaMatch && !ynMatch) {
      allOptions.push("Yes");
      allOptions.push("No");
    }
  }

  return {
    isQuestion: true,
    questionText,
    options: allOptions.length > 0 ? allOptions : [],
  };
}
