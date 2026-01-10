import time
import numpy as np

print(np.array([1, 2, 3]))

for i in range(5):
    time.sleep(0.1)
    print(f"Hello, World, from the server! {i}")
