import {
  ClickOutSideDirective
} from "./chunk-MG3FUR2W.js";
import {
  CommonModule,
  Component,
  ViewEncapsulation,
  output,
  setClassMetadata,
  ɵsetClassDebugInfo,
  ɵɵdefineComponent,
  ɵɵelementEnd,
  ɵɵelementStart,
  ɵɵlistener,
  ɵɵprojection,
  ɵɵprojectionDef
} from "./chunk-FJPSXAXA.js";

// src/app/shared/export-toolbar-overlay/export-toolbar-overlay.component.ts
var _c0 = ["*"];
var ExportToolbarOverlayComponent = class _ExportToolbarOverlayComponent {
  /** Emitted when user clicks outside the overlay (e.g. to close). */
  closeRequest = output();
  static \u0275fac = function ExportToolbarOverlayComponent_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _ExportToolbarOverlayComponent)();
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _ExportToolbarOverlayComponent, selectors: [["app-export-toolbar-overlay"]], outputs: { closeRequest: "closeRequest" }, ngContentSelectors: _c0, decls: 3, vars: 0, consts: [[1, "export-toolbar-overlay", "no-print", 3, "clickOutside"], [1, "toolbar-export-grid", 3, "click"]], template: function ExportToolbarOverlayComponent_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275projectionDef();
      \u0275\u0275elementStart(0, "div", 0);
      \u0275\u0275listener("clickOutside", function ExportToolbarOverlayComponent_Template_div_clickOutside_0_listener() {
        return ctx.closeRequest.emit();
      });
      \u0275\u0275elementStart(1, "div", 1);
      \u0275\u0275listener("click", function ExportToolbarOverlayComponent_Template_div_click_1_listener($event) {
        return $event.stopPropagation();
      });
      \u0275\u0275projection(2);
      \u0275\u0275elementEnd()();
    }
  }, dependencies: [CommonModule, ClickOutSideDirective], styles: ["/* src/app/shared/export-toolbar-overlay/export-toolbar-overlay.component.scss */\n.export-toolbar-overlay {\n  position: fixed;\n  display: flex;\n  inset-inline: 0;\n  top: -10px;\n  z-index: 250;\n  align-items: center;\n  justify-content: center;\n  min-height: 4.5rem;\n  padding-inline: 1.25rem;\n  padding-block: 0.75rem;\n  backdrop-filter: blur(1px);\n  border-block-end: 1px solid var(--border-default);\n}\n.export-toolbar-overlay .toolbar-export-grid {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: center;\n  justify-content: center;\n  gap: 0.625rem;\n}\n.export-toolbar-overlay .toolbar-glass-btn {\n  display: inline-flex;\n  align-items: center;\n  gap: 0.4rem;\n  padding-inline: 0.85rem;\n  padding-block: 0.55rem;\n  font-size: 0.8125rem;\n  font-weight: 500;\n  color: var(--color-text-main);\n  background: var(--bg-pure);\n  border: 1px solid var(--border-default);\n  border-radius: var(--radius-md);\n  cursor: pointer;\n  transition: background 0.2s ease, border-color 0.2s ease;\n}\n.export-toolbar-overlay .toolbar-glass-btn:hover {\n  background: var(--bg-muted);\n  border-color: var(--border-strong);\n}\n.export-toolbar-overlay .toolbar-glass-btn.icon {\n  padding-inline: 0.5rem;\n  padding-block: 0.5rem;\n}\n.export-toolbar-overlay .toolbar-glass-btn.save {\n  background: #22b29a;\n  color: var(--color-text-on-primary);\n  border-color: #22b29a;\n  font-weight: 600;\n}\n.export-toolbar-overlay .toolbar-glass-btn.save:hover:not(:disabled) {\n  background: #1ea088;\n}\n.export-toolbar-overlay .view-export-wrap,\n.export-toolbar-overlay .checklist-export-wrap {\n  position: relative;\n  display: inline-flex;\n  align-items: center;\n}\n.export-toolbar-overlay .view-export-modal {\n  position: absolute;\n  top: 100%;\n  inset-inline-start: 0;\n  margin-block-start: 0.35rem;\n  z-index: 10;\n  display: flex;\n  flex-direction: column;\n  min-width: 8rem;\n  padding: 0.25rem;\n  background: var(--bg-glass-strong);\n  border: 1px solid var(--border-glass);\n  border-radius: var(--radius-md);\n  backdrop-filter: var(--blur-nav);\n  -webkit-backdrop-filter: var(--blur-nav);\n  box-shadow: var(--shadow-glass);\n}\n.export-toolbar-overlay .view-export-option {\n  display: flex;\n  align-items: center;\n  gap: 0.4rem;\n  padding-inline: 0.65rem;\n  padding-block: 0.5rem;\n  font-size: 0.8rem;\n  font-weight: 500;\n  color: var(--color-text-secondary);\n  text-align: start;\n  background: transparent;\n  border: none;\n  border-radius: var(--radius-sm);\n  cursor: pointer;\n  transition: background 0.2s ease;\n}\n.export-toolbar-overlay .view-export-option:hover {\n  background: var(--bg-glass-hover);\n}\n.export-toolbar-overlay .checklist-export-dropdown {\n  position: absolute;\n  top: 100%;\n  inset-inline-end: 0;\n  margin-block-start: 0.35rem;\n  z-index: 10;\n  min-width: 10rem;\n  padding: 0.35rem;\n  background: var(--bg-glass-strong);\n  border: 1px solid var(--border-glass);\n  border-radius: var(--radius-md);\n  backdrop-filter: var(--blur-nav);\n  -webkit-backdrop-filter: var(--blur-nav);\n  box-shadow: var(--shadow-glass);\n}\n.export-toolbar-overlay .checklist-export-option-row {\n  display: flex;\n  align-items: center;\n  padding: 0.4rem 0.5rem;\n  gap: 0.375rem;\n}\n.export-toolbar-overlay .checklist-export-option-label {\n  flex: 1;\n  font-size: 0.875rem;\n  color: var(--color-text-main);\n  text-align: right;\n}\n.export-toolbar-overlay .checklist-export-option-row .toolbar-glass-btn.icon {\n  padding-inline: 0.35rem;\n  padding-block: 0.35rem;\n}\n/*# sourceMappingURL=export-toolbar-overlay.component.css.map */\n"], encapsulation: 2 });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(ExportToolbarOverlayComponent, [{
    type: Component,
    args: [{ selector: "app-export-toolbar-overlay", standalone: true, imports: [CommonModule, ClickOutSideDirective], encapsulation: ViewEncapsulation.None, template: '<div class="export-toolbar-overlay no-print" (clickOutside)="closeRequest.emit()">\r\n  <div class="toolbar-export-grid" (click)="$event.stopPropagation()">\r\n    <ng-content></ng-content>\r\n  </div>\r\n</div>\r\n', styles: ["/* src/app/shared/export-toolbar-overlay/export-toolbar-overlay.component.scss */\n.export-toolbar-overlay {\n  position: fixed;\n  display: flex;\n  inset-inline: 0;\n  top: -10px;\n  z-index: 250;\n  align-items: center;\n  justify-content: center;\n  min-height: 4.5rem;\n  padding-inline: 1.25rem;\n  padding-block: 0.75rem;\n  backdrop-filter: blur(1px);\n  border-block-end: 1px solid var(--border-default);\n}\n.export-toolbar-overlay .toolbar-export-grid {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: center;\n  justify-content: center;\n  gap: 0.625rem;\n}\n.export-toolbar-overlay .toolbar-glass-btn {\n  display: inline-flex;\n  align-items: center;\n  gap: 0.4rem;\n  padding-inline: 0.85rem;\n  padding-block: 0.55rem;\n  font-size: 0.8125rem;\n  font-weight: 500;\n  color: var(--color-text-main);\n  background: var(--bg-pure);\n  border: 1px solid var(--border-default);\n  border-radius: var(--radius-md);\n  cursor: pointer;\n  transition: background 0.2s ease, border-color 0.2s ease;\n}\n.export-toolbar-overlay .toolbar-glass-btn:hover {\n  background: var(--bg-muted);\n  border-color: var(--border-strong);\n}\n.export-toolbar-overlay .toolbar-glass-btn.icon {\n  padding-inline: 0.5rem;\n  padding-block: 0.5rem;\n}\n.export-toolbar-overlay .toolbar-glass-btn.save {\n  background: #22b29a;\n  color: var(--color-text-on-primary);\n  border-color: #22b29a;\n  font-weight: 600;\n}\n.export-toolbar-overlay .toolbar-glass-btn.save:hover:not(:disabled) {\n  background: #1ea088;\n}\n.export-toolbar-overlay .view-export-wrap,\n.export-toolbar-overlay .checklist-export-wrap {\n  position: relative;\n  display: inline-flex;\n  align-items: center;\n}\n.export-toolbar-overlay .view-export-modal {\n  position: absolute;\n  top: 100%;\n  inset-inline-start: 0;\n  margin-block-start: 0.35rem;\n  z-index: 10;\n  display: flex;\n  flex-direction: column;\n  min-width: 8rem;\n  padding: 0.25rem;\n  background: var(--bg-glass-strong);\n  border: 1px solid var(--border-glass);\n  border-radius: var(--radius-md);\n  backdrop-filter: var(--blur-nav);\n  -webkit-backdrop-filter: var(--blur-nav);\n  box-shadow: var(--shadow-glass);\n}\n.export-toolbar-overlay .view-export-option {\n  display: flex;\n  align-items: center;\n  gap: 0.4rem;\n  padding-inline: 0.65rem;\n  padding-block: 0.5rem;\n  font-size: 0.8rem;\n  font-weight: 500;\n  color: var(--color-text-secondary);\n  text-align: start;\n  background: transparent;\n  border: none;\n  border-radius: var(--radius-sm);\n  cursor: pointer;\n  transition: background 0.2s ease;\n}\n.export-toolbar-overlay .view-export-option:hover {\n  background: var(--bg-glass-hover);\n}\n.export-toolbar-overlay .checklist-export-dropdown {\n  position: absolute;\n  top: 100%;\n  inset-inline-end: 0;\n  margin-block-start: 0.35rem;\n  z-index: 10;\n  min-width: 10rem;\n  padding: 0.35rem;\n  background: var(--bg-glass-strong);\n  border: 1px solid var(--border-glass);\n  border-radius: var(--radius-md);\n  backdrop-filter: var(--blur-nav);\n  -webkit-backdrop-filter: var(--blur-nav);\n  box-shadow: var(--shadow-glass);\n}\n.export-toolbar-overlay .checklist-export-option-row {\n  display: flex;\n  align-items: center;\n  padding: 0.4rem 0.5rem;\n  gap: 0.375rem;\n}\n.export-toolbar-overlay .checklist-export-option-label {\n  flex: 1;\n  font-size: 0.875rem;\n  color: var(--color-text-main);\n  text-align: right;\n}\n.export-toolbar-overlay .checklist-export-option-row .toolbar-glass-btn.icon {\n  padding-inline: 0.35rem;\n  padding-block: 0.35rem;\n}\n/*# sourceMappingURL=export-toolbar-overlay.component.css.map */\n"] }]
  }], null, null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(ExportToolbarOverlayComponent, { className: "ExportToolbarOverlayComponent", filePath: "src/app/shared/export-toolbar-overlay/export-toolbar-overlay.component.ts", lineNumber: 13 });
})();

export {
  ExportToolbarOverlayComponent
};
//# sourceMappingURL=chunk-GUPBSHPJ.js.map
