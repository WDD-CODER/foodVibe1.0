path: B
action: Create --color-star-rating: #f59e0b in styles.scss, replace with var(--color-star-rating).
reasoning: #f59e0b has no matching token in styles.scss. The context (star rating) gives a clear semantic name. Even if used in one file now, star ratings are a pattern likely to appear elsewhere — global token is correct.
