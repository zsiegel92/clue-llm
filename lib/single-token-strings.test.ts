import { encodingForModel, type TiktokenModel } from "js-tiktoken";
import { describe, expect, it } from "vitest";
import {
  chineseLastNames,
  companies,
  foods,
  institutions,
  materials,
  names,
  places,
  technologies,
} from "./single-token-strings";

describe("single-token-strings", () => {
  const allStrings = [
    ...chineseLastNames,
    ...companies,
    ...foods,
    ...institutions,
    ...materials,
    ...names,
    ...places,
    ...technologies,
  ];

  it("exports non-empty arrays", () => {
    expect(chineseLastNames.length).toBeGreaterThan(0);
    expect(companies.length).toBeGreaterThan(0);
    expect(foods.length).toBeGreaterThan(0);
    expect(institutions.length).toBeGreaterThan(0);
    expect(materials.length).toBeGreaterThan(0);
    expect(names.length).toBeGreaterThan(0);
    expect(places.length).toBeGreaterThan(0);
    expect(technologies.length).toBeGreaterThan(0);
  });

  it("exports unique strings", () => {
    expect(allStrings.length).toEqual([...new Set(allStrings)].length);
  });

  for (const model of [
    "gpt-4o",
    "gpt-4.1-nano",
    "gpt-4.1-mini",
  ] satisfies TiktokenModel[]) {
    const encoding = encodingForModel(model);
    it(`all strings tokenize to exactly 1 token with ${model}`, () => {
      for (const string of allStrings) {
        const tokens = encoding.encode(string);
        expect(tokens.length).toBe(1);
      }
    });
  }
});
