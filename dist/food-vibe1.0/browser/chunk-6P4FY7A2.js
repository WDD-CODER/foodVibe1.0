import {
  duplicateEntityNameValidator
} from "./chunk-6FJWTD4F.js";
import {
  useSavingState
} from "./chunk-I64HYR5B.js";
import {
  RequireAuthService
} from "./chunk-D637KIHB.js";
import {
  CheckboxControlValueAccessor,
  DefaultValueAccessor,
  FormArrayName,
  FormBuilder,
  FormControlName,
  FormGroupDirective,
  MinValidator,
  NgControlStatus,
  NgControlStatusGroup,
  NumberValueAccessor,
  ReactiveFormsModule,
  Validators,
  ɵNgNoValidate
} from "./chunk-CA2J44DF.js";
import {
  LoaderComponent
} from "./chunk-G7HPFFIH.js";
import {
  takeUntilDestroyed
} from "./chunk-KJ2NCQHM.js";
import {
  LucideAngularModule
} from "./chunk-XDVMM5TS.js";
import {
  TranslatePipe
} from "./chunk-CH6HZ4GZ.js";
import {
  SupplierDataService
} from "./chunk-ZDTM2BLR.js";
import {
  LoggingService
} from "./chunk-ZMFT5D5F.js";
import {
  ActivatedRoute,
  ChangeDetectionStrategy,
  CommonModule,
  Component,
  DestroyRef,
  Router,
  __spreadValues,
  effect,
  inject,
  input,
  output,
  setClassMetadata,
  signal,
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
  ɵɵrepeaterTrackByIndex,
  ɵɵresetView,
  ɵɵrestoreView,
  ɵɵtemplate,
  ɵɵtext,
  ɵɵtextInterpolate,
  ɵɵtextInterpolate1,
  ɵɵtextInterpolate2
} from "./chunk-FJPSXAXA.js";

// src/app/pages/suppliers/components/supplier-form/supplier-form.component.ts
function SupplierFormComponent_Conditional_0_Conditional_0_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "h3");
    \u0275\u0275text(1);
    \u0275\u0275pipe(2, "translatePipe");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    let tmp_2_0;
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate2("", \u0275\u0275pipeBind1(2, 2, "edit"), ": ", (tmp_2_0 = ctx_r1.supplierForm_.get("name_hebrew")) == null ? null : tmp_2_0.value, "");
  }
}
function SupplierFormComponent_Conditional_0_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "h3");
    \u0275\u0275text(1);
    \u0275\u0275pipe(2, "translatePipe");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(2, 1, "add_supplier"));
  }
}
function SupplierFormComponent_Conditional_0_Conditional_9_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 6);
    \u0275\u0275text(1);
    \u0275\u0275pipe(2, "translatePipe");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(2, 1, "duplicate_supplier_name"));
  }
}
function SupplierFormComponent_Conditional_0_For_21_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "label", 10);
    \u0275\u0275element(1, "input", 19);
    \u0275\u0275text(2);
    \u0275\u0275pipe(3, "translatePipe");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const $index_r3 = ctx.$index;
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275property("formControlName", $index_r3);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(3, 2, ctx_r1.dayKeys[$index_r3]), " ");
  }
}
function SupplierFormComponent_Conditional_0_Conditional_37_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "app-loader", 18);
  }
  if (rf & 2) {
    \u0275\u0275property("inline", true);
  }
}
function SupplierFormComponent_Conditional_0_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = \u0275\u0275getCurrentView();
    \u0275\u0275template(0, SupplierFormComponent_Conditional_0_Conditional_0_Template, 3, 4, "h3")(1, SupplierFormComponent_Conditional_0_Conditional_1_Template, 3, 3, "h3");
    \u0275\u0275elementStart(2, "form", 1);
    \u0275\u0275listener("ngSubmit", function SupplierFormComponent_Conditional_0_Template_form_ngSubmit_2_listener() {
      \u0275\u0275restoreView(_r1);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.onSubmit());
    });
    \u0275\u0275elementStart(3, "div", 2)(4, "div", 3)(5, "label", 4);
    \u0275\u0275text(6);
    \u0275\u0275pipe(7, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275element(8, "input", 5);
    \u0275\u0275template(9, SupplierFormComponent_Conditional_0_Conditional_9_Template, 3, 3, "span", 6);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(10, "div", 3)(11, "label", 7);
    \u0275\u0275text(12);
    \u0275\u0275pipe(13, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275element(14, "input", 8);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(15, "div", 3)(16, "label");
    \u0275\u0275text(17);
    \u0275\u0275pipe(18, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(19, "div", 9);
    \u0275\u0275repeaterCreate(20, SupplierFormComponent_Conditional_0_For_21_Template, 4, 4, "label", 10, \u0275\u0275repeaterTrackByIndex);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(22, "div", 3)(23, "label", 11);
    \u0275\u0275text(24);
    \u0275\u0275pipe(25, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275element(26, "input", 12);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(27, "div", 3)(28, "label", 13);
    \u0275\u0275text(29);
    \u0275\u0275pipe(30, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275element(31, "input", 14);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(32, "div", 15)(33, "button", 16);
    \u0275\u0275listener("click", function SupplierFormComponent_Conditional_0_Template_button_click_33_listener() {
      \u0275\u0275restoreView(_r1);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.onCancel());
    });
    \u0275\u0275text(34);
    \u0275\u0275pipe(35, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(36, "button", 17);
    \u0275\u0275template(37, SupplierFormComponent_Conditional_0_Conditional_37_Template, 1, 1, "app-loader", 18);
    \u0275\u0275text(38);
    \u0275\u0275pipe(39, "translatePipe");
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    let tmp_4_0;
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275conditional(ctx_r1.isEditMode_() ? 0 : 1);
    \u0275\u0275advance(2);
    \u0275\u0275property("formGroup", ctx_r1.supplierForm_);
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(7, 12, "name"));
    \u0275\u0275advance(3);
    \u0275\u0275conditional(((tmp_4_0 = ctx_r1.supplierForm_.get("name_hebrew")) == null ? null : tmp_4_0.errors == null ? null : tmp_4_0.errors["duplicateName"]) && ((tmp_4_0 = ctx_r1.supplierForm_.get("name_hebrew")) == null ? null : tmp_4_0.touched) ? 9 : -1);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(13, 14, "contact_person"));
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(18, 16, "delivery_days"));
    \u0275\u0275advance(3);
    \u0275\u0275repeater(ctx_r1.deliveryDaysArray.controls);
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(25, 18, "min_order"));
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(30, 20, "lead_time"));
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(35, 22, "cancel"), " ");
    \u0275\u0275advance(2);
    \u0275\u0275property("disabled", ctx_r1.supplierForm_.invalid || ctx_r1.isSaving_());
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r1.isSaving_() ? 37 : -1);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(39, 24, "save"), " ");
  }
}
function SupplierFormComponent_Conditional_1_Conditional_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "h2");
    \u0275\u0275text(1);
    \u0275\u0275pipe(2, "translatePipe");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    let tmp_2_0;
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate2("", \u0275\u0275pipeBind1(2, 2, "edit"), ": ", (tmp_2_0 = ctx_r1.supplierForm_.get("name_hebrew")) == null ? null : tmp_2_0.value, "");
  }
}
function SupplierFormComponent_Conditional_1_Conditional_3_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "h2");
    \u0275\u0275text(1);
    \u0275\u0275pipe(2, "translatePipe");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(2, 1, "add_supplier"));
  }
}
function SupplierFormComponent_Conditional_1_Conditional_11_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 6);
    \u0275\u0275text(1);
    \u0275\u0275pipe(2, "translatePipe");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(2, 1, "duplicate_supplier_name"));
  }
}
function SupplierFormComponent_Conditional_1_For_23_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "label", 29);
    \u0275\u0275element(1, "input", 19);
    \u0275\u0275text(2);
    \u0275\u0275pipe(3, "translatePipe");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const $index_r5 = ctx.$index;
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275property("formControlName", $index_r5);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(3, 2, ctx_r1.dayKeys[$index_r5]), " ");
  }
}
function SupplierFormComponent_Conditional_1_Conditional_39_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "app-loader", 18);
  }
  if (rf & 2) {
    \u0275\u0275property("inline", true);
  }
}
function SupplierFormComponent_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    const _r4 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 0)(1, "header", 20);
    \u0275\u0275template(2, SupplierFormComponent_Conditional_1_Conditional_2_Template, 3, 4, "h2")(3, SupplierFormComponent_Conditional_1_Conditional_3_Template, 3, 3, "h2");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "form", 21);
    \u0275\u0275listener("ngSubmit", function SupplierFormComponent_Conditional_1_Template_form_ngSubmit_4_listener() {
      \u0275\u0275restoreView(_r4);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.onSubmit());
    });
    \u0275\u0275elementStart(5, "div", 22)(6, "div", 23)(7, "label", 24);
    \u0275\u0275text(8);
    \u0275\u0275pipe(9, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275element(10, "input", 25);
    \u0275\u0275template(11, SupplierFormComponent_Conditional_1_Conditional_11_Template, 3, 3, "span", 6);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(12, "div", 23)(13, "label", 26);
    \u0275\u0275text(14);
    \u0275\u0275pipe(15, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275element(16, "input", 27);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(17, "div", 23)(18, "label");
    \u0275\u0275text(19);
    \u0275\u0275pipe(20, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(21, "div", 28);
    \u0275\u0275repeaterCreate(22, SupplierFormComponent_Conditional_1_For_23_Template, 4, 4, "label", 29, \u0275\u0275repeaterTrackByIndex);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(24, "div", 23)(25, "label", 30);
    \u0275\u0275text(26);
    \u0275\u0275pipe(27, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275element(28, "input", 31);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(29, "div", 23)(30, "label", 32);
    \u0275\u0275text(31);
    \u0275\u0275pipe(32, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275element(33, "input", 33);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(34, "div", 34)(35, "button", 16);
    \u0275\u0275listener("click", function SupplierFormComponent_Conditional_1_Template_button_click_35_listener() {
      \u0275\u0275restoreView(_r4);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.onCancel());
    });
    \u0275\u0275text(36);
    \u0275\u0275pipe(37, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(38, "button", 17);
    \u0275\u0275template(39, SupplierFormComponent_Conditional_1_Conditional_39_Template, 1, 1, "app-loader", 18);
    \u0275\u0275text(40);
    \u0275\u0275pipe(41, "translatePipe");
    \u0275\u0275elementEnd()()()();
  }
  if (rf & 2) {
    let tmp_4_0;
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r1.isEditMode_() ? 2 : 3);
    \u0275\u0275advance(2);
    \u0275\u0275property("formGroup", ctx_r1.supplierForm_);
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(9, 12, "name"));
    \u0275\u0275advance(3);
    \u0275\u0275conditional(((tmp_4_0 = ctx_r1.supplierForm_.get("name_hebrew")) == null ? null : tmp_4_0.errors == null ? null : tmp_4_0.errors["duplicateName"]) && ((tmp_4_0 = ctx_r1.supplierForm_.get("name_hebrew")) == null ? null : tmp_4_0.touched) ? 11 : -1);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(15, 14, "contact_person"));
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(20, 16, "delivery_days"));
    \u0275\u0275advance(3);
    \u0275\u0275repeater(ctx_r1.deliveryDaysArray.controls);
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(27, 18, "min_order"));
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(32, 20, "lead_time"));
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(37, 22, "cancel"), " ");
    \u0275\u0275advance(2);
    \u0275\u0275property("disabled", ctx_r1.supplierForm_.invalid || ctx_r1.isSaving_());
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r1.isSaving_() ? 39 : -1);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(41, 24, "save"), " ");
  }
}
var DAY_KEYS = ["day_sun", "day_mon", "day_tue", "day_wed", "day_thu", "day_fri", "day_sat"];
var SupplierFormComponent = class _SupplierFormComponent {
  embeddedInDashboard = input(false);
  /** When set (e.g. from SupplierModalService), form is hydrated in modal mode without route resolver. */
  supplierToEdit = input(null);
  saved = output();
  cancel = output();
  fb = inject(FormBuilder);
  route = inject(ActivatedRoute);
  router = inject(Router);
  supplierData = inject(SupplierDataService);
  destroyRef = inject(DestroyRef);
  logging = inject(LoggingService);
  requireAuth = inject(RequireAuthService);
  supplierForm_;
  isEditMode_ = signal(false);
  saving = useSavingState();
  isSaving_ = this.saving.isSaving_;
  dayKeys = DAY_KEYS;
  get deliveryDaysArray() {
    return this.supplierForm_?.get("delivery_days_");
  }
  constructor() {
    effect(() => {
      const supplier = this.supplierToEdit();
      if (!this.supplierForm_)
        return;
      if (supplier) {
        this.isEditMode_.set(true);
        this.hydrateForm(supplier);
      } else if (supplier === null) {
        this.isEditMode_.set(false);
        this.supplierForm_.patchValue({
          name_hebrew: "",
          contact_person_: "",
          min_order_mov_: 0,
          lead_time_days_: 0
        });
        const daysArray = this.supplierForm_.get("delivery_days_");
        if (daysArray?.controls?.length === 7) {
          for (let i = 0; i < 7; i++) {
            daysArray.at(i).setValue(false);
          }
        }
      }
    });
  }
  ngOnInit() {
    this.buildForm();
    if (!this.embeddedInDashboard()) {
      this.route.data.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((data) => {
        const supplier = data["supplier"];
        if (supplier) {
          this.isEditMode_.set(true);
          this.hydrateForm(supplier);
        }
      });
    }
  }
  buildForm() {
    const daysArray = this.fb.array(Array.from({ length: 7 }, () => this.fb.control(false)));
    this.supplierForm_ = this.fb.group({
      name_hebrew: ["", [
        Validators.required,
        duplicateEntityNameValidator(() => this.supplierData.allSuppliers_(), () => {
          if (!this.isEditMode_())
            return null;
          if (this.embeddedInDashboard())
            return this.supplierToEdit()?._id ?? null;
          return this.route.snapshot.data["supplier"]?._id ?? null;
        })
      ]],
      contact_person_: [""],
      delivery_days_: daysArray,
      min_order_mov_: [0, [Validators.required, Validators.min(0)]],
      lead_time_days_: [0, [Validators.required, Validators.min(0)]]
    });
  }
  hydrateForm(s) {
    const days = s.delivery_days_ ?? [];
    const dayControls = this.deliveryDaysArray;
    for (let i = 0; i < 7; i++) {
      dayControls.at(i).setValue(days.includes(i));
    }
    this.supplierForm_.patchValue({
      name_hebrew: s.name_hebrew ?? "",
      contact_person_: s.contact_person_ ?? "",
      min_order_mov_: s.min_order_mov_ ?? 0,
      lead_time_days_: s.lead_time_days_ ?? 0
    });
  }
  onSubmit() {
    if (!this.requireAuth.requireAuth())
      return;
    if (this.supplierForm_.invalid || this.isSaving_())
      return;
    const raw = this.supplierForm_.getRawValue();
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
    this.saving.setSaving(true);
    if (this.isEditMode_()) {
      const supplier = this.embeddedInDashboard() ? this.supplierToEdit() ?? void 0 : this.route.snapshot.data["supplier"];
      if (!supplier) {
        this.saving.setSaving(false);
        return;
      }
      this.supplierData.updateSupplier(__spreadValues(__spreadValues({}, supplier), payload)).then(() => {
        if (this.embeddedInDashboard())
          this.saved.emit();
        else
          this.router.navigate(["/suppliers/list"]);
      }).catch((e) => {
        this.logging.error({ event: "supplier.save_error", message: "Supplier save failed", context: { err: e } });
      }).finally(() => this.saving.setSaving(false));
    } else {
      this.supplierData.addSupplier(payload).then(() => {
        if (this.embeddedInDashboard())
          this.saved.emit();
        else
          this.router.navigate(["/suppliers/list"]);
      }).catch((e) => {
        this.logging.error({ event: "supplier.save_error", message: "Supplier save failed", context: { err: e } });
      }).finally(() => this.saving.setSaving(false));
    }
  }
  onCancel() {
    if (this.embeddedInDashboard()) {
      this.cancel.emit();
    } else {
      this.router.navigate(["/suppliers/list"]);
    }
  }
  static \u0275fac = function SupplierFormComponent_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _SupplierFormComponent)();
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _SupplierFormComponent, selectors: [["app-supplier-form"]], inputs: { embeddedInDashboard: [1, "embeddedInDashboard"], supplierToEdit: [1, "supplierToEdit"] }, outputs: { saved: "saved", cancel: "cancel" }, decls: 2, vars: 1, consts: [["dir", "rtl", 1, "supplier-form-container"], [3, "ngSubmit", "formGroup"], [1, "c-modal-body"], [1, "c-input-stack", "full-width"], ["for", "name_hebrew"], ["id", "name_hebrew", "type", "text", "formControlName", "name_hebrew"], [1, "form-error"], ["for", "contact_person_"], ["id", "contact_person_", "type", "text", "formControlName", "contact_person_"], ["formArrayName", "delivery_days_", 1, "c-filter-options", "c-filter-options--inline"], [1, "c-filter-option"], ["for", "min_order_mov_"], ["id", "min_order_mov_", "type", "number", "formControlName", "min_order_mov_", "min", "0"], ["for", "lead_time_days_"], ["id", "lead_time_days_", "type", "number", "formControlName", "lead_time_days_", "min", "0"], [1, "c-modal-actions"], ["type", "button", 1, "c-btn-ghost", 3, "click"], ["type", "submit", 1, "c-btn-primary", 3, "disabled"], ["size", "small", 3, "inline"], ["type", "checkbox", 3, "formControlName"], [1, "form-header"], [1, "form-body", 3, "ngSubmit", "formGroup"], [1, "form-section"], [1, "form-group"], ["for", "name_hebrew_page"], ["id", "name_hebrew_page", "type", "text", "formControlName", "name_hebrew", 1, "c-input"], ["for", "contact_person_page"], ["id", "contact_person_page", "type", "text", "formControlName", "contact_person_", 1, "c-input"], ["formArrayName", "delivery_days_", 1, "delivery-days-wrap"], [1, "day-check"], ["for", "min_order_mov_page"], ["id", "min_order_mov_page", "type", "number", "formControlName", "min_order_mov_", "min", "0", 1, "c-input"], ["for", "lead_time_days_page"], ["id", "lead_time_days_page", "type", "number", "formControlName", "lead_time_days_", "min", "0", 1, "c-input"], [1, "c-form-actions"]], template: function SupplierFormComponent_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275template(0, SupplierFormComponent_Conditional_0_Template, 40, 26)(1, SupplierFormComponent_Conditional_1_Template, 42, 26, "div", 0);
    }
    if (rf & 2) {
      \u0275\u0275conditional(ctx.embeddedInDashboard() ? 0 : 1);
    }
  }, dependencies: [CommonModule, ReactiveFormsModule, \u0275NgNoValidate, DefaultValueAccessor, NumberValueAccessor, CheckboxControlValueAccessor, NgControlStatus, NgControlStatusGroup, MinValidator, FormGroupDirective, FormControlName, FormArrayName, LucideAngularModule, TranslatePipe, LoaderComponent], styles: ["\n\n@layer components.supplier-form {\n  [_nghost-%COMP%] {\n    display: block;\n  }\n  [_nghost-%COMP%]   .form-error[_ngcontent-%COMP%] {\n    font-size: 0.75rem;\n    color: var(--color-danger);\n  }\n  .supplier-form-container[_ngcontent-%COMP%] {\n    max-width: 32rem;\n  }\n  .supplier-form-container[_ngcontent-%COMP%]   .form-header[_ngcontent-%COMP%] {\n    margin-block-end: 1rem;\n  }\n  .supplier-form-container[_ngcontent-%COMP%]   .form-header[_ngcontent-%COMP%]   h2[_ngcontent-%COMP%] {\n    margin: 0;\n    font-size: 1.25rem;\n    font-weight: 600;\n  }\n  .supplier-form-container[_ngcontent-%COMP%]   .form-body[_ngcontent-%COMP%]   .form-section[_ngcontent-%COMP%] {\n    margin-block-end: 1.25rem;\n  }\n  .supplier-form-container[_ngcontent-%COMP%]   .form-body[_ngcontent-%COMP%]   .form-group[_ngcontent-%COMP%] {\n    margin-block-end: 0.75rem;\n  }\n  .supplier-form-container[_ngcontent-%COMP%]   .form-body[_ngcontent-%COMP%]   .form-group[_ngcontent-%COMP%]   label[_ngcontent-%COMP%] {\n    display: block;\n    margin-block-end: 0.25rem;\n    font-size: 0.875rem;\n    font-weight: 500;\n  }\n  .supplier-form-container[_ngcontent-%COMP%]   .form-body[_ngcontent-%COMP%]   .form-group[_ngcontent-%COMP%]   .c-input[_ngcontent-%COMP%] {\n    width: 100%;\n  }\n  .supplier-form-container[_ngcontent-%COMP%]   .form-body[_ngcontent-%COMP%]   .form-group[_ngcontent-%COMP%]   .delivery-days-wrap[_ngcontent-%COMP%] {\n    display: flex;\n    flex-wrap: wrap;\n    gap: 0.5rem 1rem;\n  }\n  .supplier-form-container[_ngcontent-%COMP%]   .form-body[_ngcontent-%COMP%]   .form-group[_ngcontent-%COMP%]   .day-check[_ngcontent-%COMP%] {\n    display: inline-flex;\n    align-items: center;\n    gap: 0.375rem;\n    font-weight: 400;\n  }\n  .supplier-form-container[_ngcontent-%COMP%]   .form-body[_ngcontent-%COMP%]   .c-form-actions[_ngcontent-%COMP%] {\n    margin-block-start: 1.25rem;\n  }\n}\n/*# sourceMappingURL=supplier-form.component.css.map */"], changeDetection: 0 });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(SupplierFormComponent, [{
    type: Component,
    args: [{ selector: "app-supplier-form", standalone: true, imports: [CommonModule, ReactiveFormsModule, LucideAngularModule, TranslatePipe, LoaderComponent], changeDetection: ChangeDetectionStrategy.OnPush, template: `@if (embeddedInDashboard()) {\r
  @if (isEditMode_()) {\r
    <h3>{{ 'edit' | translatePipe }}: {{ supplierForm_.get('name_hebrew')?.value }}</h3>\r
  } @else {\r
    <h3>{{ 'add_supplier' | translatePipe }}</h3>\r
  }\r
\r
  <form [formGroup]="supplierForm_" (ngSubmit)="onSubmit()">\r
    <div class="c-modal-body">\r
      <div class="c-input-stack full-width">\r
        <label for="name_hebrew">{{ 'name' | translatePipe }}</label>\r
        <input id="name_hebrew" type="text" formControlName="name_hebrew" />\r
        @if (supplierForm_.get('name_hebrew')?.errors?.['duplicateName'] && supplierForm_.get('name_hebrew')?.touched) {\r
          <span class="form-error">{{ 'duplicate_supplier_name' | translatePipe }}</span>\r
        }\r
      </div>\r
      <div class="c-input-stack full-width">\r
        <label for="contact_person_">{{ 'contact_person' | translatePipe }}</label>\r
        <input id="contact_person_" type="text" formControlName="contact_person_" />\r
      </div>\r
      <div class="c-input-stack full-width">\r
        <label>{{ 'delivery_days' | translatePipe }}</label>\r
        <div class="c-filter-options c-filter-options--inline" formArrayName="delivery_days_">\r
          @for (ctrl of deliveryDaysArray.controls; track $index) {\r
            <label class="c-filter-option">\r
              <input type="checkbox" [formControlName]="$index" />\r
              {{ dayKeys[$index] | translatePipe }}\r
            </label>\r
          }\r
        </div>\r
      </div>\r
      <div class="c-input-stack full-width">\r
        <label for="min_order_mov_">{{ 'min_order' | translatePipe }}</label>\r
        <input id="min_order_mov_" type="number" formControlName="min_order_mov_" min="0" />\r
      </div>\r
      <div class="c-input-stack full-width">\r
        <label for="lead_time_days_">{{ 'lead_time' | translatePipe }}</label>\r
        <input id="lead_time_days_" type="number" formControlName="lead_time_days_" min="0" />\r
      </div>\r
    </div>\r
\r
    <div class="c-modal-actions">\r
      <button type="button" class="c-btn-ghost" (click)="onCancel()">\r
        {{ 'cancel' | translatePipe }}\r
      </button>\r
      <button type="submit" class="c-btn-primary" [disabled]="supplierForm_.invalid || isSaving_()">\r
        @if (isSaving_()) {\r
          <app-loader size="small" [inline]="true" />\r
        }\r
        {{ 'save' | translatePipe }}\r
      </button>\r
    </div>\r
  </form>\r
} @else {\r
  <div class="supplier-form-container" dir="rtl">\r
    <header class="form-header">\r
      @if (isEditMode_()) {\r
        <h2>{{ 'edit' | translatePipe }}: {{ supplierForm_.get('name_hebrew')?.value }}</h2>\r
      } @else {\r
        <h2>{{ 'add_supplier' | translatePipe }}</h2>\r
      }\r
    </header>\r
\r
    <form [formGroup]="supplierForm_" (ngSubmit)="onSubmit()" class="form-body">\r
      <div class="form-section">\r
        <div class="form-group">\r
          <label for="name_hebrew_page">{{ 'name' | translatePipe }}</label>\r
          <input id="name_hebrew_page" type="text" formControlName="name_hebrew" class="c-input" />\r
          @if (supplierForm_.get('name_hebrew')?.errors?.['duplicateName'] && supplierForm_.get('name_hebrew')?.touched) {\r
            <span class="form-error">{{ 'duplicate_supplier_name' | translatePipe }}</span>\r
          }\r
        </div>\r
        <div class="form-group">\r
          <label for="contact_person_page">{{ 'contact_person' | translatePipe }}</label>\r
          <input id="contact_person_page" type="text" formControlName="contact_person_" class="c-input" />\r
        </div>\r
        <div class="form-group">\r
          <label>{{ 'delivery_days' | translatePipe }}</label>\r
          <div class="delivery-days-wrap" formArrayName="delivery_days_">\r
            @for (ctrl of deliveryDaysArray.controls; track $index) {\r
              <label class="day-check">\r
                <input type="checkbox" [formControlName]="$index" />\r
                {{ dayKeys[$index] | translatePipe }}\r
              </label>\r
            }\r
          </div>\r
        </div>\r
        <div class="form-group">\r
          <label for="min_order_mov_page">{{ 'min_order' | translatePipe }}</label>\r
          <input id="min_order_mov_page" type="number" formControlName="min_order_mov_" min="0" class="c-input" />\r
        </div>\r
        <div class="form-group">\r
          <label for="lead_time_days_page">{{ 'lead_time' | translatePipe }}</label>\r
          <input id="lead_time_days_page" type="number" formControlName="lead_time_days_" min="0" class="c-input" />\r
        </div>\r
      </div>\r
\r
      <div class="c-form-actions">\r
        <button type="button" class="c-btn-ghost" (click)="onCancel()">\r
          {{ 'cancel' | translatePipe }}\r
        </button>\r
        <button type="submit" class="c-btn-primary" [disabled]="supplierForm_.invalid || isSaving_()">\r
          @if (isSaving_()) {\r
            <app-loader size="small" [inline]="true" />\r
          }\r
          {{ 'save' | translatePipe }}\r
        </button>\r
      </div>\r
    </form>\r
  </div>\r
}\r
`, styles: ["/* src/app/pages/suppliers/components/supplier-form/supplier-form.component.scss */\n@layer components.supplier-form {\n  :host {\n    display: block;\n  }\n  :host .form-error {\n    font-size: 0.75rem;\n    color: var(--color-danger);\n  }\n  .supplier-form-container {\n    max-width: 32rem;\n  }\n  .supplier-form-container .form-header {\n    margin-block-end: 1rem;\n  }\n  .supplier-form-container .form-header h2 {\n    margin: 0;\n    font-size: 1.25rem;\n    font-weight: 600;\n  }\n  .supplier-form-container .form-body .form-section {\n    margin-block-end: 1.25rem;\n  }\n  .supplier-form-container .form-body .form-group {\n    margin-block-end: 0.75rem;\n  }\n  .supplier-form-container .form-body .form-group label {\n    display: block;\n    margin-block-end: 0.25rem;\n    font-size: 0.875rem;\n    font-weight: 500;\n  }\n  .supplier-form-container .form-body .form-group .c-input {\n    width: 100%;\n  }\n  .supplier-form-container .form-body .form-group .delivery-days-wrap {\n    display: flex;\n    flex-wrap: wrap;\n    gap: 0.5rem 1rem;\n  }\n  .supplier-form-container .form-body .form-group .day-check {\n    display: inline-flex;\n    align-items: center;\n    gap: 0.375rem;\n    font-weight: 400;\n  }\n  .supplier-form-container .form-body .c-form-actions {\n    margin-block-start: 1.25rem;\n  }\n}\n/*# sourceMappingURL=supplier-form.component.css.map */\n"] }]
  }], () => [], null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(SupplierFormComponent, { className: "SupplierFormComponent", filePath: "src/app/pages/suppliers/components/supplier-form/supplier-form.component.ts", lineNumber: 36 });
})();

export {
  SupplierFormComponent
};
//# sourceMappingURL=chunk-6P4FY7A2.js.map
