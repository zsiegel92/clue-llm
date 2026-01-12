from sympy import (
    symbols,  #
    Implies,
    And,
    Or,
    Symbol,
)
from sympy.logic.boolalg import to_cnf, to_int_repr
from sympy.abc import A, B
from sympy.logic.inference import satisfiable

C: Symbol = symbols("C")
D: Symbol = symbols("D")
E, F = symbols("E F")

expr = Implies(A, B) & (C | D)
cnf = to_cnf(expr, simplify=True)
cnf2 = to_cnf(expr, simplify=True, force=True)
print(cnf)
ir = to_int_repr(cnf.args, [A, B, C, D])
print(ir)

sol = satisfiable(cnf)

print(f"Solution: {sol}")

expr2 = Or(And(A, B), And(C, D))
cnf2 = to_cnf(expr2, simplify=True, force=True)
print(cnf2)
ir2 = to_int_repr(cnf2.args, [A, B, C, D])
print(ir2)

sol2 = satisfiable(cnf2)
print(f"Solution: {sol2}")
