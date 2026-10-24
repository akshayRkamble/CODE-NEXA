# Stacks and bracket matching

A stack fits tasks where the most recent unmatched item must be handled first. On an opening bracket, push its type. On a closing bracket, reject an empty stack or a type mismatch; otherwise pop. A valid string ends with an empty stack. The scan takes O(n) time and O(n) worst-case space.

Checking only the count of opening and closing brackets misses ordering errors. Check bracket type and check for leftover open brackets at the end.

Source: NexaCode learning notes · Stack
