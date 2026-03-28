import {
  RestoreChoiceModalService
} from "./chunk-FUKBAJ6Z.js";
import {
  LoaderComponent
} from "./chunk-TR2OKVKA.js";
import {
  LucideAngularModule
} from "./chunk-JROUPDH4.js";
import {
  TranslatePipe
} from "./chunk-Z6OI3YDQ.js";
import {
  VersionHistoryService
} from "./chunk-ACTKISJR.js";
import {
  UserMsgService
} from "./chunk-WYZGJ7UG.js";
import {
  ChangeDetectionStrategy,
  CommonModule,
  Component,
  Router,
  __async,
  effect,
  inject,
  input,
  output,
  setClassMetadata,
  signal,
  ɵsetClassDebugInfo,
  ɵɵadvance,
  ɵɵattribute,
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
  ɵɵrepeater,
  ɵɵrepeaterCreate,
  ɵɵresetView,
  ɵɵrestoreView,
  ɵɵtemplate,
  ɵɵtext,
  ɵɵtextInterpolate,
  ɵɵtextInterpolate1,
  ɵɵtextInterpolate2
} from "./chunk-GCYOWW7U.js";

// src/app/shared/version-history-panel/version-history-panel.component.ts
var _forTrack0 = ($index, $item) => $item.versionAt;
function VersionHistoryPanelComponent_Conditional_8_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "app-loader", 3);
  }
}
function VersionHistoryPanelComponent_Conditional_9_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "p", 4);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(ctx_r0.loadError());
  }
}
function VersionHistoryPanelComponent_Conditional_10_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "p", 5);
    \u0275\u0275text(1);
    \u0275\u0275pipe(2, "translatePipe");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(2, 1, "history_no_versions"));
  }
}
function VersionHistoryPanelComponent_Conditional_11_For_2_Conditional_4_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 9);
    \u0275\u0275text(1);
    \u0275\u0275pipe(2, "translatePipe");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const entry_r3 = \u0275\u0275nextContext().$implicit;
    \u0275\u0275advance();
    \u0275\u0275textInterpolate2("", entry_r3.changes == null ? null : entry_r3.changes.length, " ", \u0275\u0275pipeBind1(2, 2, "activity_updated"), "");
  }
}
function VersionHistoryPanelComponent_Conditional_11_For_2_Template(rf, ctx) {
  if (rf & 1) {
    const _r2 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "li", 7)(1, "span", 8);
    \u0275\u0275text(2);
    \u0275\u0275pipe(3, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275template(4, VersionHistoryPanelComponent_Conditional_11_For_2_Conditional_4_Template, 3, 4, "span", 9);
    \u0275\u0275elementStart(5, "div", 10)(6, "button", 11);
    \u0275\u0275listener("click", function VersionHistoryPanelComponent_Conditional_11_For_2_Template_button_click_6_listener() {
      const entry_r3 = \u0275\u0275restoreView(_r2).$implicit;
      const ctx_r0 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r0.viewVersion(entry_r3));
    });
    \u0275\u0275text(7);
    \u0275\u0275pipe(8, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(9, "button", 12);
    \u0275\u0275listener("click", function VersionHistoryPanelComponent_Conditional_11_For_2_Template_button_click_9_listener() {
      const entry_r3 = \u0275\u0275restoreView(_r2).$implicit;
      const ctx_r0 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r0.restore(entry_r3));
    });
    \u0275\u0275text(10);
    \u0275\u0275pipe(11, "translatePipe");
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const entry_r3 = ctx.$implicit;
    const ctx_r0 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate2("", \u0275\u0275pipeBind1(3, 5, "history_version_at"), ": ", ctx_r0.formatDate(entry_r3.versionAt), "");
    \u0275\u0275advance(2);
    \u0275\u0275conditional((entry_r3.changes == null ? null : entry_r3.changes.length) ? 4 : -1);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(8, 7, "history_view_version"), " ");
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(11, 9, "history_restore"), " ");
  }
}
function VersionHistoryPanelComponent_Conditional_11_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "ul", 6);
    \u0275\u0275repeaterCreate(1, VersionHistoryPanelComponent_Conditional_11_For_2_Template, 12, 11, "li", 7, _forTrack0);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275repeater(ctx_r0.versions());
  }
}
var VersionHistoryPanelComponent = class _VersionHistoryPanelComponent {
  versionHistory = inject(VersionHistoryService);
  restoreChoiceModal = inject(RestoreChoiceModalService);
  userMsg = inject(UserMsgService);
  router = inject(Router);
  entityType = input.required();
  entityId = input.required();
  entityName = input("");
  /** When set (e.g. from trash), call this before restoreVersion so the entity is back in the main list. */
  recoverBeforeRestore = input();
  closed = output();
  restored = output();
  versions = signal([]);
  loading = signal(false);
  loadError = signal(null);
  constructor() {
    effect(() => {
      const type = this.entityType();
      const id = this.entityId();
      if (type && id)
        this.loadVersions(type, id);
    });
  }
  loadVersions(entityType, entityId) {
    return __async(this, null, function* () {
      this.loading.set(true);
      this.loadError.set(null);
      try {
        const list = yield this.versionHistory.getVersions(entityType, entityId);
        this.versions.set(list);
      } catch {
        this.loadError.set("\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D8\u05E2\u05D9\u05E0\u05EA \u05D4\u05D2\u05E8\u05E1\u05D0\u05D5\u05EA");
      } finally {
        this.loading.set(false);
      }
    });
  }
  formatDate(ts) {
    return new Date(ts).toLocaleString("he-IL", {
      dateStyle: "short",
      timeStyle: "short"
    });
  }
  viewVersion(entry) {
    this.closed.emit();
    this.router.navigate(["/recipe-builder"], {
      queryParams: {
        view: "history",
        entityType: this.entityType(),
        entityId: this.entityId(),
        versionAt: entry.versionAt
      }
    });
  }
  restore(entry) {
    return __async(this, null, function* () {
      const choice = yield this.restoreChoiceModal.open();
      if (choice === null)
        return;
      try {
        if (choice === "replace") {
          const recoverFirst = this.recoverBeforeRestore();
          if (recoverFirst)
            yield recoverFirst();
          yield this.versionHistory.restoreVersion(this.entityType(), this.entityId(), entry.versionAt);
          this.userMsg.onSetSuccessMsg("\u05D4\u05D2\u05E8\u05E1\u05D4 \u05E9\u05D5\u05D7\u05D6\u05E8\u05D4");
        } else {
          yield this.versionHistory.addVersionAsNewRecipe(this.entityType(), this.entityId(), entry.versionAt);
          this.userMsg.onSetSuccessMsg("\u05E0\u05D5\u05E6\u05E8 \u05DE\u05EA\u05DB\u05D5\u05DF \u05D7\u05D3\u05E9 \u05DE\u05D4\u05D2\u05E8\u05E1\u05D4");
        }
        this.restored.emit();
        this.closed.emit();
      } catch {
        this.userMsg.onSetErrorMsg("\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05E9\u05D7\u05D6\u05D5\u05E8 \u05D4\u05D2\u05E8\u05E1\u05D4");
      }
    });
  }
  close() {
    this.closed.emit();
  }
  static \u0275fac = function VersionHistoryPanelComponent_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _VersionHistoryPanelComponent)();
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _VersionHistoryPanelComponent, selectors: [["app-version-history-panel"]], inputs: { entityType: [1, "entityType"], entityId: [1, "entityId"], entityName: [1, "entityName"], recoverBeforeRestore: [1, "recoverBeforeRestore"] }, outputs: { closed: "closed", restored: "restored" }, decls: 12, vars: 7, consts: [["dir", "rtl", 1, "version-history-panel"], [1, "panel-header"], ["type", "button", 1, "c-btn-ghost--sm", 3, "click"], ["size", "medium", "label", "loader_loading"], [1, "panel-error"], [1, "panel-empty"], [1, "version-list"], [1, "version-item"], [1, "version-date"], [1, "version-summary"], [1, "version-actions"], ["type", "button", 1, "btn-view", 3, "click"], ["type", "button", 1, "btn-restore", 3, "click"]], template: function VersionHistoryPanelComponent_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275elementStart(0, "div", 0)(1, "div", 1)(2, "h3");
      \u0275\u0275text(3);
      \u0275\u0275pipe(4, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(5, "button", 2);
      \u0275\u0275pipe(6, "translatePipe");
      \u0275\u0275listener("click", function VersionHistoryPanelComponent_Template_button_click_5_listener() {
        return ctx.close();
      });
      \u0275\u0275text(7, "\xD7");
      \u0275\u0275elementEnd()();
      \u0275\u0275template(8, VersionHistoryPanelComponent_Conditional_8_Template, 1, 0, "app-loader", 3)(9, VersionHistoryPanelComponent_Conditional_9_Template, 2, 1, "p", 4)(10, VersionHistoryPanelComponent_Conditional_10_Template, 3, 3, "p", 5)(11, VersionHistoryPanelComponent_Conditional_11_Template, 3, 0, "ul", 6);
      \u0275\u0275elementEnd();
    }
    if (rf & 2) {
      \u0275\u0275advance(3);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(4, 3, "history"));
      \u0275\u0275advance(2);
      \u0275\u0275attribute("aria-label", \u0275\u0275pipeBind1(6, 5, "close"));
      \u0275\u0275advance(3);
      \u0275\u0275conditional(ctx.loading() ? 8 : ctx.loadError() ? 9 : ctx.versions().length === 0 ? 10 : 11);
    }
  }, dependencies: [CommonModule, LucideAngularModule, TranslatePipe, LoaderComponent], styles: ["\n\n.version-history-panel[_ngcontent-%COMP%] {\n  min-width: 17.5rem;\n  max-width: 25rem;\n  padding: 1rem;\n  background: var(--bg-glass-strong);\n  border: 1px solid var(--border-glass);\n  border-radius: var(--radius-xl);\n  box-shadow: var(--shadow-modal);\n  backdrop-filter: var(--blur-modal);\n  -webkit-backdrop-filter: var(--blur-modal);\n}\n.panel-header[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  margin-block-end: 0.75rem;\n}\n.panel-header[_ngcontent-%COMP%]   h3[_ngcontent-%COMP%] {\n  margin: 0;\n  font-size: 1rem;\n  font-weight: 600;\n  color: var(--color-text-main);\n}\n.panel-header[_ngcontent-%COMP%]   .c-btn-ghost--sm[_ngcontent-%COMP%] {\n  min-width: 2rem;\n  padding-inline: 0.25rem;\n  padding-block: 0;\n  font-size: 1.25rem;\n  line-height: 1;\n}\n.panel-loading[_ngcontent-%COMP%], \n.panel-empty[_ngcontent-%COMP%] {\n  margin: 0;\n  padding-block: 0.5rem;\n  padding-inline: 0;\n  color: var(--color-text-muted);\n  font-size: 0.875rem;\n}\n.version-list[_ngcontent-%COMP%] {\n  margin: 0;\n  padding: 0;\n  list-style: none;\n}\n.version-item[_ngcontent-%COMP%] {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: center;\n  gap: 0.5rem;\n  padding-block: 0.5rem;\n  padding-inline: 0;\n  border-block-end: 1px solid var(--border-default);\n}\n.version-item[_ngcontent-%COMP%]:last-child {\n  border-block-end: none;\n}\n.version-date[_ngcontent-%COMP%] {\n  flex: 1 1 100%;\n  font-size: 0.8125rem;\n  color: var(--color-text-muted);\n}\n.version-summary[_ngcontent-%COMP%] {\n  font-size: 0.75rem;\n  color: var(--color-text-muted-light);\n}\n.version-actions[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 0.5rem;\n  flex: 1 1 100%;\n  margin-block-start: 0.25rem;\n}\n.btn-view[_ngcontent-%COMP%] {\n  padding-block: 0.3rem;\n  padding-inline: 0.6rem;\n  background: var(--bg-glass);\n  color: var(--color-primary);\n  font-size: 0.75rem;\n  border: 1px solid var(--border-focus);\n  border-radius: var(--radius-sm);\n  cursor: pointer;\n  transition: background 0.2s ease;\n}\n.btn-view[_ngcontent-%COMP%]:hover {\n  background: var(--color-primary-soft);\n}\n.btn-restore[_ngcontent-%COMP%] {\n  padding-block: 0.3rem;\n  padding-inline: 0.6rem;\n  background: var(--bg-warning);\n  color: var(--text-warning);\n  font-size: 0.75rem;\n  border: 1px solid var(--border-warning);\n  border-radius: var(--radius-sm);\n  cursor: pointer;\n  transition: background 0.2s ease;\n}\n.btn-restore[_ngcontent-%COMP%]:hover {\n  background: var(--bg-warning);\n  filter: brightness(1.05);\n}\n@media (max-width: 768px) {\n  .version-history-panel[_ngcontent-%COMP%] {\n    width: 100%;\n    min-width: 0;\n    max-width: calc(100vw - 2rem);\n  }\n  .version-actions[_ngcontent-%COMP%] {\n    flex-wrap: wrap;\n  }\n}\n/*# sourceMappingURL=version-history-panel.component.css.map */"], changeDetection: 0 });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(VersionHistoryPanelComponent, [{
    type: Component,
    args: [{ selector: "app-version-history-panel", standalone: true, imports: [CommonModule, LucideAngularModule, TranslatePipe, LoaderComponent], changeDetection: ChangeDetectionStrategy.OnPush, template: `<div class="version-history-panel" dir="rtl">\r
  <div class="panel-header">\r
    <h3>{{ 'history' | translatePipe }}</h3>\r
    <button type="button" class="c-btn-ghost--sm" (click)="close()" [attr.aria-label]="'close' | translatePipe">\xD7</button>\r
  </div>\r
  @if (loading()) {\r
    <app-loader size="medium" label="loader_loading" />\r
  } @else if (loadError()) {\r
    <p class="panel-error">{{ loadError() }}</p>\r
  } @else if (versions().length === 0) {\r
    <p class="panel-empty">{{ 'history_no_versions' | translatePipe }}</p>\r
  } @else {\r
    <ul class="version-list">\r
      @for (entry of versions(); track entry.versionAt) {\r
        <li class="version-item">\r
          <span class="version-date">{{ 'history_version_at' | translatePipe }}: {{ formatDate(entry.versionAt) }}</span>\r
          @if (entry.changes?.length) {\r
            <span class="version-summary">{{ entry.changes?.length }} {{ 'activity_updated' | translatePipe }}</span>\r
          }\r
          <div class="version-actions">\r
            <button type="button" class="btn-view" (click)="viewVersion(entry)">\r
              {{ 'history_view_version' | translatePipe }}\r
            </button>\r
            <button type="button" class="btn-restore" (click)="restore(entry)">\r
              {{ 'history_restore' | translatePipe }}\r
            </button>\r
          </div>\r
        </li>\r
      }\r
    </ul>\r
  }\r
</div>\r
`, styles: ["/* src/app/shared/version-history-panel/version-history-panel.component.scss */\n.version-history-panel {\n  min-width: 17.5rem;\n  max-width: 25rem;\n  padding: 1rem;\n  background: var(--bg-glass-strong);\n  border: 1px solid var(--border-glass);\n  border-radius: var(--radius-xl);\n  box-shadow: var(--shadow-modal);\n  backdrop-filter: var(--blur-modal);\n  -webkit-backdrop-filter: var(--blur-modal);\n}\n.panel-header {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  margin-block-end: 0.75rem;\n}\n.panel-header h3 {\n  margin: 0;\n  font-size: 1rem;\n  font-weight: 600;\n  color: var(--color-text-main);\n}\n.panel-header .c-btn-ghost--sm {\n  min-width: 2rem;\n  padding-inline: 0.25rem;\n  padding-block: 0;\n  font-size: 1.25rem;\n  line-height: 1;\n}\n.panel-loading,\n.panel-empty {\n  margin: 0;\n  padding-block: 0.5rem;\n  padding-inline: 0;\n  color: var(--color-text-muted);\n  font-size: 0.875rem;\n}\n.version-list {\n  margin: 0;\n  padding: 0;\n  list-style: none;\n}\n.version-item {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: center;\n  gap: 0.5rem;\n  padding-block: 0.5rem;\n  padding-inline: 0;\n  border-block-end: 1px solid var(--border-default);\n}\n.version-item:last-child {\n  border-block-end: none;\n}\n.version-date {\n  flex: 1 1 100%;\n  font-size: 0.8125rem;\n  color: var(--color-text-muted);\n}\n.version-summary {\n  font-size: 0.75rem;\n  color: var(--color-text-muted-light);\n}\n.version-actions {\n  display: flex;\n  gap: 0.5rem;\n  flex: 1 1 100%;\n  margin-block-start: 0.25rem;\n}\n.btn-view {\n  padding-block: 0.3rem;\n  padding-inline: 0.6rem;\n  background: var(--bg-glass);\n  color: var(--color-primary);\n  font-size: 0.75rem;\n  border: 1px solid var(--border-focus);\n  border-radius: var(--radius-sm);\n  cursor: pointer;\n  transition: background 0.2s ease;\n}\n.btn-view:hover {\n  background: var(--color-primary-soft);\n}\n.btn-restore {\n  padding-block: 0.3rem;\n  padding-inline: 0.6rem;\n  background: var(--bg-warning);\n  color: var(--text-warning);\n  font-size: 0.75rem;\n  border: 1px solid var(--border-warning);\n  border-radius: var(--radius-sm);\n  cursor: pointer;\n  transition: background 0.2s ease;\n}\n.btn-restore:hover {\n  background: var(--bg-warning);\n  filter: brightness(1.05);\n}\n@media (max-width: 768px) {\n  .version-history-panel {\n    width: 100%;\n    min-width: 0;\n    max-width: calc(100vw - 2rem);\n  }\n  .version-actions {\n    flex-wrap: wrap;\n  }\n}\n/*# sourceMappingURL=version-history-panel.component.css.map */\n"] }]
  }], () => [], null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(VersionHistoryPanelComponent, { className: "VersionHistoryPanelComponent", filePath: "src/app/shared/version-history-panel/version-history-panel.component.ts", lineNumber: 27 });
})();

export {
  VersionHistoryPanelComponent
};
//# sourceMappingURL=chunk-TJGMQCI6.js.map
