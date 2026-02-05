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

from clue_models import DEFAULT_CONFIG
from generate_clue_game import (
    create_game,
    generate_game_until_unique_solution,
    print_scenario,
    setup_scenario,
)


def run_batch(num_games: int = 10, seed_start: int = 0):
    """Run multiple games and report statistics."""
    print(f"\n{'=' * 60}")
    print(f"RUNNING {num_games} GAMES")
    print(f"{'=' * 60}\n")

    correct_count = 0
    proposition_counts = []

    for i in range(num_games):
        print(f"Game {i + 1}/{num_games}:")

        # Create and setup game
        game = create_game(DEFAULT_CONFIG, seed=seed_start + i)
        setup_scenario(game)
        print_scenario(game)

        # Generate propositions until unique solution
        killer = generate_game_until_unique_solution(game, verbose=False)

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
