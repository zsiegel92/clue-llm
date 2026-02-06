import type { SerializedGame, SerializedProposition } from "./schemas";

/**
 * Instructions explaining how the game format works and how to solve it.
 * These instructions are included in the prompt to help the LLM understand
 * the logical constraints and deduction process.
 */
const gameFormatInstructions = `
## How to Solve This Puzzle

This is a logic deduction puzzle. Your goal: identify which ONE person is the killer.

**The Core Logic:**
- If someone can be proven to have been with ANY attribute (technology, place, company, institution, food, or material), they have an ALIBI
- Having an alibi means you are NOT the killer
- The killer is the ONLY person who cannot be proven to have any alibi
- Eliminate everyone with alibis to find the killer

**Reading Propositions:**

DIRECT ALIBIS (person is definitely NOT the killer):
- "X was with Y" → Person X has alibi, so X ≠ killer
- "X was with Y (alibi: not the killer)" → Explicit alibi for X

CONDITIONAL ALIBIS:
- "If X was with Y, then X is not the killer" → IF you can prove X was with Y, then X has alibi

DISJUNCTIONS (OR statements):
- "(A with X) OR (B with Y)" → At least one is true. Cannot directly eliminate anyone unless you can prove one side false
- "(A with material M) OR (B with food F and institution I)" → Similar logic for complex ORs

**Step-by-Step Method:**
1. First pass: Mark all people with direct alibis as NOT the killer
2. Second pass: Look for OR statements where you can deduce which branch must be true
3. Third pass: Apply conditional statements if their conditions are met
4. The remaining person with NO alibis is the killer

**Critical:** Every suspect except ONE will have at least one alibi. Find the person who has ZERO alibis.

Think carefully and work through each proposition systematically before deciding.
`.trim();

/**
 * Renders a single proposition to a human-readable string
 */
export function renderProposition(prop: SerializedProposition): string {
  const propType = prop.prop_type;

  if (propType === "person_and_attribute") {
    return `${prop.person} was with ${prop.value}`;
  }

  if (propType === "person_or_person") {
    return `(${prop.person1} with ${prop.val1}) OR (${prop.person2} with ${prop.val2})`;
  }

  if (propType === "person_attribute_implies_not_killer") {
    return `If ${prop.person} was with ${prop.value}, then ${prop.person} is not the killer`;
  }

  if (propType === "complex_or") {
    return `(${prop.person1} with ${prop.mat1}) OR (${prop.person2} with ${prop.food2} and ${prop.inst2})`;
  }

  if (propType === "direct_elimination") {
    return `${prop.person} was with ${prop.value} (alibi: not the killer)`;
  }

  // Exhaustiveness check
  const _exhaustiveCheck: never = propType;
  return _exhaustiveCheck;
}

/**
 * Converts a game to a prompt string for LLM inference.
 * The output includes all propositions in a lossless, numbered format.
 */
export function gameToPrompt(game: SerializedGame): string {
  const lines: string[] = [];

  lines.push("# Clue Logic Puzzle");
  lines.push("");
  lines.push("Determine who the killer is based on the following information:");
  lines.push("");

  lines.push(gameFormatInstructions);
  lines.push("");

  lines.push("## Suspects:");
  for (const name of game.names) {
    lines.push(`- ${name}`);
  }
  lines.push("");

  lines.push("## Propositions:");
  for (let i = 0; i < game.propositions.length; i++) {
    const prop = game.propositions[i];
    const rendered = renderProposition(prop);
    lines.push(`${i + 1}. ${rendered}`);
  }
  lines.push("");

  lines.push("Based on these propositions, who is the killer?");

  return lines.join("\n");
}
