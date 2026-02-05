"""Simple test of multi-file Python code blocks."""

from simple_utils import add, greet

print("Testing multi-file imports...")
print(greet("World"))
print(f"2 + 3 = {add(2, 3)}")
print("✅ Multi-file import test passed!")
