import { z } from "zod";
import {
  technologies,
  places,
  companies,
  institutions,
} from "./single-token-strings";

export const scenarioSchema = z.object({
  technology: z.enum(technologies),
  place: z.enum(places),
  company: z.enum(companies),
  institution: z.enum(institutions),
});

export type Scenario = z.infer<typeof scenarioSchema>;
export type Technology = Scenario["technology"];
export type Place = Scenario["place"];
export type Company = Scenario["company"];
export type Institution = Scenario["institution"];
