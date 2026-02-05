"""Solver module for Clue logic game using sympy."""

from typing import Any

from sympy import And, Not, Or, symbols
from sympy.logic.inference import satisfiable

from clue_models import ClueGame


def create_symbols(
    names: list[str],
    materials: list[str],
    institutions: list[str],
    foods: list[str],
    places: list[str],
    companies: list[str],
    technologies: list[str],
) -> dict[str, Any]:
    """Create sympy symbols for each person-attribute combination."""
    symbols_map: dict[str, Any] = {}

    for name in names:
        for material in materials:
            key = f"{name}_{material}"
            symbols_map[key] = symbols(key)
        for institution in institutions:
            key = f"{name}_{institution}"
            symbols_map[key] = symbols(key)
        for food in foods:
            key = f"{name}_{food}"
            symbols_map[key] = symbols(key)
        for place in places:
            key = f"{name}_{place}"
            symbols_map[key] = symbols(key)
        for company in companies:
            key = f"{name}_{company}"
            symbols_map[key] = symbols(key)
        for tech in technologies:
            key = f"{name}_{tech}"
            symbols_map[key] = symbols(key)

    # Also create symbols for "is_killer"
    for name in names:
        key = f"{name}_is_killer"
        symbols_map[key] = symbols(key)

    return symbols_map


def check_solution_count(game: ClueGame) -> tuple[int, list[str]]:
    """
    Count how many possible killers remain given current knowledge.

    Uses sympy's satisfiable() to check each person.
    """
    if not game.knowledge_base:
        return len(game.names), game.names

    # Combine all knowledge
    combined_knowledge = And(*game.knowledge_base)

    possible_killers = []

    # For each person, check if "person is killer" is satisfiable
    for name in game.names:
        killer_sym = game.symbols_map[f"{name}_is_killer"]
        # Check if this person being the killer is consistent with our knowledge
        test_expr = And(combined_knowledge, killer_sym)

        solution = satisfiable(test_expr)

        if solution is not False:
            # This person could be the killer
            possible_killers.append(name)

    return len(possible_killers), possible_killers


def is_feasible_with_proposition(game: ClueGame, proposition_expr: Any) -> bool:
    """
    Check if adding this proposition would keep the problem feasible.

    CRITICAL: To guarantee 100% convergence to the correct answer, this checks
    that the TRUE killer (game.killer) remains a possible solution after adding
    the proposition. This ensures we never accidentally eliminate the correct answer.

    Returns True if the true killer can still be the killer after adding this proposition.
    """
    # Test the knowledge base with this new proposition
    test_kb = game.knowledge_base + [proposition_expr]
    combined = And(*test_kb)

    # CRITICAL: Check if the TRUE killer is still possible after adding this proposition
    # This guarantees we never eliminate the correct answer
    true_killer_sym = game.symbols_map[f"{game.killer}_is_killer"]
    test_expr = And(combined, true_killer_sym)

    solution = satisfiable(test_expr)

    # Return True only if the TRUE killer remains a valid possibility
    return solution is not False


def setup_initial_constraints(game: ClueGame) -> None:
    """Set up initial constraints: exactly one killer."""
    killer_symbols = [game.symbols_map[f"{name}_is_killer"] for name in game.names]

    # At least one killer
    at_least_one = Or(*killer_symbols)
    game.knowledge_base.append(at_least_one)

    # At most one killer (if X is killer, others are not)
    for i, name1 in enumerate(game.names):
        for name2 in game.names[i + 1 :]:
            not_both = Not(
                And(
                    game.symbols_map[f"{name1}_is_killer"],
                    game.symbols_map[f"{name2}_is_killer"],
                )
            )
            game.knowledge_base.append(not_both)
