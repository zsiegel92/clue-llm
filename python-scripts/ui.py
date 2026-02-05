"""UI rendering functions for Clue game propositions."""

from clue_models import (
    PROP_COMPLEX_OR,
    PROP_DIRECT_ELIMINATION,
    PROP_PERSON_AND_ATTRIBUTE,
    PROP_PERSON_ATTRIBUTE_IMPLIES_NOT_KILLER,
    PROP_PERSON_OR_PERSON,
    ClueGame,
    PropositionData,
)


def render_proposition(prop_data: PropositionData) -> str:
    """Render a proposition to a human-readable string."""
    if prop_data.prop_type == PROP_PERSON_AND_ATTRIBUTE:
        return f"{prop_data.person} was with {prop_data.value}"

    elif prop_data.prop_type == PROP_PERSON_OR_PERSON:
        return (
            f"({prop_data.person1} with {prop_data.val1}) OR "
            f"({prop_data.person2} with {prop_data.val2})"
        )

    elif prop_data.prop_type == PROP_PERSON_ATTRIBUTE_IMPLIES_NOT_KILLER:
        return (
            f"If {prop_data.person} was with {prop_data.value}, "
            f"then {prop_data.person} is not the killer"
        )

    elif prop_data.prop_type == PROP_COMPLEX_OR:
        return (
            f"({prop_data.person1} with {prop_data.mat1}) OR "
            f"({prop_data.person2} with {prop_data.food2} and {prop_data.inst2})"
        )

    elif prop_data.prop_type == PROP_DIRECT_ELIMINATION:
        return f"{prop_data.person} was with {prop_data.value} (alibi: not the killer)"

    return f"Unknown proposition type: {prop_data.prop_type}"


def print_scenario(game: ClueGame) -> None:
    """Print the game scenario."""
    print(f"🎯 Ground truth: {game.killer} is the killer")
    print("🔍 Full scenario:")
    for name, activity in game.ground_truth.items():
        marker = "🔪" if name == game.killer else "✅"
        print(f"  {marker} {name}: {activity.model_dump()}")
    print()


def print_propositions(game: ClueGame, verbose: bool = True) -> None:
    """Print all propositions in the game with their descriptions."""
    if not game.propositions:
        print("No propositions yet.")
        return

    print(f"\n📜 Propositions ({len(game.propositions)} total):")
    for i, (_, prop_data) in enumerate(game.propositions, 1):
        desc = render_proposition(prop_data)
        if verbose:
            print(f"  {i}. {desc}")
        else:
            # Just show the count
            pass

    if not verbose:
        print(f"  ({len(game.propositions)} propositions)")
