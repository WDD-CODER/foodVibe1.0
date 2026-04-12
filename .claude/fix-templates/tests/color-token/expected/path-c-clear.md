path: C
action: Add --cv-divider-accent: #2dd4bf to the component :host block, replace with var(--cv-divider-accent).
reasoning: #2dd4bf has no matching token in styles.scss. Used in one file only. "Decorative divider" is page-specific with no clear global semantic name — local --cv-* token in the component :host block is correct.
