# MiMo Agent Instructions

## Question Tool Usage — MANDATORY

When you need to present the user with **multiple options or choices**, you MUST use the `question` tool with structured options. NEVER present multiple-choice questions as plain text.

### When to use the question tool

- The user asks you to "ask me a question" or "give me options"
- You need the user to choose between alternatives
- You need user confirmation (yes/no with context)
- You need to clarify an ambiguous request with specific options

### How to use it

Call the `question` tool with this structure:

```
question({
  questions: [{
    question: "The full question text",
    header: "Short label",
    options: [
      { label: "Option A", description: "Description of option A" },
      { label: "Option B", description: "Description of option B" }
    ],
    multiple: false
  }]
})
```

### Rules

- `options` must have at least 2 items
- Use `multiple: false` for single-select (default)
- Use `multiple: true` when the user can pick several items
- Add "(Recommended)" to your preferred option's label
- Set `custom: true` (default) to allow the user to type a custom answer
- NEVER write numbered options as plain text (e.g., "1. React\n2. Vue")
- NEVER use bullet points or lists for choices — always use the question tool

### Examples

**BAD** (plain text — never do this):
```
Choose one:
1. React
2. Vue
3. Angular
4. Svelte
```

**GOOD** (question tool):
```
question({
  questions: [{
    question: "Which framework do you prefer?",
    header: "Framework",
    options: [
      { label: "React", description: "Frontend library by Meta" },
      { label: "Vue", description: "Progressive framework" },
      { label: "Angular", description: "Full framework by Google" },
      { label: "Svelte", description: "Compile-time framework" }
    ],
    multiple: false
  }]
})
```

## Other conventions

- When the user's request is vague, use the question tool to clarify before reading files or making changes.
- Keep answers concise and relevant.
- Use tools appropriately for the task.
