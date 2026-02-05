import type { SerializedGame, SerializedProposition } from "./schemas";

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
