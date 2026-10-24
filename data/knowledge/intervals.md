# Merging ranges

Sort intervals by start value. Visit them in order and compare each interval with the end of the last output interval. If the new start is at or before that end, replace the output end with the larger end. Otherwise append a new range. Sorting dominates at O(n log n); the merge pass is O(n).

Decide whether touching endpoints count as overlap. For closed ranges, [a,b] and [b,c] touch and are commonly merged.

Source: NexaCode learning notes · Intervals
