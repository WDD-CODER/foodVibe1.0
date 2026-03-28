import {
  AddItemModalService
} from "./chunk-44QAIIDK.js";
import {
  ConfirmModalService
} from "./chunk-OMWRJF5J.js";
import {
  TranslationKeyModalService,
  isTranslationKeyResult
} from "./chunk-KNQKKPOG.js";
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
} from "./chunk-FIK4BYDO.js";
import {
  NullableBooleanParam,
  StringParam,
  StringSetParam,
  useListState
} from "./chunk-34POUDIW.js";
import {
  HeroFabService
} from "./chunk-QBY7FUTT.js";
import {
  ERR_DUPLICATE_EQUIPMENT_NAME,
  EquipmentDataService
} from "./chunk-YEG5WWUX.js";
import {
  RequireAuthService
} from "./chunk-T7ENSIHP.js";
import "./chunk-RXM3SI3E.js";
import {
  CustomSelectComponent
} from "./chunk-KKA4TBVQ.js";
import {
  CheckboxControlValueAccessor,
  DefaultValueAccessor,
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
} from "./chunk-UNNU6L7T.js";
import {
  LoaderComponent
} from "./chunk-TR2OKVKA.js";
import "./chunk-4LOKEQAU.js";
import {
  LucideAngularComponent,
  LucideAngularModule
} from "./chunk-JROUPDH4.js";
import {
  TranslatePipe,
  TranslationService
} from "./chunk-Z6OI3YDQ.js";
import {
  UserService
} from "./chunk-VOTRTAY7.js";
import "./chunk-7WUWXC4O.js";
import {
  UserMsgService
} from "./chunk-WYZGJ7UG.js";
import {
  LoggingService
} from "./chunk-OYT4PDSG.js";
import {
  ChangeDetectionStrategy,
  CommonModule,
  Component,
  Router,
  RouterLink,
  __async,
  __spreadProps,
  __spreadValues,
  afterNextRender,
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
  ɵɵtextInterpolate1,
  ɵɵtextInterpolate2
} from "./chunk-GCYOWW7U.js";

// src/app/pages/equipment/components/equipment-list/equipment-list.component.ts
var _forTrack0 = ($index, $item) => $item._id;
function EquipmentListComponent_Conditional_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "a", 2);
    \u0275\u0275element(1, "lucide-icon", 35);
    \u0275\u0275text(2);
    \u0275\u0275pipe(3, "translatePipe");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    \u0275\u0275advance();
    \u0275\u0275property("size", 20);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(3, 2, "product_list"), " ");
  }
}
function EquipmentListComponent_Conditional_42_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 23);
    \u0275\u0275text(1);
    \u0275\u0275pipe(2, "translatePipe");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(2, 1, "no_equipment_match"), " ");
  }
}
function EquipmentListComponent_For_44_Conditional_21_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "app-loader", 45);
  }
  if (rf & 2) {
    \u0275\u0275property("inline", true);
  }
}
function EquipmentListComponent_For_44_Conditional_22_Template(rf, ctx) {
  if (rf & 1) {
    const _r4 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 49);
    \u0275\u0275pipe(1, "translatePipe");
    \u0275\u0275pipe(2, "translatePipe");
    \u0275\u0275listener("click", function EquipmentListComponent_For_44_Conditional_22_Template_button_click_0_listener($event) {
      \u0275\u0275restoreView(_r4);
      const item_r2 = \u0275\u0275nextContext().$implicit;
      const ctx_r2 = \u0275\u0275nextContext();
      ctx_r2.onDelete(item_r2);
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275element(3, "lucide-icon", 50);
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
function EquipmentListComponent_For_44_Conditional_25_Conditional_37_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 68)(1, "h4", 71);
    \u0275\u0275text(2);
    \u0275\u0275pipe(3, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "div", 72)(5, "div", 54)(6, "label", 73);
    \u0275\u0275text(7);
    \u0275\u0275pipe(8, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275element(9, "input", 74);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(10, "div", 54)(11, "label", 75);
    \u0275\u0275text(12);
    \u0275\u0275pipe(13, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275element(14, "input", 76);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(15, "div", 54)(16, "label", 77);
    \u0275\u0275text(17);
    \u0275\u0275pipe(18, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275element(19, "input", 78);
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(3, 4, "scaling_rule"));
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(8, 6, "per_guests"));
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(13, 8, "min_quantity"));
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(18, 10, "max_quantity"));
  }
}
function EquipmentListComponent_For_44_Conditional_25_Conditional_43_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "app-loader", 45);
  }
  if (rf & 2) {
    \u0275\u0275property("inline", true);
  }
}
function EquipmentListComponent_For_44_Conditional_25_Template(rf, ctx) {
  if (rf & 1) {
    const _r5 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 48)(1, "h3", 51);
    \u0275\u0275text(2);
    \u0275\u0275pipe(3, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "div", 52)(5, "div", 53)(6, "div", 54)(7, "label", 55);
    \u0275\u0275text(8);
    \u0275\u0275pipe(9, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275element(10, "input", 56);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(11, "div", 54)(12, "label", 57);
    \u0275\u0275text(13);
    \u0275\u0275pipe(14, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(15, "app-custom-select", 58);
    \u0275\u0275listener("valueChange", function EquipmentListComponent_For_44_Conditional_25_Template_app_custom_select_valueChange_15_listener($event) {
      \u0275\u0275restoreView(_r5);
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.onCategoryValueChange($event, "inline"));
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(16, "div", 54)(17, "label", 59);
    \u0275\u0275text(18);
    \u0275\u0275pipe(19, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275element(20, "input", 60);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(21, "div", 61)(22, "label", 62);
    \u0275\u0275element(23, "input", 63);
    \u0275\u0275elementStart(24, "span");
    \u0275\u0275text(25);
    \u0275\u0275pipe(26, "translatePipe");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(27, "label", 62);
    \u0275\u0275element(28, "input", 64);
    \u0275\u0275elementStart(29, "span");
    \u0275\u0275text(30);
    \u0275\u0275pipe(31, "translatePipe");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(32, "div", 65)(33, "label", 66);
    \u0275\u0275text(34);
    \u0275\u0275pipe(35, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275element(36, "textarea", 67);
    \u0275\u0275elementEnd()();
    \u0275\u0275template(37, EquipmentListComponent_For_44_Conditional_25_Conditional_37_Template, 20, 12, "div", 68);
    \u0275\u0275elementStart(38, "div", 69)(39, "button", 70);
    \u0275\u0275listener("click", function EquipmentListComponent_For_44_Conditional_25_Template_button_click_39_listener() {
      \u0275\u0275restoreView(_r5);
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.onInlineCancel());
    });
    \u0275\u0275text(40);
    \u0275\u0275pipe(41, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(42, "button", 11);
    \u0275\u0275listener("click", function EquipmentListComponent_For_44_Conditional_25_Template_button_click_42_listener() {
      \u0275\u0275restoreView(_r5);
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.onInlineSave());
    });
    \u0275\u0275template(43, EquipmentListComponent_For_44_Conditional_25_Conditional_43_Template, 1, 1, "app-loader", 45);
    \u0275\u0275text(44);
    \u0275\u0275pipe(45, "translatePipe");
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    let tmp_22_0;
    const item_r2 = \u0275\u0275nextContext().$implicit;
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275property("formGroup", ctx_r2.editForm_);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate2("", \u0275\u0275pipeBind1(3, 17, "edit"), ": ", item_r2.name_hebrew, "");
    \u0275\u0275advance(6);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(9, 19, "name"));
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(14, 21, "category"));
    \u0275\u0275advance(2);
    \u0275\u0275property("options", ctx_r2.categoryOptions())("typeToFilter", true)("addNewValue", "__add_new__");
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(19, 23, "owned_quantity"));
    \u0275\u0275advance(7);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(26, 25, "is_consumable"));
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(31, 27, "scaling_enabled"));
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(35, 29, "notes"));
    \u0275\u0275advance(3);
    \u0275\u0275conditional(((tmp_22_0 = ctx_r2.editForm_.get("scaling_enabled_")) == null ? null : tmp_22_0.value) ? 37 : -1);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(41, 31, "cancel"), " ");
    \u0275\u0275advance(2);
    \u0275\u0275property("disabled", ctx_r2.editForm_.invalid || ctx_r2.isSavingEdit_());
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r2.isSavingEdit_() ? 43 : -1);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(45, 33, "save"), " ");
  }
}
function EquipmentListComponent_For_44_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 36);
    \u0275\u0275listener("click", function EquipmentListComponent_For_44_Template_div_click_0_listener($event) {
      const item_r2 = \u0275\u0275restoreView(_r1).$implicit;
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.onRowClick(item_r2, $event));
    })("keydown.enter", function EquipmentListComponent_For_44_Template_div_keydown_enter_0_listener() {
      const item_r2 = \u0275\u0275restoreView(_r1).$implicit;
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.toggleRowEdit(item_r2));
    })("keydown.space", function EquipmentListComponent_For_44_Template_div_keydown_space_0_listener($event) {
      const item_r2 = \u0275\u0275restoreView(_r1).$implicit;
      const ctx_r2 = \u0275\u0275nextContext();
      $event.preventDefault();
      return \u0275\u0275resetView(ctx_r2.toggleRowEdit(item_r2));
    });
    \u0275\u0275elementStart(1, "div", 37);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "app-cell-carousel", 38)(4, "div", 39);
    \u0275\u0275pipe(5, "translatePipe");
    \u0275\u0275text(6);
    \u0275\u0275pipe(7, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(8, "div", 40);
    \u0275\u0275pipe(9, "translatePipe");
    \u0275\u0275text(10);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(11, "div", 41);
    \u0275\u0275pipe(12, "translatePipe");
    \u0275\u0275text(13);
    \u0275\u0275pipe(14, "translatePipe");
    \u0275\u0275pipe(15, "translatePipe");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(16, "div", 42)(17, "button", 43);
    \u0275\u0275pipe(18, "translatePipe");
    \u0275\u0275pipe(19, "translatePipe");
    \u0275\u0275listener("click", function EquipmentListComponent_For_44_Template_button_click_17_listener($event) {
      const item_r2 = \u0275\u0275restoreView(_r1).$implicit;
      const ctx_r2 = \u0275\u0275nextContext();
      ctx_r2.onEdit(item_r2);
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275element(20, "lucide-icon", 44);
    \u0275\u0275elementEnd();
    \u0275\u0275template(21, EquipmentListComponent_For_44_Conditional_21_Template, 1, 1, "app-loader", 45)(22, EquipmentListComponent_For_44_Conditional_22_Template, 4, 8, "button", 46);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(23, "div", 47)(24, "app-list-row-checkbox", 21);
    \u0275\u0275listener("toggle", function EquipmentListComponent_For_44_Template_app_list_row_checkbox_toggle_24_listener() {
      const item_r2 = \u0275\u0275restoreView(_r1).$implicit;
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.selection.toggle(item_r2._id));
    });
    \u0275\u0275elementEnd()()();
    \u0275\u0275template(25, EquipmentListComponent_For_44_Conditional_25_Template, 46, 35, "div", 48);
  }
  if (rf & 2) {
    const item_r2 = ctx.$implicit;
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(item_r2.name_hebrew);
    \u0275\u0275advance();
    \u0275\u0275property("activeIndex", ctx_r2.carouselHeaderIndex_());
    \u0275\u0275advance();
    \u0275\u0275property("label", \u0275\u0275pipeBind1(5, 15, "category"));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(7, 17, item_r2.category_));
    \u0275\u0275advance(2);
    \u0275\u0275property("label", \u0275\u0275pipeBind1(9, 19, "owned_quantity"));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(item_r2.owned_quantity_);
    \u0275\u0275advance();
    \u0275\u0275property("label", \u0275\u0275pipeBind1(12, 21, "is_consumable"));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(item_r2.is_consumable_ ? \u0275\u0275pipeBind1(14, 23, "approved_yes") : \u0275\u0275pipeBind1(15, 25, "approved_no"));
    \u0275\u0275advance(4);
    \u0275\u0275property("disabled", !ctx_r2.isLoggedIn());
    \u0275\u0275attribute("aria-label", \u0275\u0275pipeBind1(18, 27, "edit"))("title", !ctx_r2.isLoggedIn() ? \u0275\u0275pipeBind1(19, 29, "sign_in_to_use") : null);
    \u0275\u0275advance(3);
    \u0275\u0275property("size", 18);
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r2.deletingId_() === item_r2._id ? 21 : 22);
    \u0275\u0275advance(3);
    \u0275\u0275property("checked", ctx_r2.selection.isSelected(item_r2._id));
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r2.editingId_() === item_r2._id ? 25 : -1);
  }
}
function EquipmentListComponent_Conditional_48_Template(rf, ctx) {
  if (rf & 1) {
    const _r6 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 79);
    \u0275\u0275listener("click", function EquipmentListComponent_Conditional_48_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r6);
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
function EquipmentListComponent_For_55_Template(rf, ctx) {
  if (rf & 1) {
    const _r7 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "label", 31)(1, "input", 80);
    \u0275\u0275listener("change", function EquipmentListComponent_For_55_Template_input_change_1_listener() {
      const cat_r8 = \u0275\u0275restoreView(_r7).$implicit;
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.toggleCategory(cat_r8));
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(2, "span");
    \u0275\u0275text(3);
    \u0275\u0275pipe(4, "translatePipe");
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const cat_r8 = ctx.$implicit;
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275property("checked", ctx_r2.selectedCategories_().has(cat_r8));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(4, 2, cat_r8));
  }
}
var ADD_NEW_CATEGORY_VALUE = "__add_new__";
var EquipmentListComponent = class _EquipmentListComponent {
  isLoggedIn = inject(UserService).isLoggedIn;
  requireAuthService = inject(RequireAuthService);
  equipmentData = inject(EquipmentDataService);
  router = inject(Router);
  heroFab = inject(HeroFabService);
  userMsg = inject(UserMsgService);
  translation = inject(TranslationService);
  logging = inject(LoggingService);
  confirmModal = inject(ConfirmModalService);
  fb = inject(FormBuilder);
  addItemModal = inject(AddItemModalService);
  translationKeyModal = inject(TranslationKeyModalService);
  /** True when this list is shown under /inventory/equipment (logistics from inventory). */
  get isUnderInventory() {
    return this.router.url.startsWith("/inventory/equipment");
  }
  get equipmentBasePath() {
    return this.isUnderInventory ? ["/inventory/equipment"] : ["/equipment"];
  }
  searchQuery_ = signal("");
  isPanelOpen_ = signal(true);
  carouselHeaderIndex_ = signal(0);
  get panelContext() {
    return this.router.url.startsWith("/inventory/equipment") ? "inventory" : "equipment";
  }
  constructor() {
    this.isPanelOpen_.set(getPanelOpen(this.panelContext));
    this.buildEditForm();
    useListState("equipment", [
      { urlParam: "q", signal: this.searchQuery_, serializer: StringParam },
      { urlParam: "sort", signal: this.sortBy_, serializer: StringParam },
      { urlParam: "order", signal: this.sortOrder_, serializer: StringParam },
      { urlParam: "categories", signal: this.selectedCategories_, serializer: StringSetParam },
      { urlParam: "consumable", signal: this.consumableFilter_, serializer: NullableBooleanParam }
    ]);
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
    this.heroFab.setPageActions([{ labelKey: "add_equipment", icon: "plus", run: () => this.router.navigate([...this.equipmentBasePath, "add"]) }], "replace");
  }
  ngOnDestroy() {
    this.heroFab.clearPageActions();
  }
  /** Selected categories; empty set = show all. */
  selectedCategories_ = signal(/* @__PURE__ */ new Set());
  /** null = no filter, true = consumable only, false = non-consumable only. */
  consumableFilter_ = signal(null);
  sortBy_ = signal("name");
  deletingId_ = signal(null);
  sortOrder_ = signal("asc");
  editingId_ = signal(null);
  selection = new ListSelectionState();
  isSavingEdit_ = signal(false);
  editableFields_ = computed(() => [
    {
      key: "category_",
      label: "category",
      options: this.categories.map((c) => ({ value: c, label: c })),
      multi: false
    },
    {
      key: "is_consumable_",
      label: "consumable",
      options: [{ value: "true", label: "yes" }, { value: "false", label: "no" }],
      multi: false
    }
  ]);
  editForm_;
  hasActiveFilters_ = computed(() => {
    const cats = this.selectedCategories_();
    const cons = this.consumableFilter_();
    return cats.size > 0 || cons !== null;
  });
  filteredEquipment_ = computed(() => {
    let list = this.equipmentData.allEquipment_();
    const search = this.searchQuery_().trim().toLowerCase();
    const cats = this.selectedCategories_();
    const consumableOnly = this.consumableFilter_();
    const sortBy = this.sortBy_();
    const order = this.sortOrder_();
    if (search) {
      list = list.filter((e) => (e.name_hebrew ?? "").toLowerCase().includes(search));
    }
    if (cats.size > 0) {
      list = list.filter((e) => cats.has(e.category_));
    }
    if (consumableOnly !== null) {
      list = list.filter((e) => e.is_consumable_ === consumableOnly);
    }
    list = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortBy === "name") {
        cmp = (a.name_hebrew ?? "").localeCompare(b.name_hebrew ?? "", "he");
      } else if (sortBy === "category") {
        cmp = (a.category_ ?? "").localeCompare(b.category_ ?? "");
      } else {
        cmp = (a.owned_quantity_ ?? 0) - (b.owned_quantity_ ?? 0);
      }
      return order === "asc" ? cmp : -cmp;
    });
    return list;
  });
  /** Visible equipment IDs for header select-all. */
  filteredEquipmentIds_ = computed(() => this.filteredEquipment_().map((e) => e._id ?? "").filter(Boolean));
  categories = [
    "heat_source",
    "tool",
    "container",
    "packaging",
    "infrastructure",
    "consumable"
  ];
  customCategories_ = signal([]);
  categoryOptions = computed(() => {
    const fixed = this.categories.map((c) => ({ value: c, label: c }));
    const custom = this.customCategories_().map((c) => ({ value: c, label: c }));
    return [...fixed, ...custom, { value: ADD_NEW_CATEGORY_VALUE, label: "add_new_category" }];
  });
  buildEditForm() {
    this.editForm_ = this.fb.group({
      name_hebrew: ["", [Validators.required]],
      category_: ["tool", [Validators.required]],
      owned_quantity_: [1, [Validators.required, Validators.min(0)]],
      is_consumable_: [false],
      notes_: [""],
      scaling_enabled_: [false],
      per_guests_: [25, [Validators.min(1)]],
      min_quantity_: [1, [Validators.min(0)]],
      max_quantity_: [null]
    });
  }
  hydrateEditForm(e) {
    const cat = e.category_ ?? "tool";
    if (cat && cat !== ADD_NEW_CATEGORY_VALUE && !this.categories.includes(cat)) {
      this.customCategories_.update((list) => list.includes(cat) ? list : [...list, cat]);
    }
    this.lastCategory_.set(cat && cat !== ADD_NEW_CATEGORY_VALUE ? cat : "tool");
    this.editForm_.patchValue({
      name_hebrew: e.name_hebrew ?? "",
      category_: cat,
      owned_quantity_: e.owned_quantity_ ?? 0,
      is_consumable_: e.is_consumable_ ?? false,
      notes_: e.notes_ ?? "",
      scaling_enabled_: !!e.scaling_rule_,
      per_guests_: e.scaling_rule_?.per_guests_ ?? 25,
      min_quantity_: e.scaling_rule_?.min_quantity_ ?? 1,
      max_quantity_: e.scaling_rule_?.max_quantity_ ?? null
    });
  }
  /** Last non-sentinel category used so we can restore when user cancels add-new. */
  lastCategory_ = signal("tool");
  onCategoryValueChange(value, context) {
    if (value === ADD_NEW_CATEGORY_VALUE) {
      void this.openAddNewCategory(context);
      return;
    }
    this.lastCategory_.set(value);
    if (context === "inline") {
      this.editForm_.patchValue({ category_: value });
    }
  }
  openAddNewCategory(context) {
    return __async(this, null, function* () {
      const previousCategory = this.lastCategory_();
      const result = yield this.addItemModal.open({
        title: "add_new_category",
        label: "category",
        placeholder: "category",
        saveLabel: "save"
      });
      if (result?.trim()) {
        let keyToUse = this.translation.resolveCategory(result.trim()) ?? "";
        if (!keyToUse) {
          const modalResult = yield this.translationKeyModal.open(result.trim(), "category");
          if (isTranslationKeyResult(modalResult)) {
            this.translation.addKeyAndHebrew(modalResult.englishKey, modalResult.hebrewLabel);
            keyToUse = modalResult.englishKey;
          } else {
            keyToUse = result.trim();
          }
        }
        if (!this.customCategories_().includes(keyToUse)) {
          this.customCategories_.update((list) => [...list, keyToUse]);
        }
        if (context === "inline") {
          this.lastCategory_.set(keyToUse);
          this.editForm_.patchValue({ category_: keyToUse });
        }
      } else if (context === "inline") {
        this.editForm_.patchValue({ category_: previousCategory });
      }
    });
  }
  togglePanel() {
    this.isPanelOpen_.update((v) => !v);
    setPanelOpen(this.panelContext, this.isPanelOpen_());
  }
  onCarouselHeaderChange(index) {
    this.carouselHeaderIndex_.set(index);
  }
  toggleCategory(cat) {
    this.selectedCategories_.update((set) => {
      const next = new Set(set);
      if (next.has(cat))
        next.delete(cat);
      else
        next.add(cat);
      return next;
    });
  }
  clearAllFilters() {
    this.selectedCategories_.set(/* @__PURE__ */ new Set());
    this.consumableFilter_.set(null);
  }
  setSort(field) {
    if (this.sortBy_() === field) {
      this.sortOrder_.update((o) => o === "asc" ? "desc" : "asc");
    } else {
      this.sortBy_.set(field);
      this.sortOrder_.set("asc");
    }
  }
  onAdd() {
    this.router.navigate([...this.equipmentBasePath, "add"]);
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
      const equipment = this.equipmentData.allEquipment_().find((e) => e._id === id);
      if (!equipment)
        return false;
      this.isSavingEdit_.set(true);
      try {
        const v = this.editForm_.getRawValue();
        const now = (/* @__PURE__ */ new Date()).toISOString();
        const scalingRule = v.scaling_enabled_ ? {
          per_guests_: Number(v.per_guests_),
          min_quantity_: Number(v.min_quantity_),
          max_quantity_: v.max_quantity_ != null && v.max_quantity_ !== "" ? Number(v.max_quantity_) : void 0
        } : void 0;
        const updated = __spreadProps(__spreadValues({}, equipment), {
          name_hebrew: v.name_hebrew,
          category_: v.category_,
          owned_quantity_: Number(v.owned_quantity_),
          is_consumable_: !!v.is_consumable_,
          notes_: v.notes_ ?? void 0,
          scaling_rule_: scalingRule,
          updated_at_: now
        });
        yield this.equipmentData.updateEquipment(updated);
        return true;
      } catch (err) {
        this.logging.error({ event: "equipment.save_error", message: "Equipment save error", context: { err } });
        const msg = err instanceof Error && err.message === ERR_DUPLICATE_EQUIPMENT_NAME ? this.translation.translate("duplicate_equipment_name") ?? "\u05DB\u05DC\u05D9 \u05E2\u05DD \u05E9\u05DD \u05D6\u05D4 \u05DB\u05D1\u05E8 \u05E7\u05D9\u05D9\u05DD" : this.translation.translate("save_failed") ?? "\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05E9\u05DE\u05D9\u05E8\u05D4";
        this.userMsg.onSetErrorMsg(msg);
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
  onDelete(item) {
    return __async(this, null, function* () {
      if (!this.requireAuthService.requireAuth())
        return;
      if (!confirm('\u05D4\u05D0\u05DD \u05DC\u05DE\u05D7\u05D5\u05E7 \u05D0\u05EA \u05E4\u05E8\u05D9\u05D8 \u05D4\u05E6\u05D9\u05D5\u05D3 "' + (item.name_hebrew ?? "") + '"?'))
        return;
      this.deletingId_.set(item._id);
      try {
        yield this.equipmentData.deleteEquipment(item._id);
      } catch (e) {
        this.logging.error({ event: "equipment.list_error", message: "Equipment list error", context: { err: e } });
      } finally {
        this.deletingId_.set(null);
      }
    });
  }
  onBulkEdit(event) {
    return __async(this, null, function* () {
      const field = event.field;
      const equipment = this.equipmentData.allEquipment_();
      for (const id of event.ids) {
        const item = equipment.find((e) => e._id === id);
        if (!item)
          continue;
        let updated;
        if (field === "category_") {
          updated = __spreadProps(__spreadValues({}, item), { category_: event.value });
        } else {
          updated = __spreadProps(__spreadValues({}, item), { is_consumable_: event.value === "true" });
        }
        void this.equipmentData.updateEquipment(updated);
      }
    });
  }
  onBulkDeleteSelected(ids) {
    return __async(this, null, function* () {
      if (ids.length === 0)
        return;
      if (!this.requireAuthService.requireAuth())
        return;
      if (!confirm(`\u05DC\u05DE\u05D7\u05D5\u05E7 ${ids.length} \u05E4\u05E8\u05D9\u05D8\u05D9 \u05E6\u05D9\u05D5\u05D3?`))
        return;
      for (const id of ids) {
        this.deletingId_.set(id);
        try {
          yield this.equipmentData.deleteEquipment(id);
        } catch (e) {
          this.logging.error({ event: "equipment.list_error", message: "Equipment list error", context: { err: e } });
        } finally {
          this.deletingId_.set(null);
        }
      }
      this.selection.clear();
    });
  }
  static \u0275fac = function EquipmentListComponent_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _EquipmentListComponent)();
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _EquipmentListComponent, selectors: [["app-equipment-list"]], decls: 76, vars: 64, consts: [[3, "panelToggle", "isPanelOpen", "gridTemplate", "mobileGridTemplate"], ["shell-title", ""], ["routerLink", "/inventory/list", 1, "back-link"], [1, "page-title"], ["shell-search", ""], ["for", "equipment-search", 1, "visually-hidden"], [1, "c-input-wrapper"], ["name", "search", 3, "size"], ["id", "equipment-search", "type", "text", 3, "ngModelChange", "ngModel", "placeholder"], ["shell-actions", ""], [3, "bulkDelete", "bulkEdit", "selectionState", "editableFields"], ["type", "button", 1, "c-btn-primary", 3, "click", "disabled"], ["name", "plus", 3, "size"], ["shell-table-header", ""], ["role", "columnheader", "tabindex", "0", 1, "col-name", "c-grid-header-cell", "c-sortable-header", 3, "click", "keydown.enter", "keydown.space"], [3, "activeIndexChange", "activeIndex"], ["carouselHeaderColumn", "", "label", "category", "role", "button", "tabindex", "0", 1, "col-category", "c-grid-header-cell", "c-sortable-header", 3, "click", "keydown.enter", "keydown.space"], ["carouselHeaderColumn", "", "label", "owned_quantity", "role", "button", "tabindex", "0", 1, "col-owned", "c-grid-header-cell", "c-sortable-header", 3, "click", "keydown.enter", "keydown.space"], ["carouselHeaderColumn", "", "label", "is_consumable", "role", "presentation", 1, "col-consumable", "c-grid-header-cell"], ["role", "columnheader", 1, "c-col-actions", "c-grid-header-cell"], ["role", "columnheader", 1, "col-select", "c-grid-header-cell"], [3, "toggle", "checked"], ["shell-table-body", ""], [1, "no-results"], ["shell-filters", ""], [1, "c-filter-section"], [1, "c-filter-section-header"], ["type", "button", 1, "c-btn-ghost--sm"], [1, "c-filter-category"], [1, "c-filter-category-label"], [1, "c-filter-options"], [1, "c-filter-option"], [1, "c-filter-category", "consumable-filter"], [1, "c-filter-options", "c-filter-options--inline"], ["type", "radio", "name", "consumable", 3, "change", "checked"], ["name", "chevron-right", 3, "size"], ["role", "button", "tabindex", "0", 1, "equipment-grid-row", "c-list-row", 3, "click", "keydown.enter", "keydown.space"], ["role", "cell", 1, "col-name", "c-list-body-cell"], ["role", "cell", 3, "activeIndex"], ["cellCarouselSlide", "", 1, "col-category", "c-list-body-cell", 3, "label"], ["cellCarouselSlide", "", 1, "col-owned", "c-list-body-cell", 3, "label"], ["cellCarouselSlide", "", 1, "col-consumable", "c-list-body-cell", 3, "label"], ["role", "cell", 1, "c-col-actions", "c-list-body-cell"], ["type", "button", 1, "c-icon-btn", 3, "click", "disabled"], ["name", "pencil", 3, "size"], ["size", "small", 3, "inline"], ["type", "button", 1, "c-icon-btn", "danger", 3, "disabled"], ["role", "cell", 1, "col-select", "c-list-body-cell"], [1, "inline-edit-panel", 3, "formGroup"], ["type", "button", 1, "c-icon-btn", "danger", 3, "click", "disabled"], ["name", "trash-2", 3, "size"], [1, "inline-edit-title"], [1, "inline-edit-section"], [1, "inline-edit-grid"], [1, "inline-edit-field"], ["for", "inline-name"], ["id", "inline-name", "type", "text", "formControlName", "name_hebrew", 1, "c-input"], ["for", "inline-category"], ["triggerId", "inline-category", "formControlName", "category_", "placeholder", "category", 3, "valueChange", "options", "typeToFilter", "addNewValue"], ["for", "inline-owned"], ["id", "inline-owned", "type", "number", "formControlName", "owned_quantity_", "min", "0", 1, "c-input"], [1, "inline-edit-checkboxes"], [1, "inline-edit-check"], ["type", "checkbox", "formControlName", "is_consumable_"], ["type", "checkbox", "formControlName", "scaling_enabled_"], [1, "inline-edit-field", "inline-edit-notes"], ["for", "inline-notes"], ["id", "inline-notes", "formControlName", "notes_", "rows", "2", 1, "c-input"], [1, "inline-edit-section", "inline-edit-scaling"], [1, "inline-edit-actions"], ["type", "button", 1, "c-btn-ghost", 3, "click"], [1, "inline-edit-section-title"], [1, "inline-edit-grid", "inline-edit-scaling-grid"], ["for", "inline-per-guests"], ["id", "inline-per-guests", "type", "number", "formControlName", "per_guests_", "min", "1", 1, "c-input"], ["for", "inline-min-qty"], ["id", "inline-min-qty", "type", "number", "formControlName", "min_quantity_", "min", "0", 1, "c-input"], ["for", "inline-max-qty"], ["id", "inline-max-qty", "type", "number", "formControlName", "max_quantity_", "min", "0", "placeholder", "\u2014", 1, "c-input"], ["type", "button", 1, "c-btn-ghost--sm", 3, "click"], ["type", "checkbox", 3, "change", "checked"]], template: function EquipmentListComponent_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275elementStart(0, "app-list-shell", 0);
      \u0275\u0275listener("panelToggle", function EquipmentListComponent_Template_app_list_shell_panelToggle_0_listener() {
        return ctx.togglePanel();
      });
      \u0275\u0275elementContainerStart(1, 1);
      \u0275\u0275template(2, EquipmentListComponent_Conditional_2_Template, 4, 4, "a", 2);
      \u0275\u0275elementStart(3, "h2", 3);
      \u0275\u0275text(4);
      \u0275\u0275pipe(5, "translatePipe");
      \u0275\u0275pipe(6, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275elementContainerEnd();
      \u0275\u0275elementContainerStart(7, 4);
      \u0275\u0275elementStart(8, "label", 5);
      \u0275\u0275text(9);
      \u0275\u0275pipe(10, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(11, "div", 6);
      \u0275\u0275element(12, "lucide-icon", 7);
      \u0275\u0275elementStart(13, "input", 8);
      \u0275\u0275pipe(14, "translatePipe");
      \u0275\u0275listener("ngModelChange", function EquipmentListComponent_Template_input_ngModelChange_13_listener($event) {
        return ctx.searchQuery_.set($event);
      });
      \u0275\u0275elementEnd()();
      \u0275\u0275elementContainerEnd();
      \u0275\u0275elementContainerStart(15, 9);
      \u0275\u0275elementStart(16, "app-selection-bar", 10);
      \u0275\u0275listener("bulkDelete", function EquipmentListComponent_Template_app_selection_bar_bulkDelete_16_listener($event) {
        return ctx.onBulkDeleteSelected($event);
      })("bulkEdit", function EquipmentListComponent_Template_app_selection_bar_bulkEdit_16_listener($event) {
        return ctx.onBulkEdit($event);
      });
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(17, "button", 11);
      \u0275\u0275pipe(18, "translatePipe");
      \u0275\u0275listener("click", function EquipmentListComponent_Template_button_click_17_listener() {
        return ctx.onAdd();
      });
      \u0275\u0275element(19, "lucide-icon", 12);
      \u0275\u0275text(20);
      \u0275\u0275pipe(21, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275elementContainerEnd();
      \u0275\u0275elementContainerStart(22, 13);
      \u0275\u0275elementStart(23, "div", 14);
      \u0275\u0275listener("click", function EquipmentListComponent_Template_div_click_23_listener() {
        return ctx.setSort("name");
      })("keydown.enter", function EquipmentListComponent_Template_div_keydown_enter_23_listener() {
        return ctx.setSort("name");
      })("keydown.space", function EquipmentListComponent_Template_div_keydown_space_23_listener($event) {
        $event.preventDefault();
        return ctx.setSort("name");
      });
      \u0275\u0275text(24);
      \u0275\u0275pipe(25, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(26, "app-carousel-header", 15);
      \u0275\u0275listener("activeIndexChange", function EquipmentListComponent_Template_app_carousel_header_activeIndexChange_26_listener($event) {
        return ctx.onCarouselHeaderChange($event);
      });
      \u0275\u0275elementStart(27, "div", 16);
      \u0275\u0275listener("click", function EquipmentListComponent_Template_div_click_27_listener() {
        return ctx.setSort("category");
      })("keydown.enter", function EquipmentListComponent_Template_div_keydown_enter_27_listener() {
        return ctx.setSort("category");
      })("keydown.space", function EquipmentListComponent_Template_div_keydown_space_27_listener($event) {
        $event.preventDefault();
        return ctx.setSort("category");
      });
      \u0275\u0275text(28);
      \u0275\u0275pipe(29, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(30, "div", 17);
      \u0275\u0275listener("click", function EquipmentListComponent_Template_div_click_30_listener() {
        return ctx.setSort("owned");
      })("keydown.enter", function EquipmentListComponent_Template_div_keydown_enter_30_listener() {
        return ctx.setSort("owned");
      })("keydown.space", function EquipmentListComponent_Template_div_keydown_space_30_listener($event) {
        $event.preventDefault();
        return ctx.setSort("owned");
      });
      \u0275\u0275text(31);
      \u0275\u0275pipe(32, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(33, "div", 18);
      \u0275\u0275text(34);
      \u0275\u0275pipe(35, "translatePipe");
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(36, "div", 19);
      \u0275\u0275text(37);
      \u0275\u0275pipe(38, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(39, "div", 20)(40, "app-list-row-checkbox", 21);
      \u0275\u0275listener("toggle", function EquipmentListComponent_Template_app_list_row_checkbox_toggle_40_listener() {
        return ctx.selection.toggleSelectAll(ctx.filteredEquipmentIds_());
      });
      \u0275\u0275elementEnd()();
      \u0275\u0275elementContainerEnd();
      \u0275\u0275elementContainerStart(41, 22);
      \u0275\u0275template(42, EquipmentListComponent_Conditional_42_Template, 3, 3, "div", 23);
      \u0275\u0275repeaterCreate(43, EquipmentListComponent_For_44_Template, 26, 31, null, null, _forTrack0);
      \u0275\u0275elementContainerEnd();
      \u0275\u0275elementContainerStart(45, 24);
      \u0275\u0275elementStart(46, "div", 25)(47, "div", 26);
      \u0275\u0275template(48, EquipmentListComponent_Conditional_48_Template, 3, 3, "button", 27);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(49, "div", 28)(50, "span", 29);
      \u0275\u0275text(51);
      \u0275\u0275pipe(52, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(53, "div", 30);
      \u0275\u0275repeaterCreate(54, EquipmentListComponent_For_55_Template, 5, 4, "label", 31, \u0275\u0275repeaterTrackByIdentity);
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(56, "div", 32)(57, "span", 29);
      \u0275\u0275text(58);
      \u0275\u0275pipe(59, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(60, "div", 33)(61, "label", 31)(62, "input", 34);
      \u0275\u0275listener("change", function EquipmentListComponent_Template_input_change_62_listener() {
        return ctx.consumableFilter_.set(null);
      });
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(63, "span");
      \u0275\u0275text(64);
      \u0275\u0275pipe(65, "translatePipe");
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(66, "label", 31)(67, "input", 34);
      \u0275\u0275listener("change", function EquipmentListComponent_Template_input_change_67_listener() {
        return ctx.consumableFilter_.set(true);
      });
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(68, "span");
      \u0275\u0275text(69);
      \u0275\u0275pipe(70, "translatePipe");
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(71, "label", 31)(72, "input", 34);
      \u0275\u0275listener("change", function EquipmentListComponent_Template_input_change_72_listener() {
        return ctx.consumableFilter_.set(false);
      });
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(73, "span");
      \u0275\u0275text(74);
      \u0275\u0275pipe(75, "translatePipe");
      \u0275\u0275elementEnd()()()()();
      \u0275\u0275elementContainerEnd();
      \u0275\u0275elementEnd();
    }
    if (rf & 2) {
      \u0275\u0275property("isPanelOpen", ctx.isPanelOpen_())("gridTemplate", "2fr 1fr minmax(48px, 0.8fr) 0.8fr 80px minmax(44px, auto)")("mobileGridTemplate", "2fr 1fr 80px minmax(44px, auto)");
      \u0275\u0275advance(2);
      \u0275\u0275conditional(ctx.isUnderInventory ? 2 : -1);
      \u0275\u0275advance(2);
      \u0275\u0275textInterpolate(ctx.isUnderInventory ? \u0275\u0275pipeBind1(5, 32, "logistics") : \u0275\u0275pipeBind1(6, 34, "equipment_list"));
      \u0275\u0275advance(5);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(10, 36, "search"));
      \u0275\u0275advance(3);
      \u0275\u0275property("size", 18);
      \u0275\u0275advance();
      \u0275\u0275property("ngModel", ctx.searchQuery_())("placeholder", \u0275\u0275pipeBind1(14, 38, "search"));
      \u0275\u0275advance(3);
      \u0275\u0275property("selectionState", ctx.selection)("editableFields", ctx.editableFields_());
      \u0275\u0275advance();
      \u0275\u0275property("disabled", !ctx.isLoggedIn());
      \u0275\u0275attribute("title", !ctx.isLoggedIn() ? \u0275\u0275pipeBind1(18, 40, "sign_in_to_use") : null);
      \u0275\u0275advance(2);
      \u0275\u0275property("size", 18);
      \u0275\u0275advance();
      \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(21, 42, "add_equipment"), " ");
      \u0275\u0275advance(4);
      \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(25, 44, "name"), " ");
      \u0275\u0275advance(2);
      \u0275\u0275property("activeIndex", ctx.carouselHeaderIndex_());
      \u0275\u0275advance(2);
      \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(29, 46, "category"), " ");
      \u0275\u0275advance(3);
      \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(32, 48, "owned_quantity"), " ");
      \u0275\u0275advance(3);
      \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(35, 50, "is_consumable"), " ");
      \u0275\u0275advance(3);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(38, 52, "actions"));
      \u0275\u0275advance(3);
      \u0275\u0275property("checked", ctx.filteredEquipmentIds_().length > 0 && ctx.selection.allSelected(ctx.filteredEquipmentIds_()));
      \u0275\u0275advance(2);
      \u0275\u0275conditional(ctx.filteredEquipment_().length === 0 ? 42 : -1);
      \u0275\u0275advance();
      \u0275\u0275repeater(ctx.filteredEquipment_());
      \u0275\u0275advance(5);
      \u0275\u0275conditional(ctx.hasActiveFilters_() ? 48 : -1);
      \u0275\u0275advance(3);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(52, 54, "category"));
      \u0275\u0275advance(3);
      \u0275\u0275repeater(ctx.categories);
      \u0275\u0275advance(4);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(59, 56, "is_consumable"));
      \u0275\u0275advance(4);
      \u0275\u0275property("checked", ctx.consumableFilter_() === null);
      \u0275\u0275advance(2);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(65, 58, "all"));
      \u0275\u0275advance(3);
      \u0275\u0275property("checked", ctx.consumableFilter_() === true);
      \u0275\u0275advance(2);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(70, 60, "approved_yes"));
      \u0275\u0275advance(3);
      \u0275\u0275property("checked", ctx.consumableFilter_() === false);
      \u0275\u0275advance(2);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(75, 62, "approved_no"));
    }
  }, dependencies: [CommonModule, FormsModule, DefaultValueAccessor, NumberValueAccessor, CheckboxControlValueAccessor, NgControlStatus, NgControlStatusGroup, MinValidator, NgModel, ReactiveFormsModule, FormGroupDirective, FormControlName, RouterLink, LucideAngularModule, LucideAngularComponent, TranslatePipe, LoaderComponent, CellCarouselComponent, CellCarouselSlideDirective, ListShellComponent, CarouselHeaderComponent, CarouselHeaderColumnDirective, CustomSelectComponent, ListRowCheckboxComponent, SelectionBarComponent], styles: ["\n\n@layer components.equipment-list {\n  [_nghost-%COMP%] {\n    display: block;\n  }\n  .page-title[_ngcontent-%COMP%] {\n    flex-shrink: 0;\n    margin: 0;\n    font-size: 1.25rem;\n    font-weight: 700;\n    color: var(--color-text-main);\n    letter-spacing: 0.02em;\n  }\n  .back-link[_ngcontent-%COMP%] {\n    display: inline-flex;\n    align-items: center;\n    gap: 0.35rem;\n    padding-inline: 0.5rem;\n    padding-block: 0.375rem;\n    color: var(--color-text-muted);\n    font-size: 0.875rem;\n    font-weight: 500;\n    text-decoration: none;\n    border-radius: var(--radius-md);\n    transition: background 0.2s var(--ease-smooth), color 0.2s var(--ease-smooth);\n  }\n  .back-link[_ngcontent-%COMP%]:hover {\n    background: var(--bg-glass-hover);\n    color: var(--color-text-main);\n  }\n  .c-sortable-header[_ngcontent-%COMP%] {\n    cursor: pointer;\n    -webkit-user-select: none;\n    user-select: none;\n  }\n  .equipment-grid-row[_ngcontent-%COMP%] {\n    display: contents;\n  }\n  .equipment-grid-row[_ngcontent-%COMP%]   .c-list-body-cell[_ngcontent-%COMP%] {\n    cursor: pointer;\n  }\n  .equipment-grid-row[_ngcontent-%COMP%]:hover   .c-icon-btn[_ngcontent-%COMP%] {\n    opacity: 1;\n  }\n  .c-col-actions[_ngcontent-%COMP%]   .c-icon-btn[_ngcontent-%COMP%] {\n    margin-inline-start: 0.25rem;\n  }\n  .no-results[_ngcontent-%COMP%] {\n    grid-column: 1/-1;\n    padding: 2rem 1rem;\n    text-align: center;\n    color: var(--color-text-muted);\n    font-size: 0.875rem;\n    border-block-end: 1px solid var(--border-default);\n    background: var(--bg-glass-strong);\n  }\n  .inline-edit-panel[_ngcontent-%COMP%] {\n    grid-column: 1/-1;\n  }\n  .inline-edit-section[_ngcontent-%COMP%]    + .inline-edit-section[_ngcontent-%COMP%] {\n    padding-block-start: 1.25rem;\n    margin-block-start: 0.5rem;\n    border-block-start: 1px solid var(--border-default);\n  }\n  .inline-edit-section-title[_ngcontent-%COMP%] {\n    display: block;\n    margin: 0 0 0.5rem;\n    font-size: 0.9375rem;\n    font-weight: 600;\n    color: var(--color-text-secondary);\n  }\n  .inline-edit-scaling-grid[_ngcontent-%COMP%] {\n    grid-template-columns: repeat(3, minmax(0, 8rem));\n  }\n  .inline-edit-notes[_ngcontent-%COMP%] {\n    grid-column: 1/-1;\n  }\n  @media (max-width: 640px) {\n    .inline-edit-grid[_ngcontent-%COMP%] {\n      grid-template-columns: 1fr;\n    }\n    .inline-edit-scaling-grid[_ngcontent-%COMP%] {\n      grid-template-columns: 1fr;\n    }\n  }\n  @media (max-width: 768px) {\n    .equipment-grid-row[_ngcontent-%COMP%]   app-cell-carousel[_ngcontent-%COMP%] {\n      background: var(--bg-glass);\n      border-block-end: 1px solid rgba(241, 245, 249, 0.4);\n      transition: background 0.15s ease;\n    }\n    .equipment-grid-row[_ngcontent-%COMP%]:hover   app-cell-carousel[_ngcontent-%COMP%] {\n      background: var(--bg-glass-hover);\n    }\n  }\n}\n/*# sourceMappingURL=equipment-list.component.css.map */"], changeDetection: 0 });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(EquipmentListComponent, [{
    type: Component,
    args: [{ selector: "app-equipment-list", standalone: true, imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink, LucideAngularModule, TranslatePipe, LoaderComponent, CellCarouselComponent, CellCarouselSlideDirective, ListShellComponent, CarouselHeaderComponent, CarouselHeaderColumnDirective, CustomSelectComponent, ListRowCheckboxComponent, SelectionBarComponent], changeDetection: ChangeDetectionStrategy.OnPush, template: `<app-list-shell
  [isPanelOpen]="isPanelOpen_()"
  (panelToggle)="togglePanel()"
  [gridTemplate]="'2fr 1fr minmax(48px, 0.8fr) 0.8fr 80px minmax(44px, auto)'"
  [mobileGridTemplate]="'2fr 1fr 80px minmax(44px, auto)'">

  <ng-container shell-title>
    @if (isUnderInventory) {
      <a routerLink="/inventory/list" class="back-link">
        <lucide-icon name="chevron-right" [size]="20"></lucide-icon>
        {{ 'product_list' | translatePipe }}
      </a>
    }
    <h2 class="page-title">{{ isUnderInventory ? ('logistics' | translatePipe) : ('equipment_list' | translatePipe) }}</h2>
  </ng-container>

  <ng-container shell-search>
    <label class="visually-hidden" for="equipment-search">{{ 'search' | translatePipe }}</label>
    <div class="c-input-wrapper">
      <lucide-icon name="search" [size]="18"></lucide-icon>
      <input
        id="equipment-search"
        type="text"
        [ngModel]="searchQuery_()"
        (ngModelChange)="searchQuery_.set($event)"
        [placeholder]="'search' | translatePipe"
      />
    </div>
  </ng-container>

  <ng-container shell-actions>
    <app-selection-bar
      [selectionState]="selection"
      [editableFields]="editableFields_()"
      (bulkDelete)="onBulkDeleteSelected($event)"
      (bulkEdit)="onBulkEdit($event)" />
    <button type="button" class="c-btn-primary" (click)="onAdd()"
      [disabled]="!isLoggedIn()"
      [attr.title]="!isLoggedIn() ? ('sign_in_to_use' | translatePipe) : null">
      <lucide-icon name="plus" [size]="18"></lucide-icon>
      {{ 'add_equipment' | translatePipe }}
    </button>
  </ng-container>

  <ng-container shell-table-header>
    <div class="col-name c-grid-header-cell c-sortable-header" (click)="setSort('name')" (keydown.enter)="setSort('name')" (keydown.space)="$event.preventDefault(); setSort('name')" role="columnheader" tabindex="0">
      {{ 'name' | translatePipe }}
    </div>
    <app-carousel-header [activeIndex]="carouselHeaderIndex_()" (activeIndexChange)="onCarouselHeaderChange($event)">
      <div class="col-category c-grid-header-cell c-sortable-header" carouselHeaderColumn label="category" (click)="setSort('category')" (keydown.enter)="setSort('category')" (keydown.space)="$event.preventDefault(); setSort('category')" role="button" tabindex="0">
        {{ 'category' | translatePipe }}
      </div>
      <div class="col-owned c-grid-header-cell c-sortable-header" carouselHeaderColumn label="owned_quantity" (click)="setSort('owned')" (keydown.enter)="setSort('owned')" (keydown.space)="$event.preventDefault(); setSort('owned')" role="button" tabindex="0">
        {{ 'owned_quantity' | translatePipe }}
      </div>
      <div class="col-consumable c-grid-header-cell" carouselHeaderColumn label="is_consumable" role="presentation">
        {{ 'is_consumable' | translatePipe }}
      </div>
    </app-carousel-header>
    <div class="c-col-actions c-grid-header-cell" role="columnheader">{{ 'actions' | translatePipe }}</div>
    <div class="col-select c-grid-header-cell" role="columnheader">
      <app-list-row-checkbox [checked]="filteredEquipmentIds_().length > 0 && selection.allSelected(filteredEquipmentIds_())" (toggle)="selection.toggleSelectAll(filteredEquipmentIds_())" />
    </div>
  </ng-container>

  <ng-container shell-table-body>
    @if (filteredEquipment_().length === 0) {
      <div class="no-results">
        {{ 'no_equipment_match' | translatePipe }}
      </div>
    }
    @for (item of filteredEquipment_(); track item._id) {
      <div class="equipment-grid-row c-list-row" role="button" tabindex="0"
        (click)="onRowClick(item, $event)"
        (keydown.enter)="toggleRowEdit(item)"
        (keydown.space)="$event.preventDefault(); toggleRowEdit(item)">
        <div class="col-name c-list-body-cell" role="cell">{{ item.name_hebrew }}</div>
        <app-cell-carousel [activeIndex]="carouselHeaderIndex_()" role="cell">
          <div class="col-category c-list-body-cell" cellCarouselSlide [label]="'category' | translatePipe">{{ item.category_ | translatePipe }}</div>
          <div class="col-owned c-list-body-cell" cellCarouselSlide [label]="'owned_quantity' | translatePipe">{{ item.owned_quantity_ }}</div>
          <div class="col-consumable c-list-body-cell" cellCarouselSlide [label]="'is_consumable' | translatePipe">{{ item.is_consumable_ ? ('approved_yes' | translatePipe) : ('approved_no' | translatePipe) }}</div>
        </app-cell-carousel>
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
        <div class="inline-edit-panel" [formGroup]="editForm_">
          <h3 class="inline-edit-title">{{ 'edit' | translatePipe }}: {{ item.name_hebrew }}</h3>

          <div class="inline-edit-section">
            <div class="inline-edit-grid">
              <div class="inline-edit-field">
                <label for="inline-name">{{ 'name' | translatePipe }}</label>
                <input id="inline-name" type="text" formControlName="name_hebrew" class="c-input" />
              </div>
              <div class="inline-edit-field">
                <label for="inline-category">{{ 'category' | translatePipe }}</label>
                <app-custom-select
                  triggerId="inline-category"
                  formControlName="category_"
                  [options]="categoryOptions()"
                  placeholder="category"
                  [typeToFilter]="true"
                  [addNewValue]="'__add_new__'"
                  (valueChange)="onCategoryValueChange($event, 'inline')" />
              </div>
              <div class="inline-edit-field">
                <label for="inline-owned">{{ 'owned_quantity' | translatePipe }}</label>
                <input id="inline-owned" type="number" formControlName="owned_quantity_" min="0" class="c-input" />
              </div>
            </div>
            <div class="inline-edit-checkboxes">
              <label class="inline-edit-check">
                <input type="checkbox" formControlName="is_consumable_" />
                <span>{{ 'is_consumable' | translatePipe }}</span>
              </label>
              <label class="inline-edit-check">
                <input type="checkbox" formControlName="scaling_enabled_" />
                <span>{{ 'scaling_enabled' | translatePipe }}</span>
              </label>
            </div>
            <div class="inline-edit-field inline-edit-notes">
              <label for="inline-notes">{{ 'notes' | translatePipe }}</label>
              <textarea id="inline-notes" formControlName="notes_" rows="2" class="c-input"></textarea>
            </div>
          </div>

          @if (editForm_.get('scaling_enabled_')?.value) {
            <div class="inline-edit-section inline-edit-scaling">
              <h4 class="inline-edit-section-title">{{ 'scaling_rule' | translatePipe }}</h4>
              <div class="inline-edit-grid inline-edit-scaling-grid">
                <div class="inline-edit-field">
                  <label for="inline-per-guests">{{ 'per_guests' | translatePipe }}</label>
                  <input id="inline-per-guests" type="number" formControlName="per_guests_" min="1" class="c-input" />
                </div>
                <div class="inline-edit-field">
                  <label for="inline-min-qty">{{ 'min_quantity' | translatePipe }}</label>
                  <input id="inline-min-qty" type="number" formControlName="min_quantity_" min="0" class="c-input" />
                </div>
                <div class="inline-edit-field">
                  <label for="inline-max-qty">{{ 'max_quantity' | translatePipe }}</label>
                  <input id="inline-max-qty" type="number" formControlName="max_quantity_" min="0" placeholder="\u2014" class="c-input" />
                </div>
              </div>
            </div>
          }

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
        <span class="c-filter-category-label">{{ 'category' | translatePipe }}</span>
        <div class="c-filter-options">
          @for (cat of categories; track cat) {
            <label class="c-filter-option">
              <input type="checkbox" [checked]="selectedCategories_().has(cat)" (change)="toggleCategory(cat)" />
              <span>{{ cat | translatePipe }}</span>
            </label>
          }
        </div>
      </div>
      <div class="c-filter-category consumable-filter">
        <span class="c-filter-category-label">{{ 'is_consumable' | translatePipe }}</span>
        <div class="c-filter-options c-filter-options--inline">
          <label class="c-filter-option">
            <input type="radio" name="consumable" [checked]="consumableFilter_() === null" (change)="consumableFilter_.set(null)" />
            <span>{{ 'all' | translatePipe }}</span>
          </label>
          <label class="c-filter-option">
            <input type="radio" name="consumable" [checked]="consumableFilter_() === true" (change)="consumableFilter_.set(true)" />
            <span>{{ 'approved_yes' | translatePipe }}</span>
          </label>
          <label class="c-filter-option">
            <input type="radio" name="consumable" [checked]="consumableFilter_() === false" (change)="consumableFilter_.set(false)" />
            <span>{{ 'approved_no' | translatePipe }}</span>
          </label>
        </div>
      </div>
    </div>
  </ng-container>

</app-list-shell>
`, styles: ["/* src/app/pages/equipment/components/equipment-list/equipment-list.component.scss */\n@layer components.equipment-list {\n  :host {\n    display: block;\n  }\n  .page-title {\n    flex-shrink: 0;\n    margin: 0;\n    font-size: 1.25rem;\n    font-weight: 700;\n    color: var(--color-text-main);\n    letter-spacing: 0.02em;\n  }\n  .back-link {\n    display: inline-flex;\n    align-items: center;\n    gap: 0.35rem;\n    padding-inline: 0.5rem;\n    padding-block: 0.375rem;\n    color: var(--color-text-muted);\n    font-size: 0.875rem;\n    font-weight: 500;\n    text-decoration: none;\n    border-radius: var(--radius-md);\n    transition: background 0.2s var(--ease-smooth), color 0.2s var(--ease-smooth);\n  }\n  .back-link:hover {\n    background: var(--bg-glass-hover);\n    color: var(--color-text-main);\n  }\n  .c-sortable-header {\n    cursor: pointer;\n    -webkit-user-select: none;\n    user-select: none;\n  }\n  .equipment-grid-row {\n    display: contents;\n  }\n  .equipment-grid-row .c-list-body-cell {\n    cursor: pointer;\n  }\n  .equipment-grid-row:hover .c-icon-btn {\n    opacity: 1;\n  }\n  .c-col-actions .c-icon-btn {\n    margin-inline-start: 0.25rem;\n  }\n  .no-results {\n    grid-column: 1/-1;\n    padding: 2rem 1rem;\n    text-align: center;\n    color: var(--color-text-muted);\n    font-size: 0.875rem;\n    border-block-end: 1px solid var(--border-default);\n    background: var(--bg-glass-strong);\n  }\n  .inline-edit-panel {\n    grid-column: 1/-1;\n  }\n  .inline-edit-section + .inline-edit-section {\n    padding-block-start: 1.25rem;\n    margin-block-start: 0.5rem;\n    border-block-start: 1px solid var(--border-default);\n  }\n  .inline-edit-section-title {\n    display: block;\n    margin: 0 0 0.5rem;\n    font-size: 0.9375rem;\n    font-weight: 600;\n    color: var(--color-text-secondary);\n  }\n  .inline-edit-scaling-grid {\n    grid-template-columns: repeat(3, minmax(0, 8rem));\n  }\n  .inline-edit-notes {\n    grid-column: 1/-1;\n  }\n  @media (max-width: 640px) {\n    .inline-edit-grid {\n      grid-template-columns: 1fr;\n    }\n    .inline-edit-scaling-grid {\n      grid-template-columns: 1fr;\n    }\n  }\n  @media (max-width: 768px) {\n    .equipment-grid-row app-cell-carousel {\n      background: var(--bg-glass);\n      border-block-end: 1px solid rgba(241, 245, 249, 0.4);\n      transition: background 0.15s ease;\n    }\n    .equipment-grid-row:hover app-cell-carousel {\n      background: var(--bg-glass-hover);\n    }\n  }\n}\n/*# sourceMappingURL=equipment-list.component.css.map */\n"] }]
  }], () => [], null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(EquipmentListComponent, { className: "EquipmentListComponent", filePath: "src/app/pages/equipment/components/equipment-list/equipment-list.component.ts", lineNumber: 43 });
})();
export {
  EquipmentListComponent
};
//# sourceMappingURL=chunk-LL6V5KAP.js.map
