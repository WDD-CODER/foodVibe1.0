import { inject } from '@angular/core'
import { ResolveFn } from '@angular/router'
import { MenuSectionCategoriesService } from '../services/menu-section-categories.service'

/** Ensures MENU_SECTION_CATEGORIES is hydrated before menu-intelligence routes render. */
export const menuSectionCategoriesEnsureLoadedResolver: ResolveFn<boolean> = () => {
  const sectionCategories = inject(MenuSectionCategoriesService)
  return sectionCategories.ensureLoaded().then(() => true)
}
