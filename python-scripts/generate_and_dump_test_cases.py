"""Generate clue game test cases and dump to JSON."""

import json
from pathlib import Path

from generate_serialized_game import generate_test_case, SerializedGame

NUMBER_OF_CASES_TO_GENERATE = 500


def generate_test_cases(num_cases: int, seed_start: int = 0) -> list[SerializedGame]:
    """Generate multiple game test cases."""
    test_cases = []

    print(f"Generating {num_cases} test cases...")
    for i in range(num_cases):
        seed = seed_start + i
        serialized_game = generate_test_case(seed)
        test_cases.append(serialized_game)
        if i % 20 == 0:
            print(f"Generated {i+1}/{NUMBER_OF_CASES_TO_GENERATE} test cases")
    return test_cases


def main() -> None:
    """Generate test cases and dump to JSON."""
    # Generate test cases
    test_cases = generate_test_cases(NUMBER_OF_CASES_TO_GENERATE, seed_start=1000)

    # Determine output path
    output_path = Path(__file__).parent.parent / "lib" / "clue-test-cases.json"

    # Convert to JSON-serializable format
    test_cases_data = [game.model_dump() for game in test_cases]

    # Write to file with indentation
    with output_path.open("w") as f:
        json.dump(test_cases_data, f, indent=2)

    print(f"\n✅ Wrote {len(test_cases)} test cases to {output_path}")
    print(f"   Total propositions: {sum(len(tc.propositions) for tc in test_cases)}")
    print(
        f"   Avg propositions per game: {sum(len(tc.propositions) for tc in test_cases) / len(test_cases):.1f}"
    )


if __name__ == "__main__":
    main()
