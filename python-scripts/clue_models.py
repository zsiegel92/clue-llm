"""Pydantic models for the Clue logic game."""

from typing import Any

from pydantic import BaseModel, Field


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


# Default game configuration
DEFAULT_CONFIG = GameConfig(
    names=["Joe", "John", "Bob", "Will"],
    technologies=["Python", "Java", "Ruby"],
    places=["China", "India", "France"],
    companies=["Google", "Facebook", "Amazon", "Netflix"],
    institutions=["church", "library", "court"],
    foods=["pizza", "beer", "toast"],
    materials=["wood", "cement", "glass"],
)
