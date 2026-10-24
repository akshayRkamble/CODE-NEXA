# Sliding windows for substring questions

A sliding window maintains a contiguous range while scanning left to right. For longest unique substring, keep a map from character to its most recent index. When a repeated character lies inside the range, advance the left boundary to one position after its previous location. Never move the left boundary backward. Update the best width after adjusting the range.

With a hash map, each character enters the range once and expected runtime is O(n). Space depends on the character set.

Source: NexaCode learning notes · Sliding Window
