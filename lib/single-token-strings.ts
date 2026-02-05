import type { SingleTokenStrings } from "./schemas";
import { singleTokenStringsSchema } from "./schemas";
import data from "./single-token-strings.json";

const validated = singleTokenStringsSchema.parse(
  data,
) satisfies SingleTokenStrings;

export const technologies = validated.technologies;
export const places = validated.places;
export const companies = validated.companies;
export const institutions = validated.institutions;
export const foods = validated.foods;
export const materials = validated.materials;
export const names = validated.names;
export const lastNames = validated.lastNames;
