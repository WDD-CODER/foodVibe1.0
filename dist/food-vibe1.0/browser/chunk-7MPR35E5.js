import {
  duplicateEntityNameValidator
} from "./chunk-6FJWTD4F.js";
import {
  useSavingState
} from "./chunk-6VNIKYJO.js";
import {
  EquipmentDataService
} from "./chunk-YEG5WWUX.js";
import {
  VenueDataService
} from "./chunk-LB7ZO2SF.js";
import {
  RequireAuthService
} from "./chunk-T7ENSIHP.js";
import {
  CustomSelectComponent
} from "./chunk-KKA4TBVQ.js";
import {
  DefaultValueAccessor,
  FormArrayName,
  FormBuilder,
  FormControlName,
  FormGroupDirective,
  FormGroupName,
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
  LucideAngularComponent,
  LucideAngularModule
} from "./chunk-JROUPDH4.js";
import {
  TranslatePipe
} from "./chunk-Z6OI3YDQ.js";
import {
  ActivatedRoute,
  ChangeDetectionStrategy,
  CommonModule,
  Component,
  DestroyRef,
  Router,
  __async,
  __spreadProps,
  __spreadValues,
  computed,
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
} from "./chunk-GCYOWW7U.js";

// src/app/pages/venues/components/venue-form/venue-form.component.ts
function VenueFormComponent_Conditional_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "h2");
    \u0275\u0275text(1);
    \u0275\u0275pipe(2, "translatePipe");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    let tmp_1_0;
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275textInterpolate2("", \u0275\u0275pipeBind1(2, 2, "edit"), ": ", (tmp_1_0 = ctx_r0.venueForm_.get("name_hebrew")) == null ? null : tmp_1_0.value, "");
  }
}
function VenueFormComponent_Conditional_3_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "h2");
    \u0275\u0275text(1);
    \u0275\u0275pipe(2, "translatePipe");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(2, 1, "add_venue"));
  }
}
function VenueFormComponent_Conditional_11_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 7);
    \u0275\u0275text(1);
    \u0275\u0275pipe(2, "translatePipe");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(2, 1, "duplicate_venue_name"));
  }
}
function VenueFormComponent_For_32_Template(rf, ctx) {
  if (rf & 1) {
    const _r2 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 16);
    \u0275\u0275element(1, "app-custom-select", 20)(2, "input", 21);
    \u0275\u0275elementStart(3, "button", 22);
    \u0275\u0275pipe(4, "translatePipe");
    \u0275\u0275listener("click", function VenueFormComponent_For_32_Template_button_click_3_listener() {
      const \u0275$index_62_r3 = \u0275\u0275restoreView(_r2).$index;
      const ctx_r0 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r0.removeInfraRow(\u0275$index_62_r3));
    });
    \u0275\u0275element(5, "lucide-icon", 23);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const \u0275$index_62_r3 = ctx.$index;
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275property("formGroupName", \u0275$index_62_r3);
    \u0275\u0275advance();
    \u0275\u0275property("options", ctx_r0.equipmentOptions_())("placeholder", "choose_equipment")("typeToFilter", true)("translateLabels", false);
    \u0275\u0275advance(2);
    \u0275\u0275attribute("aria-label", \u0275\u0275pipeBind1(4, 7, "remove"));
    \u0275\u0275advance(2);
    \u0275\u0275property("size", 16);
  }
}
function VenueFormComponent_Conditional_38_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "app-loader", 19);
  }
  if (rf & 2) {
    \u0275\u0275property("inline", true);
  }
}
var ENV_TYPES = [
  "professional_kitchen",
  "outdoor_field",
  "client_home",
  "popup_venue"
];
var VenueFormComponent = class _VenueFormComponent {
  embeddedInDashboard = input(false);
  saved = output();
  cancel = output();
  fb = inject(FormBuilder);
  route = inject(ActivatedRoute);
  router = inject(Router);
  venueData = inject(VenueDataService);
  equipmentData = inject(EquipmentDataService);
  destroyRef = inject(DestroyRef);
  requireAuth = inject(RequireAuthService);
  venueForm_;
  isEditMode_ = signal(false);
  saving = useSavingState();
  isSaving_ = this.saving.isSaving_;
  envTypes = ENV_TYPES;
  get infraArray() {
    return this.venueForm_?.get("available_infrastructure_");
  }
  get allEquipment_() {
    return this.equipmentData.allEquipment_();
  }
  envOptions = ENV_TYPES.map((env) => ({ value: env, label: env }));
  equipmentOptions_ = computed(() => this.equipmentData.allEquipment_().map((eq) => ({ value: eq._id, label: eq.name_hebrew })));
  ngOnInit() {
    this.buildForm();
    this.route.data.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((data) => {
      const venue = data["venue"];
      if (venue) {
        this.isEditMode_.set(true);
        this.hydrateForm(venue);
      }
    });
  }
  buildForm() {
    this.venueForm_ = this.fb.group({
      name_hebrew: ["", [
        Validators.required,
        duplicateEntityNameValidator(() => this.venueData.allVenues_(), () => this.route.snapshot.data["venue"]?._id ?? null)
      ]],
      environment_type_: ["outdoor_field", [Validators.required]],
      notes_: [""],
      available_infrastructure_: this.fb.array([])
    });
  }
  hydrateForm(v) {
    this.venueForm_.patchValue({
      name_hebrew: v.name_hebrew ?? "",
      environment_type_: v.environment_type_ ?? "outdoor_field",
      notes_: v.notes_ ?? ""
    });
    const arr = this.infraArray;
    arr.clear();
    (v.available_infrastructure_ ?? []).forEach((item) => {
      arr.push(this.fb.group({
        equipment_id_: [item.equipment_id_, Validators.required],
        available_quantity_: [item.available_quantity_, [Validators.required, Validators.min(0)]]
      }));
    });
  }
  addInfraRow() {
    this.infraArray.push(this.fb.group({
      equipment_id_: ["", Validators.required],
      available_quantity_: [1, [Validators.required, Validators.min(0)]]
    }));
  }
  removeInfraRow(index) {
    this.infraArray.removeAt(index);
  }
  onSubmit() {
    return __async(this, null, function* () {
      if (!this.requireAuth.requireAuth())
        return;
      if (this.venueForm_.invalid)
        return;
      yield this.saving.withSaving(() => __async(this, null, function* () {
        const v = this.venueForm_.getRawValue();
        const infra = (v.available_infrastructure_ ?? []).filter((row) => row.equipment_id_).map((row) => ({
          equipment_id_: row.equipment_id_,
          available_quantity_: Number(row.available_quantity_)
        }));
        const now = (/* @__PURE__ */ new Date()).toISOString();
        if (this.isEditMode_()) {
          const venue = this.route.snapshot.data["venue"];
          yield this.venueData.updateVenue(__spreadProps(__spreadValues({}, venue), {
            name_hebrew: v.name_hebrew,
            environment_type_: v.environment_type_,
            notes_: v.notes_ || void 0,
            available_infrastructure_: infra
          }));
        } else {
          yield this.venueData.addVenue({
            name_hebrew: v.name_hebrew,
            environment_type_: v.environment_type_,
            notes_: v.notes_ || void 0,
            available_infrastructure_: infra,
            created_at_: now
          });
        }
        if (this.embeddedInDashboard()) {
          this.saved.emit();
        } else {
          this.router.navigate(["/venues/list"]);
        }
      }));
    });
  }
  onCancel() {
    if (this.embeddedInDashboard()) {
      this.cancel.emit();
    } else {
      this.router.navigate(["/venues/list"]);
    }
  }
  equipmentName(id) {
    return this.allEquipment_.find((e) => e._id === id)?.name_hebrew ?? id;
  }
  static \u0275fac = function VenueFormComponent_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _VenueFormComponent)();
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _VenueFormComponent, selectors: [["app-venue-form"]], inputs: { embeddedInDashboard: [1, "embeddedInDashboard"] }, outputs: { saved: "saved", cancel: "cancel" }, decls: 41, vars: 30, consts: [["dir", "rtl", 1, "venue-form-container"], [1, "form-header"], [1, "form-body", 3, "ngSubmit", "formGroup"], [1, "form-section"], [1, "form-group"], ["for", "name_hebrew"], ["id", "name_hebrew", "type", "text", "formControlName", "name_hebrew", 1, "c-input"], [1, "form-error"], ["for", "environment_type_"], ["triggerId", "environment_type_", "formControlName", "environment_type_", 3, "options", "placeholder", "typeToFilter"], ["for", "notes_"], ["id", "notes_", "formControlName", "notes_", "rows", "2", 1, "c-input"], ["formArrayName", "available_infrastructure_", 1, "form-section", "infra-section"], [1, "infra-header"], ["type", "button", 1, "c-btn-ghost", 3, "click"], ["name", "plus", 3, "size"], [1, "infra-row", 3, "formGroupName"], [1, "c-form-actions"], ["type", "submit", 1, "c-btn-primary", 3, "disabled"], ["size", "small", 3, "inline"], ["formControlName", "equipment_id_", 3, "options", "placeholder", "typeToFilter", "translateLabels"], ["type", "number", "formControlName", "available_quantity_", "min", "0", "placeholder", "0"], ["type", "button", 1, "btn-icon", 3, "click"], ["name", "trash-2", 3, "size"]], template: function VenueFormComponent_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275elementStart(0, "div", 0)(1, "header", 1);
      \u0275\u0275template(2, VenueFormComponent_Conditional_2_Template, 3, 4, "h2")(3, VenueFormComponent_Conditional_3_Template, 3, 3, "h2");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(4, "form", 2);
      \u0275\u0275listener("ngSubmit", function VenueFormComponent_Template_form_ngSubmit_4_listener() {
        return ctx.onSubmit();
      });
      \u0275\u0275elementStart(5, "div", 3)(6, "div", 4)(7, "label", 5);
      \u0275\u0275text(8);
      \u0275\u0275pipe(9, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275element(10, "input", 6);
      \u0275\u0275template(11, VenueFormComponent_Conditional_11_Template, 3, 3, "span", 7);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(12, "div", 4)(13, "label", 8);
      \u0275\u0275text(14);
      \u0275\u0275pipe(15, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275element(16, "app-custom-select", 9);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(17, "div", 4)(18, "label", 10);
      \u0275\u0275text(19);
      \u0275\u0275pipe(20, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275element(21, "textarea", 11);
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(22, "div", 12)(23, "div", 13)(24, "h3");
      \u0275\u0275text(25);
      \u0275\u0275pipe(26, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(27, "button", 14);
      \u0275\u0275listener("click", function VenueFormComponent_Template_button_click_27_listener() {
        return ctx.addInfraRow();
      });
      \u0275\u0275element(28, "lucide-icon", 15);
      \u0275\u0275text(29);
      \u0275\u0275pipe(30, "translatePipe");
      \u0275\u0275elementEnd()();
      \u0275\u0275repeaterCreate(31, VenueFormComponent_For_32_Template, 6, 9, "div", 16, \u0275\u0275repeaterTrackByIndex);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(33, "div", 17)(34, "button", 14);
      \u0275\u0275listener("click", function VenueFormComponent_Template_button_click_34_listener() {
        return ctx.onCancel();
      });
      \u0275\u0275text(35);
      \u0275\u0275pipe(36, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(37, "button", 18);
      \u0275\u0275template(38, VenueFormComponent_Conditional_38_Template, 1, 1, "app-loader", 19);
      \u0275\u0275text(39);
      \u0275\u0275pipe(40, "translatePipe");
      \u0275\u0275elementEnd()()()();
    }
    if (rf & 2) {
      let tmp_3_0;
      \u0275\u0275advance(2);
      \u0275\u0275conditional(ctx.isEditMode_() ? 2 : 3);
      \u0275\u0275advance(2);
      \u0275\u0275property("formGroup", ctx.venueForm_);
      \u0275\u0275advance(4);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(9, 16, "name"));
      \u0275\u0275advance(3);
      \u0275\u0275conditional(((tmp_3_0 = ctx.venueForm_.get("name_hebrew")) == null ? null : tmp_3_0.errors == null ? null : tmp_3_0.errors["duplicateName"]) && ((tmp_3_0 = ctx.venueForm_.get("name_hebrew")) == null ? null : tmp_3_0.touched) ? 11 : -1);
      \u0275\u0275advance(3);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(15, 18, "environment_type"));
      \u0275\u0275advance(2);
      \u0275\u0275property("options", ctx.envOptions)("placeholder", "environment_type")("typeToFilter", true);
      \u0275\u0275advance(3);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(20, 20, "notes"));
      \u0275\u0275advance(6);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(26, 22, "available_infrastructure"));
      \u0275\u0275advance(3);
      \u0275\u0275property("size", 16);
      \u0275\u0275advance();
      \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(30, 24, "add_row"), " ");
      \u0275\u0275advance(2);
      \u0275\u0275repeater(ctx.infraArray.controls);
      \u0275\u0275advance(4);
      \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(36, 26, "cancel"), " ");
      \u0275\u0275advance(2);
      \u0275\u0275property("disabled", ctx.venueForm_.invalid || ctx.isSaving_());
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.isSaving_() ? 38 : -1);
      \u0275\u0275advance();
      \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(40, 28, "save"), " ");
    }
  }, dependencies: [CommonModule, ReactiveFormsModule, \u0275NgNoValidate, DefaultValueAccessor, NumberValueAccessor, NgControlStatus, NgControlStatusGroup, MinValidator, FormGroupDirective, FormControlName, FormGroupName, FormArrayName, LucideAngularModule, LucideAngularComponent, TranslatePipe, LoaderComponent, CustomSelectComponent], styles: ['@charset "UTF-8";\n\n\n\n[_nghost-%COMP%] {\n  display: block;\n}\n.venue-form-container[_ngcontent-%COMP%] {\n  max-width: 35rem;\n  padding: 1.5rem;\n  background: var(--bg-glass-strong);\n  border: 1px solid var(--border-glass);\n  border-radius: var(--radius-xl);\n  box-shadow: var(--shadow-glass);\n  backdrop-filter: var(--blur-glass);\n  -webkit-backdrop-filter: var(--blur-glass);\n}\n.venue-form-container[_ngcontent-%COMP%]   .form-header[_ngcontent-%COMP%] {\n  margin-block-end: 1.5rem;\n}\n.venue-form-container[_ngcontent-%COMP%]   .form-header[_ngcontent-%COMP%]   h2[_ngcontent-%COMP%] {\n  margin: 0;\n  font-size: 1.25rem;\n  font-weight: 600;\n}\n.venue-form-container[_ngcontent-%COMP%]   .form-body[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 1.5rem;\n}\n.venue-form-container[_ngcontent-%COMP%]   .form-section[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 1rem;\n}\n.venue-form-container[_ngcontent-%COMP%]   .form-section.infra-section[_ngcontent-%COMP%] {\n  padding-block-start: 1rem;\n  border-top: 1px solid var(--border-default);\n}\n.venue-form-container[_ngcontent-%COMP%]   .form-section.infra-section[_ngcontent-%COMP%]   .infra-header[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  margin-block-end: 0.5rem;\n}\n.venue-form-container[_ngcontent-%COMP%]   .form-section.infra-section[_ngcontent-%COMP%]   .infra-header[_ngcontent-%COMP%]   h3[_ngcontent-%COMP%] {\n  margin: 0;\n  font-size: 1rem;\n  font-weight: 600;\n}\n.venue-form-container[_ngcontent-%COMP%]   .form-section.infra-section[_ngcontent-%COMP%]   .infra-row[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n  margin-block-end: 0.5rem;\n}\n.venue-form-container[_ngcontent-%COMP%]   .form-section.infra-section[_ngcontent-%COMP%]   .infra-row[_ngcontent-%COMP%]   input.c-input[_ngcontent-%COMP%] {\n  width: 5rem;\n}\n.venue-form-container[_ngcontent-%COMP%]   .form-group[_ngcontent-%COMP%]   label[_ngcontent-%COMP%] {\n  display: block;\n  margin-block-end: 0.25rem;\n  font-size: 0.875rem;\n  font-weight: 500;\n}\n.venue-form-container[_ngcontent-%COMP%]   .form-group[_ngcontent-%COMP%]   input.c-input[_ngcontent-%COMP%], \n.venue-form-container[_ngcontent-%COMP%]   .form-group[_ngcontent-%COMP%]   textarea.c-input[_ngcontent-%COMP%] {\n  width: 100%;\n}\n.venue-form-container[_ngcontent-%COMP%]   .form-group[_ngcontent-%COMP%]   .form-error[_ngcontent-%COMP%] {\n  font-size: 0.75rem;\n  color: var(--color-danger);\n}\n.venue-form-container[_ngcontent-%COMP%]   .c-form-actions[_ngcontent-%COMP%] {\n  padding-block-start: 1rem;\n}\n/*# sourceMappingURL=venue-form.component.css.map */'], changeDetection: 0 });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(VenueFormComponent, [{
    type: Component,
    args: [{ selector: "app-venue-form", standalone: true, imports: [CommonModule, ReactiveFormsModule, LucideAngularModule, TranslatePipe, LoaderComponent, CustomSelectComponent], changeDetection: ChangeDetectionStrategy.OnPush, template: `<div class="venue-form-container" dir="rtl">\r
  <header class="form-header">\r
    @if (isEditMode_()) {\r
      <h2>{{ 'edit' | translatePipe }}: {{ venueForm_.get('name_hebrew')?.value }}</h2>\r
    } @else {\r
      <h2>{{ 'add_venue' | translatePipe }}</h2>\r
    }\r
  </header>\r
\r
  <form [formGroup]="venueForm_" (ngSubmit)="onSubmit()" class="form-body">\r
    <div class="form-section">\r
      <div class="form-group">\r
        <label for="name_hebrew">{{ 'name' | translatePipe }}</label>\r
        <input id="name_hebrew" type="text" formControlName="name_hebrew" class="c-input" />\r
        @if (venueForm_.get('name_hebrew')?.errors?.['duplicateName'] && venueForm_.get('name_hebrew')?.touched) {\r
          <span class="form-error">{{ 'duplicate_venue_name' | translatePipe }}</span>\r
        }\r
      </div>\r
      <div class="form-group">\r
        <label for="environment_type_">{{ 'environment_type' | translatePipe }}</label>\r
        <app-custom-select\r
          triggerId="environment_type_"\r
          formControlName="environment_type_"\r
          [options]="envOptions"\r
          [placeholder]="'environment_type'"\r
          [typeToFilter]="true" />\r
      </div>\r
      <div class="form-group">\r
        <label for="notes_">{{ 'notes' | translatePipe }}</label>\r
        <textarea id="notes_" formControlName="notes_" rows="2" class="c-input"></textarea>\r
      </div>\r
    </div>\r
\r
    <div class="form-section infra-section" formArrayName="available_infrastructure_">\r
      <div class="infra-header">\r
        <h3>{{ 'available_infrastructure' | translatePipe }}</h3>\r
        <button type="button" class="c-btn-ghost" (click)="addInfraRow()">\r
          <lucide-icon name="plus" [size]="16"></lucide-icon>\r
          {{ 'add_row' | translatePipe }}\r
        </button>\r
      </div>\r
      @for (ctrl of infraArray.controls; track $index; let i = $index) {\r
        <div class="infra-row" [formGroupName]="i">\r
          <app-custom-select\r
            formControlName="equipment_id_"\r
            [options]="equipmentOptions_()"\r
            [placeholder]="'choose_equipment'"\r
            [typeToFilter]="true"\r
            [translateLabels]="false" />\r
          <input type="number" formControlName="available_quantity_" min="0" placeholder="0" />\r
          <button type="button" class="btn-icon" (click)="removeInfraRow(i)" [attr.aria-label]="'remove' | translatePipe">\r
            <lucide-icon name="trash-2" [size]="16"></lucide-icon>\r
          </button>\r
        </div>\r
      }\r
    </div>\r
\r
    <div class="c-form-actions">\r
      <button type="button" class="c-btn-ghost" (click)="onCancel()">\r
        {{ 'cancel' | translatePipe }}\r
      </button>\r
      <button type="submit" class="c-btn-primary" [disabled]="venueForm_.invalid || isSaving_()">\r
        @if (isSaving_()) {\r
          <app-loader size="small" [inline]="true" />\r
        }\r
        {{ 'save' | translatePipe }}\r
      </button>\r
    </div>\r
  </form>\r
</div>\r
`, styles: ['@charset "UTF-8";\n\n/* src/app/pages/venues/components/venue-form/venue-form.component.scss */\n:host {\n  display: block;\n}\n.venue-form-container {\n  max-width: 35rem;\n  padding: 1.5rem;\n  background: var(--bg-glass-strong);\n  border: 1px solid var(--border-glass);\n  border-radius: var(--radius-xl);\n  box-shadow: var(--shadow-glass);\n  backdrop-filter: var(--blur-glass);\n  -webkit-backdrop-filter: var(--blur-glass);\n}\n.venue-form-container .form-header {\n  margin-block-end: 1.5rem;\n}\n.venue-form-container .form-header h2 {\n  margin: 0;\n  font-size: 1.25rem;\n  font-weight: 600;\n}\n.venue-form-container .form-body {\n  display: flex;\n  flex-direction: column;\n  gap: 1.5rem;\n}\n.venue-form-container .form-section {\n  display: flex;\n  flex-direction: column;\n  gap: 1rem;\n}\n.venue-form-container .form-section.infra-section {\n  padding-block-start: 1rem;\n  border-top: 1px solid var(--border-default);\n}\n.venue-form-container .form-section.infra-section .infra-header {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  margin-block-end: 0.5rem;\n}\n.venue-form-container .form-section.infra-section .infra-header h3 {\n  margin: 0;\n  font-size: 1rem;\n  font-weight: 600;\n}\n.venue-form-container .form-section.infra-section .infra-row {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n  margin-block-end: 0.5rem;\n}\n.venue-form-container .form-section.infra-section .infra-row input.c-input {\n  width: 5rem;\n}\n.venue-form-container .form-group label {\n  display: block;\n  margin-block-end: 0.25rem;\n  font-size: 0.875rem;\n  font-weight: 500;\n}\n.venue-form-container .form-group input.c-input,\n.venue-form-container .form-group textarea.c-input {\n  width: 100%;\n}\n.venue-form-container .form-group .form-error {\n  font-size: 0.75rem;\n  color: var(--color-danger);\n}\n.venue-form-container .c-form-actions {\n  padding-block-start: 1rem;\n}\n/*# sourceMappingURL=venue-form.component.css.map */\n'] }]
  }], null, null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(VenueFormComponent, { className: "VenueFormComponent", filePath: "src/app/pages/venues/components/venue-form/venue-form.component.ts", lineNumber: 46 });
})();

export {
  VenueFormComponent
};
//# sourceMappingURL=chunk-7MPR35E5.js.map
