"""Generate clue game test cases and dump to JSON."""

import json
from pathlib import Path

from clue_models import DEFAULT_CONFIG, PropositionData
from generate_clue_game import (
    create_game,
    generate_game_until_unique_solution,
    setup_scenario,
)
from pydantic import BaseModel


NUMBER_OF_CASES_TO_GENERATE = 100


class SerializedProposition(BaseModel):
    """Serializable proposition data."""

    prop_type: str
    person: str | None = None
    person1: str | None = None
    person2: str | None = None
    attr_category: str | None = None
    attr1_cat: str | None = None
    attr2_cat: str | None = None
    value: str | None = None
    val1: str | None = None
    val2: str | None = None
    mat1: str | None = None
    food2: str | None = None
    inst2: str | None = None

    model_config = {"frozen": True}


class SerializedPersonActivity(BaseModel):
    """Serializable person activity."""

    technology: str
    place: str
    company: str
    institution: str
    food: str
    material: str

    model_config = {"frozen": True}


class SerializedGame(BaseModel):
    """Complete serializable game state."""

    seed: int
    killer: str
    names: list[str]
    technologies: list[str]
    places: list[str]
    companies: list[str]
    institutions: list[str]
    foods: list[str]
    materials: list[str]
    ground_truth: dict[str, SerializedPersonActivity]
    propositions: list[SerializedProposition]

    model_config = {"frozen": True}


def serialize_proposition_data(prop_data: PropositionData) -> SerializedProposition:
    """Convert PropositionData to SerializedProposition."""
    return SerializedProposition(
        prop_type=prop_data.prop_type,
        person=prop_data.person,
        person1=prop_data.person1,
        person2=prop_data.person2,
        attr_category=prop_data.attr_category,
        attr1_cat=prop_data.attr1_cat,
        attr2_cat=prop_data.attr2_cat,
        value=prop_data.value,
        val1=prop_data.val1,
        val2=prop_data.val2,
        mat1=prop_data.mat1,
        food2=prop_data.food2,
        inst2=prop_data.inst2,
    )


def generate_test_cases(num_cases: int, seed_start: int = 0) -> list[SerializedGame]:
    """Generate multiple game test cases."""
    test_cases = []

    print(f"Generating {num_cases} test cases...")
    for i in range(num_cases):
        seed = seed_start + i
        print(f"  Game {i + 1}/{num_cases} (seed={seed})...", end=" ")

        # Create and setup game
        game = create_game(DEFAULT_CONFIG, seed=seed)
        setup_scenario(game)

        # Generate propositions until unique solution
        generate_game_until_unique_solution(game, verbose=False)

        # Serialize the game
        serialized_game = SerializedGame(
            seed=seed,
            killer=game.killer,
            names=game.names,
            technologies=game.technologies,
            places=game.places,
            companies=game.companies,
            institutions=game.institutions,
            foods=game.foods,
            materials=game.materials,
            ground_truth={
                name: SerializedPersonActivity(
                    technology=activity.technology,
                    place=activity.place,
                    company=activity.company,
                    institution=activity.institution,
                    food=activity.food,
                    material=activity.material,
                )
                for name, activity in game.ground_truth.items()
            },
            propositions=[
                serialize_proposition_data(prop_data)
                for _, prop_data in game.propositions
            ],
        )

        test_cases.append(serialized_game)
        print(f"✓ ({len(game.propositions)} propositions)")

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
