import {
  useSavingState
} from "./chunk-6VNIKYJO.js";
import {
  ERR_DUPLICATE_EQUIPMENT_NAME,
  EquipmentDataService
} from "./chunk-YEG5WWUX.js";
import {
  CustomSelectComponent
} from "./chunk-KKA4TBVQ.js";
import {
  CheckboxControlValueAccessor,
  DefaultValueAccessor,
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
} from "./chunk-UNNU6L7T.js";
import {
  LoaderComponent
} from "./chunk-TR2OKVKA.js";
import {
  takeUntilDestroyed
} from "./chunk-4LOKEQAU.js";
import {
  LucideAngularModule
} from "./chunk-JROUPDH4.js";
import {
  TranslatePipe,
  TranslationService
} from "./chunk-Z6OI3YDQ.js";
import "./chunk-7WUWXC4O.js";
import {
  UserMsgService
} from "./chunk-WYZGJ7UG.js";
import {
  LoggingService
} from "./chunk-OYT4PDSG.js";
import {
  ActivatedRoute,
  ChangeDetectionStrategy,
  CommonModule,
  Component,
  DestroyRef,
  Router,
  ViewChild,
  __async,
  __spreadProps,
  __spreadValues,
  inject,
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
  ɵɵloadQuery,
  ɵɵnextContext,
  ɵɵpipe,
  ɵɵpipeBind1,
  ɵɵproperty,
  ɵɵqueryRefresh,
  ɵɵresetView,
  ɵɵrestoreView,
  ɵɵtemplate,
  ɵɵtext,
  ɵɵtextInterpolate,
  ɵɵtextInterpolate1,
  ɵɵtextInterpolate2,
  ɵɵviewQuery
} from "./chunk-GCYOWW7U.js";

// src/app/pages/equipment/components/equipment-form/equipment-form.component.ts
var _c0 = ["nameInput"];
function EquipmentFormComponent_Conditional_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "h2");
    \u0275\u0275text(1);
    \u0275\u0275pipe(2, "translatePipe");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    let tmp_2_0;
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275textInterpolate2("", \u0275\u0275pipeBind1(2, 2, "edit"), ": ", (tmp_2_0 = ctx_r1.equipmentForm_.get("name_hebrew")) == null ? null : tmp_2_0.value, "");
  }
}
function EquipmentFormComponent_Conditional_3_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "h2");
    \u0275\u0275text(1);
    \u0275\u0275pipe(2, "translatePipe");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(2, 1, "add_equipment"));
  }
}
function EquipmentFormComponent_Conditional_41_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 18)(1, "div", 5)(2, "label", 23);
    \u0275\u0275text(3);
    \u0275\u0275pipe(4, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275element(5, "input", 24);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "div", 5)(7, "label", 25);
    \u0275\u0275text(8);
    \u0275\u0275pipe(9, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275element(10, "input", 26);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(11, "div", 5)(12, "label", 27);
    \u0275\u0275text(13);
    \u0275\u0275pipe(14, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275element(15, "input", 28);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(4, 3, "per_guests"));
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(9, 5, "min_quantity"));
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(14, 7, "max_quantity"));
  }
}
function EquipmentFormComponent_Conditional_47_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "app-loader", 22);
  }
  if (rf & 2) {
    \u0275\u0275property("inline", true);
  }
}
var CATEGORIES = [
  "heat_source",
  "tool",
  "container",
  "packaging",
  "infrastructure",
  "consumable"
];
var EquipmentFormComponent = class _EquipmentFormComponent {
  nameInputRef;
  fb = inject(FormBuilder);
  route = inject(ActivatedRoute);
  router = inject(Router);
  equipmentData = inject(EquipmentDataService);
  destroyRef = inject(DestroyRef);
  userMsg = inject(UserMsgService);
  translation = inject(TranslationService);
  logging = inject(LoggingService);
  equipmentForm_;
  isEditMode_ = signal(false);
  saving = useSavingState();
  isSaving_ = this.saving.isSaving_;
  categories = CATEGORIES;
  categoryOptions = CATEGORIES.map((c) => ({ value: c, label: c }));
  ngOnInit() {
    this.buildForm();
    this.route.data.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((data) => {
      const equipment = data["equipment"];
      if (equipment) {
        this.isEditMode_.set(true);
        this.hydrateForm(equipment);
      } else {
        this.patchScalingDefaults();
      }
    });
  }
  ngAfterViewInit() {
    setTimeout(() => this.nameInputRef?.nativeElement?.focus(), 0);
  }
  buildForm() {
    this.equipmentForm_ = this.fb.group({
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
  hydrateForm(e) {
    this.equipmentForm_.patchValue({
      name_hebrew: e.name_hebrew ?? "",
      category_: e.category_ ?? "tool",
      owned_quantity_: e.owned_quantity_ ?? 0,
      is_consumable_: e.is_consumable_ ?? false,
      notes_: e.notes_ ?? "",
      scaling_enabled_: !!e.scaling_rule_,
      per_guests_: e.scaling_rule_?.per_guests_ ?? 25,
      min_quantity_: e.scaling_rule_?.min_quantity_ ?? 1,
      max_quantity_: e.scaling_rule_?.max_quantity_ ?? null
    });
  }
  patchScalingDefaults() {
    this.equipmentForm_.patchValue({
      scaling_enabled_: false,
      per_guests_: 25,
      min_quantity_: 1,
      max_quantity_: null
    });
  }
  onSubmit() {
    return __async(this, null, function* () {
      if (this.equipmentForm_.invalid)
        return;
      yield this.saving.withSaving(() => __async(this, null, function* () {
        try {
          const v = this.equipmentForm_.getRawValue();
          const now = (/* @__PURE__ */ new Date()).toISOString();
          const scalingRule = v.scaling_enabled_ ? {
            per_guests_: Number(v.per_guests_),
            min_quantity_: Number(v.min_quantity_),
            max_quantity_: v.max_quantity_ != null && v.max_quantity_ !== "" ? Number(v.max_quantity_) : void 0
          } : void 0;
          if (this.isEditMode_()) {
            const equipment = this.route.snapshot.data["equipment"];
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
          } else {
            yield this.equipmentData.addEquipment({
              name_hebrew: v.name_hebrew,
              category_: v.category_,
              owned_quantity_: Number(v.owned_quantity_),
              scaling_rule_: scalingRule,
              is_consumable_: !!v.is_consumable_,
              notes_: v.notes_ || void 0,
              created_at_: now,
              updated_at_: now
            });
          }
          const listPath = this.router.url.startsWith("/inventory/equipment") ? ["/inventory/equipment"] : ["/equipment/list"];
          this.router.navigate(listPath);
        } catch (err) {
          this.logging.error({ event: "equipment.save_error", message: "Equipment save error", context: { err } });
          const msg = err instanceof Error && err.message === ERR_DUPLICATE_EQUIPMENT_NAME ? this.translation.translate("duplicate_equipment_name") ?? "\u05DB\u05DC\u05D9 \u05E2\u05DD \u05E9\u05DD \u05D6\u05D4 \u05DB\u05D1\u05E8 \u05E7\u05D9\u05D9\u05DD" : this.translation.translate("save_failed") ?? "\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05E9\u05DE\u05D9\u05E8\u05D4";
          this.userMsg.onSetErrorMsg(msg);
        }
      }));
    });
  }
  onCancel() {
    const listPath = this.router.url.startsWith("/inventory/equipment") ? ["/inventory/equipment"] : ["/equipment/list"];
    this.router.navigate(listPath);
  }
  static \u0275fac = function EquipmentFormComponent_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _EquipmentFormComponent)();
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _EquipmentFormComponent, selectors: [["app-equipment-form"]], viewQuery: function EquipmentFormComponent_Query(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275viewQuery(_c0, 5);
    }
    if (rf & 2) {
      let _t;
      \u0275\u0275queryRefresh(_t = \u0275\u0275loadQuery()) && (ctx.nameInputRef = _t.first);
    }
  }, decls: 50, vars: 34, consts: [["nameInput", ""], ["dir", "rtl", 1, "equipment-form-container"], [1, "form-header"], [1, "form-body", 3, "ngSubmit", "formGroup"], [1, "form-section"], [1, "form-group"], ["for", "name_hebrew"], ["id", "name_hebrew", "type", "text", "formControlName", "name_hebrew", 1, "c-input"], ["for", "category_"], ["triggerId", "category_", "formControlName", "category_", "placeholder", "category", 3, "options", "typeToFilter"], ["for", "owned_quantity_"], ["id", "owned_quantity_", "type", "number", "formControlName", "owned_quantity_", "min", "0", 1, "c-input"], [1, "form-group", "checkbox-group"], ["type", "checkbox", "formControlName", "is_consumable_"], ["for", "notes_"], ["id", "notes_", "formControlName", "notes_", "rows", "2", 1, "c-input"], [1, "form-section", "scaling-section"], ["type", "checkbox", "formControlName", "scaling_enabled_"], [1, "scaling-fields"], [1, "c-form-actions"], ["type", "button", 1, "c-btn-ghost", 3, "click"], ["type", "submit", 1, "c-btn-primary", 3, "disabled"], ["size", "small", 3, "inline"], ["for", "per_guests_"], ["id", "per_guests_", "type", "number", "formControlName", "per_guests_", "min", "1", 1, "c-input"], ["for", "min_quantity_"], ["id", "min_quantity_", "type", "number", "formControlName", "min_quantity_", "min", "0", 1, "c-input"], ["for", "max_quantity_"], ["id", "max_quantity_", "type", "number", "formControlName", "max_quantity_", "min", "0", "placeholder", "\u2014", 1, "c-input"]], template: function EquipmentFormComponent_Template(rf, ctx) {
    if (rf & 1) {
      const _r1 = \u0275\u0275getCurrentView();
      \u0275\u0275elementStart(0, "div", 1)(1, "header", 2);
      \u0275\u0275template(2, EquipmentFormComponent_Conditional_2_Template, 3, 4, "h2")(3, EquipmentFormComponent_Conditional_3_Template, 3, 3, "h2");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(4, "form", 3);
      \u0275\u0275listener("ngSubmit", function EquipmentFormComponent_Template_form_ngSubmit_4_listener() {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.onSubmit());
      });
      \u0275\u0275elementStart(5, "div", 4)(6, "div", 5)(7, "label", 6);
      \u0275\u0275text(8);
      \u0275\u0275pipe(9, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275element(10, "input", 7, 0);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(12, "div", 5)(13, "label", 8);
      \u0275\u0275text(14);
      \u0275\u0275pipe(15, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275element(16, "app-custom-select", 9);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(17, "div", 5)(18, "label", 10);
      \u0275\u0275text(19);
      \u0275\u0275pipe(20, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275element(21, "input", 11);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(22, "div", 12)(23, "label");
      \u0275\u0275element(24, "input", 13);
      \u0275\u0275text(25);
      \u0275\u0275pipe(26, "translatePipe");
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(27, "div", 5)(28, "label", 14);
      \u0275\u0275text(29);
      \u0275\u0275pipe(30, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275element(31, "textarea", 15);
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(32, "div", 16)(33, "h3");
      \u0275\u0275text(34);
      \u0275\u0275pipe(35, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(36, "div", 12)(37, "label");
      \u0275\u0275element(38, "input", 17);
      \u0275\u0275text(39);
      \u0275\u0275pipe(40, "translatePipe");
      \u0275\u0275elementEnd()();
      \u0275\u0275template(41, EquipmentFormComponent_Conditional_41_Template, 16, 9, "div", 18);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(42, "div", 19)(43, "button", 20);
      \u0275\u0275listener("click", function EquipmentFormComponent_Template_button_click_43_listener() {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.onCancel());
      });
      \u0275\u0275text(44);
      \u0275\u0275pipe(45, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(46, "button", 21);
      \u0275\u0275template(47, EquipmentFormComponent_Conditional_47_Template, 1, 1, "app-loader", 22);
      \u0275\u0275text(48);
      \u0275\u0275pipe(49, "translatePipe");
      \u0275\u0275elementEnd()()()();
    }
    if (rf & 2) {
      let tmp_12_0;
      \u0275\u0275advance(2);
      \u0275\u0275conditional(ctx.isEditMode_() ? 2 : 3);
      \u0275\u0275advance(2);
      \u0275\u0275property("formGroup", ctx.equipmentForm_);
      \u0275\u0275advance(4);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(9, 16, "name"));
      \u0275\u0275advance(6);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(15, 18, "category"));
      \u0275\u0275advance(2);
      \u0275\u0275property("options", ctx.categoryOptions)("typeToFilter", true);
      \u0275\u0275advance(3);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(20, 20, "owned_quantity"));
      \u0275\u0275advance(6);
      \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(26, 22, "is_consumable"), " ");
      \u0275\u0275advance(4);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(30, 24, "notes"));
      \u0275\u0275advance(5);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(35, 26, "scaling_rule"));
      \u0275\u0275advance(5);
      \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(40, 28, "scaling_enabled"), " ");
      \u0275\u0275advance(2);
      \u0275\u0275conditional(((tmp_12_0 = ctx.equipmentForm_.get("scaling_enabled_")) == null ? null : tmp_12_0.value) ? 41 : -1);
      \u0275\u0275advance(3);
      \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(45, 30, "cancel"), " ");
      \u0275\u0275advance(2);
      \u0275\u0275property("disabled", ctx.equipmentForm_.invalid || ctx.isSaving_());
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.isSaving_() ? 47 : -1);
      \u0275\u0275advance();
      \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(49, 32, "save"), " ");
    }
  }, dependencies: [CommonModule, ReactiveFormsModule, \u0275NgNoValidate, DefaultValueAccessor, NumberValueAccessor, CheckboxControlValueAccessor, NgControlStatus, NgControlStatusGroup, MinValidator, FormGroupDirective, FormControlName, LucideAngularModule, TranslatePipe, LoaderComponent, CustomSelectComponent], styles: ['@charset "UTF-8";\n\n\n\n[_nghost-%COMP%] {\n  display: block;\n}\n.equipment-form-container[_ngcontent-%COMP%] {\n  max-width: 35rem;\n  padding: 1.5rem;\n  background: var(--bg-glass-strong);\n  border: 1px solid var(--border-glass);\n  border-radius: var(--radius-xl);\n  box-shadow: var(--shadow-glass);\n  backdrop-filter: var(--blur-glass);\n  -webkit-backdrop-filter: var(--blur-glass);\n}\n.equipment-form-container[_ngcontent-%COMP%]   .form-header[_ngcontent-%COMP%] {\n  margin-block-end: 1.5rem;\n}\n.equipment-form-container[_ngcontent-%COMP%]   .form-header[_ngcontent-%COMP%]   h2[_ngcontent-%COMP%] {\n  margin: 0;\n  font-size: 1.25rem;\n  font-weight: 600;\n}\n.equipment-form-container[_ngcontent-%COMP%]   .form-body[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 1.5rem;\n}\n.equipment-form-container[_ngcontent-%COMP%]   .form-section[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 1rem;\n}\n.equipment-form-container[_ngcontent-%COMP%]   .form-section.scaling-section[_ngcontent-%COMP%] {\n  padding-block-start: 1rem;\n  border-top: 1px solid var(--border-default);\n}\n.equipment-form-container[_ngcontent-%COMP%]   .form-section.scaling-section[_ngcontent-%COMP%]   h3[_ngcontent-%COMP%] {\n  margin: 0 0 0.5rem 0;\n  font-size: 1rem;\n  font-weight: 600;\n}\n.equipment-form-container[_ngcontent-%COMP%]   .form-section[_ngcontent-%COMP%]   .scaling-fields[_ngcontent-%COMP%] {\n  display: grid;\n  grid-template-columns: repeat(auto-fill, minmax(7.5rem, 1fr));\n  gap: 1rem;\n}\n.equipment-form-container[_ngcontent-%COMP%]   .form-group[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 0.25rem;\n}\n.equipment-form-container[_ngcontent-%COMP%]   .form-group[_ngcontent-%COMP%]   label[_ngcontent-%COMP%] {\n  font-size: 0.875rem;\n  font-weight: 500;\n}\n.equipment-form-container[_ngcontent-%COMP%]   .form-group[_ngcontent-%COMP%]   input.c-input[_ngcontent-%COMP%], \n.equipment-form-container[_ngcontent-%COMP%]   .form-group[_ngcontent-%COMP%]   textarea.c-input[_ngcontent-%COMP%] {\n  width: 100%;\n}\n.equipment-form-container[_ngcontent-%COMP%]   .form-group.checkbox-group[_ngcontent-%COMP%]   label[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n  cursor: pointer;\n}\n.equipment-form-container[_ngcontent-%COMP%]   .c-form-actions[_ngcontent-%COMP%] {\n  padding-block-start: 1rem;\n}\n/*# sourceMappingURL=equipment-form.component.css.map */'], changeDetection: 0 });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(EquipmentFormComponent, [{
    type: Component,
    args: [{ selector: "app-equipment-form", standalone: true, imports: [CommonModule, ReactiveFormsModule, LucideAngularModule, TranslatePipe, LoaderComponent, CustomSelectComponent], changeDetection: ChangeDetectionStrategy.OnPush, template: `<div class="equipment-form-container" dir="rtl">\r
  <header class="form-header">\r
    @if (isEditMode_()) {\r
      <h2>{{ 'edit' | translatePipe }}: {{ equipmentForm_.get('name_hebrew')?.value }}</h2>\r
    } @else {\r
      <h2>{{ 'add_equipment' | translatePipe }}</h2>\r
    }\r
  </header>\r
\r
  <form [formGroup]="equipmentForm_" (ngSubmit)="onSubmit()" class="form-body">\r
    <div class="form-section">\r
      <div class="form-group">\r
        <label for="name_hebrew">{{ 'name' | translatePipe }}</label>\r
        <input #nameInput id="name_hebrew" type="text" formControlName="name_hebrew" class="c-input" />\r
      </div>\r
      <div class="form-group">\r
        <label for="category_">{{ 'category' | translatePipe }}</label>\r
        <app-custom-select\r
          triggerId="category_"\r
          formControlName="category_"\r
          [options]="categoryOptions"\r
          placeholder="category"\r
          [typeToFilter]="true" />\r
      </div>\r
      <div class="form-group">\r
        <label for="owned_quantity_">{{ 'owned_quantity' | translatePipe }}</label>\r
        <input id="owned_quantity_" type="number" formControlName="owned_quantity_" min="0" class="c-input" />\r
      </div>\r
      <div class="form-group checkbox-group">\r
        <label>\r
          <input type="checkbox" formControlName="is_consumable_" />\r
          {{ 'is_consumable' | translatePipe }}\r
        </label>\r
      </div>\r
      <div class="form-group">\r
        <label for="notes_">{{ 'notes' | translatePipe }}</label>\r
        <textarea id="notes_" formControlName="notes_" rows="2" class="c-input"></textarea>\r
      </div>\r
    </div>\r
\r
    <div class="form-section scaling-section">\r
      <h3>{{ 'scaling_rule' | translatePipe }}</h3>\r
      <div class="form-group checkbox-group">\r
        <label>\r
          <input type="checkbox" formControlName="scaling_enabled_" />\r
          {{ 'scaling_enabled' | translatePipe }}\r
        </label>\r
      </div>\r
      @if (equipmentForm_.get('scaling_enabled_')?.value) {\r
        <div class="scaling-fields">\r
          <div class="form-group">\r
            <label for="per_guests_">{{ 'per_guests' | translatePipe }}</label>\r
            <input id="per_guests_" type="number" formControlName="per_guests_" min="1" class="c-input" />\r
          </div>\r
          <div class="form-group">\r
            <label for="min_quantity_">{{ 'min_quantity' | translatePipe }}</label>\r
            <input id="min_quantity_" type="number" formControlName="min_quantity_" min="0" class="c-input" />\r
          </div>\r
          <div class="form-group">\r
            <label for="max_quantity_">{{ 'max_quantity' | translatePipe }}</label>\r
            <input id="max_quantity_" type="number" formControlName="max_quantity_" min="0" placeholder="\u2014" class="c-input" />\r
          </div>\r
        </div>\r
      }\r
    </div>\r
\r
    <div class="c-form-actions">\r
      <button type="button" class="c-btn-ghost" (click)="onCancel()">\r
        {{ 'cancel' | translatePipe }}\r
      </button>\r
      <button type="submit" class="c-btn-primary" [disabled]="equipmentForm_.invalid || isSaving_()">\r
        @if (isSaving_()) {\r
          <app-loader size="small" [inline]="true" />\r
        }\r
        {{ 'save' | translatePipe }}\r
      </button>\r
    </div>\r
  </form>\r
</div>\r
`, styles: ['@charset "UTF-8";\n\n/* src/app/pages/equipment/components/equipment-form/equipment-form.component.scss */\n:host {\n  display: block;\n}\n.equipment-form-container {\n  max-width: 35rem;\n  padding: 1.5rem;\n  background: var(--bg-glass-strong);\n  border: 1px solid var(--border-glass);\n  border-radius: var(--radius-xl);\n  box-shadow: var(--shadow-glass);\n  backdrop-filter: var(--blur-glass);\n  -webkit-backdrop-filter: var(--blur-glass);\n}\n.equipment-form-container .form-header {\n  margin-block-end: 1.5rem;\n}\n.equipment-form-container .form-header h2 {\n  margin: 0;\n  font-size: 1.25rem;\n  font-weight: 600;\n}\n.equipment-form-container .form-body {\n  display: flex;\n  flex-direction: column;\n  gap: 1.5rem;\n}\n.equipment-form-container .form-section {\n  display: flex;\n  flex-direction: column;\n  gap: 1rem;\n}\n.equipment-form-container .form-section.scaling-section {\n  padding-block-start: 1rem;\n  border-top: 1px solid var(--border-default);\n}\n.equipment-form-container .form-section.scaling-section h3 {\n  margin: 0 0 0.5rem 0;\n  font-size: 1rem;\n  font-weight: 600;\n}\n.equipment-form-container .form-section .scaling-fields {\n  display: grid;\n  grid-template-columns: repeat(auto-fill, minmax(7.5rem, 1fr));\n  gap: 1rem;\n}\n.equipment-form-container .form-group {\n  display: flex;\n  flex-direction: column;\n  gap: 0.25rem;\n}\n.equipment-form-container .form-group label {\n  font-size: 0.875rem;\n  font-weight: 500;\n}\n.equipment-form-container .form-group input.c-input,\n.equipment-form-container .form-group textarea.c-input {\n  width: 100%;\n}\n.equipment-form-container .form-group.checkbox-group label {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n  cursor: pointer;\n}\n.equipment-form-container .c-form-actions {\n  padding-block-start: 1rem;\n}\n/*# sourceMappingURL=equipment-form.component.css.map */\n'] }]
  }], null, { nameInputRef: [{
    type: ViewChild,
    args: ["nameInput"]
  }] });
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(EquipmentFormComponent, { className: "EquipmentFormComponent", filePath: "src/app/pages/equipment/components/equipment-form/equipment-form.component.ts", lineNumber: 48 });
})();
export {
  EquipmentFormComponent
};
//# sourceMappingURL=chunk-OI7DYSD7.js.map
