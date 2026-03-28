import {
  VersionHistoryPanelComponent
} from "./chunk-TJGMQCI6.js";
import {
  EmptyStateComponent
} from "./chunk-6CQIZF63.js";
import {
  RecipeCostService
} from "./chunk-7Z6ZOB5G.js";
import {
  AiRecipeModalService
} from "./chunk-XOL47RFX.js";
import "./chunk-FUKBAJ6Z.js";
import {
  MetadataRegistryService
} from "./chunk-AEBXA76L.js";
import "./chunk-HKRWTH4Y.js";
import "./chunk-KNQKKPOG.js";
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
  BooleanParam,
  FilterRecordParam,
  NullableStringParam,
  StringArrayParam,
  StringParam,
  useListState
} from "./chunk-34POUDIW.js";
import {
  HeroFabService
} from "./chunk-QBY7FUTT.js";
import {
  RequireAuthService
} from "./chunk-T7ENSIHP.js";
import "./chunk-RXM3SI3E.js";
import {
  ClickOutSideDirective,
  ScrollableDropdownComponent,
  filterOptionsByStartsWith
} from "./chunk-KKA4TBVQ.js";
import {
  DefaultValueAccessor,
  FormsModule,
  NgControlStatus,
  NgModel
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
  TranslatePipe,
  TranslationService
} from "./chunk-Z6OI3YDQ.js";
import {
  KitchenStateService
} from "./chunk-ZA4PDXUK.js";
import "./chunk-IFJ5YUTT.js";
import "./chunk-ACTKISJR.js";
import {
  UserService
} from "./chunk-VOTRTAY7.js";
import "./chunk-7WUWXC4O.js";
import {
  UserMsgService
} from "./chunk-WYZGJ7UG.js";
import "./chunk-OYT4PDSG.js";
import {
  ChangeDetectionStrategy,
  CommonModule,
  Component,
  DecimalPipe,
  NavigationEnd,
  Router,
  __spreadProps,
  __spreadValues,
  afterNextRender,
  computed,
  effect,
  filter,
  inject,
  setClassMetadata,
  signal,
  ɵsetClassDebugInfo,
  ɵɵadvance,
  ɵɵattribute,
  ɵɵclassProp,
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
  ɵɵpipeBind2,
  ɵɵproperty,
  ɵɵrepeater,
  ɵɵrepeaterCreate,
  ɵɵrepeaterTrackByIdentity,
  ɵɵresetView,
  ɵɵrestoreView,
  ɵɵstyleProp,
  ɵɵtemplate,
  ɵɵtext,
  ɵɵtextInterpolate,
  ɵɵtextInterpolate1,
  ɵɵtextInterpolate2
} from "./chunk-GCYOWW7U.js";

// src/app/core/utils/recipe-allergens.util.ts
var MAX_ALLERGEN_RECURSION = 5;
function resolveRecipeAllergens(recipe, allRecipes, allProducts, maxDepth = MAX_ALLERGEN_RECURSION, depth = 0) {
  if (depth >= maxDepth || !recipe?.ingredients_?.length)
    return [];
  const set = /* @__PURE__ */ new Set();
  for (const ing of recipe.ingredients_) {
    if (ing.type === "product") {
      const product = allProducts.find((p) => p._id === ing.referenceId);
      (product?.allergens_ || []).forEach((a) => set.add(a));
    } else if (ing.type === "recipe") {
      const subRecipe = allRecipes.find((r) => r._id === ing.referenceId);
      if (subRecipe) {
        resolveRecipeAllergens(subRecipe, allRecipes, allProducts, maxDepth, depth + 1).forEach((a) => set.add(a));
      }
    }
  }
  return Array.from(set);
}

// src/app/core/utils/cell-expand-state.util.ts
var CellExpandState = class {
  expandAll_ = signal(false);
  expandedIds_ = signal(/* @__PURE__ */ new Set());
  isExpanded(id) {
    return this.expandAll_() || this.expandedIds_().has(id);
  }
  toggleOne(id) {
    this.expandedIds_.update((set) => {
      const next = new Set(set);
      if (next.has(id))
        next.delete(id);
      else
        next.add(id);
      return next;
    });
  }
  toggleAll() {
    this.expandAll_.update((v) => !v);
    this.expandedIds_.set(/* @__PURE__ */ new Set());
  }
  closeAll() {
    this.expandAll_.set(false);
    this.expandedIds_.set(/* @__PURE__ */ new Set());
  }
  reset() {
    this.closeAll();
  }
};

// src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.ts
var _forTrack0 = ($index, $item) => $item._id;
var _forTrack1 = ($index, $item) => $item.name;
var _forTrack2 = ($index, $item) => $item.value;
function RecipeBookListComponent_Conditional_33_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 44);
    \u0275\u0275listener("click", function RecipeBookListComponent_Conditional_33_Template_div_click_0_listener() {
      \u0275\u0275restoreView(_r1);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.setSort("dateAdded"));
    })("keydown.enter", function RecipeBookListComponent_Conditional_33_Template_div_keydown_enter_0_listener() {
      \u0275\u0275restoreView(_r1);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.setSort("dateAdded"));
    })("keydown.space", function RecipeBookListComponent_Conditional_33_Template_div_keydown_space_0_listener($event) {
      \u0275\u0275restoreView(_r1);
      const ctx_r1 = \u0275\u0275nextContext();
      $event.preventDefault();
      return \u0275\u0275resetView(ctx_r1.setSort("dateAdded"));
    });
    \u0275\u0275text(1);
    \u0275\u0275pipe(2, "translatePipe");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(2, 1, "date_added"), " ");
  }
}
function RecipeBookListComponent_Conditional_43_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    const _r3 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "app-empty-state", 46);
    \u0275\u0275listener("ctaClick", function RecipeBookListComponent_Conditional_43_Conditional_1_Template_app_empty_state_ctaClick_0_listener() {
      \u0275\u0275restoreView(_r3);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.onAddRecipe());
    });
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275property("ctaDisabled", !ctx_r1.isLoggedIn());
  }
}
function RecipeBookListComponent_Conditional_43_Conditional_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275text(0);
    \u0275\u0275pipe(1, "translatePipe");
  }
  if (rf & 2) {
    \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(1, 1, "no_recipes_match"), " ");
  }
}
function RecipeBookListComponent_Conditional_43_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 23);
    \u0275\u0275template(1, RecipeBookListComponent_Conditional_43_Conditional_1_Template, 1, 1, "app-empty-state", 45)(2, RecipeBookListComponent_Conditional_43_Conditional_2_Template, 2, 3);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r1.isEmptyList_() ? 1 : 2);
  }
}
function RecipeBookListComponent_For_45_Conditional_10_Conditional_4_For_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 67);
    \u0275\u0275text(1);
    \u0275\u0275pipe(2, "translatePipe");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const label_r7 = ctx.$implicit;
    const ctx_r1 = \u0275\u0275nextContext(4);
    \u0275\u0275styleProp("background-color", ctx_r1.getLabelColor(label_r7));
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(2, 3, label_r7));
  }
}
function RecipeBookListComponent_For_45_Conditional_10_Conditional_4_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 65);
    \u0275\u0275repeaterCreate(1, RecipeBookListComponent_For_45_Conditional_10_Conditional_4_For_2_Template, 3, 5, "span", 66, \u0275\u0275repeaterTrackByIdentity);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const recipe_r5 = \u0275\u0275nextContext(2).$implicit;
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275repeater(ctx_r1.getAllRecipeLabels(recipe_r5));
  }
}
function RecipeBookListComponent_For_45_Conditional_10_Template(rf, ctx) {
  if (rf & 1) {
    const _r6 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 62);
    \u0275\u0275listener("click", function RecipeBookListComponent_For_45_Conditional_10_Template_div_click_0_listener($event) {
      \u0275\u0275restoreView(_r6);
      const recipe_r5 = \u0275\u0275nextContext().$implicit;
      const ctx_r1 = \u0275\u0275nextContext();
      ctx_r1.labelsExpand.toggleOne(recipe_r5._id);
      return \u0275\u0275resetView($event.stopPropagation());
    })("clickOutside", function RecipeBookListComponent_For_45_Conditional_10_Template_div_clickOutside_0_listener($event) {
      \u0275\u0275restoreView(_r6);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.closeLabelsView($event));
    })("keydown.enter", function RecipeBookListComponent_For_45_Conditional_10_Template_div_keydown_enter_0_listener() {
      \u0275\u0275restoreView(_r6);
      const recipe_r5 = \u0275\u0275nextContext().$implicit;
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.labelsExpand.toggleOne(recipe_r5._id));
    })("keydown.space", function RecipeBookListComponent_For_45_Conditional_10_Template_div_keydown_space_0_listener($event) {
      \u0275\u0275restoreView(_r6);
      const recipe_r5 = \u0275\u0275nextContext().$implicit;
      const ctx_r1 = \u0275\u0275nextContext();
      $event.preventDefault();
      return \u0275\u0275resetView(ctx_r1.labelsExpand.toggleOne(recipe_r5._id));
    });
    \u0275\u0275elementStart(1, "button", 63);
    \u0275\u0275element(2, "lucide-icon", 64);
    \u0275\u0275text(3);
    \u0275\u0275elementEnd();
    \u0275\u0275template(4, RecipeBookListComponent_For_45_Conditional_10_Conditional_4_Template, 3, 0, "div", 65);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const recipe_r5 = \u0275\u0275nextContext().$implicit;
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275classProp("labels-expanded-open", ctx_r1.labelsExpand.isExpanded(recipe_r5._id));
    \u0275\u0275advance(2);
    \u0275\u0275property("size", 16);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r1.getAllRecipeLabels(recipe_r5).length, " ");
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r1.labelsExpand.isExpanded(recipe_r5._id) ? 4 : -1);
  }
}
function RecipeBookListComponent_For_45_Conditional_11_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 53);
    \u0275\u0275text(1, "\u2014");
    \u0275\u0275elementEnd();
  }
}
function RecipeBookListComponent_For_45_Conditional_14_Conditional_4_For_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 71);
    \u0275\u0275text(1);
    \u0275\u0275pipe(2, "translatePipe");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const a_r9 = ctx.$implicit;
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(2, 1, a_r9));
  }
}
function RecipeBookListComponent_For_45_Conditional_14_Conditional_4_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 65);
    \u0275\u0275repeaterCreate(1, RecipeBookListComponent_For_45_Conditional_14_Conditional_4_For_2_Template, 3, 3, "span", 71, \u0275\u0275repeaterTrackByIdentity);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const recipe_r5 = \u0275\u0275nextContext(2).$implicit;
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275repeater(ctx_r1.getRecipeAllergens(recipe_r5));
  }
}
function RecipeBookListComponent_For_45_Conditional_14_Template(rf, ctx) {
  if (rf & 1) {
    const _r8 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 68);
    \u0275\u0275listener("clickOutside", function RecipeBookListComponent_For_45_Conditional_14_Template_div_clickOutside_0_listener($event) {
      \u0275\u0275restoreView(_r8);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.closeAllergenView($event));
    });
    \u0275\u0275elementStart(1, "button", 69);
    \u0275\u0275listener("click", function RecipeBookListComponent_For_45_Conditional_14_Template_button_click_1_listener() {
      \u0275\u0275restoreView(_r8);
      const recipe_r5 = \u0275\u0275nextContext().$implicit;
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.allergenExpand.toggleOne(recipe_r5._id));
    });
    \u0275\u0275element(2, "lucide-icon", 70);
    \u0275\u0275text(3);
    \u0275\u0275elementEnd();
    \u0275\u0275template(4, RecipeBookListComponent_For_45_Conditional_14_Conditional_4_Template, 3, 0, "div", 65);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const recipe_r5 = \u0275\u0275nextContext().$implicit;
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275classProp("allergen-expanded-open", ctx_r1.allergenExpand.isExpanded(recipe_r5._id));
    \u0275\u0275advance(2);
    \u0275\u0275property("size", 16);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r1.getRecipeAllergens(recipe_r5).length, " ");
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r1.allergenExpand.isExpanded(recipe_r5._id) ? 4 : -1);
  }
}
function RecipeBookListComponent_For_45_Conditional_15_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 53);
    \u0275\u0275text(1, "\u2014");
    \u0275\u0275elementEnd();
  }
}
function RecipeBookListComponent_For_45_Conditional_16_Template(rf, ctx) {
  if (rf & 1) {
    const _r10 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 72);
    \u0275\u0275pipe(1, "translatePipe");
    \u0275\u0275listener("mouseenter", function RecipeBookListComponent_For_45_Conditional_16_Template_div_mouseenter_0_listener($event) {
      \u0275\u0275restoreView(_r10);
      const recipe_r5 = \u0275\u0275nextContext().$implicit;
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.showDateTooltip(recipe_r5._id, $event));
    })("mouseleave", function RecipeBookListComponent_For_45_Conditional_16_Template_div_mouseleave_0_listener() {
      \u0275\u0275restoreView(_r10);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.hideDateTooltip());
    });
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const recipe_r5 = \u0275\u0275nextContext().$implicit;
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275property("label", \u0275\u0275pipeBind1(1, 3, "date_added"));
    \u0275\u0275attribute("aria-describedby", ctx_r1.hoveredDateRecipeId_() === recipe_r5._id ? "date-tooltip-" + recipe_r5._id : null);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1(" ", ctx_r1.formatAddedAt(recipe_r5.addedAt_), " ");
  }
}
function RecipeBookListComponent_For_45_Conditional_25_Conditional_0_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "app-loader", 73);
  }
  if (rf & 2) {
    \u0275\u0275property("inline", true);
  }
}
function RecipeBookListComponent_For_45_Conditional_25_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    const _r11 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 75);
    \u0275\u0275pipe(1, "translatePipe");
    \u0275\u0275listener("click", function RecipeBookListComponent_For_45_Conditional_25_Conditional_1_Template_button_click_0_listener($event) {
      \u0275\u0275restoreView(_r11);
      const recipe_r5 = \u0275\u0275nextContext(2).$implicit;
      const ctx_r1 = \u0275\u0275nextContext();
      ctx_r1.onRemoveRecipe(recipe_r5);
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275element(2, "lucide-icon", 76);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    \u0275\u0275attribute("aria-label", \u0275\u0275pipeBind1(1, 2, "delete"));
    \u0275\u0275advance(2);
    \u0275\u0275property("size", 18);
  }
}
function RecipeBookListComponent_For_45_Conditional_25_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275template(0, RecipeBookListComponent_For_45_Conditional_25_Conditional_0_Template, 1, 1, "app-loader", 73)(1, RecipeBookListComponent_For_45_Conditional_25_Conditional_1_Template, 3, 4, "button", 74);
  }
  if (rf & 2) {
    const recipe_r5 = \u0275\u0275nextContext().$implicit;
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275conditional(ctx_r1.removingId_() === recipe_r5._id ? 0 : 1);
  }
}
function RecipeBookListComponent_For_45_Template(rf, ctx) {
  if (rf & 1) {
    const _r4 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 47);
    \u0275\u0275listener("click", function RecipeBookListComponent_For_45_Template_div_click_0_listener($event) {
      const recipe_r5 = \u0275\u0275restoreView(_r4).$implicit;
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.onRowClick(recipe_r5, $event));
    })("keydown.enter", function RecipeBookListComponent_For_45_Template_div_keydown_enter_0_listener() {
      const recipe_r5 = \u0275\u0275restoreView(_r4).$implicit;
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.onEditRecipe(recipe_r5));
    })("keydown.space", function RecipeBookListComponent_For_45_Template_div_keydown_space_0_listener($event) {
      const recipe_r5 = \u0275\u0275restoreView(_r4).$implicit;
      const ctx_r1 = \u0275\u0275nextContext();
      $event.preventDefault();
      return \u0275\u0275resetView(ctx_r1.onEditRecipe(recipe_r5));
    });
    \u0275\u0275elementStart(1, "div", 48);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "app-cell-carousel", 49)(4, "div", 50);
    \u0275\u0275pipe(5, "translatePipe");
    \u0275\u0275text(6);
    \u0275\u0275pipe(7, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(8, "div", 51);
    \u0275\u0275pipe(9, "translatePipe");
    \u0275\u0275template(10, RecipeBookListComponent_For_45_Conditional_10_Template, 5, 5, "div", 52)(11, RecipeBookListComponent_For_45_Conditional_11_Template, 2, 0, "span", 53);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(12, "div", 54);
    \u0275\u0275pipe(13, "translatePipe");
    \u0275\u0275template(14, RecipeBookListComponent_For_45_Conditional_14_Template, 5, 5, "div", 55)(15, RecipeBookListComponent_For_45_Conditional_15_Template, 2, 0, "span", 53);
    \u0275\u0275elementEnd();
    \u0275\u0275template(16, RecipeBookListComponent_For_45_Conditional_16_Template, 3, 5, "div", 56);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(17, "div", 57);
    \u0275\u0275listener("mouseenter", function RecipeBookListComponent_For_45_Template_div_mouseenter_17_listener($event) {
      const recipe_r5 = \u0275\u0275restoreView(_r4).$implicit;
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.showCostTooltip(recipe_r5._id, $event));
    })("mouseleave", function RecipeBookListComponent_For_45_Template_div_mouseleave_17_listener() {
      \u0275\u0275restoreView(_r4);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.hideCostTooltip());
    })("click", function RecipeBookListComponent_For_45_Template_div_click_17_listener($event) {
      const recipe_r5 = \u0275\u0275restoreView(_r4).$implicit;
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.toggleCostTooltipTap(recipe_r5._id, $event));
    });
    \u0275\u0275text(18);
    \u0275\u0275pipe(19, "number");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(20, "div", 58)(21, "button", 59);
    \u0275\u0275pipe(22, "translatePipe");
    \u0275\u0275pipe(23, "translatePipe");
    \u0275\u0275listener("click", function RecipeBookListComponent_For_45_Template_button_click_21_listener($event) {
      const recipe_r5 = \u0275\u0275restoreView(_r4).$implicit;
      const ctx_r1 = \u0275\u0275nextContext();
      ctx_r1.onCookRecipe(recipe_r5);
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275element(24, "lucide-icon", 60);
    \u0275\u0275elementEnd();
    \u0275\u0275template(25, RecipeBookListComponent_For_45_Conditional_25_Template, 2, 1);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(26, "div", 61)(27, "app-list-row-checkbox", 21);
    \u0275\u0275listener("toggle", function RecipeBookListComponent_For_45_Template_app_list_row_checkbox_toggle_27_listener() {
      const recipe_r5 = \u0275\u0275restoreView(_r4).$implicit;
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.selection.toggle(recipe_r5._id));
    });
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const recipe_r5 = ctx.$implicit;
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(recipe_r5.name_hebrew);
    \u0275\u0275advance();
    \u0275\u0275property("activeIndex", ctx_r1.carouselHeaderIndex_());
    \u0275\u0275advance();
    \u0275\u0275property("label", \u0275\u0275pipeBind1(5, 17, "type"));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(7, 19, ctx_r1.isRecipeDish(recipe_r5) ? "dish" : "preparation"));
    \u0275\u0275advance(2);
    \u0275\u0275property("label", \u0275\u0275pipeBind1(9, 21, "labels"));
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r1.getAllRecipeLabels(recipe_r5).length ? 10 : 11);
    \u0275\u0275advance(2);
    \u0275\u0275property("label", \u0275\u0275pipeBind1(13, 23, "allergens"));
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r1.getRecipeAllergens(recipe_r5).length ? 14 : 15);
    \u0275\u0275advance(2);
    \u0275\u0275conditional(!ctx_r1.hideDateColumn_() ? 16 : -1);
    \u0275\u0275advance();
    \u0275\u0275attribute("aria-describedby", ctx_r1.hoveredCostRecipeId_() === recipe_r5._id || ctx_r1.tappedCostRecipeId_() === recipe_r5._id ? "cost-tooltip-" + recipe_r5._id : null);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" \u20AA", \u0275\u0275pipeBind2(19, 25, ctx_r1.getRecipeCost(recipe_r5), "1.2-2"), " ");
    \u0275\u0275advance(3);
    \u0275\u0275property("disabled", !ctx_r1.isLoggedIn());
    \u0275\u0275attribute("aria-label", \u0275\u0275pipeBind1(22, 28, "cook"))("title", !ctx_r1.isLoggedIn() ? \u0275\u0275pipeBind1(23, 30, "sign_in_to_use") : null);
    \u0275\u0275advance(3);
    \u0275\u0275property("size", 18);
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r1.isLoggedIn() ? 25 : -1);
    \u0275\u0275advance(2);
    \u0275\u0275property("checked", ctx_r1.selection.isSelected(recipe_r5._id));
  }
}
function RecipeBookListComponent_Conditional_53_Conditional_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "li", 78);
    \u0275\u0275text(1);
    \u0275\u0275pipe(2, "translatePipe");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(2, 1, "no_ingredients_found"));
  }
}
function RecipeBookListComponent_Conditional_53_For_4_Template(rf, ctx) {
  if (rf & 1) {
    const _r12 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "li", 80);
    \u0275\u0275listener("click", function RecipeBookListComponent_Conditional_53_For_4_Template_li_click_0_listener() {
      const p_r13 = \u0275\u0275restoreView(_r12).$implicit;
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.addIngredientProduct(p_r13));
    });
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const p_r13 = ctx.$implicit;
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(p_r13.name_hebrew);
  }
}
function RecipeBookListComponent_Conditional_53_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "app-scrollable-dropdown", 30)(1, "ul", 77);
    \u0275\u0275template(2, RecipeBookListComponent_Conditional_53_Conditional_2_Template, 3, 3, "li", 78);
    \u0275\u0275repeaterCreate(3, RecipeBookListComponent_Conditional_53_For_4_Template, 2, 1, "li", 79, _forTrack0);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275property("maxHeight", 200);
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r1.filteredProductsForIngredientSearch_().length === 0 ? 2 : -1);
    \u0275\u0275advance();
    \u0275\u0275repeater(ctx_r1.filteredProductsForIngredientSearch_());
  }
}
function RecipeBookListComponent_For_56_Template(rf, ctx) {
  if (rf & 1) {
    const _r14 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 81);
    \u0275\u0275listener("click", function RecipeBookListComponent_For_56_Template_button_click_0_listener() {
      const p_r15 = \u0275\u0275restoreView(_r14).$implicit;
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.removeIngredientProduct(p_r15._id));
    });
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const p_r15 = ctx.$implicit;
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(p_r15.name_hebrew);
  }
}
function RecipeBookListComponent_Conditional_57_Template(rf, ctx) {
  if (rf & 1) {
    const _r16 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 82);
    \u0275\u0275listener("click", function RecipeBookListComponent_Conditional_57_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r16);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.clearIngredientProducts());
    });
    \u0275\u0275text(1);
    \u0275\u0275pipe(2, "translatePipe");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(2, 1, "clear"));
  }
}
function RecipeBookListComponent_Conditional_60_Template(rf, ctx) {
  if (rf & 1) {
    const _r17 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 83);
    \u0275\u0275listener("click", function RecipeBookListComponent_Conditional_60_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r17);
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
function RecipeBookListComponent_Conditional_66_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 39);
    \u0275\u0275text(1, "1");
    \u0275\u0275elementEnd();
  }
}
function RecipeBookListComponent_Conditional_68_Template(rf, ctx) {
  if (rf & 1) {
    const _r18 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 41)(1, "div", 84)(2, "button", 83);
    \u0275\u0275listener("click", function RecipeBookListComponent_Conditional_68_Template_button_click_2_listener() {
      \u0275\u0275restoreView(_r18);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.setSortDateNewestFirst());
    });
    \u0275\u0275text(3);
    \u0275\u0275pipe(4, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "button", 83);
    \u0275\u0275listener("click", function RecipeBookListComponent_Conditional_68_Template_button_click_5_listener() {
      \u0275\u0275restoreView(_r18);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.setSortDateOldestFirst());
    });
    \u0275\u0275text(6);
    \u0275\u0275pipe(7, "translatePipe");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(8, "div", 85)(9, "label", 86)(10, "span");
    \u0275\u0275text(11);
    \u0275\u0275pipe(12, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(13, "input", 87);
    \u0275\u0275listener("ngModelChange", function RecipeBookListComponent_Conditional_68_Template_input_ngModelChange_13_listener($event) {
      \u0275\u0275restoreView(_r18);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.dateFrom_.set($event));
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(14, "label", 86)(15, "span");
    \u0275\u0275text(16);
    \u0275\u0275pipe(17, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(18, "input", 87);
    \u0275\u0275listener("ngModelChange", function RecipeBookListComponent_Conditional_68_Template_input_ngModelChange_18_listener($event) {
      \u0275\u0275restoreView(_r18);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.dateTo_.set($event));
    });
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(19, "label", 88)(20, "input", 89);
    \u0275\u0275listener("change", function RecipeBookListComponent_Conditional_68_Template_input_change_20_listener() {
      \u0275\u0275restoreView(_r18);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.dateIncludeByUpdated_.set(!ctx_r1.dateIncludeByUpdated_()));
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(21, "span");
    \u0275\u0275text(22);
    \u0275\u0275pipe(23, "translatePipe");
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(4, 8, "sort_newest_first"));
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(7, 10, "sort_oldest_first"));
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(12, 12, "date_from"));
    \u0275\u0275advance(2);
    \u0275\u0275property("ngModel", ctx_r1.dateFrom_());
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(17, 14, "date_to"));
    \u0275\u0275advance(2);
    \u0275\u0275property("ngModel", ctx_r1.dateTo_());
    \u0275\u0275advance(2);
    \u0275\u0275property("checked", ctx_r1.dateIncludeByUpdated_());
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(23, 16, "date_filter_by_updated"));
  }
}
function RecipeBookListComponent_For_70_Conditional_5_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 39);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const category_r20 = \u0275\u0275nextContext().$implicit;
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(ctx_r1.selectedCountInCategory(category_r20));
  }
}
function RecipeBookListComponent_For_70_Conditional_7_For_2_Template(rf, ctx) {
  if (rf & 1) {
    const _r21 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "label", 88)(1, "input", 89);
    \u0275\u0275listener("change", function RecipeBookListComponent_For_70_Conditional_7_For_2_Template_input_change_1_listener() {
      const option_r22 = \u0275\u0275restoreView(_r21).$implicit;
      const category_r20 = \u0275\u0275nextContext(2).$implicit;
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.toggleFilter(category_r20.name, option_r22.value));
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(2, "span");
    \u0275\u0275text(3);
    \u0275\u0275pipe(4, "translatePipe");
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const option_r22 = ctx.$implicit;
    \u0275\u0275advance();
    \u0275\u0275property("checked", option_r22.checked_);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(4, 2, option_r22.label));
  }
}
function RecipeBookListComponent_For_70_Conditional_7_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 90);
    \u0275\u0275repeaterCreate(1, RecipeBookListComponent_For_70_Conditional_7_For_2_Template, 5, 4, "label", 88, _forTrack2);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const category_r20 = \u0275\u0275nextContext().$implicit;
    \u0275\u0275advance();
    \u0275\u0275repeater(category_r20.options);
  }
}
function RecipeBookListComponent_For_70_Template(rf, ctx) {
  if (rf & 1) {
    const _r19 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 42)(1, "button", 38);
    \u0275\u0275listener("click", function RecipeBookListComponent_For_70_Template_button_click_1_listener() {
      const category_r20 = \u0275\u0275restoreView(_r19).$implicit;
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.toggleFilterCategory(category_r20.name));
    });
    \u0275\u0275elementStart(2, "span");
    \u0275\u0275text(3);
    \u0275\u0275pipe(4, "translatePipe");
    \u0275\u0275elementEnd();
    \u0275\u0275template(5, RecipeBookListComponent_For_70_Conditional_5_Template, 2, 1, "span", 39);
    \u0275\u0275element(6, "lucide-icon", 40);
    \u0275\u0275elementEnd();
    \u0275\u0275template(7, RecipeBookListComponent_For_70_Conditional_7_Template, 3, 0, "div", 90);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const category_r20 = ctx.$implicit;
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275classProp("expanded", ctx_r1.isCategoryExpanded(category_r20.name));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(4, 7, category_r20.name === "Allergens" ? "do_not_include_allergens" : category_r20.displayKey));
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r1.selectedCountInCategory(category_r20) > 0 ? 5 : -1);
    \u0275\u0275advance();
    \u0275\u0275property("name", ctx_r1.isCategoryExpanded(category_r20.name) ? "chevron-down" : "chevron-left")("size", 16);
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r1.isCategoryExpanded(category_r20.name) ? 7 : -1);
  }
}
function RecipeBookListComponent_Conditional_71_Conditional_0_Template(rf, ctx) {
  if (rf & 1) {
    const _r23 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 92);
    \u0275\u0275listener("clickOutside", function RecipeBookListComponent_Conditional_71_Conditional_0_Template_div_clickOutside_0_listener() {
      \u0275\u0275restoreView(_r23);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.closeCostTooltipTap());
    });
    \u0275\u0275text(1);
    \u0275\u0275pipe(2, "translatePipe");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const anchor_r24 = ctx;
    const recipe_r25 = \u0275\u0275nextContext();
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275styleProp("top", anchor_r24.bottom + 4, "px")("left", anchor_r24.left + anchor_r24.width / 2, "px");
    \u0275\u0275property("id", "cost-tooltip-" + recipe_r25._id);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate2(" ", \u0275\u0275pipeBind1(2, 7, "price_for"), "", ctx_r1.getRecipeYieldDescription(recipe_r25), " ");
  }
}
function RecipeBookListComponent_Conditional_71_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275template(0, RecipeBookListComponent_Conditional_71_Conditional_0_Template, 3, 9, "div", 91);
  }
  if (rf & 2) {
    let tmp_2_0;
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275conditional((tmp_2_0 = ctx_r1.costTooltipAnchor_()) ? 0 : -1, tmp_2_0);
  }
}
function RecipeBookListComponent_Conditional_72_Conditional_0_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 94);
    \u0275\u0275text(1);
    \u0275\u0275pipe(2, "translatePipe");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const anchor_r26 = ctx;
    const recipe_r27 = \u0275\u0275nextContext();
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275styleProp("top", anchor_r26.bottom + 4, "px")("left", anchor_r26.left + anchor_r26.width / 2, "px");
    \u0275\u0275property("id", "date-tooltip-" + recipe_r27._id);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate2(" ", \u0275\u0275pipeBind1(2, 7, "date_updated"), ": ", ctx_r1.formatUpdatedAtWithTime(recipe_r27.updatedAt_), " ");
  }
}
function RecipeBookListComponent_Conditional_72_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275template(0, RecipeBookListComponent_Conditional_72_Conditional_0_Template, 3, 9, "div", 93);
  }
  if (rf & 2) {
    let tmp_2_0;
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275conditional((tmp_2_0 = ctx_r1.dateTooltipAnchor_()) ? 0 : -1, tmp_2_0);
  }
}
function RecipeBookListComponent_Conditional_73_Template(rf, ctx) {
  if (rf & 1) {
    const _r28 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 95);
    \u0275\u0275listener("click", function RecipeBookListComponent_Conditional_73_Template_div_click_0_listener() {
      \u0275\u0275restoreView(_r28);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.closeHistory());
    });
    \u0275\u0275elementStart(1, "div", 96);
    \u0275\u0275listener("click", function RecipeBookListComponent_Conditional_73_Template_div_click_1_listener($event) {
      \u0275\u0275restoreView(_r28);
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275elementStart(2, "app-version-history-panel", 97);
    \u0275\u0275listener("closed", function RecipeBookListComponent_Conditional_73_Template_app_version_history_panel_closed_2_listener() {
      \u0275\u0275restoreView(_r28);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.closeHistory());
    })("restored", function RecipeBookListComponent_Conditional_73_Template_app_version_history_panel_restored_2_listener() {
      \u0275\u0275restoreView(_r28);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.closeHistory());
    });
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const h_r29 = ctx;
    \u0275\u0275advance(2);
    \u0275\u0275property("entityType", h_r29.entityType)("entityId", h_r29.entityId)("entityName", h_r29.entityName);
  }
}
var RecipeBookListComponent = class _RecipeBookListComponent {
  kitchenState = inject(KitchenStateService);
  router = inject(Router);
  recipeCostService = inject(RecipeCostService);
  translationService = inject(TranslationService);
  metadataRegistry = inject(MetadataRegistryService);
  userService = inject(UserService);
  isLoggedIn = this.userService.isLoggedIn;
  requireAuthService = inject(RequireAuthService);
  userMsg = inject(UserMsgService);
  heroFab = inject(HeroFabService);
  aiRecipeModal = inject(AiRecipeModalService);
  ngOnInit() {
    this.heroFab.setPageActions([{ labelKey: "add_recipe_ai", icon: "sparkles", run: () => {
      void this.aiRecipeModal.open();
    } }], "replace");
  }
  ngOnDestroy() {
    this.heroFab.clearPageActions();
  }
  currentUserId_ = computed(() => this.userService.user_()?._id ?? null);
  isAdmin_ = computed(() => this.userService.user_()?.role === "admin");
  activeFilters_ = signal({});
  searchQuery_ = signal("");
  sortBy_ = signal(null);
  sortOrder_ = signal("asc");
  isPanelOpen_ = signal(true);
  dateFrom_ = signal(null);
  dateTo_ = signal(null);
  /** When true: show items in range by creation OR by update. When false: by creation only. */
  dateIncludeByUpdated_ = signal(false);
  constructor() {
    this.isPanelOpen_.set(getPanelOpen("recipe-book"));
    useListState("recipe-book", [
      { urlParam: "q", signal: this.searchQuery_, serializer: StringParam },
      { urlParam: "sort", signal: this.sortBy_, serializer: NullableStringParam },
      { urlParam: "order", signal: this.sortOrder_, serializer: StringParam },
      { urlParam: "filters", signal: this.activeFilters_, serializer: FilterRecordParam },
      { urlParam: "ingredients", signal: this.selectedProductIds_, serializer: StringArrayParam },
      { urlParam: "dateFrom", signal: this.dateFrom_, serializer: NullableStringParam },
      { urlParam: "dateTo", signal: this.dateTo_, serializer: NullableStringParam },
      { urlParam: "dateByUpdated", signal: this.dateIncludeByUpdated_, serializer: BooleanParam }
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
    effect(() => {
      const filters = this.activeFilters_();
      const withValues = Object.keys(filters).filter((name) => (filters[name]?.length ?? 0) > 0);
      const hasDateRange = this.dateFrom_() != null || this.dateTo_() != null;
      if (withValues.length === 0 && !hasDateRange)
        return;
      this.expandedFilterCategories_.update((set) => {
        const next = new Set(set);
        withValues.forEach((name) => next.add(name));
        if (hasDateRange)
          next.add("Date");
        return next;
      });
    });
    const events = this.router.events;
    if (events) {
      events.pipe(filter((e) => e instanceof NavigationEnd), takeUntilDestroyed()).subscribe(() => {
        if (this.router.url.includes("recipe-book"))
          this.resetExpandedCells();
      });
    }
  }
  resetExpandedCells() {
    this.allergenExpand.reset();
    this.labelsExpand.reset();
  }
  expandedFilterCategories_ = signal(/* @__PURE__ */ new Set());
  allergenExpand = new CellExpandState();
  labelsExpand = new CellExpandState();
  hoveredCostRecipeId_ = signal(null);
  tappedCostRecipeId_ = signal(null);
  costTooltipAnchor_ = signal(null);
  hoveredDateRecipeId_ = signal(null);
  /** Set to false to show the "date added" column again. */
  hideDateColumn_ = signal(true);
  dateTooltipAnchor_ = signal(null);
  selection = new ListSelectionState();
  editableFields_ = computed(() => [
    {
      key: "labels_",
      label: "labels",
      options: this.metadataRegistry.allLabels_().map((l) => ({ value: l.key, label: l.key })),
      multi: true
    },
    {
      key: "recipe_type_",
      label: "recipe_type",
      options: [
        { value: "dish", label: "dish" },
        { value: "preparation", label: "preparation" }
      ],
      multi: false
    }
  ]);
  ingredientSearchQuery_ = signal("");
  selectedProductIds_ = signal([]);
  historyFor_ = signal(null);
  deletingId_ = signal(null);
  removingId_ = signal(null);
  duplicatingId_ = signal(null);
  carouselHeaderIndex_ = signal(0);
  categoryDisplayKey(internalName) {
    const map = {
      "Labels": "labels",
      "Type": "type",
      "Allergens": "allergens",
      "Approved": "approved",
      "Station": "station"
    };
    return map[internalName] ?? internalName.toLowerCase();
  }
  getAllRecipeLabels(recipe) {
    return [.../* @__PURE__ */ new Set([...recipe.labels_ ?? [], ...recipe.autoLabels_ ?? []])];
  }
  /** Resolves label color by registry key, or by display text (e.g. Hebrew) when recipe stores translated value. */
  getLabelColor(keyOrDisplay) {
    const byKey = this.metadataRegistry.getLabelColor(keyOrDisplay);
    if (byKey !== "#78716C")
      return byKey;
    const byDisplay = this.metadataRegistry.allLabels_().find((def) => this.translationService.translate(def.key) === keyOrDisplay);
    return byDisplay?.color ?? byKey;
  }
  toggleFilterCategory(name) {
    this.expandedFilterCategories_.update((set) => {
      const next = new Set(set);
      if (next.has(name))
        next.delete(name);
      else
        next.add(name);
      return next;
    });
  }
  isCategoryExpanded(name) {
    return this.expandedFilterCategories_().has(name);
  }
  togglePanel() {
    this.isPanelOpen_.update((v) => !v);
    setPanelOpen("recipe-book", this.isPanelOpen_());
  }
  filterCategories_ = computed(() => {
    const recipes = this.kitchenState.visibleRecipes_();
    const filters = this.activeFilters_();
    const categories = {};
    recipes.forEach((recipe) => {
      const isDish = this.isRecipeDish(recipe);
      const typeVal = isDish ? "dish" : "preparation";
      if (!categories["Type"])
        categories["Type"] = /* @__PURE__ */ new Set();
      categories["Type"].add(typeVal);
      const allergens = this.getRecipeAllergens(recipe);
      allergens.forEach((a) => {
        if (!categories["Allergens"])
          categories["Allergens"] = /* @__PURE__ */ new Set();
        categories["Allergens"].add(a);
      });
      const recipeLabels = this.getAllRecipeLabels(recipe);
      if (recipeLabels.length > 0) {
        recipeLabels.forEach((l) => {
          if (!categories["Labels"])
            categories["Labels"] = /* @__PURE__ */ new Set();
          categories["Labels"].add(l);
        });
      } else {
        if (!categories["Labels"])
          categories["Labels"] = /* @__PURE__ */ new Set();
        categories["Labels"].add("no_label");
      }
      if (!categories["Approved"])
        categories["Approved"] = /* @__PURE__ */ new Set();
      categories["Approved"].add(recipe.is_approved_ ? "true" : "false");
      const station = (recipe.default_station_ || "").trim() || "_none";
      if (!categories["Station"])
        categories["Station"] = /* @__PURE__ */ new Set();
      categories["Station"].add(station);
    });
    if (!categories["Approved"])
      categories["Approved"] = /* @__PURE__ */ new Set();
    categories["Approved"].add("true").add("false");
    const optionLabel = (name, value) => {
      if (name === "Approved")
        return value === "true" ? "approved_yes" : "approved_no";
      if (name === "Station" && value === "_none")
        return "no_station";
      return value;
    };
    return Object.keys(categories).map((name) => ({
      name,
      displayKey: this.categoryDisplayKey(name),
      options: Array.from(categories[name]).map((option) => ({
        label: optionLabel(name, option),
        value: option,
        checked_: (filters[name] || []).includes(option)
      }))
    }));
  });
  filteredProductsForIngredientSearch_ = computed(() => {
    const raw = this.ingredientSearchQuery_().trim();
    if (!raw)
      return [];
    const selected = new Set(this.selectedProductIds_());
    const candidates = this.kitchenState.products_().filter((p) => !selected.has(p._id));
    return filterOptionsByStartsWith(candidates, raw, (p) => (p.name_hebrew ?? "").trim());
  });
  filteredRecipes_ = computed(() => {
    let recipes = this.kitchenState.visibleRecipes_();
    const filters = this.activeFilters_();
    const search = this.searchQuery_().trim().toLowerCase();
    const sortBy = this.sortBy_();
    const sortOrder = this.sortOrder_();
    const selectedIds = this.selectedProductIds_();
    if (Object.keys(filters).length > 0) {
      recipes = recipes.filter((recipe) => {
        return Object.entries(filters).every(([category, selectedValues]) => {
          let recipeValues = [];
          if (category === "Type") {
            recipeValues = [this.isRecipeDish(recipe) ? "dish" : "preparation"];
          } else if (category === "Allergens") {
            recipeValues = this.getRecipeAllergens(recipe);
            return selectedValues.every((v) => !recipeValues.includes(v));
          } else if (category === "Labels") {
            const labels = this.getAllRecipeLabels(recipe);
            recipeValues = labels.length > 0 ? labels : ["no_label"];
          } else if (category === "Approved") {
            recipeValues = [recipe.is_approved_ ? "true" : "false"];
          } else if (category === "Station") {
            const st = (recipe.default_station_ || "").trim() || "_none";
            recipeValues = [st];
          }
          return selectedValues.some((v) => recipeValues.includes(v));
        });
      });
    }
    if (selectedIds.length > 0) {
      recipes = recipes.filter((r) => this.recipeContainsAllProducts(r, selectedIds));
    }
    if (search) {
      recipes = recipes.filter((r) => (r.name_hebrew ?? "").toLowerCase().includes(search));
    }
    const dateFrom = this.dateFrom_();
    const dateTo = this.dateTo_();
    const includeByUpdated = this.dateIncludeByUpdated_();
    if (dateFrom != null || dateTo != null) {
      const fromMs = dateFrom != null ? this.parseDateToStartOfDay(dateFrom) : null;
      const toMs = dateTo != null ? this.parseDateToEndOfDay(dateTo) : null;
      recipes = recipes.filter((recipe) => {
        const inRange = (ts) => {
          if (fromMs != null && ts < fromMs)
            return false;
          if (toMs != null && ts > toMs)
            return false;
          return true;
        };
        const createdInRange = inRange(recipe.addedAt_ ?? 0);
        const updatedInRange = includeByUpdated && inRange(recipe.updatedAt_ ?? 0);
        return createdInRange || updatedInRange;
      });
    }
    if (sortBy) {
      const isAsc = sortOrder === "asc";
      recipes = [...recipes].sort((a, b) => {
        const cmp = this.compareRecipes(a, b, sortBy);
        return isAsc ? cmp : -cmp;
      });
    }
    return recipes;
  });
  /** Visible recipe IDs for header select-all. */
  filteredRecipeIds_ = computed(() => this.filteredRecipes_().map((r) => r._id ?? "").filter(Boolean));
  isEmptyList_ = computed(() => this.kitchenState.visibleRecipes_().length === 0);
  activeCostTooltipRecipe_ = computed(() => {
    const id = this.hoveredCostRecipeId_() ?? this.tappedCostRecipeId_();
    return id ? this.filteredRecipes_().find((r) => r._id === id) ?? null : null;
  });
  activeDateTooltipRecipe_ = computed(() => {
    const id = this.hoveredDateRecipeId_();
    return id ? this.filteredRecipes_().find((r) => r._id === id) ?? null : null;
  });
  isRecipeDish(recipe) {
    return recipe.recipe_type_ === "dish" || !!(recipe.prep_items_?.length || recipe.prep_categories_?.length);
  }
  getRecipeAllergens(recipe) {
    return resolveRecipeAllergens(recipe, this.kitchenState.recipes_(), this.kitchenState.products_());
  }
  /** Parse YYYY-MM-DD to start of day (00:00:00.000) in local timezone. */
  parseDateToStartOfDay(dateStr) {
    const parts = dateStr.split("-").map(Number);
    if (parts.length !== 3 || parts.some(isNaN))
      return null;
    const [y, m, d] = parts;
    return new Date(y, m - 1, d).getTime();
  }
  /** Parse YYYY-MM-DD to end of day (23:59:59.999) in local timezone. */
  parseDateToEndOfDay(dateStr) {
    const parts = dateStr.split("-").map(Number);
    if (parts.length !== 3 || parts.some(isNaN))
      return null;
    const [y, m, d] = parts;
    return new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
  }
  formatAddedAt(addedAt) {
    if (addedAt == null)
      return "\u2014";
    return new Date(addedAt).toLocaleDateString("he-IL", { dateStyle: "short" });
  }
  formatUpdatedAt(updatedAt) {
    if (updatedAt == null)
      return "\u2014";
    return new Date(updatedAt).toLocaleDateString("he-IL", { dateStyle: "short" });
  }
  /** Date and time for hover tooltip (last updated). */
  formatUpdatedAtWithTime(updatedAt) {
    if (updatedAt == null)
      return "\u2014";
    return new Date(updatedAt).toLocaleString("he-IL", { dateStyle: "short", timeStyle: "short" });
  }
  getRecipeYieldDescription(recipe) {
    const amount = recipe.yield_amount_ ?? 1;
    const unit = recipe.yield_unit_ ? this.translationService.translate(recipe.yield_unit_) : "";
    return `${amount} ${unit}`.trim() || String(amount);
  }
  recipeContainsAllProducts(recipe, productIds) {
    if (productIds.length === 0)
      return true;
    const ids = this.getRecipeProductIds(recipe);
    return productIds.every((id) => ids.has(id));
  }
  getRecipeProductIds(recipe, depth = 0) {
    if (depth >= MAX_ALLERGEN_RECURSION || !recipe?.ingredients_?.length)
      return /* @__PURE__ */ new Set();
    const set = /* @__PURE__ */ new Set();
    const recipes = this.kitchenState.recipes_();
    for (const ing of recipe.ingredients_) {
      if (ing.type === "product") {
        set.add(ing.referenceId);
      } else if (ing.type === "recipe") {
        const sub = recipes.find((r) => r._id === ing.referenceId);
        if (sub)
          this.getRecipeProductIds(sub, depth + 1).forEach((id) => set.add(id));
      }
    }
    return set;
  }
  compareRecipes(a, b, field) {
    const hebrewCompare = (x, y) => (x || "").localeCompare(y || "", "he");
    switch (field) {
      case "name":
        return hebrewCompare(a.name_hebrew || "", b.name_hebrew || "");
      case "type": {
        const aType = this.isRecipeDish(a) ? "dish" : "preparation";
        const bType = this.isRecipeDish(b) ? "dish" : "preparation";
        return hebrewCompare(this.translationService.translate(aType), this.translationService.translate(bType));
      }
      case "cost":
        return this.recipeCostService.computeRecipeCost(a) - this.recipeCostService.computeRecipeCost(b);
      case "labels": {
        const aLabels = this.getAllRecipeLabels(a);
        const bLabels = this.getAllRecipeLabels(b);
        const aStr = aLabels.length > 0 ? aLabels.map((l) => this.translationService.translate(l)).join(", ") : "";
        const bStr = bLabels.length > 0 ? bLabels.map((l) => this.translationService.translate(l)).join(", ") : "";
        return hebrewCompare(aStr, bStr);
      }
      case "allergens": {
        const aAll = this.getRecipeAllergens(a);
        const bAll = this.getRecipeAllergens(b);
        const aVal = this.translationService.translate(aAll[0] ?? "");
        const bVal = this.translationService.translate(bAll[0] ?? "");
        return hebrewCompare(aVal, bVal);
      }
      case "dateAdded":
        return (a.addedAt_ ?? 0) - (b.addedAt_ ?? 0);
      case "dateUpdated":
        return (a.updatedAt_ ?? 0) - (b.updatedAt_ ?? 0);
      default:
        return 0;
    }
  }
  onCarouselHeaderChange(index) {
    this.carouselHeaderIndex_.set(index);
  }
  setSort(field) {
    const current = this.sortBy_();
    if (current === field) {
      this.sortOrder_.update((o) => o === "asc" ? "desc" : "asc");
    } else {
      this.sortBy_.set(field);
      this.sortOrder_.set("asc");
    }
  }
  /** Set sort to date (newest first). */
  setSortDateNewestFirst() {
    this.sortBy_.set("dateAdded");
    this.sortOrder_.set("desc");
  }
  /** Set sort to date (oldest first). */
  setSortDateOldestFirst() {
    this.sortBy_.set("dateAdded");
    this.sortOrder_.set("asc");
  }
  /** Close allergen chips view on outside click — guard header column clicks. */
  closeAllergenView(clickTarget) {
    const el = clickTarget instanceof HTMLElement ? clickTarget : null;
    if (el?.closest(".table-header .col-allergens"))
      return;
    this.allergenExpand.closeAll();
  }
  /** Close labels chips view on outside click — guard header column clicks. */
  closeLabelsView(clickTarget) {
    const el = clickTarget instanceof HTMLElement ? clickTarget : null;
    if (el?.closest(".table-header .col-labels"))
      return;
    this.labelsExpand.closeAll();
  }
  toggleFilter(categoryName, optionValue) {
    this.activeFilters_.update((prev) => {
      const current = __spreadValues({}, prev);
      const values = current[categoryName] || [];
      if (values.includes(optionValue)) {
        current[categoryName] = values.filter((v) => v !== optionValue);
        if (current[categoryName].length === 0)
          delete current[categoryName];
      } else {
        current[categoryName] = [...values, optionValue];
      }
      return current;
    });
  }
  clearAllFilters() {
    this.activeFilters_.set({});
    this.dateFrom_.set(null);
    this.dateTo_.set(null);
    this.dateIncludeByUpdated_.set(false);
  }
  hasActiveFilters_ = computed(() => Object.values(this.activeFilters_()).some((arr) => arr.length > 0) || this.dateFrom_() != null || this.dateTo_() != null);
  selectedCountInCategory(category) {
    return category.options.filter((o) => o.checked_).length;
  }
  showCostTooltip(recipeId, event) {
    const el = event?.currentTarget;
    if (el)
      this.costTooltipAnchor_.set(el.getBoundingClientRect());
    this.hoveredCostRecipeId_.set(recipeId);
  }
  hideCostTooltip() {
    this.hoveredCostRecipeId_.set(null);
    if (!this.tappedCostRecipeId_())
      this.costTooltipAnchor_.set(null);
  }
  toggleCostTooltipTap(recipeId, event) {
    const wasOpen = this.tappedCostRecipeId_() === recipeId;
    this.tappedCostRecipeId_.update((id) => id === recipeId ? null : recipeId);
    if (!wasOpen && recipeId) {
      const el = event?.currentTarget;
      if (el)
        this.costTooltipAnchor_.set(el.getBoundingClientRect());
    } else if (!this.tappedCostRecipeId_() && !this.hoveredCostRecipeId_()) {
      this.costTooltipAnchor_.set(null);
    }
  }
  closeCostTooltipTap() {
    this.tappedCostRecipeId_.set(null);
    if (!this.hoveredCostRecipeId_())
      this.costTooltipAnchor_.set(null);
  }
  showDateTooltip(recipeId, event) {
    const el = event?.currentTarget;
    if (el)
      this.dateTooltipAnchor_.set(el.getBoundingClientRect());
    this.hoveredDateRecipeId_.set(recipeId);
  }
  hideDateTooltip() {
    this.hoveredDateRecipeId_.set(null);
    this.dateTooltipAnchor_.set(null);
  }
  addIngredientProduct(product) {
    if (this.selectedProductIds_().includes(product._id))
      return;
    this.selectedProductIds_.update((ids) => [...ids, product._id]);
    this.ingredientSearchQuery_.set("");
  }
  removeIngredientProduct(productId) {
    this.selectedProductIds_.update((ids) => ids.filter((id) => id !== productId));
  }
  clearIngredientProducts() {
    this.selectedProductIds_.set([]);
  }
  getSelectedProducts() {
    const ids = this.selectedProductIds_();
    return this.kitchenState.products_().filter((p) => ids.includes(p._id));
  }
  onAddRecipe() {
    this.router.navigate(["/recipe-builder"]);
  }
  onEditRecipe(recipe) {
    this.router.navigate(["/recipe-builder", recipe._id]);
  }
  openHistory(recipe) {
    const entityType = this.isRecipeDish(recipe) ? "dish" : "recipe";
    this.historyFor_.set({ entityType, entityId: recipe._id, entityName: recipe.name_hebrew });
  }
  closeHistory() {
    this.historyFor_.set(null);
  }
  onCookRecipe(recipe) {
    this.router.navigate(["/cook", recipe._id]);
  }
  onRowClick(recipe, event) {
    const el = event.target;
    if (el.closest("button") || el.closest("a") || el.closest(".cost-cell-wrap") || el.closest(".allergen-btn-wrapper") || el.closest(".labels-btn-wrapper") || el.closest("app-list-row-checkbox"))
      return;
    if (this.selection.selectionMode()) {
      this.selection.toggle(recipe._id ?? "");
      return;
    }
    this.onEditRecipe(recipe);
  }
  onDeleteRecipe(recipe) {
    if (!this.requireAuthService.requireAuth())
      return;
    if (confirm("\u05D4\u05D0\u05DD \u05D0\u05EA\u05D4 \u05D1\u05D8\u05D5\u05D7 \u05E9\u05D1\u05E8\u05E6\u05D5\u05E0\u05DA \u05DC\u05DE\u05D7\u05D5\u05E7?")) {
      this.deletingId_.set(recipe._id);
      this.kitchenState.deleteRecipe(recipe).subscribe({
        next: () => {
          this.deletingId_.set(null);
        },
        error: () => {
          this.deletingId_.set(null);
        }
      });
    }
  }
  onHideRecipe(recipe) {
    this.removingId_.set(recipe._id);
    this.kitchenState.hideRecipe(recipe).subscribe({
      next: () => {
        this.removingId_.set(null);
      },
      error: () => {
        this.removingId_.set(null);
      }
    });
  }
  onPermanentlyDeleteRecipe(recipe) {
    if (confirm("\u05DE\u05D7\u05D9\u05E7\u05D4 \u05E7\u05D1\u05D5\u05E2\u05D4 \u2014 \u05DC\u05D0 \u05E0\u05D9\u05EA\u05DF \u05DC\u05E9\u05D7\u05D6\u05E8. \u05DC\u05D4\u05DE\u05E9\u05D9\u05DA?")) {
      this.removingId_.set(recipe._id);
      this.kitchenState.permanentlyDeleteRecipe(recipe).subscribe({
        next: () => {
          this.removingId_.set(null);
        },
        error: () => {
          this.removingId_.set(null);
        }
      });
    }
  }
  onRemoveRecipe(recipe) {
    if (!this.requireAuthService.requireAuth())
      return;
    if (this.isAdmin_()) {
      this.onPermanentlyDeleteRecipe(recipe);
    } else {
      if (confirm("\u05D4\u05D0\u05DD \u05D0\u05EA\u05D4 \u05D1\u05D8\u05D5\u05D7 \u05E9\u05D1\u05E8\u05E6\u05D5\u05E0\u05DA \u05DC\u05DE\u05D7\u05D5\u05E7?")) {
        this.onHideRecipe(recipe);
      }
    }
  }
  onBulkEdit(event) {
    const field = event.field;
    const recipes = this.kitchenState.recipes_();
    for (const id of event.ids) {
      const recipe = recipes.find((r) => r._id === id);
      if (!recipe)
        continue;
      let updated;
      if (field === "labels_") {
        const current = recipe.labels_ ?? [];
        if (current.includes(event.value))
          continue;
        updated = __spreadProps(__spreadValues({}, recipe), { labels_: [...current, event.value] });
      } else {
        updated = __spreadProps(__spreadValues({}, recipe), { recipe_type_: event.value });
      }
      this.kitchenState.saveRecipe(updated).subscribe({ next: () => {
      }, error: () => {
      } });
    }
  }
  onBulkDeleteSelected(ids) {
    if (ids.length === 0)
      return;
    if (!this.requireAuthService.requireAuth())
      return;
    if (!confirm(`\u05DC\u05DE\u05D7\u05D5\u05E7 ${ids.length} \u05DE\u05EA\u05DB\u05D5\u05E0\u05D9\u05DD?`))
      return;
    const recipes = this.kitchenState.recipes_().filter((r) => ids.includes(r._id ?? ""));
    if (this.isAdmin_()) {
      recipes.forEach((recipe) => {
        this.kitchenState.permanentlyDeleteRecipe(recipe).subscribe({ next: () => {
        }, error: () => {
        } });
      });
    } else {
      recipes.forEach((recipe) => {
        this.kitchenState.hideRecipe(recipe).subscribe({ next: () => {
        }, error: () => {
        } });
      });
    }
    this.selection.clear();
  }
  onDuplicateRecipe(recipe) {
    const copyOf = this.translationService.translate("copy_of");
    const clone = JSON.parse(JSON.stringify(recipe));
    delete clone._id;
    clone.name_hebrew = `${copyOf} ${recipe.name_hebrew}`.trim();
    clone.is_approved_ = false;
    this.duplicatingId_.set(recipe._id);
    this.kitchenState.saveRecipe(clone).subscribe({
      next: () => {
        this.duplicatingId_.set(null);
      },
      error: () => {
        this.duplicatingId_.set(null);
      }
    });
  }
  onToggleApproval(recipe) {
    const updated = __spreadProps(__spreadValues({}, recipe), { is_approved_: !recipe.is_approved_ });
    this.kitchenState.saveRecipe(updated).subscribe();
  }
  getRecipeCost(recipe) {
    return this.recipeCostService.computeRecipeCost(recipe);
  }
  static \u0275fac = function RecipeBookListComponent_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _RecipeBookListComponent)();
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _RecipeBookListComponent, selectors: [["recipe-book-list"]], decls: 74, vars: 66, consts: [[3, "panelToggle", "isPanelOpen", "gridTemplate", "mobileGridTemplate"], ["shell-title", "", 1, "page-title"], ["shell-search", ""], ["for", "recipe-search", 1, "visually-hidden"], [1, "c-input-wrapper"], ["name", "search", 3, "size"], ["id", "recipe-search", "type", "text", 3, "ngModelChange", "ngModel", "placeholder"], ["shell-actions", ""], [3, "bulkDelete", "bulkEdit", "selectionState", "editableFields"], ["type", "button", 1, "c-btn-primary", 3, "click", "disabled"], ["name", "plus", 3, "size"], ["shell-table-header", ""], ["role", "button", "tabindex", "0", 1, "col-name", "c-grid-header-cell", "c-sortable-header", 3, "click", "keydown.enter", "keydown.space"], [3, "activeIndexChange", "activeIndex"], ["carouselHeaderColumn", "", "label", "type", "role", "button", "tabindex", "0", 1, "col-type", "c-grid-header-cell", "c-sortable-header", 3, "click", "keydown.enter", "keydown.space"], ["carouselHeaderColumn", "", "label", "labels", "role", "button", "tabindex", "0", 1, "col-labels", "c-grid-header-cell", "c-sortable-header", "c-dense-chip-col", 3, "click", "keydown.enter", "keydown.space"], ["carouselHeaderColumn", "", "label", "allergens", "role", "button", "tabindex", "0", 1, "col-allergens", "c-grid-header-cell", "c-sortable-header", "c-dense-chip-col", 3, "click", "keydown.enter", "keydown.space"], ["carouselHeaderColumn", "", "label", "date_added", "role", "button", "tabindex", "0", 1, "col-date", "c-grid-header-cell", "c-sortable-header"], ["role", "button", "tabindex", "0", 1, "col-cost", "c-grid-header-cell", "c-sortable-header", 3, "click", "keydown.enter", "keydown.space"], [1, "c-col-actions", "c-grid-header-cell"], ["role", "columnheader", 1, "col-select", "c-grid-header-cell"], [3, "toggle", "checked"], ["shell-table-body", ""], [1, "no-results"], ["role", "button", "tabindex", "0", 1, "recipe-grid-row", "c-list-row"], ["shell-filters", ""], [1, "search-section"], [1, "ingredient-search-block"], [1, "ingredient-search-input-wrap"], ["type", "text", 3, "ngModelChange", "ngModel", "placeholder"], [3, "maxHeight"], [1, "ingredient-chips-wrap"], ["type", "button", 1, "c-filter-chip"], ["type", "button", 1, "ingredient-clear-btn"], [1, "c-filter-section"], [1, "c-filter-section-header"], ["type", "button", 1, "c-btn-ghost--sm"], [1, "c-filter-category", "date-filter-category"], ["type", "button", 1, "c-filter-category-header", 3, "click"], ["aria-hidden", "true", 1, "c-filter-category-count"], [3, "name", "size"], [1, "c-filter-options", "date-filter-options"], [1, "c-filter-category"], [1, "history-overlay"], ["carouselHeaderColumn", "", "label", "date_added", "role", "button", "tabindex", "0", 1, "col-date", "c-grid-header-cell", "c-sortable-header", 3, "click", "keydown.enter", "keydown.space"], ["messageKey", "empty_recipe_book", "icon", "book-open", "ctaLabelKey", "add_first_recipe", 3, "ctaDisabled"], ["messageKey", "empty_recipe_book", "icon", "book-open", "ctaLabelKey", "add_first_recipe", 3, "ctaClick", "ctaDisabled"], ["role", "button", "tabindex", "0", 1, "recipe-grid-row", "c-list-row", 3, "click", "keydown.enter", "keydown.space"], [1, "col-name", "c-list-body-cell"], [3, "activeIndex"], ["cellCarouselSlide", "", 1, "col-type", "c-list-body-cell", 3, "label"], ["cellCarouselSlide", "", 1, "col-labels", "c-list-body-cell", "c-dense-chip-col", 3, "label"], ["role", "button", "tabindex", "0", 1, "labels-btn-wrapper", 3, "labels-expanded-open"], [1, "placeholder-dash"], ["cellCarouselSlide", "", 1, "col-allergens", "c-list-body-cell", "c-dense-chip-col", 3, "label"], [1, "allergen-btn-wrapper", 3, "allergen-expanded-open"], ["cellCarouselSlide", "", 1, "col-date", "c-list-body-cell", "date-cell-wrap", 3, "label"], [1, "col-cost", "c-list-body-cell", "cost-cell-wrap", 3, "mouseenter", "mouseleave", "click"], [1, "c-col-actions", "c-list-body-cell"], ["type", "button", 1, "c-icon-btn", 3, "click", "disabled"], ["name", "cooking-pot", 3, "size"], ["role", "cell", 1, "col-select", "c-list-body-cell"], ["role", "button", "tabindex", "0", 1, "labels-btn-wrapper", 3, "click", "clickOutside", "keydown.enter", "keydown.space"], ["type", "button", 1, "labels-btn"], ["name", "tag", 3, "size"], [1, "c-dense-chip-grid"], [1, "label-chip", 3, "background-color"], [1, "label-chip"], [1, "allergen-btn-wrapper", 3, "clickOutside"], ["type", "button", 1, "allergen-btn", 3, "click"], ["name", "shield-alert", 3, "size"], [1, "allergen-pill"], ["cellCarouselSlide", "", 1, "col-date", "c-list-body-cell", "date-cell-wrap", 3, "mouseenter", "mouseleave", "label"], ["size", "small", 3, "inline"], ["type", "button", 1, "c-icon-btn", "danger"], ["type", "button", 1, "c-icon-btn", "danger", 3, "click"], ["name", "trash-2", 3, "size"], ["role", "listbox", 1, "ingredient-dropdown-list"], [1, "no-dropdown-results"], ["role", "option"], ["role", "option", 3, "click"], ["type", "button", 1, "c-filter-chip", 3, "click"], ["type", "button", 1, "ingredient-clear-btn", 3, "click"], ["type", "button", 1, "c-btn-ghost--sm", 3, "click"], [1, "date-sort-buttons"], [1, "date-range-inputs"], [1, "date-range-label"], ["type", "date", 3, "ngModelChange", "ngModel"], [1, "c-filter-option"], ["type", "checkbox", 3, "change", "checked"], [1, "c-filter-options"], [1, "cost-tooltip", "cost-tooltip-fixed", 3, "id", "top", "left"], [1, "cost-tooltip", "cost-tooltip-fixed", 3, "clickOutside", "id"], [1, "date-tooltip", "date-tooltip-fixed", 3, "id", "top", "left"], [1, "date-tooltip", "date-tooltip-fixed", 3, "id"], [1, "history-overlay", 3, "click"], [1, "history-overlay-panel", 3, "click"], [3, "closed", "restored", "entityType", "entityId", "entityName"]], template: function RecipeBookListComponent_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275elementStart(0, "app-list-shell", 0);
      \u0275\u0275listener("panelToggle", function RecipeBookListComponent_Template_app_list_shell_panelToggle_0_listener() {
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
      \u0275\u0275listener("ngModelChange", function RecipeBookListComponent_Template_input_ngModelChange_10_listener($event) {
        return ctx.searchQuery_.set($event);
      });
      \u0275\u0275elementEnd()();
      \u0275\u0275elementContainerEnd();
      \u0275\u0275elementContainerStart(12, 7);
      \u0275\u0275elementStart(13, "app-selection-bar", 8);
      \u0275\u0275listener("bulkDelete", function RecipeBookListComponent_Template_app_selection_bar_bulkDelete_13_listener($event) {
        return ctx.onBulkDeleteSelected($event);
      })("bulkEdit", function RecipeBookListComponent_Template_app_selection_bar_bulkEdit_13_listener($event) {
        return ctx.onBulkEdit($event);
      });
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(14, "button", 9);
      \u0275\u0275pipe(15, "translatePipe");
      \u0275\u0275listener("click", function RecipeBookListComponent_Template_button_click_14_listener() {
        return ctx.onAddRecipe();
      });
      \u0275\u0275element(16, "lucide-icon", 10);
      \u0275\u0275text(17);
      \u0275\u0275pipe(18, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275elementContainerEnd();
      \u0275\u0275elementContainerStart(19, 11);
      \u0275\u0275elementStart(20, "div", 12);
      \u0275\u0275listener("click", function RecipeBookListComponent_Template_div_click_20_listener() {
        return ctx.setSort("name");
      })("keydown.enter", function RecipeBookListComponent_Template_div_keydown_enter_20_listener() {
        return ctx.setSort("name");
      })("keydown.space", function RecipeBookListComponent_Template_div_keydown_space_20_listener($event) {
        $event.preventDefault();
        return ctx.setSort("name");
      });
      \u0275\u0275text(21);
      \u0275\u0275pipe(22, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(23, "app-carousel-header", 13);
      \u0275\u0275listener("activeIndexChange", function RecipeBookListComponent_Template_app_carousel_header_activeIndexChange_23_listener($event) {
        return ctx.onCarouselHeaderChange($event);
      });
      \u0275\u0275elementStart(24, "div", 14);
      \u0275\u0275listener("click", function RecipeBookListComponent_Template_div_click_24_listener() {
        return ctx.setSort("type");
      })("keydown.enter", function RecipeBookListComponent_Template_div_keydown_enter_24_listener() {
        return ctx.setSort("type");
      })("keydown.space", function RecipeBookListComponent_Template_div_keydown_space_24_listener($event) {
        $event.preventDefault();
        return ctx.setSort("type");
      });
      \u0275\u0275text(25);
      \u0275\u0275pipe(26, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(27, "div", 15);
      \u0275\u0275listener("click", function RecipeBookListComponent_Template_div_click_27_listener() {
        return ctx.labelsExpand.toggleAll();
      })("keydown.enter", function RecipeBookListComponent_Template_div_keydown_enter_27_listener() {
        return ctx.labelsExpand.toggleAll();
      })("keydown.space", function RecipeBookListComponent_Template_div_keydown_space_27_listener($event) {
        $event.preventDefault();
        return ctx.labelsExpand.toggleAll();
      });
      \u0275\u0275text(28);
      \u0275\u0275pipe(29, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(30, "div", 16);
      \u0275\u0275listener("click", function RecipeBookListComponent_Template_div_click_30_listener() {
        return ctx.allergenExpand.toggleAll();
      })("keydown.enter", function RecipeBookListComponent_Template_div_keydown_enter_30_listener() {
        return ctx.allergenExpand.toggleAll();
      })("keydown.space", function RecipeBookListComponent_Template_div_keydown_space_30_listener($event) {
        $event.preventDefault();
        return ctx.allergenExpand.toggleAll();
      });
      \u0275\u0275text(31);
      \u0275\u0275pipe(32, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275template(33, RecipeBookListComponent_Conditional_33_Template, 3, 3, "div", 17);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(34, "div", 18);
      \u0275\u0275listener("click", function RecipeBookListComponent_Template_div_click_34_listener() {
        return ctx.setSort("cost");
      })("keydown.enter", function RecipeBookListComponent_Template_div_keydown_enter_34_listener() {
        return ctx.setSort("cost");
      })("keydown.space", function RecipeBookListComponent_Template_div_keydown_space_34_listener($event) {
        $event.preventDefault();
        return ctx.setSort("cost");
      });
      \u0275\u0275text(35);
      \u0275\u0275pipe(36, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(37, "div", 19);
      \u0275\u0275text(38);
      \u0275\u0275pipe(39, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(40, "div", 20)(41, "app-list-row-checkbox", 21);
      \u0275\u0275listener("toggle", function RecipeBookListComponent_Template_app_list_row_checkbox_toggle_41_listener() {
        return ctx.selection.toggleSelectAll(ctx.filteredRecipeIds_());
      });
      \u0275\u0275elementEnd()();
      \u0275\u0275elementContainerEnd();
      \u0275\u0275elementContainerStart(42, 22);
      \u0275\u0275template(43, RecipeBookListComponent_Conditional_43_Template, 3, 1, "div", 23);
      \u0275\u0275repeaterCreate(44, RecipeBookListComponent_For_45_Template, 28, 32, "div", 24, _forTrack0);
      \u0275\u0275elementContainerEnd();
      \u0275\u0275elementContainerStart(46, 25);
      \u0275\u0275elementStart(47, "div", 26)(48, "div", 27)(49, "div", 28);
      \u0275\u0275element(50, "lucide-icon", 5);
      \u0275\u0275elementStart(51, "input", 29);
      \u0275\u0275pipe(52, "translatePipe");
      \u0275\u0275listener("ngModelChange", function RecipeBookListComponent_Template_input_ngModelChange_51_listener($event) {
        return ctx.ingredientSearchQuery_.set($event);
      });
      \u0275\u0275elementEnd()();
      \u0275\u0275template(53, RecipeBookListComponent_Conditional_53_Template, 5, 2, "app-scrollable-dropdown", 30);
      \u0275\u0275elementStart(54, "div", 31);
      \u0275\u0275repeaterCreate(55, RecipeBookListComponent_For_56_Template, 2, 1, "button", 32, _forTrack0);
      \u0275\u0275template(57, RecipeBookListComponent_Conditional_57_Template, 3, 3, "button", 33);
      \u0275\u0275elementEnd()()();
      \u0275\u0275elementStart(58, "div", 34)(59, "div", 35);
      \u0275\u0275template(60, RecipeBookListComponent_Conditional_60_Template, 3, 3, "button", 36);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(61, "div", 37)(62, "button", 38);
      \u0275\u0275listener("click", function RecipeBookListComponent_Template_button_click_62_listener() {
        return ctx.toggleFilterCategory("Date");
      });
      \u0275\u0275elementStart(63, "span");
      \u0275\u0275text(64);
      \u0275\u0275pipe(65, "translatePipe");
      \u0275\u0275elementEnd();
      \u0275\u0275template(66, RecipeBookListComponent_Conditional_66_Template, 2, 0, "span", 39);
      \u0275\u0275element(67, "lucide-icon", 40);
      \u0275\u0275elementEnd();
      \u0275\u0275template(68, RecipeBookListComponent_Conditional_68_Template, 24, 18, "div", 41);
      \u0275\u0275elementEnd();
      \u0275\u0275repeaterCreate(69, RecipeBookListComponent_For_70_Template, 8, 9, "div", 42, _forTrack1);
      \u0275\u0275elementEnd();
      \u0275\u0275elementContainerEnd();
      \u0275\u0275elementEnd();
      \u0275\u0275template(71, RecipeBookListComponent_Conditional_71_Template, 1, 1)(72, RecipeBookListComponent_Conditional_72_Template, 1, 1)(73, RecipeBookListComponent_Conditional_73_Template, 3, 3, "div", 43);
    }
    if (rf & 2) {
      let tmp_39_0;
      let tmp_40_0;
      let tmp_41_0;
      \u0275\u0275property("isPanelOpen", ctx.isPanelOpen_())("gridTemplate", ctx.hideDateColumn_() ? "2fr 1fr 1fr minmax(48px, 0.8fr) minmax(72px, 0.85fr) 80px minmax(44px, auto)" : "2fr 1fr 1fr minmax(48px, 0.8fr) minmax(72px, 0.85fr) 0.8fr 80px minmax(44px, auto)")("mobileGridTemplate", "2fr 1fr 0.8fr 80px minmax(44px, auto)");
      \u0275\u0275advance(2);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(3, 40, "recipe_book"));
      \u0275\u0275advance(4);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(7, 42, "search"));
      \u0275\u0275advance(3);
      \u0275\u0275property("size", 18);
      \u0275\u0275advance();
      \u0275\u0275property("ngModel", ctx.searchQuery_())("placeholder", \u0275\u0275pipeBind1(11, 44, "search"));
      \u0275\u0275advance(3);
      \u0275\u0275property("selectionState", ctx.selection)("editableFields", ctx.editableFields_());
      \u0275\u0275advance();
      \u0275\u0275property("disabled", !ctx.isLoggedIn());
      \u0275\u0275attribute("title", !ctx.isLoggedIn() ? \u0275\u0275pipeBind1(15, 46, "sign_in_to_use") : null);
      \u0275\u0275advance(2);
      \u0275\u0275property("size", 18);
      \u0275\u0275advance();
      \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(18, 48, "add_recipe_dish"), " ");
      \u0275\u0275advance(4);
      \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(22, 50, "name"), " ");
      \u0275\u0275advance(2);
      \u0275\u0275property("activeIndex", ctx.carouselHeaderIndex_());
      \u0275\u0275advance(2);
      \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(26, 52, "type"), " ");
      \u0275\u0275advance(3);
      \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(29, 54, "labels"), " ");
      \u0275\u0275advance(3);
      \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(32, 56, "allergens"), " ");
      \u0275\u0275advance(2);
      \u0275\u0275conditional(!ctx.hideDateColumn_() ? 33 : -1);
      \u0275\u0275advance(2);
      \u0275\u0275textInterpolate1(" ", \u0275\u0275pipeBind1(36, 58, "cost"), " ");
      \u0275\u0275advance(3);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(39, 60, "actions"));
      \u0275\u0275advance(3);
      \u0275\u0275property("checked", ctx.filteredRecipeIds_().length > 0 && ctx.selection.allSelected(ctx.filteredRecipeIds_()));
      \u0275\u0275advance(2);
      \u0275\u0275conditional(ctx.filteredRecipes_().length === 0 ? 43 : -1);
      \u0275\u0275advance();
      \u0275\u0275repeater(ctx.filteredRecipes_());
      \u0275\u0275advance(6);
      \u0275\u0275property("size", 18);
      \u0275\u0275advance();
      \u0275\u0275property("ngModel", ctx.ingredientSearchQuery_())("placeholder", \u0275\u0275pipeBind1(52, 62, "search_by_ingredients"));
      \u0275\u0275advance(2);
      \u0275\u0275conditional(ctx.ingredientSearchQuery_().trim() ? 53 : -1);
      \u0275\u0275advance(2);
      \u0275\u0275repeater(ctx.getSelectedProducts());
      \u0275\u0275advance(2);
      \u0275\u0275conditional(ctx.getSelectedProducts().length ? 57 : -1);
      \u0275\u0275advance(3);
      \u0275\u0275conditional(ctx.hasActiveFilters_() ? 60 : -1);
      \u0275\u0275advance(2);
      \u0275\u0275classProp("expanded", ctx.isCategoryExpanded("Date"));
      \u0275\u0275advance(2);
      \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(65, 64, "date_filter"));
      \u0275\u0275advance(2);
      \u0275\u0275conditional(ctx.dateFrom_() != null || ctx.dateTo_() != null ? 66 : -1);
      \u0275\u0275advance();
      \u0275\u0275property("name", ctx.isCategoryExpanded("Date") ? "chevron-down" : "chevron-left")("size", 16);
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.isCategoryExpanded("Date") ? 68 : -1);
      \u0275\u0275advance();
      \u0275\u0275repeater(ctx.filterCategories_());
      \u0275\u0275advance(2);
      \u0275\u0275conditional((tmp_39_0 = ctx.activeCostTooltipRecipe_()) ? 71 : -1, tmp_39_0);
      \u0275\u0275advance();
      \u0275\u0275conditional((tmp_40_0 = ctx.activeDateTooltipRecipe_()) ? 72 : -1, tmp_40_0);
      \u0275\u0275advance();
      \u0275\u0275conditional((tmp_41_0 = ctx.historyFor_()) ? 73 : -1, tmp_41_0);
    }
  }, dependencies: [CommonModule, DecimalPipe, FormsModule, DefaultValueAccessor, NgControlStatus, NgModel, LucideAngularModule, LucideAngularComponent, TranslatePipe, ClickOutSideDirective, VersionHistoryPanelComponent, LoaderComponent, ScrollableDropdownComponent, CellCarouselComponent, CellCarouselSlideDirective, ListShellComponent, CarouselHeaderComponent, CarouselHeaderColumnDirective, ListRowCheckboxComponent, SelectionBarComponent, EmptyStateComponent], styles: ["\n\n@layer components.recipe-book-list {\n  [_nghost-%COMP%] {\n    display: block;\n  }\n  .page-title[_ngcontent-%COMP%] {\n    flex-shrink: 0;\n    margin: 0;\n    font-size: 1.25rem;\n    font-weight: 700;\n    color: var(--color-text-main);\n    letter-spacing: 0.02em;\n  }\n  @container (max-width: 360px) {\n    [_nghost-%COMP%]     .header-actions .c-btn-primary {\n      width: 100%;\n      justify-content: center;\n    }\n  }\n  .recipe-grid-row[_ngcontent-%COMP%] {\n    display: contents;\n  }\n  .recipe-grid-row[_ngcontent-%COMP%]   .col-labels.c-list-body-cell[_ngcontent-%COMP%], \n   .recipe-grid-row[_ngcontent-%COMP%]   .col-allergens.c-list-body-cell[_ngcontent-%COMP%] {\n    align-items: flex-start;\n  }\n  .recipe-grid-row[_ngcontent-%COMP%]:hover   .c-icon-btn[_ngcontent-%COMP%] {\n    opacity: 1;\n  }\n  .no-results[_ngcontent-%COMP%] {\n    grid-column: 1/-1;\n    padding: 2rem 1rem;\n    text-align: center;\n    color: var(--color-text-muted);\n    font-size: 0.875rem;\n    border-block-end: 1px solid var(--border-default);\n    background: var(--bg-glass-strong);\n  }\n  .no-results.empty-state[_ngcontent-%COMP%] {\n    display: flex;\n    flex-direction: column;\n    align-items: center;\n    gap: 1rem;\n    padding-block: 3rem;\n  }\n  .no-results.empty-state[_ngcontent-%COMP%]   .empty-state-icon[_ngcontent-%COMP%] {\n    color: var(--color-text-muted-light);\n  }\n  .no-results.empty-state[_ngcontent-%COMP%]   .empty-state-msg[_ngcontent-%COMP%] {\n    margin: 0;\n    font-size: 1rem;\n    color: var(--color-text-secondary);\n  }\n  .c-dense-chip-grid[_ngcontent-%COMP%] {\n    display: flex;\n    flex-wrap: wrap;\n    align-content: center;\n    align-items: center;\n    justify-content: center;\n    gap: 0.25rem;\n    width: 100%;\n  }\n  .c-dense-chip-col.col-labels[_ngcontent-%COMP%], \n   .c-dense-chip-col.col-allergens[_ngcontent-%COMP%], \n   .col-labels[_ngcontent-%COMP%], \n   .col-allergens[_ngcontent-%COMP%] {\n    position: relative;\n    display: flex;\n    align-items: center;\n    justify-content: center;\n    min-width: 3rem;\n  }\n  .labels-btn-wrapper[_ngcontent-%COMP%] {\n    position: relative;\n    display: flex;\n    flex-direction: column;\n    align-items: center;\n    gap: 0.25rem;\n    width: 100%;\n    cursor: pointer;\n  }\n  .labels-btn-wrapper.labels-expanded-open[_ngcontent-%COMP%]   .labels-btn[_ngcontent-%COMP%] {\n    position: absolute;\n    left: -9999px;\n    width: 1px;\n    height: 1px;\n    overflow: hidden;\n    opacity: 0;\n    pointer-events: none;\n  }\n  .labels-btn[_ngcontent-%COMP%] {\n    display: inline-flex;\n    align-items: center;\n    gap: 0.375rem;\n    padding: 0.25rem 0.625rem;\n    background: var(--bg-glass);\n    color: var(--color-text-muted);\n    font-size: 0.8125rem;\n    font-weight: 500;\n    border: 1px solid var(--border-default);\n    border-radius: var(--radius-sm);\n    cursor: pointer;\n    transition:\n      background 0.2s ease,\n      color 0.2s ease,\n      transform 0.15s ease;\n  }\n  .labels-btn[_ngcontent-%COMP%]:hover {\n    background: var(--bg-glass-hover);\n    color: var(--color-text-main);\n    transform: scale(1.02);\n  }\n  .allergen-btn-wrapper[_ngcontent-%COMP%] {\n    position: relative;\n    display: flex;\n    flex-direction: column;\n    align-items: center;\n    gap: 0.25rem;\n    width: 100%;\n  }\n  .allergen-btn-wrapper.allergen-expanded-open[_ngcontent-%COMP%]   .allergen-btn[_ngcontent-%COMP%] {\n    position: absolute;\n    left: -9999px;\n    width: 1px;\n    height: 1px;\n    overflow: hidden;\n    opacity: 0;\n    pointer-events: none;\n  }\n  .allergen-btn[_ngcontent-%COMP%] {\n    display: inline-flex;\n    align-items: center;\n    gap: 0.375rem;\n    padding: 0.25rem 0.625rem;\n    background: var(--bg-warning);\n    color: var(--text-warning);\n    font-size: 0.8125rem;\n    font-weight: 500;\n    border: 1px solid var(--border-warning);\n    border-radius: var(--radius-sm);\n    cursor: pointer;\n    transition: background 0.2s ease, transform 0.15s ease;\n  }\n  .allergen-btn[_ngcontent-%COMP%]:hover {\n    background: rgba(254, 243, 199, 0.9);\n    transform: scale(1.02);\n  }\n  .allergen-pill[_ngcontent-%COMP%] {\n    display: inline-flex;\n    align-items: center;\n    justify-content: center;\n    padding: 0.25rem 0.625rem;\n    font-size: 0.75rem;\n    font-weight: 500;\n    background: rgba(254, 243, 199, 0.5);\n    color: var(--text-warning);\n    border-radius: var(--radius-xs);\n    backdrop-filter: var(--blur-glass);\n  }\n  .label-chip[_ngcontent-%COMP%] {\n    display: inline-flex;\n    align-items: center;\n    justify-content: center;\n    padding: 0.25rem 0.625rem;\n    font-size: 0.75rem;\n    font-weight: 500;\n    color: #fff;\n    line-height: 1.2;\n    border-radius: var(--radius-xs);\n  }\n  .search-section[_ngcontent-%COMP%] {\n    margin-block-end: 1.25rem;\n  }\n  .no-dropdown-results[_ngcontent-%COMP%] {\n    padding: 0.75rem;\n    text-align: center;\n    font-size: 0.8125rem;\n    color: var(--color-text-muted-light);\n  }\n  .ingredient-search-block[_ngcontent-%COMP%] {\n    position: relative;\n    display: flex;\n    flex-direction: column;\n    gap: 0.5rem;\n  }\n  .ingredient-search-input-wrap[_ngcontent-%COMP%] {\n    display: flex;\n    align-items: center;\n    gap: 0.5rem;\n    padding-inline: 0.75rem;\n    padding-block: 0.5rem;\n    background: var(--bg-glass);\n    border: 1px solid var(--border-default);\n    border-radius: var(--radius-md);\n    transition: border-color 0.2s ease, box-shadow 0.2s ease;\n  }\n  .ingredient-search-input-wrap[_ngcontent-%COMP%]:focus-within {\n    border-color: var(--border-focus);\n    box-shadow: var(--shadow-focus);\n  }\n  .ingredient-search-input-wrap[_ngcontent-%COMP%]   lucide-icon[_ngcontent-%COMP%] {\n    flex-shrink: 0;\n    color: var(--color-text-muted);\n  }\n  .ingredient-search-input-wrap[_ngcontent-%COMP%]   input[_ngcontent-%COMP%] {\n    flex: 1;\n    min-width: 0;\n    padding: 0;\n    background: transparent;\n    color: var(--color-text-main);\n    font-size: 0.875rem;\n    border: none;\n    outline: none;\n  }\n  .ingredient-search-input-wrap[_ngcontent-%COMP%]   input[_ngcontent-%COMP%]::placeholder {\n    color: var(--color-text-muted-light);\n  }\n  [_nghost-%COMP%]     app-scrollable-dropdown .ingredient-dropdown-list {\n    list-style: none;\n    margin: 0;\n    padding: 0;\n  }\n  [_nghost-%COMP%]     app-scrollable-dropdown .ingredient-dropdown-list li {\n    padding: 0.5rem 0.75rem;\n    font-size: 0.875rem;\n    color: var(--color-text-main);\n    cursor: pointer;\n    transition: background 0.15s ease;\n  }\n  [_nghost-%COMP%]     app-scrollable-dropdown .ingredient-dropdown-list li:hover {\n    background: var(--bg-glass);\n  }\n  .ingredient-chips-wrap[_ngcontent-%COMP%] {\n    display: flex;\n    flex-wrap: wrap;\n    align-items: center;\n    gap: 0.375rem;\n  }\n  .ingredient-clear-btn[_ngcontent-%COMP%] {\n    padding: 0.25rem 0.625rem;\n    font-size: 0.8rem;\n    color: var(--color-text-muted);\n    background: var(--bg-glass);\n    border: 1px solid var(--border-default);\n    border-radius: var(--radius-sm);\n    cursor: pointer;\n    transition: background 0.2s ease, color 0.2s ease;\n  }\n  .ingredient-clear-btn[_ngcontent-%COMP%]:hover {\n    background: var(--bg-glass-hover);\n    color: var(--color-text-secondary);\n  }\n  .cost-cell-wrap[_ngcontent-%COMP%] {\n    position: relative;\n  }\n  .cost-tooltip[_ngcontent-%COMP%] {\n    position: absolute;\n    top: 100%;\n    left: 50%;\n    z-index: 50;\n    margin-block-start: 0.25rem;\n    padding: 0.375rem 0.625rem;\n    background: var(--bg-success);\n    color: var(--text-success);\n    font-size: 0.8rem;\n    border-radius: var(--radius-sm);\n    box-shadow: var(--shadow-glass);\n    white-space: nowrap;\n    transform: translateX(-50%);\n    pointer-events: none;\n  }\n  .cost-tooltip-fixed[_ngcontent-%COMP%] {\n    position: fixed;\n    transform: translateX(-50%);\n    pointer-events: auto;\n  }\n  .date-cell-wrap[_ngcontent-%COMP%] {\n    position: relative;\n  }\n  .date-tooltip[_ngcontent-%COMP%] {\n    position: absolute;\n    top: 100%;\n    left: 50%;\n    z-index: 50;\n    margin-block-start: 0.25rem;\n    padding: 0.375rem 0.625rem;\n    background: var(--bg-success);\n    color: var(--text-success);\n    font-size: 0.8rem;\n    border-radius: var(--radius-sm);\n    box-shadow: var(--shadow-glass);\n    white-space: nowrap;\n    transform: translateX(-50%);\n    pointer-events: none;\n  }\n  .date-tooltip-fixed[_ngcontent-%COMP%] {\n    position: fixed;\n    transform: translateX(-50%);\n    pointer-events: auto;\n  }\n  .history-overlay[_ngcontent-%COMP%] {\n    position: fixed;\n    inset: 0;\n    display: flex;\n    align-items: center;\n    justify-content: center;\n    z-index: 1000;\n    background: var(--overlay-backdrop);\n    backdrop-filter: blur(0.375rem);\n  }\n  .history-overlay-panel[_ngcontent-%COMP%] {\n    max-height: 90vh;\n    overflow: auto;\n  }\n  .date-filter-options[_ngcontent-%COMP%] {\n    display: flex;\n    flex-direction: column;\n    place-items: flex-start;\n    gap: 0.75rem;\n  }\n  .date-sort-buttons[_ngcontent-%COMP%] {\n    display: flex;\n    flex-wrap: wrap;\n    gap: 0.5rem;\n  }\n  .date-range-inputs[_ngcontent-%COMP%] {\n    display: flex;\n    flex-direction: column;\n    width: min-content;\n    gap: 0.5rem;\n  }\n  .date-range-label[_ngcontent-%COMP%] {\n    display: flex;\n    flex-direction: column;\n    gap: 0.25rem;\n    font-size: 0.8125rem;\n    color: var(--color-text-muted);\n  }\n  .date-range-label[_ngcontent-%COMP%]   input[type=date][_ngcontent-%COMP%] {\n    min-height: 2.25rem;\n    padding-inline: 0.75rem;\n    padding-block: 0.375rem;\n    background: var(--bg-glass);\n    font-size: 0.875rem;\n    color: var(--color-text-main);\n    border: 1px solid var(--border-default);\n    border-radius: var(--radius-sm);\n    outline: none;\n    transition: border-color 0.2s ease, box-shadow 0.2s ease;\n  }\n  .date-range-label[_ngcontent-%COMP%]   input[type=date][_ngcontent-%COMP%]:focus {\n    border-color: var(--border-focus);\n    box-shadow: var(--shadow-focus);\n  }\n  @media (max-width: 768px) {\n    .recipe-grid-row[_ngcontent-%COMP%]   app-cell-carousel[_ngcontent-%COMP%] {\n      background: var(--bg-glass);\n      border-block-end: 1px solid var(--border-row);\n      transition: background 0.15s ease;\n    }\n    .recipe-grid-row[_ngcontent-%COMP%]:hover   app-cell-carousel[_ngcontent-%COMP%] {\n      background: var(--bg-glass-hover);\n    }\n  }\n}\n/*# sourceMappingURL=recipe-book-list.component.css.map */"], changeDetection: 0 });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(RecipeBookListComponent, [{
    type: Component,
    args: [{ selector: "recipe-book-list", standalone: true, imports: [CommonModule, FormsModule, LucideAngularModule, TranslatePipe, ClickOutSideDirective, VersionHistoryPanelComponent, LoaderComponent, ScrollableDropdownComponent, CellCarouselComponent, CellCarouselSlideDirective, ListShellComponent, CarouselHeaderComponent, CarouselHeaderColumnDirective, ListRowCheckboxComponent, SelectionBarComponent, EmptyStateComponent], changeDetection: ChangeDetectionStrategy.OnPush, template: `<app-list-shell
  [isPanelOpen]="isPanelOpen_()"
  (panelToggle)="togglePanel()"
  [gridTemplate]="hideDateColumn_() ? '2fr 1fr 1fr minmax(48px, 0.8fr) minmax(72px, 0.85fr) 80px minmax(44px, auto)' : '2fr 1fr 1fr minmax(48px, 0.8fr) minmax(72px, 0.85fr) 0.8fr 80px minmax(44px, auto)'"
  [mobileGridTemplate]="'2fr 1fr 0.8fr 80px minmax(44px, auto)'">

  <h2 shell-title class="page-title">{{ 'recipe_book' | translatePipe }}</h2>

  <ng-container shell-search>
    <label class="visually-hidden" for="recipe-search">{{ 'search' | translatePipe }}</label>
    <div class="c-input-wrapper">
      <lucide-icon name="search" [size]="18"></lucide-icon>
      <input id="recipe-search" type="text" [ngModel]="searchQuery_()" (ngModelChange)="searchQuery_.set($event)"
        [placeholder]="'search' | translatePipe" />
    </div>
  </ng-container>

  <ng-container shell-actions>
    <app-selection-bar
      [selectionState]="selection"
      [editableFields]="editableFields_()"
      (bulkDelete)="onBulkDeleteSelected($event)"
      (bulkEdit)="onBulkEdit($event)" />
    <button type="button" class="c-btn-primary" (click)="onAddRecipe()"
      [disabled]="!isLoggedIn()"
      [attr.title]="!isLoggedIn() ? ('sign_in_to_use' | translatePipe) : null">
      <lucide-icon name="plus" [size]="18"></lucide-icon>
      {{ 'add_recipe_dish' | translatePipe }}
    </button>
  </ng-container>

  <ng-container shell-table-header>
    <div class="col-name c-grid-header-cell c-sortable-header" (click)="setSort('name')" (keydown.enter)="setSort('name')" (keydown.space)="$event.preventDefault(); setSort('name')" role="button" tabindex="0">
      {{ 'name' | translatePipe }}
    </div>
    <app-carousel-header [activeIndex]="carouselHeaderIndex_()" (activeIndexChange)="onCarouselHeaderChange($event)">
      <div class="col-type c-grid-header-cell c-sortable-header" carouselHeaderColumn label="type" (click)="setSort('type')" (keydown.enter)="setSort('type')" (keydown.space)="$event.preventDefault(); setSort('type')" role="button" tabindex="0">
        {{ 'type' | translatePipe }}
      </div>
      <div class="col-labels c-grid-header-cell c-sortable-header c-dense-chip-col" carouselHeaderColumn label="labels" (click)="labelsExpand.toggleAll()" (keydown.enter)="labelsExpand.toggleAll()" (keydown.space)="$event.preventDefault(); labelsExpand.toggleAll()" role="button" tabindex="0">
        {{ 'labels' | translatePipe }}
      </div>
      <div class="col-allergens c-grid-header-cell c-sortable-header c-dense-chip-col" carouselHeaderColumn label="allergens" (click)="allergenExpand.toggleAll()" (keydown.enter)="allergenExpand.toggleAll()" (keydown.space)="$event.preventDefault(); allergenExpand.toggleAll()" role="button" tabindex="0">
        {{ 'allergens' | translatePipe }}
      </div>
      @if (!hideDateColumn_()) {
        <div class="col-date c-grid-header-cell c-sortable-header" carouselHeaderColumn label="date_added" (click)="setSort('dateAdded')" (keydown.enter)="setSort('dateAdded')" (keydown.space)="$event.preventDefault(); setSort('dateAdded')" role="button" tabindex="0">
          {{ 'date_added' | translatePipe }}
        </div>
      }
    </app-carousel-header>
    <div class="col-cost c-grid-header-cell c-sortable-header" (click)="setSort('cost')" (keydown.enter)="setSort('cost')" (keydown.space)="$event.preventDefault(); setSort('cost')" role="button" tabindex="0">
      {{ 'cost' | translatePipe }}
    </div>
    <div class="c-col-actions c-grid-header-cell">{{ 'actions' | translatePipe }}</div>
    <div class="col-select c-grid-header-cell" role="columnheader">
      <app-list-row-checkbox [checked]="filteredRecipeIds_().length > 0 && selection.allSelected(filteredRecipeIds_())" (toggle)="selection.toggleSelectAll(filteredRecipeIds_())" />
    </div>
  </ng-container>

  <ng-container shell-table-body>
    @if (filteredRecipes_().length === 0) {
      <div class="no-results">
        @if (isEmptyList_()) {
          <app-empty-state messageKey="empty_recipe_book" icon="book-open"
            ctaLabelKey="add_first_recipe" [ctaDisabled]="!isLoggedIn()"
            (ctaClick)="onAddRecipe()" />
        } @else {
          {{ 'no_recipes_match' | translatePipe }}
        }
      </div>
    }
    @for (recipe of filteredRecipes_(); track recipe._id) {
      <div class="recipe-grid-row c-list-row" (click)="onRowClick(recipe, $event)" role="button" tabindex="0" (keydown.enter)="onEditRecipe(recipe)" (keydown.space)="$event.preventDefault(); onEditRecipe(recipe)">
        <div class="col-name c-list-body-cell">{{ recipe.name_hebrew }}</div>
        <app-cell-carousel [activeIndex]="carouselHeaderIndex_()">
          <div class="col-type c-list-body-cell" cellCarouselSlide [label]="'type' | translatePipe">{{ (isRecipeDish(recipe) ? 'dish' : 'preparation') | translatePipe }}</div>
          <div class="col-labels c-list-body-cell c-dense-chip-col" cellCarouselSlide [label]="'labels' | translatePipe">
            @if (getAllRecipeLabels(recipe).length) {
              <div class="labels-btn-wrapper" [class.labels-expanded-open]="labelsExpand.isExpanded(recipe._id)" (click)="labelsExpand.toggleOne(recipe._id); $event.stopPropagation()" (clickOutside)="closeLabelsView($event)" role="button" tabindex="0" (keydown.enter)="labelsExpand.toggleOne(recipe._id)" (keydown.space)="$event.preventDefault(); labelsExpand.toggleOne(recipe._id)">
                <button type="button" class="labels-btn">
                  <lucide-icon name="tag" [size]="16"></lucide-icon>
                  {{ getAllRecipeLabels(recipe).length }}
                </button>
                @if (labelsExpand.isExpanded(recipe._id)) {
                  <div class="c-dense-chip-grid">
                    @for (label of getAllRecipeLabels(recipe); track label) {
                      <span class="label-chip" [style.background-color]="getLabelColor(label)">{{ label | translatePipe }}</span>
                    }
                  </div>
                }
              </div>
            } @else {
              <span class="placeholder-dash">\u2014</span>
            }
          </div>
          <div class="col-allergens c-list-body-cell c-dense-chip-col" cellCarouselSlide [label]="'allergens' | translatePipe">
            @if (getRecipeAllergens(recipe).length) {
              <div class="allergen-btn-wrapper" [class.allergen-expanded-open]="allergenExpand.isExpanded(recipe._id)" (clickOutside)="closeAllergenView($event)">
                <button type="button" class="allergen-btn" (click)="allergenExpand.toggleOne(recipe._id)">
                  <lucide-icon name="shield-alert" [size]="16"></lucide-icon>
                  {{ getRecipeAllergens(recipe).length }}
                </button>
                @if (allergenExpand.isExpanded(recipe._id)) {
                  <div class="c-dense-chip-grid">
                    @for (a of getRecipeAllergens(recipe); track a) {
                      <span class="allergen-pill">{{ a | translatePipe }}</span>
                    }
                  </div>
                }
              </div>
            } @else {
              <span class="placeholder-dash">\u2014</span>
            }
          </div>
          @if (!hideDateColumn_()) {
            <div class="col-date c-list-body-cell date-cell-wrap" cellCarouselSlide [label]="'date_added' | translatePipe" (mouseenter)="showDateTooltip(recipe._id, $event)" (mouseleave)="hideDateTooltip()" [attr.aria-describedby]="hoveredDateRecipeId_() === recipe._id ? 'date-tooltip-' + recipe._id : null">
              {{ formatAddedAt(recipe.addedAt_) }}
            </div>
          }
        </app-cell-carousel>
        <div class="col-cost c-list-body-cell cost-cell-wrap" (mouseenter)="showCostTooltip(recipe._id, $event)" (mouseleave)="hideCostTooltip()" (click)="toggleCostTooltipTap(recipe._id, $event)" [attr.aria-describedby]="(hoveredCostRecipeId_() === recipe._id || tappedCostRecipeId_() === recipe._id) ? 'cost-tooltip-' + recipe._id : null">
          \u20AA{{ getRecipeCost(recipe) | number:'1.2-2' }}
        </div>
        <div class="c-col-actions c-list-body-cell">
          <button type="button" class="c-icon-btn" (click)="onCookRecipe(recipe); $event.stopPropagation()"
            [attr.aria-label]="'cook' | translatePipe"
            [disabled]="!isLoggedIn()"
            [attr.title]="!isLoggedIn() ? ('sign_in_to_use' | translatePipe) : null">
            <lucide-icon name="cooking-pot" [size]="18"></lucide-icon>
          </button>
          @if (isLoggedIn()) {
            @if (removingId_() === recipe._id) {
              <app-loader size="small" [inline]="true" />
            } @else {
              <button type="button" class="c-icon-btn danger" (click)="onRemoveRecipe(recipe); $event.stopPropagation()"
                [attr.aria-label]="'delete' | translatePipe">
                <lucide-icon name="trash-2" [size]="18"></lucide-icon>
              </button>
            }
          }
        </div>
        <div class="col-select c-list-body-cell" role="cell">
          <app-list-row-checkbox [checked]="selection.isSelected(recipe._id)" (toggle)="selection.toggle(recipe._id)" />
        </div>
      </div>
    }
  </ng-container>

  <ng-container shell-filters>
    <div class="search-section">
      <div class="ingredient-search-block">
        <div class="ingredient-search-input-wrap">
          <lucide-icon name="search" [size]="18"></lucide-icon>
          <input type="text" [ngModel]="ingredientSearchQuery_()" (ngModelChange)="ingredientSearchQuery_.set($event)"
            [placeholder]="'search_by_ingredients' | translatePipe" />
        </div>
        @if (ingredientSearchQuery_().trim()) {
          <app-scrollable-dropdown [maxHeight]="200">
            <ul class="ingredient-dropdown-list" role="listbox">
              @if (filteredProductsForIngredientSearch_().length === 0) {
                <li class="no-dropdown-results">{{ 'no_ingredients_found' | translatePipe }}</li>
              }
              @for (p of filteredProductsForIngredientSearch_(); track p._id) {
                <li role="option" (click)="addIngredientProduct(p)">{{ p.name_hebrew }}</li>
              }
            </ul>
          </app-scrollable-dropdown>
        }
        <div class="ingredient-chips-wrap">
          @for (p of getSelectedProducts(); track p._id) {
            <button type="button" class="c-filter-chip" (click)="removeIngredientProduct(p._id)">{{ p.name_hebrew }}</button>
          }
          @if (getSelectedProducts().length) {
            <button type="button" class="ingredient-clear-btn" (click)="clearIngredientProducts()">{{ 'clear' | translatePipe }}</button>
          }
        </div>
      </div>
    </div>
    <div class="c-filter-section">
      <div class="c-filter-section-header">
        @if (hasActiveFilters_()) {
          <button type="button" class="c-btn-ghost--sm" (click)="clearAllFilters()">{{ 'clear_filters' | translatePipe }}</button>
        }
      </div>
      <div class="c-filter-category date-filter-category">
        <button type="button" class="c-filter-category-header" [class.expanded]="isCategoryExpanded('Date')" (click)="toggleFilterCategory('Date')">
          <span>{{ 'date_filter' | translatePipe }}</span>
          @if (dateFrom_() != null || dateTo_() != null) {
            <span class="c-filter-category-count" aria-hidden="true">1</span>
          }
          <lucide-icon [name]="isCategoryExpanded('Date') ? 'chevron-down' : 'chevron-left'" [size]="16"></lucide-icon>
        </button>
        @if (isCategoryExpanded('Date')) {
          <div class="c-filter-options date-filter-options">
            <div class="date-sort-buttons">
              <button type="button" class="c-btn-ghost--sm" (click)="setSortDateNewestFirst()">{{ 'sort_newest_first' | translatePipe }}</button>
              <button type="button" class="c-btn-ghost--sm" (click)="setSortDateOldestFirst()">{{ 'sort_oldest_first' | translatePipe }}</button>
            </div>
            <div class="date-range-inputs">
              <label class="date-range-label">
                <span>{{ 'date_from' | translatePipe }}</span>
                <input type="date" [ngModel]="dateFrom_()" (ngModelChange)="dateFrom_.set($event)" />
              </label>
              <label class="date-range-label">
                <span>{{ 'date_to' | translatePipe }}</span>
                <input type="date" [ngModel]="dateTo_()" (ngModelChange)="dateTo_.set($event)" />
              </label>
            </div>
            <label class="c-filter-option">
              <input type="checkbox" [checked]="dateIncludeByUpdated_()" (change)="dateIncludeByUpdated_.set(!dateIncludeByUpdated_())" />
              <span>{{ 'date_filter_by_updated' | translatePipe }}</span>
            </label>
          </div>
        }
      </div>
      @for (category of filterCategories_(); track category.name) {
        <div class="c-filter-category">
          <button type="button" class="c-filter-category-header" [class.expanded]="isCategoryExpanded(category.name)" (click)="toggleFilterCategory(category.name)">
            <span>{{ (category.name === 'Allergens' ? 'do_not_include_allergens' : category.displayKey) | translatePipe }}</span>
            @if (selectedCountInCategory(category) > 0) {
              <span class="c-filter-category-count" aria-hidden="true">{{ selectedCountInCategory(category) }}</span>
            }
            <lucide-icon [name]="isCategoryExpanded(category.name) ? 'chevron-down' : 'chevron-left'" [size]="16"></lucide-icon>
          </button>
          @if (isCategoryExpanded(category.name)) {
            <div class="c-filter-options">
              @for (option of category.options; track option.value) {
                <label class="c-filter-option">
                  <input type="checkbox" [checked]="option.checked_" (change)="toggleFilter(category.name, option.value)" />
                  <span>{{ option.label | translatePipe }}</span>
                </label>
              }
            </div>
          }
        </div>
      }
    </div>
  </ng-container>

</app-list-shell>

@if (activeCostTooltipRecipe_(); as recipe) {
  @if (costTooltipAnchor_(); as anchor) {
    <div class="cost-tooltip cost-tooltip-fixed" [id]="'cost-tooltip-' + recipe._id" (clickOutside)="closeCostTooltipTap()"
      [style.top.px]="anchor.bottom + 4" [style.left.px]="anchor.left + anchor.width / 2">
      {{ 'price_for' | translatePipe }}{{ getRecipeYieldDescription(recipe) }}
    </div>
  }
}

@if (activeDateTooltipRecipe_(); as recipe) {
  @if (dateTooltipAnchor_(); as anchor) {
    <div class="date-tooltip date-tooltip-fixed" [id]="'date-tooltip-' + recipe._id"
      [style.top.px]="anchor.bottom + 4" [style.left.px]="anchor.left + anchor.width / 2">
      {{ 'date_updated' | translatePipe }}: {{ formatUpdatedAtWithTime(recipe.updatedAt_) }}
    </div>
  }
}

@if (historyFor_(); as h) {
  <div class="history-overlay" (click)="closeHistory()">
    <div class="history-overlay-panel" (click)="$event.stopPropagation()">
      <app-version-history-panel
        [entityType]="h.entityType"
        [entityId]="h.entityId"
        [entityName]="h.entityName"
        (closed)="closeHistory()"
        (restored)="closeHistory()"
      />
    </div>
  </div>
}
`, styles: ["/* src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.scss */\n@layer components.recipe-book-list {\n  :host {\n    display: block;\n  }\n  .page-title {\n    flex-shrink: 0;\n    margin: 0;\n    font-size: 1.25rem;\n    font-weight: 700;\n    color: var(--color-text-main);\n    letter-spacing: 0.02em;\n  }\n  @container (max-width: 360px) {\n    :host ::ng-deep .header-actions .c-btn-primary {\n      width: 100%;\n      justify-content: center;\n    }\n  }\n  .recipe-grid-row {\n    display: contents;\n  }\n  .recipe-grid-row .col-labels.c-list-body-cell,\n  .recipe-grid-row .col-allergens.c-list-body-cell {\n    align-items: flex-start;\n  }\n  .recipe-grid-row:hover .c-icon-btn {\n    opacity: 1;\n  }\n  .no-results {\n    grid-column: 1/-1;\n    padding: 2rem 1rem;\n    text-align: center;\n    color: var(--color-text-muted);\n    font-size: 0.875rem;\n    border-block-end: 1px solid var(--border-default);\n    background: var(--bg-glass-strong);\n  }\n  .no-results.empty-state {\n    display: flex;\n    flex-direction: column;\n    align-items: center;\n    gap: 1rem;\n    padding-block: 3rem;\n  }\n  .no-results.empty-state .empty-state-icon {\n    color: var(--color-text-muted-light);\n  }\n  .no-results.empty-state .empty-state-msg {\n    margin: 0;\n    font-size: 1rem;\n    color: var(--color-text-secondary);\n  }\n  .c-dense-chip-grid {\n    display: flex;\n    flex-wrap: wrap;\n    align-content: center;\n    align-items: center;\n    justify-content: center;\n    gap: 0.25rem;\n    width: 100%;\n  }\n  .c-dense-chip-col.col-labels,\n  .c-dense-chip-col.col-allergens,\n  .col-labels,\n  .col-allergens {\n    position: relative;\n    display: flex;\n    align-items: center;\n    justify-content: center;\n    min-width: 3rem;\n  }\n  .labels-btn-wrapper {\n    position: relative;\n    display: flex;\n    flex-direction: column;\n    align-items: center;\n    gap: 0.25rem;\n    width: 100%;\n    cursor: pointer;\n  }\n  .labels-btn-wrapper.labels-expanded-open .labels-btn {\n    position: absolute;\n    left: -9999px;\n    width: 1px;\n    height: 1px;\n    overflow: hidden;\n    opacity: 0;\n    pointer-events: none;\n  }\n  .labels-btn {\n    display: inline-flex;\n    align-items: center;\n    gap: 0.375rem;\n    padding: 0.25rem 0.625rem;\n    background: var(--bg-glass);\n    color: var(--color-text-muted);\n    font-size: 0.8125rem;\n    font-weight: 500;\n    border: 1px solid var(--border-default);\n    border-radius: var(--radius-sm);\n    cursor: pointer;\n    transition:\n      background 0.2s ease,\n      color 0.2s ease,\n      transform 0.15s ease;\n  }\n  .labels-btn:hover {\n    background: var(--bg-glass-hover);\n    color: var(--color-text-main);\n    transform: scale(1.02);\n  }\n  .allergen-btn-wrapper {\n    position: relative;\n    display: flex;\n    flex-direction: column;\n    align-items: center;\n    gap: 0.25rem;\n    width: 100%;\n  }\n  .allergen-btn-wrapper.allergen-expanded-open .allergen-btn {\n    position: absolute;\n    left: -9999px;\n    width: 1px;\n    height: 1px;\n    overflow: hidden;\n    opacity: 0;\n    pointer-events: none;\n  }\n  .allergen-btn {\n    display: inline-flex;\n    align-items: center;\n    gap: 0.375rem;\n    padding: 0.25rem 0.625rem;\n    background: var(--bg-warning);\n    color: var(--text-warning);\n    font-size: 0.8125rem;\n    font-weight: 500;\n    border: 1px solid var(--border-warning);\n    border-radius: var(--radius-sm);\n    cursor: pointer;\n    transition: background 0.2s ease, transform 0.15s ease;\n  }\n  .allergen-btn:hover {\n    background: rgba(254, 243, 199, 0.9);\n    transform: scale(1.02);\n  }\n  .allergen-pill {\n    display: inline-flex;\n    align-items: center;\n    justify-content: center;\n    padding: 0.25rem 0.625rem;\n    font-size: 0.75rem;\n    font-weight: 500;\n    background: rgba(254, 243, 199, 0.5);\n    color: var(--text-warning);\n    border-radius: var(--radius-xs);\n    backdrop-filter: var(--blur-glass);\n  }\n  .label-chip {\n    display: inline-flex;\n    align-items: center;\n    justify-content: center;\n    padding: 0.25rem 0.625rem;\n    font-size: 0.75rem;\n    font-weight: 500;\n    color: #fff;\n    line-height: 1.2;\n    border-radius: var(--radius-xs);\n  }\n  .search-section {\n    margin-block-end: 1.25rem;\n  }\n  .no-dropdown-results {\n    padding: 0.75rem;\n    text-align: center;\n    font-size: 0.8125rem;\n    color: var(--color-text-muted-light);\n  }\n  .ingredient-search-block {\n    position: relative;\n    display: flex;\n    flex-direction: column;\n    gap: 0.5rem;\n  }\n  .ingredient-search-input-wrap {\n    display: flex;\n    align-items: center;\n    gap: 0.5rem;\n    padding-inline: 0.75rem;\n    padding-block: 0.5rem;\n    background: var(--bg-glass);\n    border: 1px solid var(--border-default);\n    border-radius: var(--radius-md);\n    transition: border-color 0.2s ease, box-shadow 0.2s ease;\n  }\n  .ingredient-search-input-wrap:focus-within {\n    border-color: var(--border-focus);\n    box-shadow: var(--shadow-focus);\n  }\n  .ingredient-search-input-wrap lucide-icon {\n    flex-shrink: 0;\n    color: var(--color-text-muted);\n  }\n  .ingredient-search-input-wrap input {\n    flex: 1;\n    min-width: 0;\n    padding: 0;\n    background: transparent;\n    color: var(--color-text-main);\n    font-size: 0.875rem;\n    border: none;\n    outline: none;\n  }\n  .ingredient-search-input-wrap input::placeholder {\n    color: var(--color-text-muted-light);\n  }\n  :host ::ng-deep app-scrollable-dropdown .ingredient-dropdown-list {\n    list-style: none;\n    margin: 0;\n    padding: 0;\n  }\n  :host ::ng-deep app-scrollable-dropdown .ingredient-dropdown-list li {\n    padding: 0.5rem 0.75rem;\n    font-size: 0.875rem;\n    color: var(--color-text-main);\n    cursor: pointer;\n    transition: background 0.15s ease;\n  }\n  :host ::ng-deep app-scrollable-dropdown .ingredient-dropdown-list li:hover {\n    background: var(--bg-glass);\n  }\n  .ingredient-chips-wrap {\n    display: flex;\n    flex-wrap: wrap;\n    align-items: center;\n    gap: 0.375rem;\n  }\n  .ingredient-clear-btn {\n    padding: 0.25rem 0.625rem;\n    font-size: 0.8rem;\n    color: var(--color-text-muted);\n    background: var(--bg-glass);\n    border: 1px solid var(--border-default);\n    border-radius: var(--radius-sm);\n    cursor: pointer;\n    transition: background 0.2s ease, color 0.2s ease;\n  }\n  .ingredient-clear-btn:hover {\n    background: var(--bg-glass-hover);\n    color: var(--color-text-secondary);\n  }\n  .cost-cell-wrap {\n    position: relative;\n  }\n  .cost-tooltip {\n    position: absolute;\n    top: 100%;\n    left: 50%;\n    z-index: 50;\n    margin-block-start: 0.25rem;\n    padding: 0.375rem 0.625rem;\n    background: var(--bg-success);\n    color: var(--text-success);\n    font-size: 0.8rem;\n    border-radius: var(--radius-sm);\n    box-shadow: var(--shadow-glass);\n    white-space: nowrap;\n    transform: translateX(-50%);\n    pointer-events: none;\n  }\n  .cost-tooltip-fixed {\n    position: fixed;\n    transform: translateX(-50%);\n    pointer-events: auto;\n  }\n  .date-cell-wrap {\n    position: relative;\n  }\n  .date-tooltip {\n    position: absolute;\n    top: 100%;\n    left: 50%;\n    z-index: 50;\n    margin-block-start: 0.25rem;\n    padding: 0.375rem 0.625rem;\n    background: var(--bg-success);\n    color: var(--text-success);\n    font-size: 0.8rem;\n    border-radius: var(--radius-sm);\n    box-shadow: var(--shadow-glass);\n    white-space: nowrap;\n    transform: translateX(-50%);\n    pointer-events: none;\n  }\n  .date-tooltip-fixed {\n    position: fixed;\n    transform: translateX(-50%);\n    pointer-events: auto;\n  }\n  .history-overlay {\n    position: fixed;\n    inset: 0;\n    display: flex;\n    align-items: center;\n    justify-content: center;\n    z-index: 1000;\n    background: var(--overlay-backdrop);\n    backdrop-filter: blur(0.375rem);\n  }\n  .history-overlay-panel {\n    max-height: 90vh;\n    overflow: auto;\n  }\n  .date-filter-options {\n    display: flex;\n    flex-direction: column;\n    place-items: flex-start;\n    gap: 0.75rem;\n  }\n  .date-sort-buttons {\n    display: flex;\n    flex-wrap: wrap;\n    gap: 0.5rem;\n  }\n  .date-range-inputs {\n    display: flex;\n    flex-direction: column;\n    width: min-content;\n    gap: 0.5rem;\n  }\n  .date-range-label {\n    display: flex;\n    flex-direction: column;\n    gap: 0.25rem;\n    font-size: 0.8125rem;\n    color: var(--color-text-muted);\n  }\n  .date-range-label input[type=date] {\n    min-height: 2.25rem;\n    padding-inline: 0.75rem;\n    padding-block: 0.375rem;\n    background: var(--bg-glass);\n    font-size: 0.875rem;\n    color: var(--color-text-main);\n    border: 1px solid var(--border-default);\n    border-radius: var(--radius-sm);\n    outline: none;\n    transition: border-color 0.2s ease, box-shadow 0.2s ease;\n  }\n  .date-range-label input[type=date]:focus {\n    border-color: var(--border-focus);\n    box-shadow: var(--shadow-focus);\n  }\n  @media (max-width: 768px) {\n    .recipe-grid-row app-cell-carousel {\n      background: var(--bg-glass);\n      border-block-end: 1px solid var(--border-row);\n      transition: background 0.15s ease;\n    }\n    .recipe-grid-row:hover app-cell-carousel {\n      background: var(--bg-glass-hover);\n    }\n  }\n}\n/*# sourceMappingURL=recipe-book-list.component.css.map */\n"] }]
  }], () => [], null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(RecipeBookListComponent, { className: "RecipeBookListComponent", filePath: "src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.ts", lineNumber: 51 });
})();

// src/app/pages/recipe-book/recipe-book.page.ts
var RecipeBookPage = class _RecipeBookPage {
  static \u0275fac = function RecipeBookPage_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _RecipeBookPage)();
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _RecipeBookPage, selectors: [["app-recipe-book-page"]], decls: 1, vars: 0, template: function RecipeBookPage_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275element(0, "recipe-book-list");
    }
  }, dependencies: [RecipeBookListComponent], styles: ["\n\n[_nghost-%COMP%] {\n  display: block;\n  min-height: 100%;\n}\n/*# sourceMappingURL=recipe-book.page.css.map */"], changeDetection: 0 });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(RecipeBookPage, [{
    type: Component,
    args: [{ selector: "app-recipe-book-page", standalone: true, imports: [RecipeBookListComponent], changeDetection: ChangeDetectionStrategy.OnPush, template: "<recipe-book-list />\r\n", styles: ["/* src/app/pages/recipe-book/recipe-book.page.scss */\n:host {\n  display: block;\n  min-height: 100%;\n}\n/*# sourceMappingURL=recipe-book.page.css.map */\n"] }]
  }], null, null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(RecipeBookPage, { className: "RecipeBookPage", filePath: "src/app/pages/recipe-book/recipe-book.page.ts", lineNumber: 12 });
})();
export {
  RecipeBookPage
};
//# sourceMappingURL=chunk-DFTPX6N3.js.map
