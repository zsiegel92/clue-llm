import { describe, expect, it } from "vitest";
import { clueTestCases } from "./clue-test-cases";
import type { SerializedProposition } from "./schemas";
import { gameToPrompt, renderProposition } from "./ui";

describe("renderProposition", () => {
  it("renders person_and_attribute correctly", () => {
    const prop: SerializedProposition = {
      prop_type: "person_and_attribute",
      person: "Smith",
      person1: null,
      person2: null,
      attr_category: "technology",
      attr1_cat: null,
      attr2_cat: null,
      value: "Python",
      val1: null,
      val2: null,
      mat1: null,
      food2: null,
      inst2: null,
    };

    expect(renderProposition(prop)).toBe("Smith was with Python");
  });

  it("renders person_or_person correctly", () => {
    const prop: SerializedProposition = {
      prop_type: "person_or_person",
      person: null,
      person1: "Johnson",
      person2: "Williams",
      attr_category: null,
      attr1_cat: "place",
      attr2_cat: "company",
      value: null,
      val1: "London",
      val2: "Google",
      mat1: null,
      food2: null,
      inst2: null,
    };

    expect(renderProposition(prop)).toBe(
      "(Johnson with London) OR (Williams with Google)",
    );
  });

  it("renders person_attribute_implies_not_killer correctly", () => {
    const prop: SerializedProposition = {
      prop_type: "person_attribute_implies_not_killer",
      person: "Brown",
      person1: null,
      person2: null,
      attr_category: "food",
      attr1_cat: null,
      attr2_cat: null,
      value: "Pizza",
      val1: null,
      val2: null,
      mat1: null,
      food2: null,
      inst2: null,
    };

    expect(renderProposition(prop)).toBe(
      "If Brown was with Pizza, then Brown is not the killer",
    );
  });

  it("renders complex_or correctly", () => {
    const prop: SerializedProposition = {
      prop_type: "complex_or",
      person: null,
      person1: "Davis",
      person2: "Miller",
      attr_category: null,
      attr1_cat: null,
      attr2_cat: null,
      value: null,
      val1: null,
      val2: null,
      mat1: "Steel",
      food2: "Sushi",
      inst2: "MIT",
    };

    expect(renderProposition(prop)).toBe(
      "(Davis with Steel) OR (Miller with Sushi and MIT)",
    );
  });

  it("renders direct_elimination correctly", () => {
    const prop: SerializedProposition = {
      prop_type: "direct_elimination",
      person: "Wilson",
      person1: null,
      person2: null,
      attr_category: "institution",
      attr1_cat: null,
      attr2_cat: null,
      value: "Harvard",
      val1: null,
      val2: null,
      mat1: null,
      food2: null,
      inst2: null,
    };

    expect(renderProposition(prop)).toBe(
      "Wilson was with Harvard (alibi: not the killer)",
    );
  });
});

describe("gameToPrompt", () => {
  it("generates a valid prompt with all required sections", () => {
    const game = clueTestCases[0];
    const prompt = gameToPrompt(game);

    expect(prompt).toContain("# Clue Logic Puzzle");
    expect(prompt).toContain("**Suspects:**");
    expect(prompt).toContain("**Propositions:**");
    expect(prompt).toContain("Based on these propositions, who is the killer?");
  });

  it("includes all suspects in the prompt", () => {
    const game = clueTestCases[0];
    const prompt = gameToPrompt(game);

    for (const name of game.names) {
      expect(prompt).toContain(name);
    }
  });

  it("numbers propositions starting from 1", () => {
    const game = clueTestCases[0];
    const prompt = gameToPrompt(game);

    expect(prompt).toContain("1. ");
    expect(prompt).toContain(`${game.propositions.length}. `);
  });

  it("renders all propositions", () => {
    const game = clueTestCases[0];
    const prompt = gameToPrompt(game);

    // Count proposition lines between **Propositions:** and </input>
    const propsStart = prompt.indexOf("**Propositions:**");
    const propsEnd = prompt.indexOf("</input>");
    const propsSection = prompt.slice(propsStart, propsEnd);
    const propositionLines = propsSection
      .split("\n")
      .filter((line) => /^\d+\. /.test(line));

    expect(propositionLines.length).toBe(game.propositions.length);
  });

  it("generates different prompts for different games", () => {
    const game1 = clueTestCases[0];
    const game2 = clueTestCases[1];

    const prompt1 = gameToPrompt(game1);
    const prompt2 = gameToPrompt(game2);

    expect(prompt1).not.toBe(prompt2);
  });
});
