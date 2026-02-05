"""Pydantic models for the Clue logic game."""

from enum import StrEnum
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


class PropositionType(StrEnum):
    """Types of propositions in the Clue game."""

    PERSON_AND_ATTRIBUTE = "person_and_attribute"
    PERSON_OR_PERSON = "person_or_person"
    PERSON_ATTRIBUTE_IMPLIES_NOT_KILLER = "person_attribute_implies_not_killer"
    COMPLEX_OR = "complex_or"
    DIRECT_ELIMINATION = "direct_elimination"


class PersonActivity(BaseModel):
    """Activities for a single person."""

    technology: str
    place: str
    company: str
    institution: str
    food: str
    material: str

    model_config = {"frozen": True}


class PropositionData(BaseModel):
    """Structured data for a single proposition."""

    prop_type: PropositionType
    # Data fields that may or may not be present depending on prop_type
    person: str | None = None
    person1: str | None = None
    person2: str | None = None
    attr_category: str | None = None
    attr1_cat: str | None = None
    attr2_cat: str | None = None
    value: str | None = None
    val1: str | None = None
    val2: str | None = None
    mat1: str | None = None
    food2: str | None = None
    inst2: str | None = None

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
    propositions: list[tuple[Any, PropositionData]] = Field(default_factory=list)
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
    names=names,  # Joe, John, Bob, Will
    technologies=technologies,  # Python, Java, Ruby
    places=places,  # China, India, France
    companies=companies,  # Google, Facebook, Amazon, Twitter
    institutions=institutions,  # government, company, system
    foods=foods,  # pizza, bread, fish
    materials=materials,  # wood, metal, steel
)
