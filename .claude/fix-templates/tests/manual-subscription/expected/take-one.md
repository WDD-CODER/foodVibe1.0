path: SAFE
action: Discard — take(1) ensures the observable completes after one emission.
reasoning: The pipe chain includes take(1), which auto-completes the subscription after a single value. No memory leak possible. Not a violation.
