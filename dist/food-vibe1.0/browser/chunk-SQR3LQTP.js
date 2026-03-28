import {
  CarouselHeaderColumnDirective,
  CarouselHeaderComponent,
  CellCarouselComponent,
  CellCarouselSlideDirective,
  ListRowCheckboxComponent,
  ListSelectionState,
  ListShellComponent,
  SelectionBarComponent,
  getPanelOpen,
  setPanelOpen
} from "./chunk-WQAH7QWB.js";
import {
  StringParam,
  StringSetParam,
  useListState
} from "./chunk-TM2E3L5G.js";
import {
  HeroFabService
} from "./chunk-6DTZ43TT.js";
import {
  VenueDataService
} from "./chunk-UJ4TV5QR.js";
import {
  RequireAuthService
} from "./chunk-D637KIHB.js";
import {
  DefaultValueAccessor,
  FormsModule,
  NgControlStatus,
  NgModel
} from "./chunk-CA2J44DF.js";
import {
  LoaderComponent
} from "./chunk-G7HPFFIH.js";
import {
  LucideAngularComponent,
  LucideAngularModule
} from "./chunk-XDVMM5TS.js";
import {
  TranslatePipe,
  TranslationService
} from "./chunk-CH6HZ4GZ.js";
import {
  UserService
} from "./chunk-NQ7PICSF.js";
import {
  UserMsgService
} from "./chunk-Z3W6FQFP.js";
import {
  LoggingService
} from "./chunk-ZMFT5D5F.js";
import {
  ChangeDetectionStrategy,
  CommonModule,
  Component,
  Router,
  __async,
  __spreadProps,
  __spreadValues,
  afterNextRender,
  computed,
  inject,
  output,
  setClassMetadata,
  signal,
  ɵsetClassDebugInfo,
  ɵɵadvance,
  ɵɵattribute,
  ɵɵconditional,
  ɵɵdefineComponent,
  ɵɵelement,
  ɵɵelementContainerEnd,
  ɵɵelementContainerStart,
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
  ɵɵrepeaterTrackByIdentity,
  ɵɵresetView,
  ɵɵrestoreView,
  ɵɵtemplate,
  ɵɵtext,
  ɵɵtextInterpolate,
  ɵɵtextInterpolate1
} from "./chunk-FJPSXAXA.js";

// src/app/pages/venues/components/venue-list/venue-list.component.ts
var _forTrack0 = ($index, $item) => $item._id;
function VenueListComponent_Conditional_40_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 22);
    \u0275\u0275text(1);
    \u0275\u0275pipe(2, "translatePipe");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(2, 1, "no_venues_match"));
  }
}
function VenueListComponent_For_42_Conditional_16_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "app-loader", 40);
  }
  if (rf & 2) {
    \u0275\u0275property("inline", true);
  }
}
function VenueListComponent_For_42_Conditional_17_Template(rf, ctx) {
  if (rf & 1) {
    const _r4 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 43);
    \u0275\u0275pipe(1, "translatePipe");
    \u0275\u0275pipe(2, "translatePipe");
    \u0275\u0275listener("click", function VenueListComponent_For_42_Conditional_17_Template_button_click_0_listener($event) {
      \u0275\u0275restoreView(_r4);
      const item_r2 = \u0275\u0275nextContext().$implicit;
      const ctx_r2 = \u0275\u0275nextContext();
      ctx_r2.onDelete(item_r2);
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275element(3, "lucide-icon", 44);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext(2);
    \u0275\u0275property("disabled", !ctx_r2.isLoggedIn());
    \u0275\u0275attribute("aria-label", \u0275\u0275pipeBind1(1, 4, "delete"))("title", !ctx_r2.isLoggedIn() ? \u0275\u0275pipeBind1(2, 6, "sign_in_to_use") : null);
    \u0275\u0275advance(3);
    \u0275\u0275property("size", 18);
  }
}
function VenueListComponent_For_42_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 32);
    \u0275\u0275listener("click", function VenueListComponent_For_42_Template_div_click_0_listener($event) {
      const item_r2 = \u0275\u0275restoreView(_r1).$implicit;
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.onRowClick(item_r2, $event));
    })("keydown.enter", function VenueListComponent_For_42_Template_div_keydown_enter_0_listener() {
      const item_r2 = \u0275\u0275restoreView(_r1).$implicit;
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.onEdit(item_r2._id));
    })("keydown.space", function VenueListComponent_For_42_Template_div_keydown_space_0_listener($event) {
      const item_r2 = \u0275\u0275restoreView(_r1).$implicit;
      const ctx_r2 = \u0275\u0275nextContext();
      $event.preventDefault();
      return \u0275\u0275resetView(ctx_r2.onEdit(item_r2._id));
    });
    \u0275\u0275elementStart(1, "div", 33);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "app-cell-carousel", 34)(4, "div", 35);
    \u0275\u0275pipe(5, "translatePipe");
    \u0275\u0275text(6);
    \u0275\u0275pipe(7, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(8, "div", 36);
    \u0275\u0275pipe(9, "translatePipe");
    \u0275\u0275text(10);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(11, "div", 37)(12, "button", 38);
    \u0275\u0275pipe(13, "translatePipe");
    \u0275\u0275pipe(14, "translatePipe");
    \u0275\u0275listener("click", function VenueListComponent_For_42_Template_button_click_12_listener($event) {
      const item_r2 = \u0275\u0275restoreView(_r1).$implicit;
      const ctx_r2 = \u0275\u0275nextContext();
      ctx_r2.onEdit(item_r2._id);
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275element(15, "lucide-icon", 39);
    \u0275\u0275elementEnd();
    \u0275\u0275template(16, VenueListComponent_For_42_Conditional_16_Template, 1, 1, "app-loader", 40)(17, VenueListComponent_For_42_Conditional_17_Template, 4, 8, "button", 41);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(18, "div", 42)(19, "app-list-row-checkbox", 20);
    \u0275\u0275listener("toggle", function VenueListComponent_For_42_Template_app_list_row_checkbox_toggle_19_listener() {
      const item_r2 = \u0275\u0275restoreView(_r1).$implicit;
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.selection.toggle(item_r2._id));
    });
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const item_r2 = ctx.$implicit;
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(item_r2.name_hebrew);
    \u0275\u0275advance();
    \u0275\u0275property("activeIndex", ctx_r2.carouselHeaderIndex_());
    \u0275\u0275advance();
    \u0275\u0275property("label", \u0275\u0275pipeBind1(5, 12, "environment_type"));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(7, 14, item_r2.environment_type_));
    \u0275\u0275advance(2);
    \u0275\u0275property("label", \u0275\u0275pipeBind1(9, 16, "infrastructure_items"));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(item_r2.available_infrastructure_.length);
    \u0275\u0275advance(2);
    \u0275\u0275property("disabled", !ctx_r2.isLoggedIn());
    \u0275\u0275attribute("aria-label", \u0275\u0275pipeBind1(13, 18, "edit"))("title", !ctx_r2.isLoggedIn() ? \u0275\u0275pipeBind1(14, 20, "sign_in_to_use") : null);
    \u0275\u0275advance(3);
    \u0275\u0275property("size", 18);
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r2.deletingId_() === item_r2._id ? 16 : 17);
    \u0275\u0275advance(3);
    \u0275\u0275property("checked", ctx_r2.selection.isSelected(item_r2._id));
  }
}
function VenueListComponent_Conditional_46_Template(rf, ctx) {
  if (rf & 1) {
    const _r5 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 45);
    \u0275\u0275listener("click", function VenueListComponent_Conditional_46_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r5);
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.clearAllFilters());
    });
    \u0275\u0275text(1);
    \u0275\u0275pipe(2, "translatePipe");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(2, 1, "clear_filters"));
  }
}
function VenueListComponent_For_53_Template(rf, ctx) {
  if (rf & 1) {
    const _r6 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "label", 31)(1, "input", 46);
    \u0275\u0275listener("change", function VenueListComponent_For_53_Template_input_change_1_listener() {
      const env_r7 = \u0275\u0275restoreView(_r6).$implicit;
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.toggleEnvType(env_r7));
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(2, "span");
    \u0275\u0275text(3);
    \u0275\u0275pipe(4, "translatePipe");
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const env_r7 = ctx.$implicit;
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275property("checked", ctx_r2.selectedEnvTypes_().has(env_r7));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(4, 2, env_r7));
  }
}
var ENV_TYPES = [
  "professional_kitchen",
  "outdoor_field",
  "client_home",
  "popup_venue"
];
var VenueListComponent = class _VenueListComponent {
  venueData = inject(VenueDataService);
  router = inject(Router);
  heroFab = inject(HeroFabService);
  isLoggedIn = inject(UserService).isLoggedIn;
  requireAuthService = inject(RequireAuthService);
  userMsg = inject(UserMsgService);
  translation = inject(TranslationService);
  logging = inject(LoggingService);
  /** When true, add button emits addVenueClick instead of navigating (e.g. dashboard tab switch). */
  embeddedInDashboard = false;
  addVenueClick = output();
  searchQuery_ = signal("");
  deletingId_ = signal(null);
  isPanelOpen_ = signal(true);
  carouselHeaderIndex_ = signal(0);
  selectedEnvTypes_ = signal(/* @__PURE__ */ new Set());
  selection = new ListSelectionState();
  envTypes = ENV_TYPES;
  editableFields_ = computed(() => [
    {
      key: "environment_type_",
      label: "environment_type",
      options: this.envTypes.map((e) => ({ value: e, label: e })),
      multi: false
    }
  ]);
  constructor() {
    this.isPanelOpen_.set(getPanelOpen("venues"));
    if (!this.embeddedInDashboard) {
      useListState("venues", [
        { urlParam: "q", signal: this.searchQuery_, serializer: StringParam },
        { urlParam: "envTypes", signal: this.selectedEnvTypes_, serializer: StringSetParam }
      ]);
    }
    afterNextRender(() => {
      const q = window.matchMedia("(max-width: 768px)");
      if (q.matches)
        this.isPanelOpen_.set(false);
      q.addEventListener("change", (e) => {
        if (e.matches)
          this.isPanelOpen_.set(false);
      });
    });
  }
  ngOnInit() {
    this.heroFab.setPageActions([{ labelKey: "add_venue", icon: "plus", run: () => this.onAddPlace() }], "replace");
  }
  ngOnDestroy() {
    this.heroFab.clearPageActions();
  }
  togglePanel() {
    this.isPanelOpen_.update((v) => !v);
    setPanelOpen("venues", this.isPanelOpen_());
  }
  onCarouselHeaderChange(index) {
    this.carouselHeaderIndex_.set(index);
  }
  toggleEnvType(env) {
    this.selectedEnvTypes_.update((set) => {
      const next = new Set(set);
      if (next.has(env))
        next.delete(env);
      else
        next.add(env);
      return next;
    });
  }
  hasActiveFilters_ = computed(() => this.selectedEnvTypes_().size > 0);
  clearAllFilters() {
    this.selectedEnvTypes_.set(/* @__PURE__ */ new Set());
  }
  /** Visible venue IDs for header select-all. */
  filteredVenueIds_ = computed(() => this.filteredVenues_().map((v) => v._id ?? "").filter(Boolean));
  filteredVenues_ = computed(() => {
    let list = this.venueData.allVenues_();
    const search = this.searchQuery_().trim().toLowerCase();
    const selectedEnv = this.selectedEnvTypes_();
    if (search) {
      list = list.filter((v) => (v.name_hebrew ?? "").toLowerCase().includes(search) || (v.environment_type_ ?? "").toLowerCase().includes(search));
    }
    if (selectedEnv.size > 0) {
      list = list.filter((v) => selectedEnv.has(v.environment_type_));
    }
    return [...list].sort((a, b) => (a.name_hebrew ?? "").localeCompare(b.name_hebrew ?? "", "he"));
  });
  envTypeLabel(env) {
    return env;
  }
  backToDashboard() {
    this.router.navigate(["/dashboard"]);
  }
  onAddPlace() {
    if (!this.requireAuthService.requireAuth())
      return;
    if (this.embeddedInDashboard) {
      this.addVenueClick.emit();
    } else {
      void this.router.navigate(["/venues/add"]);
    }
  }
  onEdit(id) {
    this.router.navigate(["/venues/edit", id]);
  }
  onRowClick(item, event) {
    const el = event.target;
    if (el.closest("button") || el.closest("a") || el.closest("app-list-row-checkbox"))
      return;
    if (this.selection.selectionMode()) {
      this.selection.toggle(item._id ?? "");
      return;
    }
    this.router.navigate(["/venues/edit", item._id]);
  }
  onBulkEdit(event) {
    const field = event.field;
    const venues = this.venueData.allVenues_();
    for (const id of event.ids) {
      const item = venues.find((v) => v._id === id);
      if (!item)
        continue;
      if (field === "environment_type_") {
        void this.venueData.updateVenue(__spreadProps(__spreadValues({}, item), { environment_type_: event.value }));
      }
    }
  }
  onBulkDeleteSelected(ids) {
    if (ids.length === 0)
      return;
    if (!this.requireAuthService.requireAuth())
      return;
    if (!confirm(`\u05DC\u05DE\u05D7\u05D5\u05E7 ${ids.length} \u05DE\u05D9\u05E7\u05D5\u05DE\u05D9\u05DD?`))
      return;
    (() => __async(this, null, function* () {
      for (const id of ids) {
        this.deletingId_.set(id);
        try {
          yield this.venueData.deleteVenue(id);
        } catch (e) {
          this.logging.error({ event: "venue.list_error", message: "Venue list error", context: { err: e } });
        } finally {
          this.deletingId_.set(null);
        }
      }
      this.selection.clear();
    }))();
  }
  onDelete(item) {
    return __async(this, null, function* () {
      if (!this.requireAuthService.requireAuth())
        return;
      if (!confirm('\u05DC\u05DE\u05D7\u05D5\u05E7 \u05D0\u05EA \u05D4\u05DE\u05D9\u05E7\u05D5\u05DD "' + (item.name_hebrew ?? "") + '"?'))
        return;
      this.deletingId_.set(item._id);
      try {
        yield this.venueData.deleteVenue(item._id);
      } catch (e) {
        this.logging.error({ event: "venue.list_error", message: "Venue list error", context: { err: e } });
      } finally {
        this.deletingId_.set(null);
      }
    });
  }
  static \u0275fac = function VenueListComponent_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _VenueListComponent)();
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _VenueListComponent, selectors: [["app-venue-list"]], inputs: { embeddedInDashboard: "embeddedInDashboard" }, outputs: { addVenueClick: "addVenueClick" }, decls: 54, vars: 47, consts: [[3, "panelToggle", "isPanelOpen", "gridTemplate", "mobileGridTemplate", "dir"], ["shell-title", "", 1, "page-title"], ["shell-search", ""], ["for", "venue-search", 1, "visually-hidden"], [1, "c-input-wrapper"], ["name", "search", 3, "size"], ["id", "venue-search", "type", "text", 3, "ngModelChange", "ngModel", "placeholder"], ["shell-actions", ""], ["type", "button", "data-testid", "btn-back-to-dashboard-venues", 1, "header-btn", "header-btn--back", 3, "click"], ["name", "arrow-right", "size", "16"], [3, "bulkDelete", "bulkEdit", "selectionState", "editableFields"], ["type", "button", 1, "c-btn-primary", 3, "click", "disabled"], ["name", "plus", 3, "size"], ["shell-table-header", ""], ["role", "columnheader", 1, "col-name", "c-grid-header-cell"], [3, "activeIndexChange", "activeIndex"], ["carouselHeaderColumn", "", "label", "environment_type", "role", "presentation", 1, "col-env", "c-grid-header-cell"], ["carouselHeaderColumn", "", "label", "infrastructure_items", "role", "presentation", 1, "col-infra", "c-grid-header-cell"], ["role", "columnheader", 1, "c-col-actions", "c-grid-header-cell"], ["role", "columnheader", 1, "col-select", "c-grid-header-cell"], [3, "toggle", "checked"], ["shell-table-body", ""], [1, "no-results"], ["role", "button", "tabindex", "0", 1, "venue-grid-row", "c-list-row"], ["shell-filters", ""], [1, "c-filter-section"], [1, "c-filter-section-header"], ["type", "button", 1, "c-btn-ghost--sm"], [1, "c-filter-category"], [1, "c-filter-category-label"], [1, "c-filter-options"], [1, "c-filter-option"], ["role", "button", "tabindex", "0", 1, "venue-grid-row", "c-list-row", 3, "click", "keydown.enter", "keydown.space"], ["role", "cell", 1, "col-name", "c-list-body-cell"], ["role", "cell", 3, "activeIndex"], ["cellCarouselSlide", "", 1, "col-env", "c-list-body-cell", 3, "label"], ["cellCarouselSlide", "", 1, "col-infra", "c-list-body-cell", 3, "label"], ["role", "cell", 1, "c-col-actions", "c-list-body-cell"], ["type", "button", 1, "c-icon-btn", 3, "click", "disabled"], ["name", "pencil", 3, "size"], ["size", "small", 3, "inline"], ["type", "button", 1, "c-icon-btn", "danger", 3, "disabled"], ["role", "cell", 1, "col-select", "c-list-body-cell"], ["type", "button", 1, "c-icon-btn", "danger", 3, "click", "disabled"], ["name", "trash-2", 3, "size"], ["type", "button", 1, "c-btn-ghost--sm", 3, "click"], ["type", "checkbox", 3, "change", "checked"]], template: function VenueListComponent_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275elementStart(0, "app-list-shell", 0);
      \u0275\u0275listener("panelToggle", function VenueListComponent_Template_app_list_shell_panelToggle_0_listener() {
        return ctx.togglePanel();
      });
      \u0275\u0275elementStart(1, "h2", 1);
      \u0275\u0275text(2);
      \u0275\u0275pipe(3, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275elementContainerStart(4, 2);
      \u0275\u0275elementStart(5, "label", 3);
      \u0275\u0275text(6);
      \u0275\u0275pipe(7, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(8, "div", 4);
      \u0275\u0275element(9, "lucide-icon", 5);
      \u0275\u0275elementStart(10, "input", 6);
      \u0275\u0275pipe(11, "translatePipe");
      \u0275\u0275listener("ngModelChange", function VenueListComponent_Template_input_ngModelChange_10_listener($event) {
        return ctx.searchQuery_.set($event);
      });
      \u0275\u0275elementEnd()();
      \u0275\u0275elementContainerEnd();
      \u0275\u0275elementContainerStart(12, 7);
      \u0275\u0275elementStart(13, "button", 8);
      \u0275\u0275listener("click", function VenueListComponent_Template_button_click_13_listener() {
        return ctx.backToDashboard();
      });
      \u0275\u0275element(14, "lucide-icon", 9);
      \u0275\u0275text(15);
      \u0275\u0275pipe(16, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(17, "app-selection-bar", 10);
      \u0275\u0275listener("bulkDelete", function VenueListComponent_Template_app_selection_bar_bulkDelete_17_listener($event) {
        return ctx.onBulkDeleteSelected($event);
      })("bulkEdit", function VenueListComponent_Template_app_selection_bar_bulkEdit_17_listener($event) {
        return ctx.onBulkEdit($event);
      });
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(18, "button", 11);
      \u0275\u0275pipe(19, "translatePipe");
      \u0275\u0275listener("click", function VenueListComponent_Template_button_click_18_listener() {
        return ctx.onAddPlace();
      });
      \u0275\u0275element(20, "lucide-icon", 12);
      \u0275\u0275text(21);
      \u0275\u0275pipe(22, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275elementContainerEnd();
      \u0275\u0275elementContainerStart(23, 13);
      \u0275\u0275elementStart(24, "div", 14);
      \u0275\u0275text(25);
      \u0275\u0275pipe(26, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(27, "app-carousel-header", 15);
      \u0275\u0275listener("activeIndexChange", function VenueListComponent_Template_app_carousel_header_activeIndexChange_27_listener($event) {
        return ctx.onCarouselHeaderChange($event);
      });
      \u0275\u0275elementStart(28, "div", 16);
      \u0275\u0275text(29);
      \u0275\u0275pipe(30, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(31, "div", 17);
      \u0275\u0275text(32);
      \u0275\u0275pipe(33, "translatePipe");
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(34, "div", 18);
      \u0275\u0275text(35);
      \u0275\u0275pipe(36, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(37, "div", 19)(38, "app-list-row-checkbox", 20);
      \u0275\u0275listener("toggle", function VenueListComponent_Template_app_list_row_checkbox_toggle_38_listener() {
        return ctx.selection.toggleSelectAll(ctx.filteredVenueIds_());
      });
      \u0275\u0275elementEnd()();
      \u0275\u0275elementContainerEnd();
      \u0275\u0275elementContainerStart(39, 21);
      \u0275\u0275template(40, VenueListComponent_Conditional_40_Template, 3, 3, "div", 22);
      \u0275\u0275repeaterCreate(41, VenueListComponent_For_42_Template, 20, 22, "div", 23, _forTrack0);
      \u0275\u0275elementContainerEnd();
      \u0275\u0275elementContainerStart(43, 24);
      \u0275\u0275elementStart(44, "div", 25)(45, "div", 26);
      \u0275\u0275template(46, VenueListComponent_Conditional_46_Template, 3, 3, "button", 27);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(47, "div", 28)(48, "span", 29);
      \u0275\u0275text(49);
      \u0275\u0275pipe(50, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(51, "div", 30);
      \u0275\u0275repeaterCreate(52, VenueListComponent_For_53_Template, 5, 4, "label", 31, \u0275\u0275repeaterTrackByIdentity);
      \u0275\u0275elementEnd()()();
      \u0275\u0275elementContainerEnd();
      \u0275\u0275elementEnd();
    }
    if (rf & 2) {
      \u0275\u0275property("isPanelOpen", ctx.isPanelOpen_())("gridTemplate", "2fr 1fr 0.8fr 80px minmax(44px, auto)")("mobileGridTemplate", "2fr 1fr 80px minmax(44px, auto)")("dir", "rtl");
      \u0275\u0275advance(2);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(3, 25, "venue_list"));
      \u0275\u0275advance(4);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(7, 27, "search"));
      \u0275\u0275advance(3);
      \u0275\u0275property("size", 18);
      \u0275\u0275advance();
      \u0275\u0275property("ngModel", ctx.searchQuery_())("placeholder", \u0275\u0275pipeBind1(11, 29, "search"));
      \u0275\u0275advance(5);
      \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(16, 31, "back_to_dashboard"), " ");
      \u0275\u0275advance(2);
      \u0275\u0275property("selectionState", ctx.selection)("editableFields", ctx.editableFields_());
      \u0275\u0275advance();
      \u0275\u0275property("disabled", !ctx.isLoggedIn());
      \u0275\u0275attribute("title", !ctx.isLoggedIn() ? \u0275\u0275pipeBind1(19, 33, "sign_in_to_use") : null);
      \u0275\u0275advance(2);
      \u0275\u0275property("size", 18);
      \u0275\u0275advance();
      \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(22, 35, "add_venue"), " ");
      \u0275\u0275advance(4);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(26, 37, "name"));
      \u0275\u0275advance(2);
      \u0275\u0275property("activeIndex", ctx.carouselHeaderIndex_());
      \u0275\u0275advance(2);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(30, 39, "environment_type"));
      \u0275\u0275advance(3);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(33, 41, "infrastructure_items"));
      \u0275\u0275advance(3);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(36, 43, "actions"));
      \u0275\u0275advance(3);
      \u0275\u0275property("checked", ctx.filteredVenueIds_().length > 0 && ctx.selection.allSelected(ctx.filteredVenueIds_()));
      \u0275\u0275advance(2);
      \u0275\u0275conditional(ctx.filteredVenues_().length === 0 ? 40 : -1);
      \u0275\u0275advance();
      \u0275\u0275repeater(ctx.filteredVenues_());
      \u0275\u0275advance(5);
      \u0275\u0275conditional(ctx.hasActiveFilters_() ? 46 : -1);
      \u0275\u0275advance(3);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(50, 45, "environment_type"));
      \u0275\u0275advance(3);
      \u0275\u0275repeater(ctx.envTypes);
    }
  }, dependencies: [
    CommonModule,
    FormsModule,
    DefaultValueAccessor,
    NgControlStatus,
    NgModel,
    LucideAngularModule,
    LucideAngularComponent,
    TranslatePipe,
    LoaderComponent,
    ListShellComponent,
    CarouselHeaderComponent,
    CarouselHeaderColumnDirective,
    CellCarouselComponent,
    CellCarouselSlideDirective,
    ListRowCheckboxComponent,
    SelectionBarComponent
  ], styles: ["\n\n@layer components.venue-list {\n  [_nghost-%COMP%] {\n    display: block;\n  }\n  .page-title[_ngcontent-%COMP%] {\n    flex-shrink: 0;\n    margin: 0;\n    font-size: 1.25rem;\n    font-weight: 700;\n    color: var(--color-text-main);\n    letter-spacing: 0.02em;\n  }\n  .venue-grid-row[_ngcontent-%COMP%] {\n    display: contents;\n  }\n  .venue-grid-row[_ngcontent-%COMP%]   .c-list-body-cell[_ngcontent-%COMP%] {\n    cursor: pointer;\n  }\n  .venue-grid-row[_ngcontent-%COMP%]:hover   .c-icon-btn[_ngcontent-%COMP%] {\n    opacity: 1;\n  }\n  .c-col-actions[_ngcontent-%COMP%]   .c-icon-btn[_ngcontent-%COMP%] {\n    margin-inline-start: 0.25rem;\n  }\n  .no-results[_ngcontent-%COMP%] {\n    grid-column: 1/-1;\n    padding: 2rem 1rem;\n    text-align: center;\n    color: var(--color-text-muted);\n    font-size: 0.875rem;\n    border-block-end: 1px solid var(--border-default);\n    background: var(--bg-glass-strong);\n  }\n  .header-btn[_ngcontent-%COMP%] {\n    display: inline-flex;\n    align-items: center;\n    gap: 0.375rem;\n    padding-inline: 1.25rem;\n    padding-block: 0.5rem;\n    background: var(--bg-glass);\n    color: var(--color-text-muted);\n    font-size: 0.875rem;\n    font-weight: 500;\n    border: 1px solid var(--border-default);\n    border-radius: var(--radius-full);\n    backdrop-filter: var(--blur-glass);\n    cursor: pointer;\n    transition:\n      background 0.2s ease,\n      color 0.2s ease,\n      border-color 0.2s ease,\n      box-shadow 0.2s ease;\n  }\n  .header-btn[_ngcontent-%COMP%]:hover {\n    background: var(--bg-glass-hover);\n    color: var(--color-text-main);\n  }\n  .header-btn.active[_ngcontent-%COMP%] {\n    background: var(--color-primary);\n    color: var(--color-text-on-primary);\n    border-color: var(--color-primary);\n    box-shadow: var(--shadow-glow);\n  }\n  .header-btn--trash[_ngcontent-%COMP%] {\n    color: var(--color-danger);\n    border-color: color-mix(in srgb, var(--color-danger) 30%, transparent);\n  }\n  .header-btn--trash[_ngcontent-%COMP%]:hover {\n    background: var(--bg-glass-hover);\n    color: var(--color-danger);\n    border-color: var(--color-danger);\n  }\n  .header-btn--trash.active[_ngcontent-%COMP%] {\n    background: var(--color-danger);\n    color: var(--color-text-on-primary);\n    border-color: var(--color-danger);\n  }\n  .header-btn--back[_ngcontent-%COMP%] {\n    color: var(--color-primary);\n    border-color: color-mix(in srgb, var(--color-primary) 30%, transparent);\n  }\n  .header-btn--back[_ngcontent-%COMP%]:hover {\n    background: var(--bg-glass-hover);\n    color: var(--color-primary-hover);\n    border-color: var(--color-primary);\n  }\n  @media (max-width: 768px) {\n    .venue-grid-row[_ngcontent-%COMP%]   app-cell-carousel[_ngcontent-%COMP%] {\n      background: var(--bg-glass);\n      border-block-end: 1px solid rgba(241, 245, 249, 0.4);\n      transition: background 0.15s ease;\n    }\n    .venue-grid-row[_ngcontent-%COMP%]:hover   app-cell-carousel[_ngcontent-%COMP%] {\n      background: var(--bg-glass-hover);\n    }\n  }\n}\n/*# sourceMappingURL=venue-list.component.css.map */"], changeDetection: 0 });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(VenueListComponent, [{
    type: Component,
    args: [{ selector: "app-venue-list", standalone: true, imports: [
      CommonModule,
      FormsModule,
      LucideAngularModule,
      TranslatePipe,
      LoaderComponent,
      ListShellComponent,
      CarouselHeaderComponent,
      CarouselHeaderColumnDirective,
      CellCarouselComponent,
      CellCarouselSlideDirective,
      ListRowCheckboxComponent,
      SelectionBarComponent
    ], changeDetection: ChangeDetectionStrategy.OnPush, inputs: ["embeddedInDashboard"], template: `<app-list-shell
  [isPanelOpen]="isPanelOpen_()"
  (panelToggle)="togglePanel()"
  [gridTemplate]="'2fr 1fr 0.8fr 80px minmax(44px, auto)'"
  [mobileGridTemplate]="'2fr 1fr 80px minmax(44px, auto)'"
  [dir]="'rtl'">

  <h2 shell-title class="page-title">{{ 'venue_list' | translatePipe }}</h2>

  <ng-container shell-search>
    <label class="visually-hidden" for="venue-search">{{ 'search' | translatePipe }}</label>
    <div class="c-input-wrapper">
      <lucide-icon name="search" [size]="18"></lucide-icon>
      <input
        id="venue-search"
        type="text"
        [ngModel]="searchQuery_()"
        (ngModelChange)="searchQuery_.set($event)"
        [placeholder]="'search' | translatePipe"
      />
    </div>
  </ng-container>

  <ng-container shell-actions>
    <button type="button" class="header-btn header-btn--back"
      data-testid="btn-back-to-dashboard-venues"
      (click)="backToDashboard()">
      <lucide-icon name="arrow-right" size="16"></lucide-icon>
      {{ 'back_to_dashboard' | translatePipe }}
    </button>
    <app-selection-bar
      [selectionState]="selection"
      [editableFields]="editableFields_()"
      (bulkDelete)="onBulkDeleteSelected($event)"
      (bulkEdit)="onBulkEdit($event)" />
    <button type="button" class="c-btn-primary" (click)="onAddPlace()"
      [disabled]="!isLoggedIn()"
      [attr.title]="!isLoggedIn() ? ('sign_in_to_use' | translatePipe) : null">
      <lucide-icon name="plus" [size]="18"></lucide-icon>
      {{ 'add_venue' | translatePipe }}
    </button>
  </ng-container>

  <ng-container shell-table-header>
    <div class="col-name c-grid-header-cell" role="columnheader">{{ 'name' | translatePipe }}</div>
    <app-carousel-header [activeIndex]="carouselHeaderIndex_()" (activeIndexChange)="onCarouselHeaderChange($event)">
      <div class="col-env c-grid-header-cell" carouselHeaderColumn label="environment_type" role="presentation">{{ 'environment_type' | translatePipe }}</div>
      <div class="col-infra c-grid-header-cell" carouselHeaderColumn label="infrastructure_items" role="presentation">{{ 'infrastructure_items' | translatePipe }}</div>
    </app-carousel-header>
    <div class="c-col-actions c-grid-header-cell" role="columnheader">{{ 'actions' | translatePipe }}</div>
    <div class="col-select c-grid-header-cell" role="columnheader">
      <app-list-row-checkbox [checked]="filteredVenueIds_().length > 0 && selection.allSelected(filteredVenueIds_())" (toggle)="selection.toggleSelectAll(filteredVenueIds_())" />
    </div>
  </ng-container>

  <ng-container shell-table-body>
    @if (filteredVenues_().length === 0) {
      <div class="no-results">{{ 'no_venues_match' | translatePipe }}</div>
    }
    @for (item of filteredVenues_(); track item._id) {
      <div class="venue-grid-row c-list-row" role="button" tabindex="0"
        (click)="onRowClick(item, $event)"
        (keydown.enter)="onEdit(item._id)"
        (keydown.space)="$event.preventDefault(); onEdit(item._id)">
        <div class="col-name c-list-body-cell" role="cell">{{ item.name_hebrew }}</div>
        <app-cell-carousel [activeIndex]="carouselHeaderIndex_()" role="cell">
          <div class="col-env c-list-body-cell" cellCarouselSlide [label]="'environment_type' | translatePipe">{{ item.environment_type_ | translatePipe }}</div>
          <div class="col-infra c-list-body-cell" cellCarouselSlide [label]="'infrastructure_items' | translatePipe">{{ item.available_infrastructure_.length }}</div>
        </app-cell-carousel>
        <div class="c-col-actions c-list-body-cell" role="cell">
          <button type="button" class="c-icon-btn" (click)="onEdit(item._id); $event.stopPropagation()"
            [attr.aria-label]="'edit' | translatePipe"
            [disabled]="!isLoggedIn()"
            [attr.title]="!isLoggedIn() ? ('sign_in_to_use' | translatePipe) : null">
            <lucide-icon name="pencil" [size]="18"></lucide-icon>
          </button>
          @if (deletingId_() === item._id) {
            <app-loader size="small" [inline]="true" />
          } @else {
            <button type="button" class="c-icon-btn danger" (click)="onDelete(item); $event.stopPropagation()"
              [attr.aria-label]="'delete' | translatePipe"
              [disabled]="!isLoggedIn()"
              [attr.title]="!isLoggedIn() ? ('sign_in_to_use' | translatePipe) : null">
              <lucide-icon name="trash-2" [size]="18"></lucide-icon>
            </button>
          }
        </div>
        <div class="col-select c-list-body-cell" role="cell">
          <app-list-row-checkbox [checked]="selection.isSelected(item._id)" (toggle)="selection.toggle(item._id)" />
        </div>
      </div>
    }
  </ng-container>

  <ng-container shell-filters>
    <div class="c-filter-section">
      <div class="c-filter-section-header">
        @if (hasActiveFilters_()) {
          <button type="button" class="c-btn-ghost--sm" (click)="clearAllFilters()">{{ 'clear_filters' | translatePipe }}</button>
        }
      </div>
      <div class="c-filter-category">
        <span class="c-filter-category-label">{{ 'environment_type' | translatePipe }}</span>
        <div class="c-filter-options">
          @for (env of envTypes; track env) {
            <label class="c-filter-option">
              <input type="checkbox" [checked]="selectedEnvTypes_().has(env)" (change)="toggleEnvType(env)" />
              <span>{{ env | translatePipe }}</span>
            </label>
          }
        </div>
      </div>
    </div>
  </ng-container>

</app-list-shell>
`, styles: ["/* src/app/pages/venues/components/venue-list/venue-list.component.scss */\n@layer components.venue-list {\n  :host {\n    display: block;\n  }\n  .page-title {\n    flex-shrink: 0;\n    margin: 0;\n    font-size: 1.25rem;\n    font-weight: 700;\n    color: var(--color-text-main);\n    letter-spacing: 0.02em;\n  }\n  .venue-grid-row {\n    display: contents;\n  }\n  .venue-grid-row .c-list-body-cell {\n    cursor: pointer;\n  }\n  .venue-grid-row:hover .c-icon-btn {\n    opacity: 1;\n  }\n  .c-col-actions .c-icon-btn {\n    margin-inline-start: 0.25rem;\n  }\n  .no-results {\n    grid-column: 1/-1;\n    padding: 2rem 1rem;\n    text-align: center;\n    color: var(--color-text-muted);\n    font-size: 0.875rem;\n    border-block-end: 1px solid var(--border-default);\n    background: var(--bg-glass-strong);\n  }\n  .header-btn {\n    display: inline-flex;\n    align-items: center;\n    gap: 0.375rem;\n    padding-inline: 1.25rem;\n    padding-block: 0.5rem;\n    background: var(--bg-glass);\n    color: var(--color-text-muted);\n    font-size: 0.875rem;\n    font-weight: 500;\n    border: 1px solid var(--border-default);\n    border-radius: var(--radius-full);\n    backdrop-filter: var(--blur-glass);\n    cursor: pointer;\n    transition:\n      background 0.2s ease,\n      color 0.2s ease,\n      border-color 0.2s ease,\n      box-shadow 0.2s ease;\n  }\n  .header-btn:hover {\n    background: var(--bg-glass-hover);\n    color: var(--color-text-main);\n  }\n  .header-btn.active {\n    background: var(--color-primary);\n    color: var(--color-text-on-primary);\n    border-color: var(--color-primary);\n    box-shadow: var(--shadow-glow);\n  }\n  .header-btn--trash {\n    color: var(--color-danger);\n    border-color: color-mix(in srgb, var(--color-danger) 30%, transparent);\n  }\n  .header-btn--trash:hover {\n    background: var(--bg-glass-hover);\n    color: var(--color-danger);\n    border-color: var(--color-danger);\n  }\n  .header-btn--trash.active {\n    background: var(--color-danger);\n    color: var(--color-text-on-primary);\n    border-color: var(--color-danger);\n  }\n  .header-btn--back {\n    color: var(--color-primary);\n    border-color: color-mix(in srgb, var(--color-primary) 30%, transparent);\n  }\n  .header-btn--back:hover {\n    background: var(--bg-glass-hover);\n    color: var(--color-primary-hover);\n    border-color: var(--color-primary);\n  }\n  @media (max-width: 768px) {\n    .venue-grid-row app-cell-carousel {\n      background: var(--bg-glass);\n      border-block-end: 1px solid rgba(241, 245, 249, 0.4);\n      transition: background 0.15s ease;\n    }\n    .venue-grid-row:hover app-cell-carousel {\n      background: var(--bg-glass-hover);\n    }\n  }\n}\n/*# sourceMappingURL=venue-list.component.css.map */\n"] }]
  }], () => [], null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(VenueListComponent, { className: "VenueListComponent", filePath: "src/app/pages/venues/components/venue-list/venue-list.component.ts", lineNumber: 56 });
})();

export {
  VenueListComponent
};
//# sourceMappingURL=chunk-SQR3LQTP.js.map
