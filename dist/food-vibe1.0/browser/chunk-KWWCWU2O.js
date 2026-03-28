import {
  toSignal
} from "./chunk-4LOKEQAU.js";
import {
  LucideAngularComponent,
  LucideAngularModule
} from "./chunk-JROUPDH4.js";
import {
  TranslatePipe
} from "./chunk-Z6OI3YDQ.js";
import "./chunk-OYT4PDSG.js";
import {
  ChangeDetectionStrategy,
  Component,
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
  filter,
  inject,
  map,
  setClassMetadata,
  signal,
  startWith,
  ɵsetClassDebugInfo,
  ɵɵadvance,
  ɵɵconditional,
  ɵɵdefineComponent,
  ɵɵelement,
  ɵɵelementEnd,
  ɵɵelementStart,
  ɵɵgetCurrentView,
  ɵɵlistener,
  ɵɵnextContext,
  ɵɵpipe,
  ɵɵpipeBind1,
  ɵɵproperty,
  ɵɵrepeater,
  ɵɵrepeaterCreate,
  ɵɵresetView,
  ɵɵrestoreView,
  ɵɵtemplate,
  ɵɵtext,
  ɵɵtextInterpolate1
} from "./chunk-GCYOWW7U.js";

// src/app/pages/venues/venues.page.ts
var _forTrack0 = ($index, $item) => $item.path;
function VenuesPage_Conditional_0_For_6_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "a", 3);
    \u0275\u0275text(1);
    \u0275\u0275pipe(2, "translatePipe");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const item_r3 = ctx.$implicit;
    \u0275\u0275property("routerLink", item_r3.path);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(2, 2, item_r3.labelKey), " ");
  }
}
function VenuesPage_Conditional_0_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "nav", 0)(1, "button", 1);
    \u0275\u0275listener("click", function VenuesPage_Conditional_0_Template_button_click_1_listener() {
      \u0275\u0275restoreView(_r1);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.goBackToList());
    });
    \u0275\u0275element(2, "lucide-icon", 2);
    \u0275\u0275text(3);
    \u0275\u0275pipe(4, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275repeaterCreate(5, VenuesPage_Conditional_0_For_6_Template, 3, 4, "a", 3, _forTrack0);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(4, 1, "venue_list"), " ");
    \u0275\u0275advance(2);
    \u0275\u0275repeater(ctx_r1.navRoutes_());
  }
}
var VenuesPage = class _VenuesPage {
  router = inject(Router);
  navRoutes_ = signal([
    { labelKey: "add_venue", path: "add" }
  ]);
  isListRoute_ = toSignal(this.router.events.pipe(filter((e) => e instanceof NavigationEnd), map(() => this.router.url.startsWith("/venues/list")), startWith(this.router.url.startsWith("/venues/list"))));
  goBackToList() {
    this.router.navigate(["/venues/list"]);
  }
  static \u0275fac = function VenuesPage_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _VenuesPage)();
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _VenuesPage, selectors: [["app-venues-page"]], decls: 2, vars: 1, consts: [["dir", "rtl", 1, "venues-nav"], ["type", "button", 1, "nav-link", "nav-link--back", 3, "click"], ["name", "arrow-right", "size", "16"], ["routerLinkActive", "active", 1, "nav-link", 3, "routerLink"]], template: function VenuesPage_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275template(0, VenuesPage_Conditional_0_Template, 7, 3, "nav", 0);
      \u0275\u0275element(1, "router-outlet");
    }
    if (rf & 2) {
      \u0275\u0275conditional(!ctx.isListRoute_() ? 0 : -1);
    }
  }, dependencies: [RouterOutlet, RouterLink, RouterLinkActive, LucideAngularModule, LucideAngularComponent, TranslatePipe], styles: ['@charset "UTF-8";\n\n\n\n[_nghost-%COMP%] {\n  display: block;\n  padding: 1.25rem;\n}\n.venues-nav[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 0.75rem;\n  align-items: center;\n  padding-block: 0.75rem;\n  margin-block-end: 1.25rem;\n  border-block-end: 1px solid var(--border-default);\n}\n.venues-nav[_ngcontent-%COMP%]   .nav-link[_ngcontent-%COMP%] {\n  display: inline-flex;\n  padding-inline: 1rem;\n  padding-block: 0.5rem;\n  background: var(--bg-glass);\n  color: var(--color-text-muted);\n  text-decoration: none;\n  border: 1px solid var(--border-default);\n  border-radius: var(--radius-full);\n  backdrop-filter: var(--blur-glass);\n  cursor: pointer;\n  transition:\n    background 0.2s ease,\n    color 0.2s ease,\n    border-color 0.2s ease;\n}\n.venues-nav[_ngcontent-%COMP%]   .nav-link[_ngcontent-%COMP%]:hover {\n  background: var(--bg-glass-hover);\n  color: var(--color-text-main);\n}\n.venues-nav[_ngcontent-%COMP%]   .nav-link.active[_ngcontent-%COMP%] {\n  background: var(--color-primary);\n  color: var(--color-text-on-primary);\n  border-color: var(--color-primary);\n  font-weight: 600;\n  box-shadow: var(--shadow-glow);\n}\n.venues-nav[_ngcontent-%COMP%]   .nav-link--back[_ngcontent-%COMP%] {\n  color: var(--color-primary);\n  border-color: color-mix(in srgb, var(--color-primary) 30%, transparent);\n  gap: 0.375rem;\n}\n.venues-nav[_ngcontent-%COMP%]   .nav-link--back[_ngcontent-%COMP%]:hover {\n  color: var(--color-primary-hover);\n  border-color: var(--color-primary);\n}\n/*# sourceMappingURL=venues.page.css.map */'], changeDetection: 0 });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(VenuesPage, [{
    type: Component,
    args: [{ selector: "app-venues-page", standalone: true, imports: [RouterOutlet, RouterLink, RouterLinkActive, LucideAngularModule, TranslatePipe], changeDetection: ChangeDetectionStrategy.OnPush, template: `@if (!isListRoute_()) {\r
  <nav class="venues-nav" dir="rtl">\r
    <button type="button" class="nav-link nav-link--back" (click)="goBackToList()">\r
      <lucide-icon name="arrow-right" size="16"></lucide-icon>\r
      {{ 'venue_list' | translatePipe }}\r
    </button>\r
    @for (item of navRoutes_(); track item.path) {\r
      <a [routerLink]="item.path" routerLinkActive="active" class="nav-link">\r
        {{ item.labelKey | translatePipe }}\r
      </a>\r
    }\r
  </nav>\r
}\r
<router-outlet></router-outlet>\r
`, styles: ['@charset "UTF-8";\n\n/* src/app/pages/venues/venues.page.scss */\n:host {\n  display: block;\n  padding: 1.25rem;\n}\n.venues-nav {\n  display: flex;\n  gap: 0.75rem;\n  align-items: center;\n  padding-block: 0.75rem;\n  margin-block-end: 1.25rem;\n  border-block-end: 1px solid var(--border-default);\n}\n.venues-nav .nav-link {\n  display: inline-flex;\n  padding-inline: 1rem;\n  padding-block: 0.5rem;\n  background: var(--bg-glass);\n  color: var(--color-text-muted);\n  text-decoration: none;\n  border: 1px solid var(--border-default);\n  border-radius: var(--radius-full);\n  backdrop-filter: var(--blur-glass);\n  cursor: pointer;\n  transition:\n    background 0.2s ease,\n    color 0.2s ease,\n    border-color 0.2s ease;\n}\n.venues-nav .nav-link:hover {\n  background: var(--bg-glass-hover);\n  color: var(--color-text-main);\n}\n.venues-nav .nav-link.active {\n  background: var(--color-primary);\n  color: var(--color-text-on-primary);\n  border-color: var(--color-primary);\n  font-weight: 600;\n  box-shadow: var(--shadow-glow);\n}\n.venues-nav .nav-link--back {\n  color: var(--color-primary);\n  border-color: color-mix(in srgb, var(--color-primary) 30%, transparent);\n  gap: 0.375rem;\n}\n.venues-nav .nav-link--back:hover {\n  color: var(--color-primary-hover);\n  border-color: var(--color-primary);\n}\n/*# sourceMappingURL=venues.page.css.map */\n'] }]
  }], null, null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(VenuesPage, { className: "VenuesPage", filePath: "src/app/pages/venues/venues.page.ts", lineNumber: 16 });
})();
export {
  VenuesPage
};
//# sourceMappingURL=chunk-KWWCWU2O.js.map
