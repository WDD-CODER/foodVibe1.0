path: REAL VIOLATION
action: Flag for manual fix — add takeUntilDestroyed() or migrate to toSignal().
reasoning: valueChanges is a persistent stream that never completes on its own. The .subscribe() in ngOnInit has no takeUntilDestroyed, no takeUntil, no take(1), and is not an HttpClient call. The subscription will leak when the component is destroyed.
