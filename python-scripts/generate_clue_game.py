"""Module for generating Clue logic games with propositions."""

import random
from typing import Any

from sympy import And, Implies, Not, Or

from clue_models import (
    PROP_COMPLEX_OR,
    PROP_DIRECT_ELIMINATION,
    PROP_PERSON_AND_ATTRIBUTE,
    PROP_PERSON_ATTRIBUTE_IMPLIES_NOT_KILLER,
    PROP_PERSON_OR_PERSON,
    ClueGame,
    GameConfig,
    PersonActivity,
    PropositionData,
)
from solver import (
    check_solution_count,
    create_symbols,
    is_feasible_with_proposition,
    setup_initial_constraints,
)
from ui import render_proposition


def create_game(config: GameConfig, seed: int | None = None) -> ClueGame:
    """Initialize a new game from configuration."""
    if seed is not None:
        random.seed(seed)

    symbols_map = create_symbols(
        config.names,
        config.materials,
        config.institutions,
        config.foods,
        config.places,
        config.companies,
        config.technologies,
    )

    return ClueGame(
        names=list(config.names),
        technologies=list(config.technologies),
        places=list(config.places),
        companies=list(config.companies),
        institutions=list(config.institutions),
        foods=list(config.foods),
        materials=list(config.materials),
        symbols_map=symbols_map,
    )


def setup_scenario(game: ClueGame) -> None:
    """Create a scenario where each person has activities and one is the killer."""
    # Assign each person activities (with some overlap for challenge)
    for name in game.names:
        game.ground_truth[name] = PersonActivity(
            technology=random.choice(game.technologies),
            place=random.choice(game.places),
            company=random.choice(game.companies),
            institution=random.choice(game.institutions),
            food=random.choice(game.foods),
            material=random.choice(game.materials),
        )

    # Pick the killer
    game.killer = random.choice(game.names)

    # Set up initial constraints
    setup_initial_constraints(game)


def generate_proposition(game: ClueGame) -> tuple[Any, PropositionData] | None:
    """
    Generate a random proposition that's consistent with ground truth.

    Propositions take forms like:
    - "Joe was with cement" (person AND material)
    - "(Will and cement) OR (Joe and (beer or toast) and (library or church))"
    - "If someone was at the church, they had pizza" (Implies)

    These propositions provide alibis: if we know what someone was doing,
    they might not be the killer (or they become a suspect).
    """
    # Weight towards more definitive statements to help convergence
    prop_type = random.choices(
        [
            PROP_PERSON_AND_ATTRIBUTE,
            PROP_PERSON_OR_PERSON,
            PROP_PERSON_ATTRIBUTE_IMPLIES_NOT_KILLER,
            PROP_COMPLEX_OR,
            PROP_DIRECT_ELIMINATION,
        ],
        weights=[40, 20, 20, 15, 5],
    )[0]

    if prop_type == PROP_PERSON_AND_ATTRIBUTE:
        # Simple: "Joe was with cement" or "Joe was at the library"
        person = random.choice(game.names)
        attr_category = random.choice(["material", "institution", "food", "place"])
        actual_value = getattr(game.ground_truth[person], attr_category)

        # Create the sympy expression
        symbol_key = f"{person}_{actual_value}"
        if symbol_key not in game.symbols_map:
            return None

        proposition = game.symbols_map[symbol_key]
        prop_data = PropositionData(
            prop_type=PROP_PERSON_AND_ATTRIBUTE,
            person=person,
            attr_category=attr_category,
            value=actual_value,
        )

        return (proposition, prop_data)

    elif prop_type == PROP_PERSON_OR_PERSON:
        # "Either Joe was at library OR John was with cement"
        person1 = random.choice(game.names)
        person2 = random.choice([n for n in game.names if n != person1])

        attr1_cat = random.choice(["material", "institution", "food"])
        attr2_cat = random.choice(["material", "institution", "food"])

        val1 = getattr(game.ground_truth[person1], attr1_cat)
        val2 = getattr(game.ground_truth[person2], attr2_cat)

        sym1 = game.symbols_map.get(f"{person1}_{val1}")
        sym2 = game.symbols_map.get(f"{person2}_{val2}")

        if sym1 is None or sym2 is None:
            return None

        proposition = Or(sym1, sym2)
        prop_data = PropositionData(
            prop_type=PROP_PERSON_OR_PERSON,
            person1=person1,
            person2=person2,
            attr1_cat=attr1_cat,
            attr2_cat=attr2_cat,
            val1=val1,
            val2=val2,
        )

        return (proposition, prop_data)

    elif prop_type == PROP_PERSON_ATTRIBUTE_IMPLIES_NOT_KILLER:
        # "If Joe was at church, Joe is not the killer" (alibi)
        # Pick a non-killer to give an alibi to
        innocent_people = [n for n in game.names if n != game.killer]
        if not innocent_people:
            return None

        person = random.choice(innocent_people)
        attr_cat = random.choice(["material", "institution", "food"])
        val = getattr(game.ground_truth[person], attr_cat)

        person_attr_sym = game.symbols_map.get(f"{person}_{val}")
        killer_sym = game.symbols_map[f"{person}_is_killer"]

        if person_attr_sym is None:
            return None

        # If person was with attribute, they're not the killer
        proposition = Implies(person_attr_sym, Not(killer_sym))
        prop_data = PropositionData(
            prop_type=PROP_PERSON_ATTRIBUTE_IMPLIES_NOT_KILLER,
            person=person,
            attr_category=attr_cat,
            value=val,
        )

        return (proposition, prop_data)

    elif prop_type == PROP_COMPLEX_OR:
        # Complex: "(Will and cement) OR (Joe and beer and library)"
        person1 = random.choice(game.names)
        person2 = random.choice([n for n in game.names if n != person1])

        mat1 = game.ground_truth[person1].material
        food2 = game.ground_truth[person2].food
        inst2 = game.ground_truth[person2].institution

        sym1 = game.symbols_map.get(f"{person1}_{mat1}")
        sym2_food = game.symbols_map.get(f"{person2}_{food2}")
        sym2_inst = game.symbols_map.get(f"{person2}_{inst2}")

        if sym1 is None or sym2_food is None or sym2_inst is None:
            return None

        proposition = Or(sym1, And(sym2_food, sym2_inst))
        prop_data = PropositionData(
            prop_type=PROP_COMPLEX_OR,
            person1=person1,
            person2=person2,
            mat1=mat1,
            food2=food2,
            inst2=inst2,
        )

        return (proposition, prop_data)

    elif prop_type == PROP_DIRECT_ELIMINATION:
        # Directly eliminate someone who is not the killer
        # This helps the game converge by explicitly clearing innocents
        # OPTIMIZATION: Only target innocents who are still possible suspects
        _, possible_suspects = check_solution_count(game)
        innocent_suspects = [n for n in possible_suspects if n != game.killer]

        if not innocent_suspects:
            # All remaining suspects are the true killer, we're done
            return None

        person = random.choice(innocent_suspects)

        # Give them an alibi by stating they were somewhere
        attr_cat = random.choice(["material", "institution", "food"])
        val = getattr(game.ground_truth[person], attr_cat)

        person_attr_sym = game.symbols_map.get(f"{person}_{val}")
        killer_sym = game.symbols_map[f"{person}_is_killer"]

        if person_attr_sym is None:
            return None

        # Both: person was there AND if they were there, they're not the killer
        proposition = And(person_attr_sym, Implies(person_attr_sym, Not(killer_sym)))
        prop_data = PropositionData(
            prop_type=PROP_DIRECT_ELIMINATION,
            person=person,
            attr_category=attr_cat,
            value=val,
        )

        return (proposition, prop_data)

    return None


def generate_game_until_unique_solution(
    game: ClueGame, verbose: bool = True, max_attempts: int = 1000
) -> str:
    """
    Generate propositions until exactly one killer remains.

    Process:
    1. Generate a candidate proposition
    2. Check if adding it would make the problem infeasible
    3. If infeasible, reject it and try another
    4. If feasible, add it and check for unique solution
    5. If unique solution found, stop
    6. Otherwise, continue until convergence

    Args:
        game: The game to generate propositions for
        verbose: Whether to print progress
        max_attempts: Safety limit to prevent infinite loops

    Returns the identified killer's name.
    """
    propositions_generated = 0
    attempts = 0

    # Continue until we find exactly one killer
    while attempts < max_attempts:
        attempts += 1

        # Generate a candidate proposition
        prop = generate_proposition(game)
        if prop is None:
            continue

        proposition_expr, prop_data = prop

        # Check if this proposition would make the problem infeasible
        if not is_feasible_with_proposition(game, proposition_expr):
            if verbose:
                print(f"❌ Rejected (infeasible): {render_proposition(prop_data)}")
            continue

        # Add to knowledge base (it's feasible)
        game.knowledge_base.append(proposition_expr)
        game.propositions.append(prop)
        propositions_generated += 1

        if verbose:
            print(
                f"📜 Proposition {propositions_generated}: {render_proposition(prop_data)}"
            )

        # Check if we've narrowed it down to a unique solution
        try:
            count, possible = check_solution_count(game)
            if verbose:
                print(f"   → {count} possible suspect(s): {possible}")

            if count == 1:
                identified = possible[0]
                if verbose:
                    print(f"\n🎉 Solved after {propositions_generated} propositions!")
                    print(f"   Identified killer: {identified}")
                    print(f"   Actual killer: {game.killer}")
                    correct = "✅" if identified == game.killer else "❌"
                    print(f"   {correct}")
                return identified

            if count == 0:
                # This shouldn't happen since we check feasibility first
                if verbose:
                    print(
                        "\n⚠️  Unexpected: No possible solutions after feasibility check!"
                    )
                return "NONE"

        except Exception as e:
            if verbose:
                print(f"   ⚠️  Error checking solutions: {e}")

        if verbose:
            print()

    # If we get here, we hit the safety limit without converging
    # This shouldn't happen - it indicates a bug in the proposition generation
    count, possible = check_solution_count(game)
    if verbose:
        print(f"\n⚠️  Hit safety attempt limit ({max_attempts}) without converging!")
        print("   This indicates a bug - should always converge eventually")
        print(f"   Propositions generated: {propositions_generated}")
        print(f"   Possible killers: {possible}")
        print(f"   Actual killer: {game.killer}")

    return possible[0] if possible else "UNKNOWN"
