path: A
action: Replace #fff with var(--color-text-on-primary) — colored background present in same rule block.
reasoning: #fff sits on a var(--color-danger) background in the same rule block. The template rule says #fff with a colored background context clue → use existing --color-text-on-primary. Not ambiguous.
