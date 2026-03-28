import {
  TranslatePipe
} from "./chunk-Z6OI3YDQ.js";
import "./chunk-OYT4PDSG.js";
import {
  ChangeDetectionStrategy,
  Component,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
  setClassMetadata,
  signal,
  ɵsetClassDebugInfo,
  ɵɵadvance,
  ɵɵdefineComponent,
  ɵɵelement,
  ɵɵelementEnd,
  ɵɵelementStart,
  ɵɵpipe,
  ɵɵpipeBind1,
  ɵɵproperty,
  ɵɵrepeater,
  ɵɵrepeaterCreate,
  ɵɵtext,
  ɵɵtextInterpolate1
} from "./chunk-GCYOWW7U.js";

// src/app/pages/equipment/equipment.page.ts
var _forTrack0 = ($index, $item) => $item.path;
function EquipmentPage_For_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "a", 1);
    \u0275\u0275text(1);
    \u0275\u0275pipe(2, "translatePipe");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const item_r1 = ctx.$implicit;
    \u0275\u0275property("routerLink", item_r1.path);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(2, 2, item_r1.labelKey), " ");
  }
}
var EquipmentPage = class _EquipmentPage {
  navRoutes_ = signal([
    { labelKey: "equipment_list", path: "list" },
    { labelKey: "add_equipment", path: "add" }
  ]);
  static \u0275fac = function EquipmentPage_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _EquipmentPage)();
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _EquipmentPage, selectors: [["app-equipment-page"]], decls: 4, vars: 0, consts: [["dir", "rtl", 1, "equipment-nav"], ["routerLinkActive", "active", 1, "nav-link", 3, "routerLink"]], template: function EquipmentPage_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275elementStart(0, "nav", 0);
      \u0275\u0275repeaterCreate(1, EquipmentPage_For_2_Template, 3, 4, "a", 1, _forTrack0);
      \u0275\u0275elementEnd();
      \u0275\u0275element(3, "router-outlet");
    }
    if (rf & 2) {
      \u0275\u0275advance();
      \u0275\u0275repeater(ctx.navRoutes_());
    }
  }, dependencies: [RouterOutlet, RouterLink, RouterLinkActive, TranslatePipe], styles: ['@charset "UTF-8";\n\n\n\n[_nghost-%COMP%] {\n  display: block;\n  padding: 1.25rem;\n}\n.equipment-nav[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 0.75rem;\n  align-items: center;\n  padding-block: 0.75rem;\n  margin-block-end: 1.25rem;\n  border-block-end: 1px solid var(--border-default);\n}\n.equipment-nav[_ngcontent-%COMP%]   .nav-link[_ngcontent-%COMP%] {\n  display: inline-flex;\n  padding-inline: 1rem;\n  padding-block: 0.5rem;\n  background: var(--bg-glass);\n  color: var(--color-text-muted);\n  text-decoration: none;\n  border: 1px solid var(--border-default);\n  border-radius: var(--radius-full);\n  backdrop-filter: var(--blur-glass);\n  cursor: pointer;\n  transition:\n    background 0.2s ease,\n    color 0.2s ease,\n    border-color 0.2s ease;\n}\n.equipment-nav[_ngcontent-%COMP%]   .nav-link[_ngcontent-%COMP%]:hover {\n  background: var(--bg-glass-hover);\n  color: var(--color-text-main);\n}\n.equipment-nav[_ngcontent-%COMP%]   .nav-link.active[_ngcontent-%COMP%] {\n  background: var(--color-primary);\n  color: var(--color-text-on-primary);\n  border-color: var(--color-primary);\n  font-weight: 600;\n  box-shadow: var(--shadow-glow);\n}\n/*# sourceMappingURL=equipment.page.css.map */'], changeDetection: 0 });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(EquipmentPage, [{
    type: Component,
    args: [{ selector: "app-equipment-page", standalone: true, imports: [RouterOutlet, RouterLink, RouterLinkActive, TranslatePipe], changeDetection: ChangeDetectionStrategy.OnPush, template: '<nav class="equipment-nav" dir="rtl">\r\n  @for (item of navRoutes_(); track item.path) {\r\n    <a [routerLink]="item.path" routerLinkActive="active" class="nav-link">\r\n      {{ item.labelKey | translatePipe }}\r\n    </a>\r\n  }\r\n</nav>\r\n<router-outlet></router-outlet>\r\n', styles: ['@charset "UTF-8";\n\n/* src/app/pages/equipment/equipment.page.scss */\n:host {\n  display: block;\n  padding: 1.25rem;\n}\n.equipment-nav {\n  display: flex;\n  gap: 0.75rem;\n  align-items: center;\n  padding-block: 0.75rem;\n  margin-block-end: 1.25rem;\n  border-block-end: 1px solid var(--border-default);\n}\n.equipment-nav .nav-link {\n  display: inline-flex;\n  padding-inline: 1rem;\n  padding-block: 0.5rem;\n  background: var(--bg-glass);\n  color: var(--color-text-muted);\n  text-decoration: none;\n  border: 1px solid var(--border-default);\n  border-radius: var(--radius-full);\n  backdrop-filter: var(--blur-glass);\n  cursor: pointer;\n  transition:\n    background 0.2s ease,\n    color 0.2s ease,\n    border-color 0.2s ease;\n}\n.equipment-nav .nav-link:hover {\n  background: var(--bg-glass-hover);\n  color: var(--color-text-main);\n}\n.equipment-nav .nav-link.active {\n  background: var(--color-primary);\n  color: var(--color-text-on-primary);\n  border-color: var(--color-primary);\n  font-weight: 600;\n  box-shadow: var(--shadow-glow);\n}\n/*# sourceMappingURL=equipment.page.css.map */\n'] }]
  }], null, null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(EquipmentPage, { className: "EquipmentPage", filePath: "src/app/pages/equipment/equipment.page.ts", lineNumber: 13 });
})();
export {
  EquipmentPage
};
//# sourceMappingURL=chunk-J5UPS2YN.js.map
