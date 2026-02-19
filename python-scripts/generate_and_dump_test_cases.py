"""Generate clue game test cases and dump to JSON."""

import json
from pathlib import Path

from generate_serialized_game import generate_test_case, SerializedGame

NUMBER_OF_CASES_TO_GENERATE = 500
NUMBER_OF_FEW_SHOT_EXAMPLES_TO_GENERATE = 20
NUMBER_OF_VALIDATION_CASES_TO_GENERATE = 250


def generate_test_cases(num_cases: int, seed_start: int = 0) -> list[SerializedGame]:
    """Generate multiple game test cases."""
    test_cases = []

    print(f"Generating {num_cases} test cases...")
    for i in range(num_cases):
        seed = seed_start + i
        serialized_game = generate_test_case(seed)
        test_cases.append(serialized_game)
        if i % 20 == 0:
            print(f"Generated {i + 1}/{num_cases} test cases")
    return test_cases


def main() -> None:
    """Generate test cases and dump to JSON."""
    # Generate test cases
    seed_start = 1000
    for n_test_cases, destination_filename in [
        (NUMBER_OF_CASES_TO_GENERATE, "clue-test-cases.json"),
        (
            NUMBER_OF_FEW_SHOT_EXAMPLES_TO_GENERATE,
            "few-shot-example-clue-test-cases.json",
        ),
        (
            NUMBER_OF_VALIDATION_CASES_TO_GENERATE,
            "clue-validation-cases.json",
        ),
    ]:
        output_path = Path(__file__).parent.parent / "lib" / destination_filename
        test_cases = generate_test_cases(n_test_cases, seed_start=seed_start)
        seed_start += n_test_cases

        test_cases_data = [game.model_dump() for game in test_cases]

        # Write to file with indentation
        with output_path.open("w") as f:
            json.dump(test_cases_data, f, indent=2)

        print(f"\n✅ Wrote {len(test_cases)} test cases to {output_path}")
        print(
            f"   Total propositions: {sum(len(tc.propositions) for tc in test_cases)}"
        )
        print(
            f"   Avg propositions per game: {sum(len(tc.propositions) for tc in test_cases) / len(test_cases):.1f}"
        )


if __name__ == "__main__":
    main()
