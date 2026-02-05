import { z } from "zod";
import data from "./single-token-strings.json";

const singleTokenStringsSchema = z.object({
  technologies: z.array(z.string()),
  places: z.array(z.string()),
  companies: z.array(z.string()),
  institutions: z.array(z.string()),
  foods: z.array(z.string()),
  materials: z.array(z.string()),
  names: z.array(z.string()),
  lastNames: z.array(z.string()),
});

const validated = singleTokenStringsSchema.parse(data);

export const technologies = validated.technologies;
export const places = validated.places;
export const companies = validated.companies;
export const institutions = validated.institutions;
export const foods = validated.foods;
export const materials = validated.materials;
export const names = validated.names;
export const lastNames = validated.lastNames;
