import {
  MenuEventDataService
} from "./chunk-NSXDTEAV.js";
import {
  MenuIntelligenceService
} from "./chunk-JESWAVQP.js";
import "./chunk-EQWFIXKS.js";
import "./chunk-UA66Z5WI.js";
import {
  ConfirmModalService
} from "./chunk-QWCHAH6M.js";
import "./chunk-7STEE3M4.js";
import {
  StringParam,
  useListState
} from "./chunk-TM2E3L5G.js";
import {
  HeroFabService
} from "./chunk-6DTZ43TT.js";
import {
  RequireAuthService
} from "./chunk-D637KIHB.js";
import "./chunk-WWCQSEYJ.js";
import {
  CustomSelectComponent
} from "./chunk-MG3FUR2W.js";
import {
  DefaultValueAccessor,
  FormsModule,
  NgControlStatus,
  NgModel
} from "./chunk-CA2J44DF.js";
import {
  LoaderComponent
} from "./chunk-G7HPFFIH.js";
import "./chunk-KJ2NCQHM.js";
import {
  LucideAngularComponent,
  LucideAngularModule
} from "./chunk-XDVMM5TS.js";
import {
  TranslatePipe,
  TranslationService
} from "./chunk-CH6HZ4GZ.js";
import "./chunk-DRMAUDCM.js";
import "./chunk-ZDTM2BLR.js";
import "./chunk-V3KHFSXP.js";
import {
  UserService
} from "./chunk-NQ7PICSF.js";
import "./chunk-AB3R4JQV.js";
import {
  UserMsgService
} from "./chunk-Z3W6FQFP.js";
import "./chunk-ZMFT5D5F.js";
import {
  ChangeDetectionStrategy,
  CommonModule,
  Component,
  Router,
  __async,
  computed,
  inject,
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
  ɵɵproperty,
  ɵɵreference,
  ɵɵrepeater,
  ɵɵrepeaterCreate,
  ɵɵresetView,
  ɵɵrestoreView,
  ɵɵtemplate,
  ɵɵtext,
  ɵɵtextInterpolate,
  ɵɵtextInterpolate1,
  ɵɵtextInterpolate2
} from "./chunk-FJPSXAXA.js";

// src/app/pages/menu-library/components/menu-library-list/menu-library-list.component.ts
var _forTrack0 = ($index, $item) => $item._id;
function MenuLibraryListComponent_Conditional_42_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 23);
    \u0275\u0275element(1, "lucide-icon", 25);
    \u0275\u0275elementStart(2, "p");
    \u0275\u0275text(3);
    \u0275\u0275pipe(4, "translatePipe");
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    \u0275\u0275advance();
    \u0275\u0275property("size", 48);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(4, 2, "menu_empty_library"));
  }
}
function MenuLibraryListComponent_For_44_Conditional_27_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "app-loader", 38);
  }
  if (rf & 2) {
    \u0275\u0275property("inline", true);
  }
}
function MenuLibraryListComponent_For_44_Conditional_28_Template(rf, ctx) {
  if (rf & 1) {
    const _r6 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 41);
    \u0275\u0275pipe(1, "translatePipe");
    \u0275\u0275pipe(2, "translatePipe");
    \u0275\u0275listener("click", function MenuLibraryListComponent_For_44_Conditional_28_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r6);
      const event_r4 = \u0275\u0275nextContext().$implicit;
      const ctx_r4 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r4.onClone(event_r4));
    });
    \u0275\u0275element(3, "lucide-icon", 42);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r4 = \u0275\u0275nextContext(2);
    \u0275\u0275property("disabled", !ctx_r4.isLoggedIn());
    \u0275\u0275attribute("aria-label", \u0275\u0275pipeBind1(1, 4, "menu_clone"))("title", !ctx_r4.isLoggedIn() ? \u0275\u0275pipeBind1(2, 6, "sign_in_to_use") : null);
    \u0275\u0275advance(3);
    \u0275\u0275property("size", 18);
  }
}
function MenuLibraryListComponent_For_44_Conditional_29_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "app-loader", 38);
  }
  if (rf & 2) {
    \u0275\u0275property("inline", true);
  }
}
function MenuLibraryListComponent_For_44_Conditional_30_Template(rf, ctx) {
  if (rf & 1) {
    const _r7 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 43);
    \u0275\u0275pipe(1, "translatePipe");
    \u0275\u0275pipe(2, "translatePipe");
    \u0275\u0275listener("click", function MenuLibraryListComponent_For_44_Conditional_30_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r7);
      const event_r4 = \u0275\u0275nextContext().$implicit;
      const ctx_r4 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r4.onDelete(event_r4));
    });
    \u0275\u0275element(3, "lucide-icon", 44);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r4 = \u0275\u0275nextContext(2);
    \u0275\u0275property("disabled", !ctx_r4.isLoggedIn());
    \u0275\u0275attribute("aria-label", \u0275\u0275pipeBind1(1, 4, "delete"))("title", !ctx_r4.isLoggedIn() ? \u0275\u0275pipeBind1(2, 6, "sign_in_to_use") : null);
    \u0275\u0275advance(3);
    \u0275\u0275property("size", 18);
  }
}
function MenuLibraryListComponent_For_44_Template(rf, ctx) {
  if (rf & 1) {
    const _r3 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "article", 26);
    \u0275\u0275listener("click", function MenuLibraryListComponent_For_44_Template_article_click_0_listener() {
      const event_r4 = \u0275\u0275restoreView(_r3).$implicit;
      const ctx_r4 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r4.onOpen(event_r4));
    })("keydown.enter", function MenuLibraryListComponent_For_44_Template_article_keydown_enter_0_listener() {
      const event_r4 = \u0275\u0275restoreView(_r3).$implicit;
      const ctx_r4 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r4.onOpen(event_r4));
    })("keydown.space", function MenuLibraryListComponent_For_44_Template_article_keydown_space_0_listener($event) {
      const event_r4 = \u0275\u0275restoreView(_r3).$implicit;
      const ctx_r4 = \u0275\u0275nextContext();
      $event.preventDefault();
      return \u0275\u0275resetView(ctx_r4.onOpen(event_r4));
    });
    \u0275\u0275elementStart(1, "div", 27)(2, "h3", 28);
    \u0275\u0275text(3);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "p", 29);
    \u0275\u0275text(5);
    \u0275\u0275pipe(6, "translatePipe");
    \u0275\u0275pipe(7, "translatePipe");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(8, "div", 30)(9, "span", 31);
    \u0275\u0275text(10);
    \u0275\u0275pipe(11, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(12, "span", 32);
    \u0275\u0275text(13);
    \u0275\u0275pipe(14, "translatePipe");
    \u0275\u0275elementStart(15, "span", 33);
    \u0275\u0275text(16);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(17, "span", 34);
    \u0275\u0275text(18);
    \u0275\u0275pipe(19, "translatePipe");
    \u0275\u0275elementStart(20, "span", 33);
    \u0275\u0275text(21);
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(22, "div", 35);
    \u0275\u0275listener("click", function MenuLibraryListComponent_For_44_Template_div_click_22_listener($event) {
      \u0275\u0275restoreView(_r3);
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275elementStart(23, "button", 36);
    \u0275\u0275pipe(24, "translatePipe");
    \u0275\u0275pipe(25, "translatePipe");
    \u0275\u0275listener("click", function MenuLibraryListComponent_For_44_Template_button_click_23_listener() {
      const event_r4 = \u0275\u0275restoreView(_r3).$implicit;
      const ctx_r4 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r4.onOpen(event_r4));
    });
    \u0275\u0275element(26, "lucide-icon", 37);
    \u0275\u0275elementEnd();
    \u0275\u0275template(27, MenuLibraryListComponent_For_44_Conditional_27_Template, 1, 1, "app-loader", 38)(28, MenuLibraryListComponent_For_44_Conditional_28_Template, 4, 8, "button", 39)(29, MenuLibraryListComponent_For_44_Conditional_29_Template, 1, 1, "app-loader", 38)(30, MenuLibraryListComponent_For_44_Conditional_30_Template, 4, 8, "button", 40);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const event_r4 = ctx.$implicit;
    const ctx_r4 = \u0275\u0275nextContext();
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(event_r4.name_);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate2("", \u0275\u0275pipeBind1(6, 15, event_r4.event_type_), " \xB7 ", event_r4.event_date_ || \u0275\u0275pipeBind1(7, 17, "menu_no_date"), "");
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate2("", \u0275\u0275pipeBind1(11, 19, "menu_food_cost"), ": ", ctx_r4.getFoodCostPctDisplay(event_r4), "");
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate1("", \u0275\u0275pipeBind1(14, 21, "menu_total_revenue"), ": ");
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(ctx_r4.getTotalSalePriceDisplay(event_r4));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1("", \u0275\u0275pipeBind1(19, 23, "menu_guests"), " ");
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(ctx_r4.getGuestCountDisplay(event_r4));
    \u0275\u0275advance(2);
    \u0275\u0275property("disabled", !ctx_r4.isLoggedIn());
    \u0275\u0275attribute("aria-label", \u0275\u0275pipeBind1(24, 25, "edit"))("title", !ctx_r4.isLoggedIn() ? \u0275\u0275pipeBind1(25, 27, "sign_in_to_use") : null);
    \u0275\u0275advance(3);
    \u0275\u0275property("size", 18);
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r4.cloningId_() === event_r4._id ? 27 : 28);
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r4.deletingId_() === event_r4._id ? 29 : 30);
  }
}
var MenuLibraryListComponent = class _MenuLibraryListComponent {
  router = inject(Router);
  menuEventData = inject(MenuEventDataService);
  menuIntelligence = inject(MenuIntelligenceService);
  confirmModal = inject(ConfirmModalService);
  isLoggedIn = inject(UserService).isLoggedIn;
  userMsg = inject(UserMsgService);
  requireAuthService = inject(RequireAuthService);
  translation = inject(TranslationService);
  searchQuery_ = signal("");
  eventTypeFilter_ = signal("all");
  servingStyleFilter_ = signal("all");
  dateFrom_ = signal("");
  sortBy_ = signal("date");
  sortOrder_ = signal("desc");
  cloningId_ = signal(null);
  deletingId_ = signal(null);
  constructor() {
    useListState("menu-library", [
      { urlParam: "q", signal: this.searchQuery_, serializer: StringParam },
      { urlParam: "sort", signal: this.sortBy_, serializer: StringParam },
      { urlParam: "order", signal: this.sortOrder_, serializer: StringParam },
      { urlParam: "eventType", signal: this.eventTypeFilter_, serializer: StringParam },
      { urlParam: "style", signal: this.servingStyleFilter_, serializer: StringParam },
      { urlParam: "dateFrom", signal: this.dateFrom_, serializer: StringParam }
    ]);
  }
  events_ = this.menuEventData.allMenuEvents_;
  servingStyleOptions_ = [
    { value: "all", label: "all" },
    { value: "buffet_family", label: "buffet_family" },
    { value: "plated_course", label: "plated_course" },
    { value: "cocktail_passed", label: "cocktail_passed" }
  ];
  eventTypeOptions_ = computed(() => {
    const set = /* @__PURE__ */ new Set();
    this.events_().forEach((ev) => {
      if (ev.event_type_)
        set.add(ev.event_type_);
    });
    return ["all", ...Array.from(set)];
  });
  eventTypeSelectOptions_ = computed(() => this.eventTypeOptions_().map((t) => ({ value: t, label: t })));
  sortBySelectOptions_ = [
    { value: "date", label: "sort_by_date" },
    { value: "name", label: "sort_by_name" },
    { value: "food_cost", label: "menu_food_cost" },
    { value: "guest_count", label: "menu_guest_count" }
  ];
  filteredEvents_ = computed(() => {
    const query = this.searchQuery_().trim().toLowerCase();
    const type = this.eventTypeFilter_();
    const style = this.servingStyleFilter_();
    const from = this.dateFrom_();
    const sortBy = this.sortBy_();
    const sortOrder = this.sortOrder_();
    let events = this.events_().filter((event) => {
      if (type !== "all" && event.event_type_ !== type)
        return false;
      if (style !== "all" && event.serving_type_ !== style)
        return false;
      if (from && (!event.event_date_ || event.event_date_ < from))
        return false;
      if (query) {
        const haystack = [
          event.name_,
          event.event_type_,
          event.event_date_ || "",
          ...event.cuisine_tags_ || []
        ].join(" ").toLowerCase();
        if (!haystack.includes(query))
          return false;
      }
      return true;
    });
    events = [...events].sort((a, b) => {
      const cmp = this.compareEvents(a, b, sortBy);
      return sortOrder === "asc" ? cmp : -cmp;
    });
    return events;
  });
  getFoodCostPctForSort(event) {
    const hydrated = this.menuIntelligence.hydrateDerivedPortions(event);
    return this.menuIntelligence.computeFoodCostPctFromActualRevenue(hydrated);
  }
  compareEvents(a, b, field) {
    switch (field) {
      case "name":
        return (a.name_ || "").localeCompare(b.name_ || "", "he");
      case "date":
        return (a.event_date_ || "").localeCompare(b.event_date_ || "");
      case "food_cost":
        return this.getFoodCostPctForSort(a) - this.getFoodCostPctForSort(b);
      case "guest_count":
        return (a.guest_count_ ?? 0) - (b.guest_count_ ?? 0);
      default:
        return 0;
    }
  }
  setSort(field) {
    if (this.sortBy_() === field) {
      this.sortOrder_.update((o) => o === "asc" ? "desc" : "asc");
    } else {
      this.sortBy_.set(field);
      this.sortOrder_.set("asc");
    }
  }
  onCreateNew() {
    this.router.navigate(["/menu-intelligence"]);
  }
  onOpen(event) {
    this.router.navigate(["/menu-intelligence", event._id]);
  }
  onClone(event) {
    return __async(this, null, function* () {
      this.cloningId_.set(event._id);
      try {
        const cloned = yield this.menuEventData.cloneMenuEventAsNew(event._id);
        this.router.navigate(["/menu-intelligence", cloned._id]);
      } finally {
        this.cloningId_.set(null);
      }
    });
  }
  onDelete(event) {
    return __async(this, null, function* () {
      if (!this.requireAuthService.requireAuth())
        return;
      const ok = yield this.confirmModal.open("menu_confirm_delete", {
        saveLabel: "delete",
        variant: "danger"
      });
      if (!ok)
        return;
      this.deletingId_.set(event._id);
      try {
        yield this.menuEventData.deleteMenuEvent(event._id);
      } finally {
        this.deletingId_.set(null);
      }
    });
  }
  /** Food cost % from actual revenue (same logic as menu-intelligence page). Computed live so card matches detail view. */
  getFoodCostPctDisplay(event) {
    const hydrated = this.menuIntelligence.hydrateDerivedPortions(event);
    const pct = this.menuIntelligence.computeFoodCostPctFromActualRevenue(hydrated);
    return `${pct.toFixed(1)}%`;
  }
  /** Total sale price (revenue): sum of sell_price × derived_portions for all items. */
  getTotalSalePriceDisplay(event) {
    const total = this.computeEventRevenue(event);
    if (total <= 0)
      return "\u2014";
    return `\u20AA${total.toLocaleString("he-IL", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  }
  computeEventRevenue(event) {
    let sum = 0;
    const guestCount = event.guest_count_ ?? 0;
    (event.sections_ || []).forEach((section) => {
      (section.items_ || []).forEach((item) => {
        const price = item.sell_price_ ?? 0;
        const portions = item.derived_portions_ ?? guestCount * (item.serving_portions_ ?? 1);
        sum += price * portions;
      });
    });
    return sum;
  }
  getGuestCountDisplay(event) {
    return String(event.guest_count_ || 0);
  }
  getSectionCount(event) {
    return event.sections_?.length || 0;
  }
  getDishCount(event) {
    return (event.sections_ || []).reduce((sum, s) => sum + (s.items_?.length || 0), 0);
  }
  /** Translation key for current sort order (א–ת, ת–א, ישן לחדש, etc.). */
  getSortOrderLabel() {
    const order = this.sortOrder_();
    switch (this.sortBy_()) {
      case "name":
        return order === "asc" ? "sort_name_az" : "sort_name_za";
      case "date":
        return order === "asc" ? "sort_date_old_new" : "sort_date_new_old";
      case "food_cost":
      case "guest_count":
        return order === "asc" ? "sort_number_low_high" : "sort_number_high_low";
      default:
        return order === "asc" ? "sort_number_low_high" : "sort_number_high_low";
    }
  }
  toggleSortOrder() {
    this.sortOrder_.update((o) => o === "asc" ? "desc" : "asc");
  }
  onDateWrapClick(input) {
    if (input?.showPicker) {
      input.showPicker();
    }
  }
  static \u0275fac = function MenuLibraryListComponent_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _MenuLibraryListComponent)();
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _MenuLibraryListComponent, selectors: [["app-menu-library-list"]], decls: 45, vars: 40, consts: [["dateFromRef", ""], ["dir", "rtl", 1, "menu-library-container"], [1, "action-bar"], [1, "page-title"], [1, "search-wrap"], [1, "c-input-wrapper"], ["name", "search", 3, "size"], ["type", "text", 3, "ngModelChange", "ngModel", "placeholder"], ["type", "button", 1, "c-btn-primary", 3, "click"], ["name", "plus", 3, "size"], [1, "filters-bar"], [1, "filter-item"], ["placeholder", "all", 3, "ngModelChange", "ngModel", "options", "typeToFilter"], [1, "filter-item", "date-range-wrap"], [1, "date-range-label"], ["role", "button", "tabindex", "0", 1, "date-input-wrap", 3, "click", "keydown.enter", "keydown.space"], ["type", "date", 3, "ngModelChange", "ngModel"], [1, "filter-item", "sort-wrap"], [1, "sort-label"], [1, "sort-controls"], ["placeholder", "sort", 3, "ngModelChange", "ngModel", "options", "typeToFilter"], ["type", "button", 1, "sort-order-btn", 3, "click"], [1, "events-list"], [1, "empty-state"], ["tabindex", "0", "role", "button", 1, "event-card"], ["name", "book-open", 3, "size"], ["tabindex", "0", "role", "button", 1, "event-card", 3, "click", "keydown.enter", "keydown.space"], [1, "card-main"], [1, "card-title"], [1, "card-subtitle"], [1, "card-tags"], [1, "tag", "cost"], [1, "tag", "sale"], ["dir", "ltr", 1, "tag-value"], [1, "tag", "guests"], [1, "card-actions", 3, "click"], ["type", "button", 1, "action-btn", "edit", 3, "click", "disabled"], ["name", "pencil", 3, "size"], ["size", "small", 3, "inline"], ["type", "button", 1, "action-btn", "clone", 3, "disabled"], ["type", "button", 1, "action-btn", "delete", 3, "disabled"], ["type", "button", 1, "action-btn", "clone", 3, "click", "disabled"], ["name", "copy", 3, "size"], ["type", "button", 1, "action-btn", "delete", 3, "click", "disabled"], ["name", "trash-2", 3, "size"]], template: function MenuLibraryListComponent_Template(rf, ctx) {
    if (rf & 1) {
      const _r1 = \u0275\u0275getCurrentView();
      \u0275\u0275elementStart(0, "div", 1)(1, "div", 2)(2, "h2", 3);
      \u0275\u0275text(3);
      \u0275\u0275pipe(4, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(5, "div", 4)(6, "div", 5);
      \u0275\u0275element(7, "lucide-icon", 6);
      \u0275\u0275elementStart(8, "input", 7);
      \u0275\u0275pipe(9, "translatePipe");
      \u0275\u0275listener("ngModelChange", function MenuLibraryListComponent_Template_input_ngModelChange_8_listener($event) {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.searchQuery_.set($event));
      });
      \u0275\u0275elementEnd()()();
      \u0275\u0275elementStart(10, "button", 8);
      \u0275\u0275listener("click", function MenuLibraryListComponent_Template_button_click_10_listener() {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.onCreateNew());
      });
      \u0275\u0275element(11, "lucide-icon", 9);
      \u0275\u0275text(12);
      \u0275\u0275pipe(13, "translatePipe");
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(14, "div", 10)(15, "label", 11)(16, "span");
      \u0275\u0275text(17);
      \u0275\u0275pipe(18, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(19, "app-custom-select", 12);
      \u0275\u0275listener("ngModelChange", function MenuLibraryListComponent_Template_app_custom_select_ngModelChange_19_listener($event) {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.eventTypeFilter_.set($event));
      });
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(20, "label", 11)(21, "span");
      \u0275\u0275text(22);
      \u0275\u0275pipe(23, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(24, "app-custom-select", 12);
      \u0275\u0275listener("ngModelChange", function MenuLibraryListComponent_Template_app_custom_select_ngModelChange_24_listener($event) {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.servingStyleFilter_.set($event));
      });
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(25, "div", 13)(26, "span", 14);
      \u0275\u0275text(27);
      \u0275\u0275pipe(28, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(29, "div", 15);
      \u0275\u0275listener("click", function MenuLibraryListComponent_Template_div_click_29_listener() {
        \u0275\u0275restoreView(_r1);
        const dateFromRef_r2 = \u0275\u0275reference(31);
        return \u0275\u0275resetView(ctx.onDateWrapClick(dateFromRef_r2));
      })("keydown.enter", function MenuLibraryListComponent_Template_div_keydown_enter_29_listener() {
        \u0275\u0275restoreView(_r1);
        const dateFromRef_r2 = \u0275\u0275reference(31);
        return \u0275\u0275resetView(ctx.onDateWrapClick(dateFromRef_r2));
      })("keydown.space", function MenuLibraryListComponent_Template_div_keydown_space_29_listener($event) {
        \u0275\u0275restoreView(_r1);
        const dateFromRef_r2 = \u0275\u0275reference(31);
        $event.preventDefault();
        return \u0275\u0275resetView(ctx.onDateWrapClick(dateFromRef_r2));
      });
      \u0275\u0275elementStart(30, "input", 16, 0);
      \u0275\u0275listener("ngModelChange", function MenuLibraryListComponent_Template_input_ngModelChange_30_listener($event) {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.dateFrom_.set($event));
      });
      \u0275\u0275elementEnd()()();
      \u0275\u0275elementStart(32, "div", 17)(33, "span", 18);
      \u0275\u0275text(34);
      \u0275\u0275pipe(35, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(36, "div", 19)(37, "app-custom-select", 20);
      \u0275\u0275listener("ngModelChange", function MenuLibraryListComponent_Template_app_custom_select_ngModelChange_37_listener($event) {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.sortBy_.set($event));
      });
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(38, "button", 21);
      \u0275\u0275listener("click", function MenuLibraryListComponent_Template_button_click_38_listener() {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.toggleSortOrder());
      });
      \u0275\u0275text(39);
      \u0275\u0275pipe(40, "translatePipe");
      \u0275\u0275elementEnd()()()();
      \u0275\u0275elementStart(41, "div", 22);
      \u0275\u0275template(42, MenuLibraryListComponent_Conditional_42_Template, 5, 4, "div", 23);
      \u0275\u0275repeaterCreate(43, MenuLibraryListComponent_For_44_Template, 31, 29, "article", 24, _forTrack0);
      \u0275\u0275elementEnd()();
    }
    if (rf & 2) {
      \u0275\u0275advance(3);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(4, 24, "menu_library"));
      \u0275\u0275advance(4);
      \u0275\u0275property("size", 18);
      \u0275\u0275advance();
      \u0275\u0275property("ngModel", ctx.searchQuery_())("placeholder", \u0275\u0275pipeBind1(9, 26, "search"));
      \u0275\u0275advance(3);
      \u0275\u0275property("size", 18);
      \u0275\u0275advance();
      \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(13, 28, "menu_new_event"), " ");
      \u0275\u0275advance(5);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(18, 30, "menu_event_type"));
      \u0275\u0275advance(2);
      \u0275\u0275property("ngModel", ctx.eventTypeFilter_())("options", ctx.eventTypeSelectOptions_())("typeToFilter", true);
      \u0275\u0275advance(3);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(23, 32, "menu_serving_style"));
      \u0275\u0275advance(2);
      \u0275\u0275property("ngModel", ctx.servingStyleFilter_())("options", ctx.servingStyleOptions_)("typeToFilter", true);
      \u0275\u0275advance(3);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(28, 34, "menu_date_from"));
      \u0275\u0275advance(3);
      \u0275\u0275property("ngModel", ctx.dateFrom_());
      \u0275\u0275advance(4);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(35, 36, "sort"));
      \u0275\u0275advance(3);
      \u0275\u0275property("ngModel", ctx.sortBy_())("options", ctx.sortBySelectOptions_)("typeToFilter", true);
      \u0275\u0275advance();
      \u0275\u0275attribute("aria-label", ctx.getSortOrderLabel())("title", ctx.getSortOrderLabel());
      \u0275\u0275advance();
      \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(40, 38, ctx.getSortOrderLabel()), " ");
      \u0275\u0275advance(3);
      \u0275\u0275conditional(ctx.filteredEvents_().length === 0 ? 42 : -1);
      \u0275\u0275advance();
      \u0275\u0275repeater(ctx.filteredEvents_());
    }
  }, dependencies: [CommonModule, FormsModule, DefaultValueAccessor, NgControlStatus, NgModel, LucideAngularModule, LucideAngularComponent, TranslatePipe, LoaderComponent, CustomSelectComponent], styles: ["\n\n.menu-library-container[_ngcontent-%COMP%] {\n  display: block;\n  max-width: 56.25rem;\n  margin: 0 auto;\n  padding: 1.75rem 1.5rem;\n  background: transparent;\n}\n.action-bar[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  justify-content: space-around;\n  flex-wrap: wrap;\n  gap: 1rem;\n  margin-block-end: 1.25rem;\n}\n.page-title[_ngcontent-%COMP%] {\n  flex: 0 0 auto;\n  margin: 0;\n  font-size: 1.5rem;\n  font-weight: 700;\n  color: var(--color-text-main);\n  letter-spacing: -0.01em;\n}\n.search-wrap[_ngcontent-%COMP%] {\n  flex: 1;\n  min-width: 12.5rem;\n  max-width: 21.25rem;\n}\n.filters-bar[_ngcontent-%COMP%] {\n  display: flex;\n  flex-wrap: wrap;\n  place-content: center;\n  gap: 1rem;\n  margin-block-end: 1.5rem;\n  padding: 1rem;\n  background: var(--bg-glass);\n  border: 1px solid var(--border-glass);\n  border-radius: var(--radius-lg);\n  backdrop-filter: var(--blur-glass);\n  box-shadow: var(--shadow-glass);\n}\n.filter-item[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 0.25rem;\n  font-size: 0.875rem;\n  font-weight: 600;\n  color: var(--color-text-muted);\n}\n.filter-item[_ngcontent-%COMP%]   select[_ngcontent-%COMP%], \n.filter-item[_ngcontent-%COMP%]   input[type=date][_ngcontent-%COMP%] {\n  min-height: 2.25rem;\n  padding-inline: 0.75rem;\n  padding-block: 0.5rem;\n  background: var(--bg-glass);\n  font-size: 0.875rem;\n  color: var(--color-text-main);\n  border: 1px solid var(--border-default);\n  border-radius: var(--radius-md);\n  outline: none;\n  transition: border-color 0.2s ease, box-shadow 0.2s ease;\n}\n.filter-item[_ngcontent-%COMP%]   select[_ngcontent-%COMP%]:focus, \n.filter-item[_ngcontent-%COMP%]   input[type=date][_ngcontent-%COMP%]:focus {\n  border-color: var(--border-focus);\n  box-shadow: var(--shadow-focus);\n}\n.date-range-wrap[_ngcontent-%COMP%]   .date-range-label[_ngcontent-%COMP%] {\n  display: block;\n}\n.date-range-wrap[_ngcontent-%COMP%]   .date-input-wrap[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: stretch;\n  cursor: pointer;\n}\n.date-range-wrap[_ngcontent-%COMP%]   .date-input-wrap[_ngcontent-%COMP%]   input[type=date][_ngcontent-%COMP%] {\n  flex: 1;\n  min-width: 0;\n  cursor: pointer;\n}\n.sort-wrap[_ngcontent-%COMP%]   .sort-label[_ngcontent-%COMP%] {\n  display: block;\n}\n.sort-wrap[_ngcontent-%COMP%]   .sort-controls[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n}\n.sort-wrap[_ngcontent-%COMP%]   .sort-order-btn[_ngcontent-%COMP%] {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  min-height: 2.25rem;\n  padding-inline: 0.75rem;\n  background: var(--bg-glass);\n  font-size: 0.875rem;\n  font-weight: 600;\n  color: var(--color-text-main);\n  border: 1px solid var(--border-default);\n  border-radius: var(--radius-md);\n  cursor: pointer;\n  transition: border-color 0.2s ease, box-shadow 0.2s ease;\n}\n.sort-wrap[_ngcontent-%COMP%]   .sort-order-btn[_ngcontent-%COMP%]:hover, \n.sort-wrap[_ngcontent-%COMP%]   .sort-order-btn[_ngcontent-%COMP%]:focus {\n  outline: none;\n  border-color: var(--border-focus);\n  box-shadow: var(--shadow-focus);\n}\n.events-list[_ngcontent-%COMP%] {\n  display: grid;\n  gap: 0.875rem;\n}\n.empty-state[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  gap: 0.875rem;\n  padding: 3.5rem 1.25rem;\n  font-size: 1.1rem;\n  color: var(--color-text-muted);\n  text-align: center;\n}\n.empty-state[_ngcontent-%COMP%]   lucide-icon[_ngcontent-%COMP%] {\n  opacity: 0.6;\n}\n.event-card[_ngcontent-%COMP%] {\n  display: grid;\n  grid-template-columns: 1fr auto auto;\n  align-items: center;\n  gap: 1rem;\n  padding: 1rem 1.25rem;\n  background: var(--bg-glass);\n  border: 1px solid var(--border-glass);\n  border-radius: var(--radius-lg);\n  box-shadow: var(--shadow-glass);\n  backdrop-filter: var(--blur-glass);\n  -webkit-backdrop-filter: var(--blur-glass);\n  cursor: pointer;\n  transition:\n    transform 0.25s ease,\n    box-shadow 0.25s ease,\n    background 0.2s ease;\n}\n@media (hover: hover) {\n  .event-card[_ngcontent-%COMP%]:hover {\n    background: var(--bg-glass-hover);\n    box-shadow: var(--shadow-hover), 0 4px 16px rgba(20, 184, 166, 0.08);\n    transform: translateY(-2px);\n  }\n}\n@media (max-width: 768px) {\n  .event-card[_ngcontent-%COMP%] {\n    grid-template-columns: 1fr;\n  }\n}\n.card-main[_ngcontent-%COMP%] {\n  min-width: 0;\n}\n.card-title[_ngcontent-%COMP%] {\n  margin: 0 0 0.25rem 0;\n  font-size: 1.15rem;\n  font-weight: 600;\n  color: var(--color-text-main);\n  letter-spacing: 0.02em;\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n}\n.card-subtitle[_ngcontent-%COMP%] {\n  margin: 0;\n  font-size: 0.875rem;\n  color: var(--color-text-muted);\n}\n.card-tags[_ngcontent-%COMP%] {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 0.375rem;\n}\n.tag[_ngcontent-%COMP%] {\n  display: inline-flex;\n  align-items: center;\n  padding: 0.25rem 0.625rem;\n  font-size: 0.8rem;\n  font-weight: 600;\n  white-space: nowrap;\n  border: 1px solid var(--border-default);\n  border-radius: var(--radius-xs);\n  background: var(--bg-glass);\n}\n.tag.cost[_ngcontent-%COMP%] {\n  background: var(--color-primary-soft);\n  color: var(--color-primary-hover);\n  border-color: rgba(20, 184, 166, 0.2);\n}\n.tag.sale[_ngcontent-%COMP%] {\n  background: var(--bg-glass);\n  color: var(--color-text-secondary);\n  border-color: var(--border-default);\n}\n.tag.sale[_ngcontent-%COMP%]   .tag-value[_ngcontent-%COMP%] {\n  margin-inline-end: 0.25rem;\n}\n.tag.guests[_ngcontent-%COMP%] {\n  background: var(--bg-glass);\n  color: var(--color-text-secondary);\n  border-color: var(--border-default);\n}\n.tag.guests[_ngcontent-%COMP%]   .tag-value[_ngcontent-%COMP%] {\n  margin-inline-end: 0.25rem;\n}\n.card-actions[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 0.25rem;\n}\n.action-btn[_ngcontent-%COMP%] {\n  display: grid;\n  place-content: center;\n  width: 2.25rem;\n  height: 2.25rem;\n  padding: 0;\n  background: transparent;\n  color: var(--color-text-muted);\n  opacity: 0.7;\n  border: 1px solid transparent;\n  border-radius: var(--radius-sm);\n  cursor: pointer;\n  transition:\n    opacity 0.2s ease,\n    background 0.2s ease,\n    color 0.2s ease;\n}\n.action-btn[_ngcontent-%COMP%]:hover {\n  opacity: 1;\n}\n.action-btn.edit[_ngcontent-%COMP%]:hover {\n  background: var(--color-primary-soft);\n  color: var(--color-primary);\n}\n.action-btn.clone[_ngcontent-%COMP%]:hover {\n  background: var(--color-primary-soft);\n  color: var(--color-primary);\n}\n.action-btn.delete[_ngcontent-%COMP%]:hover {\n  background: var(--bg-danger-subtle);\n  color: var(--color-danger);\n}\n@media (max-width: 768px) {\n  .menu-library-container[_ngcontent-%COMP%] {\n    padding: 1rem;\n  }\n  .action-bar[_ngcontent-%COMP%] {\n    flex-direction: column;\n    align-items: stretch;\n    gap: 0.75rem;\n  }\n  .action-bar[_ngcontent-%COMP%]   .page-title[_ngcontent-%COMP%] {\n    font-size: 1.25rem;\n    text-align: center;\n  }\n  .action-bar[_ngcontent-%COMP%]   .search-wrap[_ngcontent-%COMP%] {\n    max-width: none;\n  }\n  .action-bar[_ngcontent-%COMP%]   .c-btn-primary[_ngcontent-%COMP%] {\n    width: 100%;\n    justify-content: center;\n  }\n  .filters-bar[_ngcontent-%COMP%] {\n    flex-direction: column;\n    gap: 0.75rem;\n  }\n  .filters-bar[_ngcontent-%COMP%]   .filter-item[_ngcontent-%COMP%] {\n    width: 100%;\n  }\n  .filters-bar[_ngcontent-%COMP%]   .date-range-wrap[_ngcontent-%COMP%] {\n    width: 100%;\n  }\n  .filters-bar[_ngcontent-%COMP%]   .date-range-inputs[_ngcontent-%COMP%] {\n    flex-direction: column;\n    gap: 0.5rem;\n  }\n  .filters-bar[_ngcontent-%COMP%]   .date-range-inputs[_ngcontent-%COMP%]   .date-range-sep[_ngcontent-%COMP%] {\n    display: none;\n  }\n  .event-card[_ngcontent-%COMP%] {\n    flex-direction: column;\n    gap: 0.75rem;\n  }\n  .event-card[_ngcontent-%COMP%]   .card-actions[_ngcontent-%COMP%] {\n    display: flex;\n    justify-content: flex-end;\n    gap: 0.25rem;\n    padding-block-start: 0.5rem;\n    border-block-start: 1px solid var(--border-default);\n  }\n}\n/*# sourceMappingURL=menu-library-list.component.css.map */"], changeDetection: 0 });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(MenuLibraryListComponent, [{
    type: Component,
    args: [{ selector: "app-menu-library-list", standalone: true, imports: [CommonModule, FormsModule, LucideAngularModule, TranslatePipe, LoaderComponent, CustomSelectComponent], changeDetection: ChangeDetectionStrategy.OnPush, template: `<div class="menu-library-container" dir="rtl">
  <div class="action-bar">
    <h2 class="page-title">{{ 'menu_library' | translatePipe }}</h2>
    <div class="search-wrap">
      <div class="c-input-wrapper">
        <lucide-icon name="search" [size]="18"></lucide-icon>
        <input type="text" [ngModel]="searchQuery_()" (ngModelChange)="searchQuery_.set($event)"
          [placeholder]="'search' | translatePipe" />
      </div>
    </div>
    <button type="button" class="c-btn-primary" (click)="onCreateNew()">
      <lucide-icon name="plus" [size]="18"></lucide-icon>
      {{ 'menu_new_event' | translatePipe }}
    </button>
  </div>

  <div class="filters-bar">
    <label class="filter-item">
      <span>{{ 'menu_event_type' | translatePipe }}</span>
      <app-custom-select
        [ngModel]="eventTypeFilter_()"
        (ngModelChange)="eventTypeFilter_.set($event)"
        [options]="eventTypeSelectOptions_()"
        placeholder="all"
        [typeToFilter]="true" />
    </label>

    <label class="filter-item">
      <span>{{ 'menu_serving_style' | translatePipe }}</span>
      <app-custom-select
        [ngModel]="servingStyleFilter_()"
        (ngModelChange)="servingStyleFilter_.set($event)"
        [options]="servingStyleOptions_"
        placeholder="all"
        [typeToFilter]="true" />
    </label>

    <div class="filter-item date-range-wrap">
      <span class="date-range-label">{{ 'menu_date_from' | translatePipe }}</span>
      <div class="date-input-wrap" (click)="onDateWrapClick(dateFromRef)" (keydown.enter)="onDateWrapClick(dateFromRef)" (keydown.space)="$event.preventDefault(); onDateWrapClick(dateFromRef)" role="button" tabindex="0">
        <input #dateFromRef type="date" [ngModel]="dateFrom_()" (ngModelChange)="dateFrom_.set($event)" />
      </div>
    </div>

    <div class="filter-item sort-wrap">
      <span class="sort-label">{{ 'sort' | translatePipe }}</span>
      <div class="sort-controls">
        <app-custom-select
          [ngModel]="sortBy_()"
          (ngModelChange)="sortBy_.set($event)"
          [options]="sortBySelectOptions_"
          placeholder="sort"
          [typeToFilter]="true" />
        <button type="button" class="sort-order-btn" (click)="toggleSortOrder()" [attr.aria-label]="getSortOrderLabel()" [attr.title]="getSortOrderLabel()">
          {{ getSortOrderLabel() | translatePipe }}
        </button>
      </div>
    </div>
  </div>

  <div class="events-list">
    @if (filteredEvents_().length === 0) {
      <div class="empty-state">
        <lucide-icon name="book-open" [size]="48"></lucide-icon>
        <p>{{ 'menu_empty_library' | translatePipe }}</p>
      </div>
    }
    @for (event of filteredEvents_(); track event._id) {
      <article class="event-card" (click)="onOpen(event)" (keydown.enter)="onOpen(event)" (keydown.space)="$event.preventDefault(); onOpen(event)" tabindex="0" role="button">
        <div class="card-main">
          <h3 class="card-title">{{ event.name_ }}</h3>
          <p class="card-subtitle">{{ event.event_type_ | translatePipe }} \xB7 {{ event.event_date_ || ('menu_no_date' | translatePipe) }}</p>
        </div>
        <div class="card-tags">
          <span class="tag cost">{{ 'menu_food_cost' | translatePipe }}: {{ getFoodCostPctDisplay(event) }}</span>
          <span class="tag sale">{{ 'menu_total_revenue' | translatePipe }}: <span class="tag-value" dir="ltr">{{ getTotalSalePriceDisplay(event) }}</span></span>
          <span class="tag guests">{{ 'menu_guests' | translatePipe }} <span class="tag-value" dir="ltr">{{ getGuestCountDisplay(event) }}</span></span>
        </div>
        <div class="card-actions" (click)="$event.stopPropagation()">
          <button type="button" class="action-btn edit" (click)="onOpen(event)"
            [attr.aria-label]="'edit' | translatePipe"
            [disabled]="!isLoggedIn()"
            [attr.title]="!isLoggedIn() ? ('sign_in_to_use' | translatePipe) : null">
            <lucide-icon name="pencil" [size]="18"></lucide-icon>
          </button>
          @if (cloningId_() === event._id) {
            <app-loader size="small" [inline]="true" />
          } @else {
            <button type="button" class="action-btn clone" (click)="onClone(event)"
              [attr.aria-label]="'menu_clone' | translatePipe"
              [disabled]="!isLoggedIn()"
              [attr.title]="!isLoggedIn() ? ('sign_in_to_use' | translatePipe) : null">
              <lucide-icon name="copy" [size]="18"></lucide-icon>
            </button>
          }
          @if (deletingId_() === event._id) {
            <app-loader size="small" [inline]="true" />
          } @else {
            <button type="button" class="action-btn delete" (click)="onDelete(event)"
              [attr.aria-label]="'delete' | translatePipe"
              [disabled]="!isLoggedIn()"
              [attr.title]="!isLoggedIn() ? ('sign_in_to_use' | translatePipe) : null">
              <lucide-icon name="trash-2" [size]="18"></lucide-icon>
            </button>
          }
        </div>
      </article>
    }
  </div>
</div>
`, styles: ["/* src/app/pages/menu-library/components/menu-library-list/menu-library-list.component.scss */\n.menu-library-container {\n  display: block;\n  max-width: 56.25rem;\n  margin: 0 auto;\n  padding: 1.75rem 1.5rem;\n  background: transparent;\n}\n.action-bar {\n  display: flex;\n  align-items: center;\n  justify-content: space-around;\n  flex-wrap: wrap;\n  gap: 1rem;\n  margin-block-end: 1.25rem;\n}\n.page-title {\n  flex: 0 0 auto;\n  margin: 0;\n  font-size: 1.5rem;\n  font-weight: 700;\n  color: var(--color-text-main);\n  letter-spacing: -0.01em;\n}\n.search-wrap {\n  flex: 1;\n  min-width: 12.5rem;\n  max-width: 21.25rem;\n}\n.filters-bar {\n  display: flex;\n  flex-wrap: wrap;\n  place-content: center;\n  gap: 1rem;\n  margin-block-end: 1.5rem;\n  padding: 1rem;\n  background: var(--bg-glass);\n  border: 1px solid var(--border-glass);\n  border-radius: var(--radius-lg);\n  backdrop-filter: var(--blur-glass);\n  box-shadow: var(--shadow-glass);\n}\n.filter-item {\n  display: flex;\n  flex-direction: column;\n  gap: 0.25rem;\n  font-size: 0.875rem;\n  font-weight: 600;\n  color: var(--color-text-muted);\n}\n.filter-item select,\n.filter-item input[type=date] {\n  min-height: 2.25rem;\n  padding-inline: 0.75rem;\n  padding-block: 0.5rem;\n  background: var(--bg-glass);\n  font-size: 0.875rem;\n  color: var(--color-text-main);\n  border: 1px solid var(--border-default);\n  border-radius: var(--radius-md);\n  outline: none;\n  transition: border-color 0.2s ease, box-shadow 0.2s ease;\n}\n.filter-item select:focus,\n.filter-item input[type=date]:focus {\n  border-color: var(--border-focus);\n  box-shadow: var(--shadow-focus);\n}\n.date-range-wrap .date-range-label {\n  display: block;\n}\n.date-range-wrap .date-input-wrap {\n  display: flex;\n  align-items: stretch;\n  cursor: pointer;\n}\n.date-range-wrap .date-input-wrap input[type=date] {\n  flex: 1;\n  min-width: 0;\n  cursor: pointer;\n}\n.sort-wrap .sort-label {\n  display: block;\n}\n.sort-wrap .sort-controls {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n}\n.sort-wrap .sort-order-btn {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  min-height: 2.25rem;\n  padding-inline: 0.75rem;\n  background: var(--bg-glass);\n  font-size: 0.875rem;\n  font-weight: 600;\n  color: var(--color-text-main);\n  border: 1px solid var(--border-default);\n  border-radius: var(--radius-md);\n  cursor: pointer;\n  transition: border-color 0.2s ease, box-shadow 0.2s ease;\n}\n.sort-wrap .sort-order-btn:hover,\n.sort-wrap .sort-order-btn:focus {\n  outline: none;\n  border-color: var(--border-focus);\n  box-shadow: var(--shadow-focus);\n}\n.events-list {\n  display: grid;\n  gap: 0.875rem;\n}\n.empty-state {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  gap: 0.875rem;\n  padding: 3.5rem 1.25rem;\n  font-size: 1.1rem;\n  color: var(--color-text-muted);\n  text-align: center;\n}\n.empty-state lucide-icon {\n  opacity: 0.6;\n}\n.event-card {\n  display: grid;\n  grid-template-columns: 1fr auto auto;\n  align-items: center;\n  gap: 1rem;\n  padding: 1rem 1.25rem;\n  background: var(--bg-glass);\n  border: 1px solid var(--border-glass);\n  border-radius: var(--radius-lg);\n  box-shadow: var(--shadow-glass);\n  backdrop-filter: var(--blur-glass);\n  -webkit-backdrop-filter: var(--blur-glass);\n  cursor: pointer;\n  transition:\n    transform 0.25s ease,\n    box-shadow 0.25s ease,\n    background 0.2s ease;\n}\n@media (hover: hover) {\n  .event-card:hover {\n    background: var(--bg-glass-hover);\n    box-shadow: var(--shadow-hover), 0 4px 16px rgba(20, 184, 166, 0.08);\n    transform: translateY(-2px);\n  }\n}\n@media (max-width: 768px) {\n  .event-card {\n    grid-template-columns: 1fr;\n  }\n}\n.card-main {\n  min-width: 0;\n}\n.card-title {\n  margin: 0 0 0.25rem 0;\n  font-size: 1.15rem;\n  font-weight: 600;\n  color: var(--color-text-main);\n  letter-spacing: 0.02em;\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n}\n.card-subtitle {\n  margin: 0;\n  font-size: 0.875rem;\n  color: var(--color-text-muted);\n}\n.card-tags {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 0.375rem;\n}\n.tag {\n  display: inline-flex;\n  align-items: center;\n  padding: 0.25rem 0.625rem;\n  font-size: 0.8rem;\n  font-weight: 600;\n  white-space: nowrap;\n  border: 1px solid var(--border-default);\n  border-radius: var(--radius-xs);\n  background: var(--bg-glass);\n}\n.tag.cost {\n  background: var(--color-primary-soft);\n  color: var(--color-primary-hover);\n  border-color: rgba(20, 184, 166, 0.2);\n}\n.tag.sale {\n  background: var(--bg-glass);\n  color: var(--color-text-secondary);\n  border-color: var(--border-default);\n}\n.tag.sale .tag-value {\n  margin-inline-end: 0.25rem;\n}\n.tag.guests {\n  background: var(--bg-glass);\n  color: var(--color-text-secondary);\n  border-color: var(--border-default);\n}\n.tag.guests .tag-value {\n  margin-inline-end: 0.25rem;\n}\n.card-actions {\n  display: flex;\n  gap: 0.25rem;\n}\n.action-btn {\n  display: grid;\n  place-content: center;\n  width: 2.25rem;\n  height: 2.25rem;\n  padding: 0;\n  background: transparent;\n  color: var(--color-text-muted);\n  opacity: 0.7;\n  border: 1px solid transparent;\n  border-radius: var(--radius-sm);\n  cursor: pointer;\n  transition:\n    opacity 0.2s ease,\n    background 0.2s ease,\n    color 0.2s ease;\n}\n.action-btn:hover {\n  opacity: 1;\n}\n.action-btn.edit:hover {\n  background: var(--color-primary-soft);\n  color: var(--color-primary);\n}\n.action-btn.clone:hover {\n  background: var(--color-primary-soft);\n  color: var(--color-primary);\n}\n.action-btn.delete:hover {\n  background: var(--bg-danger-subtle);\n  color: var(--color-danger);\n}\n@media (max-width: 768px) {\n  .menu-library-container {\n    padding: 1rem;\n  }\n  .action-bar {\n    flex-direction: column;\n    align-items: stretch;\n    gap: 0.75rem;\n  }\n  .action-bar .page-title {\n    font-size: 1.25rem;\n    text-align: center;\n  }\n  .action-bar .search-wrap {\n    max-width: none;\n  }\n  .action-bar .c-btn-primary {\n    width: 100%;\n    justify-content: center;\n  }\n  .filters-bar {\n    flex-direction: column;\n    gap: 0.75rem;\n  }\n  .filters-bar .filter-item {\n    width: 100%;\n  }\n  .filters-bar .date-range-wrap {\n    width: 100%;\n  }\n  .filters-bar .date-range-inputs {\n    flex-direction: column;\n    gap: 0.5rem;\n  }\n  .filters-bar .date-range-inputs .date-range-sep {\n    display: none;\n  }\n  .event-card {\n    flex-direction: column;\n    gap: 0.75rem;\n  }\n  .event-card .card-actions {\n    display: flex;\n    justify-content: flex-end;\n    gap: 0.25rem;\n    padding-block-start: 0.5rem;\n    border-block-start: 1px solid var(--border-default);\n  }\n}\n/*# sourceMappingURL=menu-library-list.component.css.map */\n"] }]
  }], () => [], null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(MenuLibraryListComponent, { className: "MenuLibraryListComponent", filePath: "src/app/pages/menu-library/components/menu-library-list/menu-library-list.component.ts", lineNumber: 29 });
})();

// src/app/pages/menu-library/menu-library.page.ts
var MenuLibraryPage = class _MenuLibraryPage {
  router = inject(Router);
  heroFab = inject(HeroFabService);
  ngOnInit() {
    this.heroFab.setPageActions([{ labelKey: "menu_new_event", icon: "file-plus", run: () => this.router.navigate(["/menu-intelligence"]) }], "replace");
  }
  ngOnDestroy() {
    this.heroFab.clearPageActions();
  }
  static \u0275fac = function MenuLibraryPage_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _MenuLibraryPage)();
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _MenuLibraryPage, selectors: [["app-menu-library-page"]], decls: 1, vars: 0, template: function MenuLibraryPage_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275element(0, "app-menu-library-list");
    }
  }, dependencies: [MenuLibraryListComponent], styles: ['@charset "UTF-8";\n\n\n\n[_nghost-%COMP%] {\n  display: block;\n  min-height: 100vh;\n  background-color: var(--bg-body);\n}\n/*# sourceMappingURL=menu-library.page.css.map */'], changeDetection: 0 });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(MenuLibraryPage, [{
    type: Component,
    args: [{ selector: "app-menu-library-page", standalone: true, imports: [MenuLibraryListComponent], changeDetection: ChangeDetectionStrategy.OnPush, template: "<app-menu-library-list></app-menu-library-list>\r\n", styles: ['@charset "UTF-8";\n\n/* src/app/pages/menu-library/menu-library.page.scss */\n:host {\n  display: block;\n  min-height: 100vh;\n  background-color: var(--bg-body);\n}\n/*# sourceMappingURL=menu-library.page.css.map */\n'] }]
  }], null, null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(MenuLibraryPage, { className: "MenuLibraryPage", filePath: "src/app/pages/menu-library/menu-library.page.ts", lineNumber: 14 });
})();
export {
  MenuLibraryPage
};
//# sourceMappingURL=chunk-3QGJX3AI.js.map
