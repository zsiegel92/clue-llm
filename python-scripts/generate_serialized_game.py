"""Generate clue game test cases and dump to JSON."""

from clue_models import DEFAULT_CONFIG, PropositionData
from generate_clue_game import (
    create_game,
    generate_game_until_unique_solution,
    setup_scenario,
)
from pydantic import BaseModel


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


def generate_test_case(seed: int = 0) -> SerializedGame:
    game = create_game(DEFAULT_CONFIG, seed=seed)
    setup_scenario(game)
    generate_game_until_unique_solution(game, verbose=False)
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
            serialize_proposition_data(prop_data) for _, prop_data in game.propositions
        ],
    )
    return serialized_game


if __name__ == "__main__":
    serialized_game = generate_test_case(seed=42)
    print(serialized_game)
