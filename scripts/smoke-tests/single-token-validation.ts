import {
  technologies,
  places,
  companies,
  institutions,
} from "@/lib/single-token-strings";
import { encodingForModel, type TiktokenModel } from "js-tiktoken";

const singleTokenStrings = [
  ...technologies,
  ...places,
  ...companies,
  ...institutions,
];

const models: TiktokenModel[] = ["gpt-4.1-nano", "gpt-4.1-mini", "gpt-4o"];

async function main() {
  for (const model of models) {
    console.log(`===Checking ${model}===`);
    const encoding = encodingForModel(model);
    let nViolations = 0;
    for (const string of singleTokenStrings) {
      const tokens = encoding.encode(string);
      if (tokens.length !== 1) {
        console.log(`"${string}" -> ${tokens.length} tokens`);
        nViolations++;
      }
    }
    console.log(`===DONE - ${nViolations} violations===`);
  }
  console.log(`✅ ${singleTokenStrings.length} strings checked with tokenizations for ${models.length} models:
	${technologies.length} technologies
	${places.length} places
	${companies.length} companies
	${institutions.length} institutions`);
}

main().catch(console.error);
