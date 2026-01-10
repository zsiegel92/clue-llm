import { z } from "zod";
import {
  technologies,
  places,
  companies,
  institutions,
  foods,
  materials,
} from "./single-token-strings";

export const scenarioSchema = z.object({
  technology: z.enum(technologies),
  place: z.enum(places),
  company: z.enum(companies),
  institution: z.enum(institutions),
  food: z.enum(foods),
  material: z.enum(materials),
});

export type Scenario = z.infer<typeof scenarioSchema>;
export type Technology = Scenario["technology"];
export type Place = Scenario["place"];
export type Company = Scenario["company"];
export type Institution = Scenario["institution"];
export type Food = Scenario["food"];
export type Material = Scenario["material"];
