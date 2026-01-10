import {
  programmingLanguages,
  places,
  companies,
  institutions,
} from "@/lib/single-token-strings";

const singleTokenStrings = [
  ...programmingLanguages,
  ...places,
  ...companies,
  ...institutions,
];

async function main() {
  for (const string of singleTokenStrings) {
    console.log(string);
  }
}

main().catch(console.error);
