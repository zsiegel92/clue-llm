"""Pydantic models for the Clue logic game."""

from typing import Any

from pydantic import BaseModel, Field

from single_token_strings import (
    companies,
    foods,
    institutions,
    materials,
    names,
    places,
    technologies,
)


class PersonActivity(BaseModel):
    """Activities for a single person."""

    technology: str
    place: str
    company: str
    institution: str
    food: str
    material: str

    model_config = {"frozen": True}


class ClueGame(BaseModel):
    """Complete state of a Clue logic game."""

    # Game configuration
    names: list[str]
    technologies: list[str]
    places: list[str]
    companies: list[str]
    institutions: list[str]
    foods: list[str]
    materials: list[str]

    # Sympy symbols for logic
    symbols_map: dict[str, Any] = Field(default_factory=dict)

    # Ground truth
    ground_truth: dict[str, PersonActivity] = Field(default_factory=dict)
    killer: str = ""

    # Propositions and knowledge
    propositions: list[tuple[Any, str]] = Field(default_factory=list)
    knowledge_base: list[Any] = Field(default_factory=list)

    model_config = {"arbitrary_types_allowed": True}


class GameConfig(BaseModel):
    """Configuration for game generation."""

    names: list[str]
    technologies: list[str]
    places: list[str]
    companies: list[str]
    institutions: list[str]
    foods: list[str]
    materials: list[str]

    model_config = {"frozen": True}


# Default game configuration using subset of single-token strings
DEFAULT_CONFIG = GameConfig(
    names=names[:4],  # Joe, John, Bob, Will
    technologies=technologies[:3],  # Python, Java, Ruby
    places=places[:3],  # China, India, France
    companies=companies[:4],  # Google, Facebook, Amazon, Twitter
    institutions=institutions[:3],  # government, company, system
    foods=foods[:3],  # pizza, bread, fish
    materials=materials[:3],  # wood, metal, steel
)
