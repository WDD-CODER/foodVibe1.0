/** Plan 764 (C-TEMPLATE): the words of a menu, as the template draws them. Names only: never prices or costs (M3). */

export interface MenuDocSection {
  title: string
  dishes: { name: string }[]
}

export interface MenuDoc {
  title?: string
  subtitle?: string
  bottomNote?: string
  sections: MenuDocSection[]
}

/** The part of a stored menu event the doc is built from. */
export interface MenuDocEvent {
  name?: string
  subtitle?: string
  bottomNote?: string
  sections?: readonly {
    name?: string
    unlinkedName?: string
    sortOrder?: number
    items?: readonly { recipeId?: string; unlinkedName?: string }[]
  }[]
}

/** The browser and the server pass their own lookups, so both build the same doc. */
export interface MenuDocLookups {
  /** The catalog name of a linked dish. */
  dishName(id: string): string | undefined
  /** The label of a section category key. */
  sectionLabel(key: string): string | undefined
}

/**
 * A linked dish takes its catalog name (left out when the catalog has none: an id is never printed); an unlinked dish
 * and a menu-only section title are written exactly as stored. Sections follow `sortOrder`, dishes their stored order.
 */
export function menuDocFromEvent(event: MenuDocEvent, lookups: MenuDocLookups): MenuDoc {
  const sections = [...(event.sections ?? [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
  return {
    ...(event.name && { title: event.name }),
    ...(event.subtitle && { subtitle: event.subtitle }),
    ...(event.bottomNote && { bottomNote: event.bottomNote }),
    sections: sections.map(section => ({
      title: section.unlinkedName || (section.name ? lookups.sectionLabel(section.name) || section.name : ''),
      dishes: (section.items ?? []).flatMap(item => {
        const name = item.recipeId ? lookups.dishName(item.recipeId) : item.unlinkedName
        return name ? [{ name }] : []
      })
    }))
  }
}

/** The sample menu a design is judged on: Hebrew, English and mixed names, so right-to-left mixing shows. */
export const SAMPLE_MENU_DOC: MenuDoc = {
  title: 'תפריט ערב',
  subtitle: "ארוחה עונתית · Chef's selection",
  bottomNote: 'נא לעדכן אותנו על אלרגיות ורגישויות למזון.\nThe dishes change with the season.',
  sections: [
    {
      title: 'פתיחה',
      dishes: [{ name: "פוקאצ'ה with spreads" }, { name: 'חציל שרוף בטחינה' }, { name: 'Beef Carpaccio' }]
    },
    {
      title: 'ביניים',
      dishes: [{ name: 'ניוקי ערמונים בחמאת מרווה' }, { name: 'סביצ׳ה דג ים' }, { name: 'Burrata & עגבניות שרי' }]
    },
    {
      title: 'עיקריות',
      dishes: [{ name: 'Beef Bourguignon' }, { name: 'פילה לברק על קרם כרובית' }, { name: 'ריזוטו פטריות יער' }]
    },
    {
      title: 'Desserts',
      dishes: [{ name: 'מלבי קוקוס' }, { name: 'Crème Brûlée' }, { name: 'טארט שוקולד with sea salt' }]
    }
  ]
}
