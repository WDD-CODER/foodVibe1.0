# Center main loader in viewport

## Root cause

The "main big loader" is used in two places with `[overlay]="true"` and `size="large"`:

- **app.component.html** — route loading: `@if (isRouteLoading()) { <app-loader size="large" label="loader_please_wait" [overlay]="true" /> }`
- **metadata-manager.page.component.html** — "Cooking up" demo loader

In loader.component.scss, the overlay is styled as:

```scss
&.overlay {
  position: absolute;
  inset: 0;
  z-index: 50;
  // ... glass styles
}
```

So the overlay is **positioned relative to its containing block** (`.app-content` in the app root). `.app-content` has `position: relative` but **no min-height** (commented out in app.component.scss). During route changes the content area can be short or not yet laid out, so:

- The overlay only covers `.app-content`, not the full viewport.
- Centering is "center of `.app-content`", which may be a small or odd-shaped region, so the loader can appear off-center or not in the "middle of the app".

## Approach

Make the **overlay variant** of the loader viewport-relative and ensure it stacks above the main chrome (e.g. header) so the loader is always in the true center of the screen.

1. **Use fixed positioning for overlay** — In loader.component.scss, for `.loader-wrap.overlay` change `position: absolute` to `position: fixed` and keep `inset: 0`. The existing flex rules on `.loader-wrap` will then center the pot and label in the **viewport**.
2. **Raise z-index for overlay** — Header uses `z-index: 100`. Set overlay `z-index` to `150` so the full-screen overlay covers content and header consistently.
3. **Overlay border-radius** — Set `border-radius: 0` for full-bleed overlay (no meaningful parent to inherit from when fixed).
4. **Compliance** — SCSS edits follow cssLayer skill (five-group vertical rhythm, tokens). Changes limited to the `.loader-wrap.overlay` block.

## Files to change

| File | Change |
|------|--------|
| src/app/shared/loader/loader.component.scss | In `&.overlay`: set `position: fixed`, keep `inset: 0`, set `z-index: 150`, set `border-radius: 0`. |

No template or TypeScript changes. All existing usages of `<app-loader [overlay]="true" />` will automatically get viewport-centered behavior.

## Verification

- Trigger route navigation and confirm the large "Please wait" loader appears centered in the viewport.
- Open metadata-manager and confirm the "Cooking up" overlay loader is also centered in the viewport.
- Confirm small/medium inline loaders are unchanged.
