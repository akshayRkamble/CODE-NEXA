# Hash maps and complements

For pair lookup tasks, scan the input once and record each value's index. For a current value x and target t, check whether t - x is in the map before recording x. This prevents reusing one array position. Expected time is O(n) and extra space is O(n).

Negative numbers work with ordinary subtraction. Duplicate values form a pair only at distinct indices. If the prompt promises a result, return as soon as the pair is found.

Source: NexaCode learning notes · Arrays & Hashing
