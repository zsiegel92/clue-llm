"""Simple integration test for Clue logic game."""

from clue_models import DEFAULT_CONFIG
from generate_clue_game import (
    create_game,
    generate_game_until_unique_solution,
    setup_scenario,
)
from solver import check_solution_count
from ui import print_propositions, print_scenario


def test_generate_and_solve_game():
    """Test that a generated game has a unique solution."""
    print("Running single game test...")

    # Create and setup game
    game = create_game(DEFAULT_CONFIG, seed=42)
    setup_scenario(game)

    # Print scenario for visibility
    print_scenario(game)

    # Generate propositions until unique solution
    identified_killer = generate_game_until_unique_solution(game, verbose=True)

    # Print the full game record
    print("\n" + "=" * 60)
    print("GAME RECORD")
    print("=" * 60)
    print_propositions(game, verbose=True)
    print()

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

    print("✅ Test passed: Unique solution found and verified!")
    return True


if __name__ == "__main__":
    test_generate_and_solve_game()
