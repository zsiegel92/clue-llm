import {
  technologies,
  places,
  companies,
  institutions,
} from "@/lib/single-token-strings";
import { encodingForModel } from "js-tiktoken";

const singleTokenStrings = [
  ...technologies,
  ...places,
  ...companies,
  ...institutions,
];

async function main() {
  const encoding = encodingForModel("gpt-4");

  for (const string of singleTokenStrings) {
    const tokens = encoding.encode(string);
    if (tokens.length !== 1) {
      console.log(`"${string}" -> ${tokens.length} tokens`);
    }
  }
  console.log(`✅ ${singleTokenStrings.length} strings checked:
	${technologies.length} technologies
	${places.length} places
	${companies.length} companies
	${institutions.length} institutions`);
}

main().catch(console.error);
