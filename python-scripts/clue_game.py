"""
Clue-like logic game using sympy.

Game mechanics:
- We have multiple people (names), and each person was doing something
- Each person's activity involves: technology, place, company, institution, food, material
- Propositions gradually reveal what people were doing
- The "killer" is the person we need to identify through logical deduction
- Propositions use Or, And, Implies to encode information

Key constraints for intuitive gameplay:
1. Each person has a unique "signature" (combination of attributes)
2. Propositions should gradually narrow down possibilities
3. Some propositions are "alibis" - if we know person X was at place Y, they can't be the killer
4. The killer's full signature is only revealed when all other possibilities are eliminated

Proposition generation strategy:
- Generate propositions that are consistent with ground truth
- Check feasibility before adding (reject if it makes problem infeasible)
- Continue generating until exactly one possible killer remains (guaranteed convergence)
- Propositions include: simple statements, disjunctions, implications, and direct eliminations

Performance notes:
- The game now runs until convergence (no arbitrary proposition limit)
- As propositions increase, probability of multiple possibilities converges to zero
- The difficulty is an NP-hard SAT problem, making it a proper brain teaser

Future improvements:
- Better proposition generation strategy (e.g., information-theoretic approach)
- Adaptive proposition selection based on remaining possibilities
- Ensure attributes have more distinguishing power between people
"""

import random
from typing import Any, TypedDict

from sympy import And, Implies, Not, Or, Symbol, symbols
from sympy.logic.inference import satisfiable

# Small subsets for each category
TECHNOLOGIES = ["Python", "Java", "Ruby"]
PLACES = ["China", "India", "France"]
COMPANIES = ["Google", "Facebook", "Amazon", "Netflix"]
INSTITUTIONS = ["church", "library", "court"]
FOODS = ["pizza", "beer", "toast"]
MATERIALS = ["wood", "cement", "glass"]
NAMES = ["Joe", "John", "Bob", "Will"]


class GameState(TypedDict):
    """State for a Clue game."""

    names: list[str]
    technologies: list[str]
    places: list[str]
    companies: list[str]
    institutions: list[str]
    foods: list[str]
    materials: list[str]
    symbols_map: dict[str, Symbol]
    ground_truth: dict[str, dict[str, str]]
    killer: str
    propositions: list[tuple[Any, str]]
    knowledge_base: list[Any]


def create_symbols(
    names: list[str],
    materials: list[str],
    institutions: list[str],
    foods: list[str],
    places: list[str],
    companies: list[str],
    technologies: list[str],
) -> dict[str, Symbol]:
    """Create sympy symbols for each person-attribute combination."""
    symbols_map: dict[str, Symbol] = {}

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


def create_game_state(seed: int | None = None) -> GameState:
    """Initialize a new game state."""
    if seed is not None:
        random.seed(seed)

    symbols_map = create_symbols(
        NAMES, MATERIALS, INSTITUTIONS, FOODS, PLACES, COMPANIES, TECHNOLOGIES
    )

    return GameState(
        names=NAMES,
        technologies=TECHNOLOGIES,
        places=PLACES,
        companies=COMPANIES,
        institutions=INSTITUTIONS,
        foods=FOODS,
        materials=MATERIALS,
        symbols_map=symbols_map,
        ground_truth={},
        killer="",
        propositions=[],
        knowledge_base=[],
    )


def setup_scenario(state: GameState) -> GameState:
    """Create a scenario where each person has activities and one is the killer."""
    # Assign each person activities (with some overlap for challenge)
    for name in state["names"]:
        state["ground_truth"][name] = {
            "technology": random.choice(state["technologies"]),
            "place": random.choice(state["places"]),
            "company": random.choice(state["companies"]),
            "institution": random.choice(state["institutions"]),
            "food": random.choice(state["foods"]),
            "material": random.choice(state["materials"]),
        }

    # Pick the killer
    state["killer"] = random.choice(state["names"])
    print(f"🎯 Ground truth: {state['killer']} is the killer")
    print("🔍 Full scenario:")
    for name, activity in state["ground_truth"].items():
        marker = "🔪" if name == state["killer"] else "✅"
        print(f"  {marker} {name}: {activity}")
    print()

    # Set up initial constraints: exactly one killer
    killer_symbols = [
        state["symbols_map"][f"{name}_is_killer"] for name in state["names"]
    ]
    # At least one killer
    at_least_one = Or(*killer_symbols)
    state["knowledge_base"].append(at_least_one)

    # At most one killer (if X is killer, others are not)
    for i, name1 in enumerate(state["names"]):
        for name2 in state["names"][i + 1 :]:
            not_both = Not(
                And(
                    state["symbols_map"][f"{name1}_is_killer"],
                    state["symbols_map"][f"{name2}_is_killer"],
                )
            )
            state["knowledge_base"].append(not_both)

    return state


def check_solution_count(state: GameState) -> tuple[int, list[str]]:
    """
    Count how many possible killers remain given current knowledge.

    Uses sympy's satisfiable() to check each person.
    """
    if not state["knowledge_base"]:
        return len(state["names"]), state["names"]

    # Combine all knowledge
    combined_knowledge = And(*state["knowledge_base"])

    possible_killers = []

    # For each person, check if "person is killer" is satisfiable
    for name in state["names"]:
        killer_sym = state["symbols_map"][f"{name}_is_killer"]
        # Check if this person being the killer is consistent with our knowledge
        test_expr = And(combined_knowledge, killer_sym)

        solution = satisfiable(test_expr)

        if solution is not False:
            # This person could be the killer
            possible_killers.append(name)

    return len(possible_killers), possible_killers


def generate_proposition(state: GameState) -> tuple[Any, str] | None:
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
            "person_and_attribute",
            "person_or_person",
            "person_attribute_implies_not_killer",
            "complex_or",
            "direct_elimination",
        ],
        weights=[40, 20, 20, 15, 5],
    )[0]

    if prop_type == "person_and_attribute":
        # Simple: "Joe was with cement" or "Joe was at the library"
        person = random.choice(state["names"])
        attr_category = random.choice(["material", "institution", "food", "place"])
        actual_value = state["ground_truth"][person][attr_category]

        # Create the sympy expression
        symbol_key = f"{person}_{actual_value}"
        if symbol_key not in state["symbols_map"]:
            return None

        proposition = state["symbols_map"][symbol_key]
        description = f"{person} was with {actual_value}"

        return (proposition, description)

    elif prop_type == "person_or_person":
        # "Either Joe was at library OR John was with cement"
        person1 = random.choice(state["names"])
        person2 = random.choice([n for n in state["names"] if n != person1])

        attr1_cat = random.choice(["material", "institution", "food"])
        attr2_cat = random.choice(["material", "institution", "food"])

        val1 = state["ground_truth"][person1][attr1_cat]
        val2 = state["ground_truth"][person2][attr2_cat]

        sym1 = state["symbols_map"].get(f"{person1}_{val1}")
        sym2 = state["symbols_map"].get(f"{person2}_{val2}")

        if sym1 is None or sym2 is None:
            return None

        proposition = Or(sym1, sym2)
        description = f"({person1} with {val1}) OR ({person2} with {val2})"

        return (proposition, description)

    elif prop_type == "person_attribute_implies_not_killer":
        # "If Joe was at church, Joe is not the killer" (alibi)
        # Pick a non-killer to give an alibi to
        innocent_people = [n for n in state["names"] if n != state["killer"]]
        if not innocent_people:
            return None

        person = random.choice(innocent_people)
        attr_cat = random.choice(["material", "institution", "food"])
        val = state["ground_truth"][person][attr_cat]

        person_attr_sym = state["symbols_map"].get(f"{person}_{val}")
        killer_sym = state["symbols_map"][f"{person}_is_killer"]

        if person_attr_sym is None:
            return None

        # If person was with attribute, they're not the killer
        proposition = Implies(person_attr_sym, Not(killer_sym))
        description = f"If {person} was with {val}, then {person} is not the killer"

        return (proposition, description)

    elif prop_type == "complex_or":
        # Complex: "(Will and cement) OR (Joe and beer and library)"
        person1 = random.choice(state["names"])
        person2 = random.choice([n for n in state["names"] if n != person1])

        mat1 = state["ground_truth"][person1]["material"]
        food2 = state["ground_truth"][person2]["food"]
        inst2 = state["ground_truth"][person2]["institution"]

        sym1 = state["symbols_map"].get(f"{person1}_{mat1}")
        sym2_food = state["symbols_map"].get(f"{person2}_{food2}")
        sym2_inst = state["symbols_map"].get(f"{person2}_{inst2}")

        if sym1 is None or sym2_food is None or sym2_inst is None:
            return None

        proposition = Or(sym1, And(sym2_food, sym2_inst))
        description = f"({person1} with {mat1}) OR ({person2} with {food2} and {inst2})"

        return (proposition, description)

    elif prop_type == "direct_elimination":
        # Directly eliminate someone who is not the killer
        # This helps the game converge by explicitly clearing innocents
        # OPTIMIZATION: Only target innocents who are still possible suspects
        _, possible_suspects = check_solution_count(state)
        innocent_suspects = [n for n in possible_suspects if n != state["killer"]]

        if not innocent_suspects:
            # All remaining suspects are the true killer, we're done
            return None

        person = random.choice(innocent_suspects)

        # Give them an alibi by stating they were somewhere
        attr_cat = random.choice(["material", "institution", "food"])
        val = state["ground_truth"][person][attr_cat]

        person_attr_sym = state["symbols_map"].get(f"{person}_{val}")
        killer_sym = state["symbols_map"][f"{person}_is_killer"]

        if person_attr_sym is None:
            return None

        # Both: person was there AND if they were there, they're not the killer
        proposition = And(person_attr_sym, Implies(person_attr_sym, Not(killer_sym)))
        description = f"{person} was with {val} (alibi: not the killer)"

        return (proposition, description)

    return None


def is_feasible_with_proposition(state: GameState, proposition_expr: Any) -> bool:
    """
    Check if adding this proposition would keep the problem feasible.

    CRITICAL: To guarantee 100% convergence to the correct answer, this checks
    that the TRUE killer (state["killer"]) remains a possible solution after adding
    the proposition. This ensures we never accidentally eliminate the correct answer.

    Returns True if the true killer can still be the killer after adding this proposition.
    """
    # Test the knowledge base with this new proposition
    test_kb = state["knowledge_base"] + [proposition_expr]
    combined = And(*test_kb)

    # CRITICAL: Check if the TRUE killer is still possible after adding this proposition
    # This guarantees we never eliminate the correct answer
    true_killer_sym = state["symbols_map"][f"{state['killer']}_is_killer"]
    test_expr = And(combined, true_killer_sym)

    solution = satisfiable(test_expr)

    # Return True only if the TRUE killer remains a valid possibility
    return solution is not False


def play_game(state: GameState, verbose: bool = True) -> str:
    """
    Play the game: generate propositions until exactly one killer remains.

    Process:
    1. Generate a candidate proposition
    2. Check if adding it would make the problem infeasible
    3. If infeasible, reject it and try another
    4. If feasible, add it and check for unique solution
    5. If unique solution found, stop
    6. Otherwise, continue until convergence

    Args:
        state: The game state
        verbose: Whether to print progress

    Returns the identified killer's name.
    """
    state = setup_scenario(state)

    propositions_generated = 0
    attempts = 0
    max_attempts = 1000  # Safety limit to prevent infinite loops

    # Continue until we find exactly one killer
    while attempts < max_attempts:
        attempts += 1

        # Generate a candidate proposition
        prop = generate_proposition(state)
        if prop is None:
            continue

        proposition_expr, desc = prop

        # Check if this proposition would make the problem infeasible
        if not is_feasible_with_proposition(state, proposition_expr):
            if verbose:
                print(f"❌ Rejected (infeasible): {desc}")
            continue

        # Add to knowledge base (it's feasible)
        state["knowledge_base"].append(proposition_expr)
        state["propositions"].append(prop)
        propositions_generated += 1

        if verbose:
            print(f"📜 Proposition {propositions_generated}: {desc}")

        # Check if we've narrowed it down to a unique solution
        try:
            count, possible = check_solution_count(state)
            if verbose:
                print(f"   → {count} possible suspect(s): {possible}")

            if count == 1:
                identified = possible[0]
                if verbose:
                    print(f"\n🎉 Solved after {propositions_generated} propositions!")
                    print(f"   Identified killer: {identified}")
                    print(f"   Actual killer: {state['killer']}")
                    correct = "✅" if identified == state["killer"] else "❌"
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
    count, possible = check_solution_count(state)
    if verbose:
        print(f"\n⚠️  Hit safety attempt limit ({max_attempts}) without converging!")
        print("   This indicates a bug - should always converge eventually")
        print(f"   Propositions generated: {propositions_generated}")
        print(f"   Possible killers: {possible}")
        print(f"   Actual killer: {state['killer']}")

    return possible[0] if possible else "UNKNOWN"


def run_batch(num_games: int = 10, seed_start: int = 0):
    """Run multiple games and report statistics."""
    print(f"\n{'=' * 60}")
    print(f"RUNNING {num_games} GAMES")
    print(f"{'=' * 60}\n")

    correct_count = 0
    proposition_counts = []

    for i in range(num_games):
        print(f"Game {i + 1}/{num_games}:")
        state = create_game_state(seed=seed_start + i)
        killer = play_game(state, verbose=False)

        correct = killer == state["killer"]
        correct_count += correct
        proposition_counts.append(len(state["propositions"]))

        status = "✅" if correct else "❌"
        print(
            f"  {status} Actual: {state['killer']}, Identified: {killer}, Props: {len(state['propositions'])}\n"
        )

    print(f"{'=' * 60}")
    print("STATISTICS")
    print(f"{'=' * 60}")
    print(
        f"Correct: {correct_count}/{num_games} ({100 * correct_count / num_games:.1f}%)"
    )
    print(f"Avg propositions: {sum(proposition_counts) / len(proposition_counts):.1f}")
    print(f"Min propositions: {min(proposition_counts)}")
    print(f"Max propositions: {max(proposition_counts)}")


if __name__ == "__main__":
    run_batch(num_games=10, seed_start=100)
