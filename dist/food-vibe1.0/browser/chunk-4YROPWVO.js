import {
  EmptyStateComponent
} from "./chunk-CBNLJQ6Y.js";
import {
  SupplierModalService
} from "./chunk-42ORQKED.js";
import {
  ConfirmModalService
} from "./chunk-QWCHAH6M.js";
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
  BooleanParam,
  NumberSetParam,
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
  ClickOutSideDirective
} from "./chunk-MG3FUR2W.js";
import {
  CheckboxControlValueAccessor,
  DefaultValueAccessor,
  FormArrayName,
  FormBuilder,
  FormControlName,
  FormGroupDirective,
  FormsModule,
  MinValidator,
  NgControlStatus,
  NgControlStatusGroup,
  NgModel,
  NumberValueAccessor,
  ReactiveFormsModule,
  Validators
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
import {
  KitchenStateService
} from "./chunk-DRMAUDCM.js";
import {
  SupplierDataService
} from "./chunk-ZDTM2BLR.js";
import "./chunk-V3KHFSXP.js";
import {
  UserService
} from "./chunk-NQ7PICSF.js";
import "./chunk-AB3R4JQV.js";
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
  ɵɵpureFunction0,
  ɵɵpureFunction1,
  ɵɵrepeater,
  ɵɵrepeaterCreate,
  ɵɵrepeaterTrackByIdentity,
  ɵɵrepeaterTrackByIndex,
  ɵɵresetView,
  ɵɵrestoreView,
  ɵɵtemplate,
  ɵɵtext,
  ɵɵtextInterpolate,
  ɵɵtextInterpolate1,
  ɵɵtextInterpolate2
} from "./chunk-FJPSXAXA.js";

// src/app/pages/suppliers/components/supplier-list/supplier-list.component.ts
var _c0 = () => [0, 1, 2, 3, 4, 5, 6];
var _c1 = (a0) => [a0];
var _forTrack0 = ($index, $item) => $item._id;
function SupplierListComponent_Conditional_49_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "app-empty-state", 37);
    \u0275\u0275listener("ctaClick", function SupplierListComponent_Conditional_49_Conditional_1_Template_app_empty_state_ctaClick_0_listener() {
      \u0275\u0275restoreView(_r1);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.onAdd());
    });
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275property("ctaDisabled", !ctx_r1.isLoggedIn());
  }
}
function SupplierListComponent_Conditional_49_Conditional_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275text(0);
    \u0275\u0275pipe(1, "translatePipe");
  }
  if (rf & 2) {
    \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(1, 1, "no_suppliers_match"), " ");
  }
}
function SupplierListComponent_Conditional_49_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 25);
    \u0275\u0275template(1, SupplierListComponent_Conditional_49_Conditional_1_Template, 1, 1, "app-empty-state", 36)(2, SupplierListComponent_Conditional_49_Conditional_2_Template, 2, 3);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r1.isEmptyList_() ? 1 : 2);
  }
}
function SupplierListComponent_For_51_Conditional_22_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "app-loader", 49);
  }
  if (rf & 2) {
    \u0275\u0275property("inline", true);
  }
}
function SupplierListComponent_For_51_Conditional_23_Template(rf, ctx) {
  if (rf & 1) {
    const _r5 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 53);
    \u0275\u0275pipe(1, "translatePipe");
    \u0275\u0275pipe(2, "translatePipe");
    \u0275\u0275listener("click", function SupplierListComponent_For_51_Conditional_23_Template_button_click_0_listener($event) {
      \u0275\u0275restoreView(_r5);
      const item_r4 = \u0275\u0275nextContext().$implicit;
      const ctx_r1 = \u0275\u0275nextContext();
      ctx_r1.onDelete(item_r4);
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275element(3, "lucide-icon", 54);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275property("disabled", !ctx_r1.isLoggedIn());
    \u0275\u0275attribute("aria-label", \u0275\u0275pipeBind1(1, 4, "delete"))("title", !ctx_r1.isLoggedIn() ? \u0275\u0275pipeBind1(2, 6, "sign_in_to_use") : null);
    \u0275\u0275advance(3);
    \u0275\u0275property("size", 18);
  }
}
function SupplierListComponent_For_51_Conditional_26_For_32_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "label", 71);
    \u0275\u0275element(1, "input", 74);
    \u0275\u0275elementStart(2, "span");
    \u0275\u0275text(3);
    \u0275\u0275pipe(4, "translatePipe");
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const $index_r7 = ctx.$index;
    const ctx_r1 = \u0275\u0275nextContext(3);
    \u0275\u0275advance();
    \u0275\u0275property("formControlName", $index_r7);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(4, 2, ctx_r1.dayLabels[$index_r7]));
  }
}
function SupplierListComponent_For_51_Conditional_26_Conditional_38_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "app-loader", 49);
  }
  if (rf & 2) {
    \u0275\u0275property("inline", true);
  }
}
function SupplierListComponent_For_51_Conditional_26_Template(rf, ctx) {
  if (rf & 1) {
    const _r6 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 55);
    \u0275\u0275listener("clickOutside", function SupplierListComponent_For_51_Conditional_26_Template_div_clickOutside_0_listener() {
      \u0275\u0275restoreView(_r6);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.onInlinePanelClickOutside());
    });
    \u0275\u0275elementStart(1, "h3", 56);
    \u0275\u0275text(2);
    \u0275\u0275pipe(3, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "div", 57)(5, "div", 58)(6, "div", 59)(7, "label", 60);
    \u0275\u0275text(8);
    \u0275\u0275pipe(9, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275element(10, "input", 61);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(11, "div", 59)(12, "label", 62);
    \u0275\u0275text(13);
    \u0275\u0275pipe(14, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275element(15, "input", 63);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(16, "div", 59)(17, "label", 64);
    \u0275\u0275text(18);
    \u0275\u0275pipe(19, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275element(20, "input", 65);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(21, "div", 59)(22, "label", 66);
    \u0275\u0275text(23);
    \u0275\u0275pipe(24, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275element(25, "input", 67);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(26, "div", 68)(27, "span", 69);
    \u0275\u0275text(28);
    \u0275\u0275pipe(29, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(30, "div", 70);
    \u0275\u0275repeaterCreate(31, SupplierListComponent_For_51_Conditional_26_For_32_Template, 5, 4, "label", 71, \u0275\u0275repeaterTrackByIndex);
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(33, "div", 72)(34, "button", 73);
    \u0275\u0275listener("click", function SupplierListComponent_For_51_Conditional_26_Template_button_click_34_listener() {
      \u0275\u0275restoreView(_r6);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.onInlineCancel());
    });
    \u0275\u0275text(35);
    \u0275\u0275pipe(36, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(37, "button", 11);
    \u0275\u0275listener("click", function SupplierListComponent_For_51_Conditional_26_Template_button_click_37_listener() {
      \u0275\u0275restoreView(_r6);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.onInlineSave());
    });
    \u0275\u0275template(38, SupplierListComponent_For_51_Conditional_26_Conditional_38_Template, 1, 1, "app-loader", 49);
    \u0275\u0275text(39);
    \u0275\u0275pipe(40, "translatePipe");
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const item_r4 = \u0275\u0275nextContext().$implicit;
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275property("formGroup", ctx_r1.editForm_);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate2("", \u0275\u0275pipeBind1(3, 12, "edit"), ": ", item_r4.name_hebrew, "");
    \u0275\u0275advance(6);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(9, 14, "name"));
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(14, 16, "contact_person"));
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(19, 18, "min_order"));
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(24, 20, "lead_time"));
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(29, 22, "delivery_days"));
    \u0275\u0275advance(3);
    \u0275\u0275repeater(ctx_r1.deliveryDaysArray.controls);
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(36, 24, "cancel"), " ");
    \u0275\u0275advance(2);
    \u0275\u0275property("disabled", ctx_r1.editForm_.invalid || ctx_r1.isSavingEdit_());
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r1.isSavingEdit_() ? 38 : -1);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(40, 26, "save"), " ");
  }
}
function SupplierListComponent_For_51_Template(rf, ctx) {
  if (rf & 1) {
    const _r3 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 38);
    \u0275\u0275listener("click", function SupplierListComponent_For_51_Template_div_click_0_listener($event) {
      const item_r4 = \u0275\u0275restoreView(_r3).$implicit;
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.onRowClick(item_r4, $event));
    })("keydown.enter", function SupplierListComponent_For_51_Template_div_keydown_enter_0_listener() {
      const item_r4 = \u0275\u0275restoreView(_r3).$implicit;
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.toggleRowEdit(item_r4));
    })("keydown.space", function SupplierListComponent_For_51_Template_div_keydown_space_0_listener($event) {
      const item_r4 = \u0275\u0275restoreView(_r3).$implicit;
      const ctx_r1 = \u0275\u0275nextContext();
      $event.preventDefault();
      return \u0275\u0275resetView(ctx_r1.toggleRowEdit(item_r4));
    });
    \u0275\u0275elementStart(1, "div", 39);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "app-cell-carousel", 40)(4, "div", 41);
    \u0275\u0275pipe(5, "translatePipe");
    \u0275\u0275text(6);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "div", 42);
    \u0275\u0275pipe(8, "translatePipe");
    \u0275\u0275text(9);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(10, "div", 43);
    \u0275\u0275pipe(11, "translatePipe");
    \u0275\u0275text(12);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(13, "div", 44);
    \u0275\u0275text(14);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(15, "div", 45);
    \u0275\u0275text(16);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(17, "div", 46)(18, "button", 47);
    \u0275\u0275pipe(19, "translatePipe");
    \u0275\u0275pipe(20, "translatePipe");
    \u0275\u0275listener("click", function SupplierListComponent_For_51_Template_button_click_18_listener($event) {
      const item_r4 = \u0275\u0275restoreView(_r3).$implicit;
      const ctx_r1 = \u0275\u0275nextContext();
      ctx_r1.onEdit(item_r4);
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275element(21, "lucide-icon", 48);
    \u0275\u0275elementEnd();
    \u0275\u0275template(22, SupplierListComponent_For_51_Conditional_22_Template, 1, 1, "app-loader", 49)(23, SupplierListComponent_For_51_Conditional_23_Template, 4, 8, "button", 50);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(24, "div", 51)(25, "app-list-row-checkbox", 23);
    \u0275\u0275listener("toggle", function SupplierListComponent_For_51_Template_app_list_row_checkbox_toggle_25_listener() {
      const item_r4 = \u0275\u0275restoreView(_r3).$implicit;
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.selection.toggle(item_r4._id));
    });
    \u0275\u0275elementEnd()()();
    \u0275\u0275template(26, SupplierListComponent_For_51_Conditional_26_Template, 41, 28, "div", 52);
  }
  if (rf & 2) {
    let tmp_13_0;
    const item_r4 = ctx.$implicit;
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(item_r4.name_hebrew);
    \u0275\u0275advance();
    \u0275\u0275property("activeIndex", ctx_r1.carouselHeaderIndex_());
    \u0275\u0275advance();
    \u0275\u0275property("label", \u0275\u0275pipeBind1(5, 17, "contact_person"));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate((tmp_13_0 = item_r4.contact_person_) !== null && tmp_13_0 !== void 0 ? tmp_13_0 : "\u2014");
    \u0275\u0275advance();
    \u0275\u0275property("label", \u0275\u0275pipeBind1(8, 19, "delivery_days"));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r1.deliveryDaysDisplay(item_r4.delivery_days_));
    \u0275\u0275advance();
    \u0275\u0275property("label", \u0275\u0275pipeBind1(11, 21, "min_order"));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(item_r4.min_order_mov_);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(item_r4.lead_time_days_);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r1.linkedProductCount_(item_r4._id));
    \u0275\u0275advance(2);
    \u0275\u0275property("disabled", !ctx_r1.isLoggedIn());
    \u0275\u0275attribute("aria-label", \u0275\u0275pipeBind1(19, 23, "edit"))("title", !ctx_r1.isLoggedIn() ? \u0275\u0275pipeBind1(20, 25, "sign_in_to_use") : null);
    \u0275\u0275advance(3);
    \u0275\u0275property("size", 18);
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r1.deletingId_() === item_r4._id ? 22 : 23);
    \u0275\u0275advance(3);
    \u0275\u0275property("checked", ctx_r1.selection.isSelected(item_r4._id));
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r1.editingId_() === item_r4._id ? 26 : -1);
  }
}
function SupplierListComponent_Conditional_55_Template(rf, ctx) {
  if (rf & 1) {
    const _r8 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 75);
    \u0275\u0275listener("click", function SupplierListComponent_Conditional_55_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r8);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.clearAllFilters());
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
function SupplierListComponent_For_62_Template(rf, ctx) {
  if (rf & 1) {
    const _r9 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "label", 33)(1, "input", 35);
    \u0275\u0275listener("change", function SupplierListComponent_For_62_Template_input_change_1_listener() {
      const day_r10 = \u0275\u0275restoreView(_r9).$implicit;
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.toggleDay(day_r10));
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(2, "span");
    \u0275\u0275text(3);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const day_r10 = ctx.$implicit;
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275property("checked", ctx_r1.selectedDays_().has(day_r10));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r1.deliveryDaysDisplay(\u0275\u0275pureFunction1(2, _c1, day_r10)));
  }
}
var DAY_LABELS = [
  "general.day_sun",
  "general.day_mon",
  "general.day_tue",
  "general.day_wed",
  "general.day_thu",
  "general.day_fri",
  "general.day_sat"
];
var SupplierListComponent = class _SupplierListComponent {
  isLoggedIn = inject(UserService).isLoggedIn;
  supplierData = inject(SupplierDataService);
  kitchenState = inject(KitchenStateService);
  supplierModal = inject(SupplierModalService);
  heroFab = inject(HeroFabService);
  translation = inject(TranslationService);
  router = inject(Router);
  userMsg = inject(UserMsgService);
  requireAuthService = inject(RequireAuthService);
  logging = inject(LoggingService);
  confirmModal = inject(ConfirmModalService);
  fb = inject(FormBuilder);
  /** When true, add button emits addSupplierClick instead of opening modal and navigating. */
  embeddedInDashboard = false;
  addSupplierClick = output();
  searchQuery_ = signal("");
  deletingId_ = signal(null);
  editingId_ = signal(null);
  isSavingEdit_ = signal(false);
  isPanelOpen_ = signal(true);
  carouselHeaderIndex_ = signal(0);
  selection = new ListSelectionState();
  dayLabels = DAY_LABELS;
  editForm_;
  editableFields_ = [
    {
      key: "delivery_days_",
      label: "delivery_days",
      options: DAY_LABELS.map((label, i) => ({ value: String(i), label })),
      multi: true
    },
    {
      key: "lead_time_days_",
      label: "lead_time",
      options: ["1", "2", "3", "5", "7", "10", "14", "21", "30"].map((d) => ({ value: d, label: d })),
      multi: false
    }
  ];
  constructor() {
    this.isPanelOpen_.set(getPanelOpen("suppliers"));
    this.buildEditForm();
    if (!this.embeddedInDashboard) {
      useListState("suppliers", [
        { urlParam: "q", signal: this.searchQuery_, serializer: StringParam },
        { urlParam: "days", signal: this.selectedDays_, serializer: NumberSetParam },
        { urlParam: "linkedOnly", signal: this.hasLinkedOnly_, serializer: BooleanParam }
      ]);
    }
    afterNextRender(() => {
      if (typeof window === "undefined")
        return;
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
    if (!this.embeddedInDashboard) {
      this.heroFab.setPageActions([{
        labelKey: "add_supplier",
        icon: "plus",
        run: () => {
          if (this.requireAuthService.requireAuth())
            this.supplierModal.openAdd();
        }
      }], "replace");
    }
  }
  ngOnDestroy() {
    this.heroFab.clearPageActions();
  }
  /** Delivery days to filter (0=Sun .. 6=Sat). Empty set = show all. */
  selectedDays_ = signal(/* @__PURE__ */ new Set());
  hasLinkedOnly_ = signal(false);
  isEmptyList_ = computed(() => this.supplierData.allSuppliers_().length === 0);
  hasActiveFilters_ = computed(() => {
    const days = this.selectedDays_();
    const linked = this.hasLinkedOnly_();
    return days.size > 0 || linked;
  });
  filteredSuppliers_ = computed(() => {
    let list = this.supplierData.allSuppliers_();
    const search = this.searchQuery_().trim().toLowerCase();
    const days = this.selectedDays_();
    const linkedOnly = this.hasLinkedOnly_();
    if (search) {
      list = list.filter((s) => (s.name_hebrew ?? "").toLowerCase().includes(search) || (s.contact_person_ ?? "").toLowerCase().includes(search));
    }
    if (days.size > 0) {
      list = list.filter((s) => (s.delivery_days_ ?? []).some((d) => days.has(d)));
    }
    if (linkedOnly) {
      list = list.filter((s) => this.linkedProductCount_(s._id) > 0);
    }
    return [...list].sort((a, b) => (a.name_hebrew ?? "").localeCompare(b.name_hebrew ?? "", "he"));
  });
  /** Visible supplier IDs for header select-all. */
  filteredSupplierIds_ = computed(() => this.filteredSuppliers_().map((s) => s._id ?? "").filter(Boolean));
  togglePanel() {
    this.isPanelOpen_.update((v) => !v);
    setPanelOpen("suppliers", this.isPanelOpen_());
  }
  onCarouselHeaderChange(index) {
    this.carouselHeaderIndex_.set(index);
  }
  toggleDay(day) {
    this.selectedDays_.update((set) => {
      const next = new Set(set);
      if (next.has(day))
        next.delete(day);
      else
        next.add(day);
      return next;
    });
  }
  clearAllFilters() {
    this.selectedDays_.set(/* @__PURE__ */ new Set());
    this.hasLinkedOnly_.set(false);
  }
  buildEditForm() {
    const daysArray = this.fb.array(Array.from({ length: 7 }, () => this.fb.control(false)));
    this.editForm_ = this.fb.group({
      name_hebrew: ["", [Validators.required]],
      contact_person_: [""],
      delivery_days_: daysArray,
      min_order_mov_: [0, [Validators.required, Validators.min(0)]],
      lead_time_days_: [0, [Validators.required, Validators.min(0)]]
    });
  }
  get deliveryDaysArray() {
    return this.editForm_?.get("delivery_days_");
  }
  hydrateEditForm(s) {
    const days = s.delivery_days_ ?? [];
    const dayControls = this.deliveryDaysArray;
    for (let i = 0; i < 7; i++) {
      dayControls.at(i).setValue(days.includes(i));
    }
    this.editForm_.patchValue({
      name_hebrew: s.name_hebrew ?? "",
      contact_person_: s.contact_person_ ?? "",
      min_order_mov_: s.min_order_mov_ ?? 0,
      lead_time_days_: s.lead_time_days_ ?? 0
    });
  }
  linkedProductCount_(supplierId) {
    return this.kitchenState.products_().filter((p) => (p.supplierIds_ ?? []).includes(supplierId)).length;
  }
  onAdd() {
    if (!this.requireAuthService.requireAuth())
      return;
    if (this.embeddedInDashboard) {
      this.addSupplierClick.emit();
      return;
    }
    this.supplierModal.openAdd();
  }
  onRowClick(item, event) {
    const el = event.target;
    if (el.closest("button") || el.closest("a") || el.closest(".inline-edit-panel") || el.closest("app-list-row-checkbox"))
      return;
    if (this.selection.selectionMode()) {
      this.selection.toggle(item._id ?? "");
      return;
    }
    if (this.editingId_() === item._id) {
      this.editingId_.set(null);
      return;
    }
    void this.onEdit(item);
  }
  toggleRowEdit(item) {
    if (this.editingId_() === item._id) {
      this.editingId_.set(null);
    } else {
      void this.onEdit(item);
    }
  }
  onEdit(item) {
    return __async(this, null, function* () {
      if (!this.requireAuthService.requireAuth())
        return;
      const currentId = this.editingId_();
      if (currentId !== null && currentId !== item._id && this.editForm_.dirty) {
        const saveFirst = yield this.confirmModal.open(this.translation.translate("unsaved_changes_confirm") ?? "\u05D9\u05E9 \u05E9\u05D9\u05E0\u05D5\u05D9\u05D9\u05DD \u05E9\u05DC\u05D0 \u05E0\u05E9\u05DE\u05E8\u05D5. \u05E9\u05DE\u05D5\u05E8 \u05DC\u05E4\u05E0\u05D9 \u05DE\u05E2\u05D1\u05E8?", { variant: "warning", saveLabel: "save" });
        if (saveFirst) {
          yield this.saveCurrentInlineEdit();
        }
      }
      this.editingId_.set(item._id);
      this.hydrateEditForm(item);
    });
  }
  saveCurrentInlineEdit() {
    return __async(this, null, function* () {
      const id = this.editingId_();
      if (!id || this.editForm_.invalid)
        return false;
      const supplier = this.supplierData.allSuppliers_().find((s) => s._id === id);
      if (!supplier)
        return false;
      this.isSavingEdit_.set(true);
      try {
        const raw = this.editForm_.getRawValue();
        const delivery_days_ = [];
        this.deliveryDaysArray.controls.forEach((c, i) => {
          if (c.value)
            delivery_days_.push(i);
        });
        const payload = {
          name_hebrew: raw.name_hebrew,
          contact_person_: raw.contact_person_ || void 0,
          delivery_days_,
          min_order_mov_: Number(raw.min_order_mov_) || 0,
          lead_time_days_: Number(raw.lead_time_days_) || 0
        };
        yield this.supplierData.updateSupplier(__spreadValues(__spreadValues({}, supplier), payload));
        return true;
      } catch (err) {
        this.logging.error({ event: "supplier.save_error", message: "Supplier save failed", context: { err } });
        this.userMsg.onSetErrorMsg(this.translation.translate("save_failed") ?? "\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05E9\u05DE\u05D9\u05E8\u05D4");
        return false;
      } finally {
        this.isSavingEdit_.set(false);
      }
    });
  }
  onInlineSave() {
    return __async(this, null, function* () {
      const ok = yield this.saveCurrentInlineEdit();
      if (ok)
        this.editingId_.set(null);
    });
  }
  onInlineCancel() {
    this.editingId_.set(null);
  }
  /** Close inline panel on click outside; confirm if form has unsaved changes. */
  onInlinePanelClickOutside() {
    return __async(this, null, function* () {
      if (this.editForm_.dirty) {
        const discard = yield this.confirmModal.open(this.translation.translate("unsaved_changes_confirm") ?? "\u05D9\u05E9 \u05E9\u05D9\u05E0\u05D5\u05D9\u05D9\u05DD \u05E9\u05DC\u05D0 \u05E0\u05E9\u05DE\u05E8\u05D5. \u05D4\u05D0\u05DD \u05D0\u05EA\u05D4 \u05D1\u05D8\u05D5\u05D7 \u05E9\u05D1\u05E8\u05E6\u05D5\u05E0\u05DA \u05DC\u05E6\u05D0\u05EA?", { variant: "warning", saveLabel: "leave_without_saving" });
        if (!discard)
          return;
      }
      this.editingId_.set(null);
    });
  }
  onDelete(item) {
    return __async(this, null, function* () {
      if (!this.requireAuthService.requireAuth())
        return;
      const count = this.linkedProductCount_(item._id);
      if (count > 0) {
        const msg = this.translation.translate("supplier_in_use_cannot_delete");
        if (!confirm(msg))
          return;
      } else if (!confirm('\u05DC\u05DE\u05D7\u05D5\u05E7 \u05D0\u05EA \u05D4\u05E1\u05E4\u05E7 "' + (item.name_hebrew ?? "") + '"?'))
        return;
      this.deletingId_.set(item._id);
      try {
        yield this.supplierData.removeSupplier(item._id);
      } catch (e) {
        this.logging.error({ event: "supplier.list_error", message: "Supplier list error", context: { err: e } });
      } finally {
        this.deletingId_.set(null);
      }
    });
  }
  onBulkDeleteSelected(ids) {
    return __async(this, null, function* () {
      if (ids.length === 0)
        return;
      if (!this.requireAuthService.requireAuth())
        return;
      if (!confirm(`\u05DC\u05DE\u05D7\u05D5\u05E7 ${ids.length} \u05E1\u05E4\u05E7\u05D9\u05DD?`))
        return;
      for (const id of ids) {
        this.deletingId_.set(id);
        try {
          yield this.supplierData.removeSupplier(id);
        } catch (e) {
          this.logging.error({ event: "supplier.list_error", message: "Supplier list error", context: { err: e } });
        } finally {
          this.deletingId_.set(null);
        }
      }
      this.selection.clear();
    });
  }
  onBulkEdit(event) {
    return __async(this, null, function* () {
      const field = event.field;
      const suppliers = this.supplierData.allSuppliers_();
      for (const id of event.ids) {
        const supplier = suppliers.find((s) => s._id === id);
        if (!supplier)
          continue;
        let updated;
        if (field === "delivery_days_") {
          const day = parseInt(event.value, 10);
          const current = supplier.delivery_days_ ?? [];
          if (current.includes(day))
            continue;
          updated = __spreadProps(__spreadValues({}, supplier), { delivery_days_: [...current, day] });
        } else {
          updated = __spreadProps(__spreadValues({}, supplier), { lead_time_days_: parseInt(event.value, 10) });
        }
        void this.supplierData.updateSupplier(updated);
      }
    });
  }
  backToDashboard() {
    this.router.navigate(["/dashboard"]);
  }
  deliveryDaysDisplay(days) {
    if (!days?.length)
      return "\u2014";
    return days.map((d) => this.translation.translate(DAY_LABELS[d]) || String(d)).join(", ");
  }
  static \u0275fac = function SupplierListComponent_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _SupplierListComponent)();
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _SupplierListComponent, selectors: [["app-supplier-list"]], inputs: { embeddedInDashboard: "embeddedInDashboard" }, outputs: { addSupplierClick: "addSupplierClick" }, decls: 68, vars: 60, consts: [[3, "panelToggle", "isPanelOpen", "gridTemplate", "mobileGridTemplate"], ["shell-title", "", 1, "page-title"], ["shell-search", ""], ["for", "supplier-search", 1, "visually-hidden"], [1, "c-input-wrapper"], ["name", "search", 3, "size"], ["id", "supplier-search", "type", "text", 3, "ngModelChange", "ngModel", "placeholder"], ["shell-actions", ""], ["type", "button", "data-testid", "btn-back-to-dashboard-suppliers", 1, "header-btn", "header-btn--back", 3, "click"], ["name", "arrow-right", "size", "16"], [3, "bulkDelete", "bulkEdit", "selectionState", "editableFields"], ["type", "button", 1, "c-btn-primary", 3, "click", "disabled"], ["name", "plus", 3, "size"], ["shell-table-header", ""], ["role", "columnheader", 1, "col-name", "c-grid-header-cell"], [3, "activeIndexChange", "activeIndex"], ["carouselHeaderColumn", "", "label", "contact_person", "role", "presentation", 1, "col-contact", "c-grid-header-cell"], ["carouselHeaderColumn", "", "label", "delivery_days", "role", "presentation", 1, "col-delivery", "c-grid-header-cell"], ["carouselHeaderColumn", "", "label", "min_order", "role", "presentation", 1, "col-min-order", "c-grid-header-cell"], ["role", "columnheader", 1, "col-lead", "c-grid-header-cell"], ["role", "columnheader", 1, "col-linked", "c-grid-header-cell"], ["role", "columnheader", 1, "c-col-actions", "c-grid-header-cell"], ["role", "columnheader", 1, "col-select", "c-grid-header-cell"], [3, "toggle", "checked"], ["shell-table-body", ""], [1, "no-results"], ["shell-filters", ""], [1, "c-filter-section"], [1, "c-filter-section-header"], ["type", "button", 1, "c-btn-ghost--sm"], [1, "c-filter-category"], [1, "c-filter-category-label"], [1, "c-filter-options", "c-filter-options--inline"], [1, "c-filter-option"], [1, "c-filter-option", "linked-only-toggle"], ["type", "checkbox", 3, "change", "checked"], ["messageKey", "empty_suppliers", "icon", "truck", "ctaLabelKey", "add_supplier", 3, "ctaDisabled"], ["messageKey", "empty_suppliers", "icon", "truck", "ctaLabelKey", "add_supplier", 3, "ctaClick", "ctaDisabled"], ["role", "button", "tabindex", "0", 1, "supplier-grid-row", "c-list-row", 3, "click", "keydown.enter", "keydown.space"], ["role", "cell", 1, "col-name", "c-list-body-cell"], ["role", "cell", 3, "activeIndex"], ["cellCarouselSlide", "", 1, "col-contact", "c-list-body-cell", 3, "label"], ["cellCarouselSlide", "", 1, "col-delivery", "c-list-body-cell", 3, "label"], ["cellCarouselSlide", "", 1, "col-min-order", "c-list-body-cell", 3, "label"], ["role", "cell", 1, "col-lead", "c-list-body-cell"], ["role", "cell", 1, "col-linked", "c-list-body-cell"], ["role", "cell", 1, "c-col-actions", "c-list-body-cell"], ["type", "button", 1, "c-icon-btn", 3, "click", "disabled"], ["name", "pencil", 3, "size"], ["size", "small", 3, "inline"], ["type", "button", 1, "c-icon-btn", "danger", 3, "disabled"], ["role", "cell", 1, "col-select", "c-list-body-cell"], [1, "inline-edit-panel", 3, "formGroup"], ["type", "button", 1, "c-icon-btn", "danger", 3, "click", "disabled"], ["name", "trash-2", 3, "size"], [1, "inline-edit-panel", 3, "clickOutside", "formGroup"], [1, "inline-edit-title"], [1, "inline-edit-section"], [1, "inline-edit-grid"], [1, "inline-edit-field"], ["for", "inline-supplier-name"], ["id", "inline-supplier-name", "type", "text", "formControlName", "name_hebrew", 1, "c-input"], ["for", "inline-supplier-contact"], ["id", "inline-supplier-contact", "type", "text", "formControlName", "contact_person_", 1, "c-input"], ["for", "inline-supplier-min"], ["id", "inline-supplier-min", "type", "number", "formControlName", "min_order_mov_", "min", "0", 1, "c-input"], ["for", "inline-supplier-lead"], ["id", "inline-supplier-lead", "type", "number", "formControlName", "lead_time_days_", "min", "0", 1, "c-input"], [1, "inline-edit-checkboxes"], [1, "inline-edit-check-label"], ["formArrayName", "delivery_days_", 1, "inline-edit-days-wrap"], [1, "inline-edit-check"], [1, "inline-edit-actions"], ["type", "button", 1, "c-btn-ghost", 3, "click"], ["type", "checkbox", 3, "formControlName"], ["type", "button", 1, "c-btn-ghost--sm", 3, "click"]], template: function SupplierListComponent_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275elementStart(0, "app-list-shell", 0);
      \u0275\u0275listener("panelToggle", function SupplierListComponent_Template_app_list_shell_panelToggle_0_listener() {
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
      \u0275\u0275listener("ngModelChange", function SupplierListComponent_Template_input_ngModelChange_10_listener($event) {
        return ctx.searchQuery_.set($event);
      });
      \u0275\u0275elementEnd()();
      \u0275\u0275elementContainerEnd();
      \u0275\u0275elementContainerStart(12, 7);
      \u0275\u0275elementStart(13, "button", 8);
      \u0275\u0275listener("click", function SupplierListComponent_Template_button_click_13_listener() {
        return ctx.backToDashboard();
      });
      \u0275\u0275element(14, "lucide-icon", 9);
      \u0275\u0275text(15);
      \u0275\u0275pipe(16, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(17, "app-selection-bar", 10);
      \u0275\u0275listener("bulkDelete", function SupplierListComponent_Template_app_selection_bar_bulkDelete_17_listener($event) {
        return ctx.onBulkDeleteSelected($event);
      })("bulkEdit", function SupplierListComponent_Template_app_selection_bar_bulkEdit_17_listener($event) {
        return ctx.onBulkEdit($event);
      });
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(18, "button", 11);
      \u0275\u0275pipe(19, "translatePipe");
      \u0275\u0275listener("click", function SupplierListComponent_Template_button_click_18_listener() {
        return ctx.onAdd();
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
      \u0275\u0275listener("activeIndexChange", function SupplierListComponent_Template_app_carousel_header_activeIndexChange_27_listener($event) {
        return ctx.onCarouselHeaderChange($event);
      });
      \u0275\u0275elementStart(28, "div", 16);
      \u0275\u0275text(29);
      \u0275\u0275pipe(30, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(31, "div", 17);
      \u0275\u0275text(32);
      \u0275\u0275pipe(33, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(34, "div", 18);
      \u0275\u0275text(35);
      \u0275\u0275pipe(36, "translatePipe");
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(37, "div", 19);
      \u0275\u0275text(38);
      \u0275\u0275pipe(39, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(40, "div", 20);
      \u0275\u0275text(41);
      \u0275\u0275pipe(42, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(43, "div", 21);
      \u0275\u0275text(44);
      \u0275\u0275pipe(45, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(46, "div", 22)(47, "app-list-row-checkbox", 23);
      \u0275\u0275listener("toggle", function SupplierListComponent_Template_app_list_row_checkbox_toggle_47_listener() {
        return ctx.selection.toggleSelectAll(ctx.filteredSupplierIds_());
      });
      \u0275\u0275elementEnd()();
      \u0275\u0275elementContainerEnd();
      \u0275\u0275elementContainerStart(48, 24);
      \u0275\u0275template(49, SupplierListComponent_Conditional_49_Template, 3, 1, "div", 25);
      \u0275\u0275repeaterCreate(50, SupplierListComponent_For_51_Template, 27, 27, null, null, _forTrack0);
      \u0275\u0275elementContainerEnd();
      \u0275\u0275elementContainerStart(52, 26);
      \u0275\u0275elementStart(53, "div", 27)(54, "div", 28);
      \u0275\u0275template(55, SupplierListComponent_Conditional_55_Template, 3, 3, "button", 29);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(56, "div", 30)(57, "span", 31);
      \u0275\u0275text(58);
      \u0275\u0275pipe(59, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(60, "div", 32);
      \u0275\u0275repeaterCreate(61, SupplierListComponent_For_62_Template, 4, 4, "label", 33, \u0275\u0275repeaterTrackByIdentity);
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(63, "label", 34)(64, "input", 35);
      \u0275\u0275listener("change", function SupplierListComponent_Template_input_change_64_listener() {
        return ctx.hasLinkedOnly_.set(!ctx.hasLinkedOnly_());
      });
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(65, "span");
      \u0275\u0275text(66);
      \u0275\u0275pipe(67, "translatePipe");
      \u0275\u0275elementEnd()()();
      \u0275\u0275elementContainerEnd();
      \u0275\u0275elementEnd();
    }
    if (rf & 2) {
      \u0275\u0275property("isPanelOpen", ctx.isPanelOpen_())("gridTemplate", "2fr 1fr minmax(48px, 0.8fr) 0.8fr 0.8fr 0.8fr 80px minmax(44px, auto)")("mobileGridTemplate", "2fr 1fr 0.8fr 0.8fr 80px minmax(44px, auto)");
      \u0275\u0275advance(2);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(3, 29, "supplier_list"));
      \u0275\u0275advance(4);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(7, 31, "search"));
      \u0275\u0275advance(3);
      \u0275\u0275property("size", 18);
      \u0275\u0275advance();
      \u0275\u0275property("ngModel", ctx.searchQuery_())("placeholder", \u0275\u0275pipeBind1(11, 33, "search"));
      \u0275\u0275advance(5);
      \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(16, 35, "back_to_dashboard"), " ");
      \u0275\u0275advance(2);
      \u0275\u0275property("selectionState", ctx.selection)("editableFields", ctx.editableFields_);
      \u0275\u0275advance();
      \u0275\u0275property("disabled", !ctx.isLoggedIn());
      \u0275\u0275attribute("title", !ctx.isLoggedIn() ? \u0275\u0275pipeBind1(19, 37, "sign_in_to_use") : null);
      \u0275\u0275advance(2);
      \u0275\u0275property("size", 18);
      \u0275\u0275advance();
      \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(22, 39, "add_supplier"), " ");
      \u0275\u0275advance(4);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(26, 41, "name"));
      \u0275\u0275advance(2);
      \u0275\u0275property("activeIndex", ctx.carouselHeaderIndex_());
      \u0275\u0275advance(2);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(30, 43, "contact_person"));
      \u0275\u0275advance(3);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(33, 45, "delivery_days"));
      \u0275\u0275advance(3);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(36, 47, "min_order"));
      \u0275\u0275advance(3);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(39, 49, "lead_time"));
      \u0275\u0275advance(3);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(42, 51, "linked_products"));
      \u0275\u0275advance(3);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(45, 53, "actions"));
      \u0275\u0275advance(3);
      \u0275\u0275property("checked", ctx.filteredSupplierIds_().length > 0 && ctx.selection.allSelected(ctx.filteredSupplierIds_()));
      \u0275\u0275advance(2);
      \u0275\u0275conditional(ctx.filteredSuppliers_().length === 0 ? 49 : -1);
      \u0275\u0275advance();
      \u0275\u0275repeater(ctx.filteredSuppliers_());
      \u0275\u0275advance(5);
      \u0275\u0275conditional(ctx.hasActiveFilters_() ? 55 : -1);
      \u0275\u0275advance(3);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(59, 55, "delivery_days"));
      \u0275\u0275advance(3);
      \u0275\u0275repeater(\u0275\u0275pureFunction0(59, _c0));
      \u0275\u0275advance(3);
      \u0275\u0275property("checked", ctx.hasLinkedOnly_());
      \u0275\u0275advance(2);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(67, 57, "linked_products"));
    }
  }, dependencies: [CommonModule, FormsModule, DefaultValueAccessor, NumberValueAccessor, CheckboxControlValueAccessor, NgControlStatus, NgControlStatusGroup, MinValidator, NgModel, ReactiveFormsModule, FormGroupDirective, FormControlName, FormArrayName, LucideAngularModule, LucideAngularComponent, TranslatePipe, LoaderComponent, CellCarouselComponent, CellCarouselSlideDirective, ListShellComponent, CarouselHeaderComponent, CarouselHeaderColumnDirective, ClickOutSideDirective, ListRowCheckboxComponent, SelectionBarComponent, EmptyStateComponent], styles: ["\n\n@layer components.supplier-list {\n  [_nghost-%COMP%] {\n    display: block;\n  }\n  .page-title[_ngcontent-%COMP%] {\n    flex-shrink: 0;\n    margin: 0;\n    font-size: 1.25rem;\n    font-weight: 700;\n    color: var(--color-text-main);\n    letter-spacing: 0.02em;\n  }\n  .supplier-grid-row[_ngcontent-%COMP%] {\n    display: contents;\n  }\n  .supplier-grid-row[_ngcontent-%COMP%]   .c-list-body-cell[_ngcontent-%COMP%] {\n    cursor: pointer;\n  }\n  .supplier-grid-row[_ngcontent-%COMP%]:hover   .c-icon-btn[_ngcontent-%COMP%] {\n    opacity: 1;\n  }\n  .c-col-actions[_ngcontent-%COMP%]   .c-icon-btn[_ngcontent-%COMP%] {\n    margin-inline-start: 0.25rem;\n  }\n  .no-results[_ngcontent-%COMP%] {\n    grid-column: 1/-1;\n    padding: 2rem 1rem;\n    text-align: center;\n    color: var(--color-text-muted);\n    font-size: 0.875rem;\n    border-block-end: 1px solid var(--border-default);\n    background: var(--bg-glass-strong);\n  }\n  .linked-only-toggle[_ngcontent-%COMP%] {\n    margin-block-start: 0.5rem;\n  }\n  .inline-edit-panel[_ngcontent-%COMP%] {\n    grid-column: 1/-1;\n  }\n  .inline-edit-check-label[_ngcontent-%COMP%] {\n    font-size: 0.8125rem;\n    font-weight: 600;\n    color: var(--color-text-secondary);\n  }\n  .inline-edit-days-wrap[_ngcontent-%COMP%] {\n    display: flex;\n    flex-wrap: wrap;\n    gap: 0.5rem 1rem;\n  }\n  @media (max-width: 640px) {\n    .inline-edit-grid[_ngcontent-%COMP%] {\n      grid-template-columns: 1fr;\n    }\n  }\n  .header-btn[_ngcontent-%COMP%] {\n    display: inline-flex;\n    align-items: center;\n    gap: 0.375rem;\n    padding-inline: 1.25rem;\n    padding-block: 0.5rem;\n    background: var(--bg-glass);\n    color: var(--color-text-muted);\n    font-size: 0.875rem;\n    font-weight: 500;\n    border: 1px solid var(--border-default);\n    border-radius: var(--radius-full);\n    backdrop-filter: var(--blur-glass);\n    cursor: pointer;\n    transition:\n      background 0.2s ease,\n      color 0.2s ease,\n      border-color 0.2s ease,\n      box-shadow 0.2s ease;\n  }\n  .header-btn[_ngcontent-%COMP%]:hover {\n    background: var(--bg-glass-hover);\n    color: var(--color-text-main);\n  }\n  .header-btn.active[_ngcontent-%COMP%] {\n    background: var(--color-primary);\n    color: var(--color-text-on-primary);\n    border-color: var(--color-primary);\n    box-shadow: var(--shadow-glow);\n  }\n  .header-btn--back[_ngcontent-%COMP%] {\n    color: var(--color-primary);\n    border-color: color-mix(in srgb, var(--color-primary) 30%, transparent);\n  }\n  .header-btn--back[_ngcontent-%COMP%]:hover {\n    background: var(--bg-glass-hover);\n    color: var(--color-primary-hover);\n    border-color: var(--color-primary);\n  }\n  @media (max-width: 768px) {\n    .supplier-grid-row[_ngcontent-%COMP%]   app-cell-carousel[_ngcontent-%COMP%] {\n      background: var(--bg-glass);\n      border-block-end: 1px solid rgba(241, 245, 249, 0.4);\n      transition: background 0.15s ease;\n    }\n    .supplier-grid-row[_ngcontent-%COMP%]:hover   app-cell-carousel[_ngcontent-%COMP%] {\n      background: var(--bg-glass-hover);\n    }\n  }\n}\n/*# sourceMappingURL=supplier-list.component.css.map */"], changeDetection: 0 });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(SupplierListComponent, [{
    type: Component,
    args: [{ selector: "app-supplier-list", standalone: true, imports: [CommonModule, FormsModule, ReactiveFormsModule, LucideAngularModule, TranslatePipe, LoaderComponent, CellCarouselComponent, CellCarouselSlideDirective, ListShellComponent, CarouselHeaderComponent, CarouselHeaderColumnDirective, ClickOutSideDirective, ListRowCheckboxComponent, SelectionBarComponent, EmptyStateComponent], changeDetection: ChangeDetectionStrategy.OnPush, inputs: ["embeddedInDashboard"], template: `<app-list-shell
  [isPanelOpen]="isPanelOpen_()"
  (panelToggle)="togglePanel()"
  [gridTemplate]="'2fr 1fr minmax(48px, 0.8fr) 0.8fr 0.8fr 0.8fr 80px minmax(44px, auto)'"
  [mobileGridTemplate]="'2fr 1fr 0.8fr 0.8fr 80px minmax(44px, auto)'">

  <h2 shell-title class="page-title">{{ 'supplier_list' | translatePipe }}</h2>

  <ng-container shell-search>
    <label class="visually-hidden" for="supplier-search">{{ 'search' | translatePipe }}</label>
    <div class="c-input-wrapper">
      <lucide-icon name="search" [size]="18"></lucide-icon>
      <input
        id="supplier-search"
        type="text"
        [ngModel]="searchQuery_()"
        (ngModelChange)="searchQuery_.set($event)"
        [placeholder]="'search' | translatePipe"
      />
    </div>
  </ng-container>

  <ng-container shell-actions>
    <button type="button" class="header-btn header-btn--back"
      data-testid="btn-back-to-dashboard-suppliers"
      (click)="backToDashboard()">
      <lucide-icon name="arrow-right" size="16"></lucide-icon>
      {{ 'back_to_dashboard' | translatePipe }}
    </button>
    <app-selection-bar
      [selectionState]="selection"
      [editableFields]="editableFields_"
      (bulkDelete)="onBulkDeleteSelected($event)"
      (bulkEdit)="onBulkEdit($event)" />
    <button type="button" class="c-btn-primary" (click)="onAdd()"
      [disabled]="!isLoggedIn()"
      [attr.title]="!isLoggedIn() ? ('sign_in_to_use' | translatePipe) : null">
      <lucide-icon name="plus" [size]="18"></lucide-icon>
      {{ 'add_supplier' | translatePipe }}
    </button>
  </ng-container>

  <ng-container shell-table-header>
    <div class="col-name c-grid-header-cell" role="columnheader">{{ 'name' | translatePipe }}</div>
    <app-carousel-header [activeIndex]="carouselHeaderIndex_()" (activeIndexChange)="onCarouselHeaderChange($event)">
      <div class="col-contact c-grid-header-cell" carouselHeaderColumn label="contact_person" role="presentation">{{ 'contact_person' | translatePipe }}</div>
      <div class="col-delivery c-grid-header-cell" carouselHeaderColumn label="delivery_days" role="presentation">{{ 'delivery_days' | translatePipe }}</div>
      <div class="col-min-order c-grid-header-cell" carouselHeaderColumn label="min_order" role="presentation">{{ 'min_order' | translatePipe }}</div>
    </app-carousel-header>
    <div class="col-lead c-grid-header-cell" role="columnheader">{{ 'lead_time' | translatePipe }}</div>
    <div class="col-linked c-grid-header-cell" role="columnheader">{{ 'linked_products' | translatePipe }}</div>
    <div class="c-col-actions c-grid-header-cell" role="columnheader">{{ 'actions' | translatePipe }}</div>
    <div class="col-select c-grid-header-cell" role="columnheader">
      <app-list-row-checkbox [checked]="filteredSupplierIds_().length > 0 && selection.allSelected(filteredSupplierIds_())" (toggle)="selection.toggleSelectAll(filteredSupplierIds_())" />
    </div>
  </ng-container>

  <ng-container shell-table-body>
    @if (filteredSuppliers_().length === 0) {
      <div class="no-results">
        @if (isEmptyList_()) {
          <app-empty-state messageKey="empty_suppliers" icon="truck"
            ctaLabelKey="add_supplier" [ctaDisabled]="!isLoggedIn()"
            (ctaClick)="onAdd()" />
        } @else {
          {{ 'no_suppliers_match' | translatePipe }}
        }
      </div>
    }
    @for (item of filteredSuppliers_(); track item._id) {
      <div class="supplier-grid-row c-list-row" role="button" tabindex="0"
        (click)="onRowClick(item, $event)"
        (keydown.enter)="toggleRowEdit(item)"
        (keydown.space)="$event.preventDefault(); toggleRowEdit(item)">
        <div class="col-name c-list-body-cell" role="cell">{{ item.name_hebrew }}</div>
        <app-cell-carousel [activeIndex]="carouselHeaderIndex_()" role="cell">
          <div class="col-contact c-list-body-cell" cellCarouselSlide [label]="'contact_person' | translatePipe">{{ item.contact_person_ ?? '\u2014' }}</div>
          <div class="col-delivery c-list-body-cell" cellCarouselSlide [label]="'delivery_days' | translatePipe">{{ deliveryDaysDisplay(item.delivery_days_) }}</div>
          <div class="col-min-order c-list-body-cell" cellCarouselSlide [label]="'min_order' | translatePipe">{{ item.min_order_mov_ }}</div>
        </app-cell-carousel>
        <div class="col-lead c-list-body-cell" role="cell">{{ item.lead_time_days_ }}</div>
        <div class="col-linked c-list-body-cell" role="cell">{{ linkedProductCount_(item._id) }}</div>
        <div class="c-col-actions c-list-body-cell" role="cell">
          <button type="button" class="c-icon-btn" (click)="onEdit(item); $event.stopPropagation()"
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
      @if (editingId_() === item._id) {
        <div class="inline-edit-panel" [formGroup]="editForm_" (clickOutside)="onInlinePanelClickOutside()">
          <h3 class="inline-edit-title">{{ 'edit' | translatePipe }}: {{ item.name_hebrew }}</h3>

          <div class="inline-edit-section">
            <div class="inline-edit-grid">
              <div class="inline-edit-field">
                <label for="inline-supplier-name">{{ 'name' | translatePipe }}</label>
                <input id="inline-supplier-name" type="text" formControlName="name_hebrew" class="c-input" />
              </div>
              <div class="inline-edit-field">
                <label for="inline-supplier-contact">{{ 'contact_person' | translatePipe }}</label>
                <input id="inline-supplier-contact" type="text" formControlName="contact_person_" class="c-input" />
              </div>
              <div class="inline-edit-field">
                <label for="inline-supplier-min">{{ 'min_order' | translatePipe }}</label>
                <input id="inline-supplier-min" type="number" formControlName="min_order_mov_" min="0" class="c-input" />
              </div>
              <div class="inline-edit-field">
                <label for="inline-supplier-lead">{{ 'lead_time' | translatePipe }}</label>
                <input id="inline-supplier-lead" type="number" formControlName="lead_time_days_" min="0" class="c-input" />
              </div>
            </div>
            <div class="inline-edit-checkboxes">
              <span class="inline-edit-check-label">{{ 'delivery_days' | translatePipe }}</span>
              <div class="inline-edit-days-wrap" formArrayName="delivery_days_">
                @for (ctrl of deliveryDaysArray.controls; track $index) {
                  <label class="inline-edit-check">
                    <input type="checkbox" [formControlName]="$index" />
                    <span>{{ dayLabels[$index] | translatePipe }}</span>
                  </label>
                }
              </div>
            </div>
          </div>

          <div class="inline-edit-actions">
            <button type="button" class="c-btn-ghost" (click)="onInlineCancel()">
              {{ 'cancel' | translatePipe }}
            </button>
            <button type="button" class="c-btn-primary" (click)="onInlineSave()"
              [disabled]="editForm_.invalid || isSavingEdit_()">
              @if (isSavingEdit_()) {
                <app-loader size="small" [inline]="true" />
              }
              {{ 'save' | translatePipe }}
            </button>
          </div>
        </div>
      }
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
        <span class="c-filter-category-label">{{ 'delivery_days' | translatePipe }}</span>
        <div class="c-filter-options c-filter-options--inline">
          @for (day of [0,1,2,3,4,5,6]; track day) {
            <label class="c-filter-option">
              <input type="checkbox" [checked]="selectedDays_().has(day)" (change)="toggleDay(day)" />
              <span>{{ deliveryDaysDisplay([day]) }}</span>
            </label>
          }
        </div>
      </div>
      <label class="c-filter-option linked-only-toggle">
        <input type="checkbox" [checked]="hasLinkedOnly_()" (change)="hasLinkedOnly_.set(!hasLinkedOnly_())" />
        <span>{{ 'linked_products' | translatePipe }}</span>
      </label>
    </div>
  </ng-container>

</app-list-shell>
`, styles: ["/* src/app/pages/suppliers/components/supplier-list/supplier-list.component.scss */\n@layer components.supplier-list {\n  :host {\n    display: block;\n  }\n  .page-title {\n    flex-shrink: 0;\n    margin: 0;\n    font-size: 1.25rem;\n    font-weight: 700;\n    color: var(--color-text-main);\n    letter-spacing: 0.02em;\n  }\n  .supplier-grid-row {\n    display: contents;\n  }\n  .supplier-grid-row .c-list-body-cell {\n    cursor: pointer;\n  }\n  .supplier-grid-row:hover .c-icon-btn {\n    opacity: 1;\n  }\n  .c-col-actions .c-icon-btn {\n    margin-inline-start: 0.25rem;\n  }\n  .no-results {\n    grid-column: 1/-1;\n    padding: 2rem 1rem;\n    text-align: center;\n    color: var(--color-text-muted);\n    font-size: 0.875rem;\n    border-block-end: 1px solid var(--border-default);\n    background: var(--bg-glass-strong);\n  }\n  .linked-only-toggle {\n    margin-block-start: 0.5rem;\n  }\n  .inline-edit-panel {\n    grid-column: 1/-1;\n  }\n  .inline-edit-check-label {\n    font-size: 0.8125rem;\n    font-weight: 600;\n    color: var(--color-text-secondary);\n  }\n  .inline-edit-days-wrap {\n    display: flex;\n    flex-wrap: wrap;\n    gap: 0.5rem 1rem;\n  }\n  @media (max-width: 640px) {\n    .inline-edit-grid {\n      grid-template-columns: 1fr;\n    }\n  }\n  .header-btn {\n    display: inline-flex;\n    align-items: center;\n    gap: 0.375rem;\n    padding-inline: 1.25rem;\n    padding-block: 0.5rem;\n    background: var(--bg-glass);\n    color: var(--color-text-muted);\n    font-size: 0.875rem;\n    font-weight: 500;\n    border: 1px solid var(--border-default);\n    border-radius: var(--radius-full);\n    backdrop-filter: var(--blur-glass);\n    cursor: pointer;\n    transition:\n      background 0.2s ease,\n      color 0.2s ease,\n      border-color 0.2s ease,\n      box-shadow 0.2s ease;\n  }\n  .header-btn:hover {\n    background: var(--bg-glass-hover);\n    color: var(--color-text-main);\n  }\n  .header-btn.active {\n    background: var(--color-primary);\n    color: var(--color-text-on-primary);\n    border-color: var(--color-primary);\n    box-shadow: var(--shadow-glow);\n  }\n  .header-btn--back {\n    color: var(--color-primary);\n    border-color: color-mix(in srgb, var(--color-primary) 30%, transparent);\n  }\n  .header-btn--back:hover {\n    background: var(--bg-glass-hover);\n    color: var(--color-primary-hover);\n    border-color: var(--color-primary);\n  }\n  @media (max-width: 768px) {\n    .supplier-grid-row app-cell-carousel {\n      background: var(--bg-glass);\n      border-block-end: 1px solid rgba(241, 245, 249, 0.4);\n      transition: background 0.15s ease;\n    }\n    .supplier-grid-row:hover app-cell-carousel {\n      background: var(--bg-glass-hover);\n    }\n  }\n}\n/*# sourceMappingURL=supplier-list.component.css.map */\n"] }]
  }], () => [], null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(SupplierListComponent, { className: "SupplierListComponent", filePath: "src/app/pages/suppliers/components/supplier-list/supplier-list.component.ts", lineNumber: 51 });
})();
export {
  SupplierListComponent
};
//# sourceMappingURL=chunk-4YROPWVO.js.map
