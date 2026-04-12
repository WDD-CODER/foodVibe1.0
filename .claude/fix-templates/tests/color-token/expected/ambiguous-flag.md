path: FLAG
action: Do not fix — #000 with no surrounding context is too ambiguous to determine correct token.
reasoning: #000 as a text color with no background, no parent selector, and no usage hint. Could be body text, could be overlay text, could be anything. The template says #fff/#000 with no colored background in the same rule block → FLAG.
