from sympy import (
    symbols,  #
    Implies,
    Symbol,
)
from sympy.logic.boolalg import to_cnf, to_int_repr
from sympy.abc import A, B

C: Symbol = symbols("C")
D: Symbol = symbols("D")
E, F = symbols("E F")

expr = Implies(A, B) & (C | D)
cnf = to_cnf(expr, simplify=True)
cnf2 = to_cnf(expr, simplify=True, force=True)
print(cnf)
ir = to_int_repr(cnf.args, [A, B, C, D])
print(ir)
