"""Integration tests for Clue logic game."""

from clue_models import DEFAULT_CONFIG
from generate_clue_game import (
    create_game,
    generate_game_until_unique_solution,
    print_scenario,
    setup_scenario,
)
from solver import check_solution_count


def test_generate_and_solve_game():
    """Test that a generated game has a unique solution."""
    # Create and setup game
    game = create_game(DEFAULT_CONFIG, seed=42)
    setup_scenario(game)

    # Print scenario for visibility
    print_scenario(game)

    # Generate propositions until unique solution
    identified_killer = generate_game_until_unique_solution(game, verbose=True)

    # Verify the solution
    count, possible_killers = check_solution_count(game)

    # Assertions
    assert count == 1, f"Expected 1 possible killer, got {count}: {possible_killers}"
    assert identified_killer == game.killer, (
        f"Identified {identified_killer} but actual killer is {game.killer}"
    )
    assert possible_killers[0] == game.killer, (
        f"Solver found {possible_killers[0]} but actual killer is {game.killer}"
    )

    print("\n✅ Test passed: Unique solution found and verified!")
    return True


def test_batch_games(num_games: int = 10, seed_start: int = 0):
    """Test multiple game generations."""
    print(f"\n{'=' * 60}")
    print(f"RUNNING {num_games} GAME TESTS")
    print(f"{'=' * 60}\n")

    all_passed = True
    correct_count = 0
    proposition_counts = []

    for i in range(num_games):
        print(f"Game {i + 1}/{num_games}:")

        # Create and setup game
        game = create_game(DEFAULT_CONFIG, seed=seed_start + i)
        setup_scenario(game)
        print_scenario(game)

        # Generate propositions until unique solution
        identified_killer = generate_game_until_unique_solution(game, verbose=False)

        # Verify the solution
        count, possible_killers = check_solution_count(game)

        # Check assertions
        if count != 1:
            print(
                f"  ❌ FAILED: Expected 1 possible killer, got {count}: {possible_killers}"
            )
            all_passed = False
        elif identified_killer != game.killer:
            print(
                f"  ❌ FAILED: Identified {identified_killer} but actual killer is {game.killer}"
            )
            all_passed = False
        else:
            print(f"  ✅ PASSED: Correctly identified {game.killer}")
            correct_count += 1

        proposition_counts.append(len(game.propositions))
        print(f"     Propositions: {len(game.propositions)}\n")

    # Summary
    print(f"{'=' * 60}")
    print("TEST SUMMARY")
    print(f"{'=' * 60}")
    print(f"Passed: {correct_count}/{num_games}")
    print(f"Avg propositions: {sum(proposition_counts) / len(proposition_counts):.1f}")
    print(f"Min propositions: {min(proposition_counts)}")
    print(f"Max propositions: {max(proposition_counts)}")

    assert all_passed, f"Only {correct_count}/{num_games} tests passed"
    print("\n✅ All tests passed!")


if __name__ == "__main__":
    # Run a single test first
    print("Running single game test...\n")
    test_generate_and_solve_game()

    # Run batch tests
    print("\n" + "=" * 60)
    test_batch_games(num_games=5, seed_start=100)
