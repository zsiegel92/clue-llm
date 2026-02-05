"""Single-token strings loaded from JSON for Clue game."""

import json
from pathlib import Path
from typing import TypedDict


class SingleTokenStrings(TypedDict):
    """Type definition for single-token strings data."""

    technologies: list[str]
    places: list[str]
    companies: list[str]
    institutions: list[str]
    foods: list[str]
    materials: list[str]
    names: list[str]
    lastNames: list[str]


def load_single_token_strings() -> SingleTokenStrings:
    """Load single-token strings from JSON file."""
    # Path to the JSON file relative to this script
    json_path = Path(__file__).parent.parent / "lib" / "single-token-strings.json"

    with json_path.open() as f:
        data: SingleTokenStrings = json.load(f)

    return data


# Load the data once at module import time
_data = load_single_token_strings()

# Export individual categories
technologies: list[str] = _data["technologies"]
places: list[str] = _data["places"]
companies: list[str] = _data["companies"]
institutions: list[str] = _data["institutions"]
foods: list[str] = _data["foods"]
materials: list[str] = _data["materials"]
names: list[str] = _data["names"]
last_names: list[str] = _data["lastNames"]
