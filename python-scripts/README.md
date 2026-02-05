# Clue Logic Game

A Clue-like deduction game using sympy for logical reasoning.

## Game Mechanics

- Multiple people (names), each doing something unique
- Each person's activity involves: technology, place, company, institution, food, material
- Propositions gradually reveal what people were doing through logical constraints
- The "killer" is identified through logical deduction

## Key Constraints

1. Each person has a unique "signature" (combination of attributes)
2. Propositions gradually narrow down possibilities
3. Some propositions are "alibis" - if person X was at place Y, they can't be the killer
4. The killer's full signature is only revealed when all other possibilities are eliminated

## Proposition Generation Strategy

- Propositions are consistent with ground truth
- Feasibility is checked before adding (reject if it makes problem infeasible)
- Generation continues until exactly one possible killer remains
- Propositions include: simple statements, disjunctions, implications, and direct eliminations

## Performance Notes

- The game runs until convergence (no arbitrary proposition limit)
- As propositions increase, probability of multiple possibilities converges to zero
- The difficulty is an NP-hard SAT problem, making it a proper brain teaser

## Running Tests

```bash
python test_clue_game.py
```
