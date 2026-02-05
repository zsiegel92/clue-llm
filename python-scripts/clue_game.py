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
from typing import Any
from sympy import symbols, Implies, And, Or, Not, Symbol
from sympy.logic.inference import satisfiable

# Small subsets for each category
TECHNOLOGIES = ["Python", "Java", "Ruby"]
PLACES = ["China", "India", "France"]
COMPANIES = ["Google", "Facebook", "Amazon", "Netflix"]
INSTITUTIONS = ["church", "library", "court"]
FOODS = ["pizza", "beer", "toast"]
MATERIALS = ["wood", "cement", "glass"]
NAMES = ["Joe", "John", "Bob", "Will"]


class ClueGame:
    def __init__(self, seed: int | None = None):
        if seed is not None:
            random.seed(seed)

        self.names = NAMES
        self.technologies = TECHNOLOGIES
        self.places = PLACES
        self.companies = COMPANIES
        self.institutions = INSTITUTIONS
        self.foods = FOODS
        self.materials = MATERIALS

        # Create symbols for each person-attribute combination
        # e.g., "Joe_cement" means "Joe was with cement"
        self.symbols_map: dict[str, Symbol] = {}
        self._create_symbols()

        # Ground truth: what each person actually did
        self.ground_truth: dict[str, dict[str, str]] = {}
        self.killer: str = ""
        self.propositions: list[tuple[Any, str]] = []
        self.knowledge_base: list[Any] = []

    def _create_symbols(self) -> None:
        """Create sympy symbols for each person-attribute combination."""
        for name in self.names:
            for material in self.materials:
                key = f"{name}_{material}"
                self.symbols_map[key] = symbols(key)
            for institution in self.institutions:
                key = f"{name}_{institution}"
                self.symbols_map[key] = symbols(key)
            for food in self.foods:
                key = f"{name}_{food}"
                self.symbols_map[key] = symbols(key)
            for place in self.places:
                key = f"{name}_{place}"
                self.symbols_map[key] = symbols(key)
            for company in self.companies:
                key = f"{name}_{company}"
                self.symbols_map[key] = symbols(key)
            for tech in self.technologies:
                key = f"{name}_{tech}"
                self.symbols_map[key] = symbols(key)

        # Also create symbols for "is_killer"
        for name in self.names:
            key = f"{name}_is_killer"
            self.symbols_map[key] = symbols(key)

    def setup_scenario(self) -> None:
        """Create a scenario where each person has activities and one is the killer."""
        # Assign each person activities (with some overlap for challenge)
        for name in self.names:
            self.ground_truth[name] = {
                "technology": random.choice(self.technologies),
                "place": random.choice(self.places),
                "company": random.choice(self.companies),
                "institution": random.choice(self.institutions),
                "food": random.choice(self.foods),
                "material": random.choice(self.materials),
            }

        # Pick the killer
        self.killer = random.choice(self.names)
        print(f"🎯 Ground truth: {self.killer} is the killer")
        print("🔍 Full scenario:")
        for name, activity in self.ground_truth.items():
            marker = "🔪" if name == self.killer else "✅"
            print(f"  {marker} {name}: {activity}")
        print()

        # Set up initial constraints: exactly one killer
        killer_symbols = [self.symbols_map[f"{name}_is_killer"] for name in self.names]
        # At least one killer
        at_least_one = Or(*killer_symbols)
        self.knowledge_base.append(at_least_one)

        # At most one killer (if X is killer, others are not)
        for i, name1 in enumerate(self.names):
            for name2 in self.names[i + 1 :]:
                not_both = Not(
                    And(
                        self.symbols_map[f"{name1}_is_killer"],
                        self.symbols_map[f"{name2}_is_killer"],
                    )
                )
                self.knowledge_base.append(not_both)

    def generate_proposition(self) -> tuple[Any, str] | None:
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
            person = random.choice(self.names)
            attr_category = random.choice(["material", "institution", "food", "place"])
            actual_value = self.ground_truth[person][attr_category]

            # Create the sympy expression
            symbol_key = f"{person}_{actual_value}"
            if symbol_key not in self.symbols_map:
                return None

            proposition = self.symbols_map[symbol_key]
            description = f"{person} was with {actual_value}"

            return (proposition, description)

        elif prop_type == "person_or_person":
            # "Either Joe was at library OR John was with cement"
            person1 = random.choice(self.names)
            person2 = random.choice([n for n in self.names if n != person1])

            attr1_cat = random.choice(["material", "institution", "food"])
            attr2_cat = random.choice(["material", "institution", "food"])

            val1 = self.ground_truth[person1][attr1_cat]
            val2 = self.ground_truth[person2][attr2_cat]

            sym1 = self.symbols_map.get(f"{person1}_{val1}")
            sym2 = self.symbols_map.get(f"{person2}_{val2}")

            if sym1 is None or sym2 is None:
                return None

            proposition = Or(sym1, sym2)
            description = f"({person1} with {val1}) OR ({person2} with {val2})"

            return (proposition, description)

        elif prop_type == "person_attribute_implies_not_killer":
            # "If Joe was at church, Joe is not the killer" (alibi)
            # Pick a non-killer to give an alibi to
            innocent_people = [n for n in self.names if n != self.killer]
            if not innocent_people:
                return None

            person = random.choice(innocent_people)
            attr_cat = random.choice(["material", "institution", "food"])
            val = self.ground_truth[person][attr_cat]

            person_attr_sym = self.symbols_map.get(f"{person}_{val}")
            killer_sym = self.symbols_map[f"{person}_is_killer"]

            if person_attr_sym is None:
                return None

            # If person was with attribute, they're not the killer
            proposition = Implies(person_attr_sym, Not(killer_sym))
            description = f"If {person} was with {val}, then {person} is not the killer"

            return (proposition, description)

        elif prop_type == "complex_or":
            # Complex: "(Will and cement) OR (Joe and beer and library)"
            person1 = random.choice(self.names)
            person2 = random.choice([n for n in self.names if n != person1])

            mat1 = self.ground_truth[person1]["material"]
            food2 = self.ground_truth[person2]["food"]
            inst2 = self.ground_truth[person2]["institution"]

            sym1 = self.symbols_map.get(f"{person1}_{mat1}")
            sym2_food = self.symbols_map.get(f"{person2}_{food2}")
            sym2_inst = self.symbols_map.get(f"{person2}_{inst2}")

            if sym1 is None or sym2_food is None or sym2_inst is None:
                return None

            proposition = Or(sym1, And(sym2_food, sym2_inst))
            description = (
                f"({person1} with {mat1}) OR ({person2} with {food2} and {inst2})"
            )

            return (proposition, description)

        elif prop_type == "direct_elimination":
            # Directly eliminate someone who is not the killer
            # This helps the game converge by explicitly clearing innocents
            # OPTIMIZATION: Only target innocents who are still possible suspects
            _, possible_suspects = self.check_solution_count()
            innocent_suspects = [n for n in possible_suspects if n != self.killer]

            if not innocent_suspects:
                # All remaining suspects are the true killer, we're done
                return None

            person = random.choice(innocent_suspects)

            # Give them an alibi by stating they were somewhere
            attr_cat = random.choice(["material", "institution", "food"])
            val = self.ground_truth[person][attr_cat]

            person_attr_sym = self.symbols_map.get(f"{person}_{val}")
            killer_sym = self.symbols_map[f"{person}_is_killer"]

            if person_attr_sym is None:
                return None

            # Both: person was there AND if they were there, they're not the killer
            proposition = And(
                person_attr_sym, Implies(person_attr_sym, Not(killer_sym))
            )
            description = f"{person} was with {val} (alibi: not the killer)"

            return (proposition, description)

        return None

    def check_solution_count(self) -> tuple[int, list[str]]:
        """
        Count how many possible killers remain given current knowledge.

        Uses sympy's satisfiable() to check each person.
        """
        if not self.knowledge_base:
            return len(self.names), self.names

        # Combine all knowledge
        combined_knowledge = And(*self.knowledge_base)

        possible_killers = []

        # For each person, check if "person is killer" is satisfiable
        for name in self.names:
            killer_sym = self.symbols_map[f"{name}_is_killer"]
            # Check if this person being the killer is consistent with our knowledge
            test_expr = And(combined_knowledge, killer_sym)

            solution = satisfiable(test_expr)

            if solution is not False:
                # This person could be the killer
                possible_killers.append(name)

        return len(possible_killers), possible_killers

    def is_feasible_with_proposition(self, proposition_expr: Any) -> bool:
        """
        Check if adding this proposition would keep the problem feasible.

        CRITICAL: To guarantee 100% convergence to the correct answer, this checks
        that the TRUE killer (self.killer) remains a possible solution after adding
        the proposition. This ensures we never accidentally eliminate the correct answer.

        Returns True if the true killer can still be the killer after adding this proposition.
        """
        # Test the knowledge base with this new proposition
        test_kb = self.knowledge_base + [proposition_expr]
        combined = And(*test_kb)

        # CRITICAL: Check if the TRUE killer is still possible after adding this proposition
        # This guarantees we never eliminate the correct answer
        true_killer_sym = self.symbols_map[f"{self.killer}_is_killer"]
        test_expr = And(combined, true_killer_sym)

        solution = satisfiable(test_expr)

        # Return True only if the TRUE killer remains a valid possibility
        return solution is not False

    def play_game(self, verbose: bool = True) -> str:
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
            verbose: Whether to print progress

        Returns the identified killer's name.
        """
        self.setup_scenario()

        propositions_generated = 0
        attempts = 0
        max_attempts = 1000  # Safety limit to prevent infinite loops

        # Continue until we find exactly one killer
        while attempts < max_attempts:
            attempts += 1

            # Generate a candidate proposition
            prop = self.generate_proposition()
            if prop is None:
                continue

            proposition_expr, desc = prop

            # Check if this proposition would make the problem infeasible
            if not self.is_feasible_with_proposition(proposition_expr):
                if verbose:
                    print(f"❌ Rejected (infeasible): {desc}")
                continue

            # Add to knowledge base (it's feasible)
            self.knowledge_base.append(proposition_expr)
            self.propositions.append(prop)
            propositions_generated += 1

            if verbose:
                print(f"📜 Proposition {propositions_generated}: {desc}")

            # Check if we've narrowed it down to a unique solution
            try:
                count, possible = self.check_solution_count()
                if verbose:
                    print(f"   → {count} possible suspect(s): {possible}")

                if count == 1:
                    identified = possible[0]
                    if verbose:
                        print(
                            f"\n🎉 Solved after {propositions_generated} propositions!"
                        )
                        print(f"   Identified killer: {identified}")
                        print(f"   Actual killer: {self.killer}")
                        correct = "✅" if identified == self.killer else "❌"
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
        count, possible = self.check_solution_count()
        if verbose:
            print(
                f"\n⚠️  Hit safety attempt limit ({max_attempts}) without converging!"
            )
            print(f"   This indicates a bug - should always converge eventually")
            print(f"   Propositions generated: {propositions_generated}")
            print(f"   Possible killers: {possible}")
            print(f"   Actual killer: {self.killer}")

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
        game = ClueGame(seed=seed_start + i)
        killer = game.play_game(verbose=False)

        correct = killer == game.killer
        correct_count += correct
        proposition_counts.append(len(game.propositions))

        status = "✅" if correct else "❌"
        print(
            f"  {status} Actual: {game.killer}, Identified: {killer}, Props: {len(game.propositions)}\n"
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
