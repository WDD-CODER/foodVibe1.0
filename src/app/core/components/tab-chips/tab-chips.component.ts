import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router'
import { filter } from 'rxjs/operators'
import { LucideAngularModule } from 'lucide-angular'
import { TranslatePipe } from 'src/app/core/pipes/translation-pipe.pipe'

/** One contextual sub-nav destination under a top-level tab. */
interface TabChip {
  id: string
  labelKey: string
  icon: string
  path: string
  /** Extra query params to match/apply — only the metadata chip uses this today. */
  queryParams?: Record<string, string>
}

type TabGroup = 'dashboard' | 'inventory' | 'recipes' | 'menus'

/** Longest-prefix-wins route → tab-group map. Mirrors `UI refactor/shell.js` PARENT. */
const GROUP_BY_PATH_PREFIX: ReadonlyArray<[string, TabGroup]> = [
  ['/dashboard', 'dashboard'],
  ['/venues', 'dashboard'],
  ['/suppliers', 'dashboard'],
  ['/trash', 'dashboard'],
  ['/inventory', 'inventory'],
  ['/equipment', 'inventory'],
  ['/recipe-book', 'recipes'],
  ['/recipe-builder', 'recipes'],
  ['/cook', 'recipes'],
  ['/menu-library', 'menus'],
  ['/menu-intelligence', 'menus']
]

const CHIPS_BY_GROUP: Readonly<Record<TabGroup, readonly TabChip[]>> = {
  dashboard: [
    { id: 'venues', labelKey: 'venues', icon: 'map-pin', path: '/venues' },
    {
      id: 'metadata',
      labelKey: 'metadata_manager',
      icon: 'tags',
      path: '/dashboard',
      queryParams: { tab: 'metadata' }
    },
    { id: 'suppliers', labelKey: 'suppliers', icon: 'truck', path: '/suppliers' },
    { id: 'trash', labelKey: 'trash', icon: 'trash-2', path: '/trash' }
  ],
  inventory: [{ id: 'equipment', labelKey: 'equipment', icon: 'wrench', path: '/equipment' }],
  recipes: [
    { id: 'recipe-builder', labelKey: 'recipe_builder', icon: 'chef-hat', path: '/recipe-builder' },
    { id: 'cook-view', labelKey: 'cook_view', icon: 'flame', path: '/cook' }
  ],
  menus: [
    { id: 'menu-library', labelKey: 'menu_library', icon: 'library', path: '/menu-library' },
    { id: 'menu-intelligence', labelKey: 'menu_intelligence', icon: 'sparkles', path: '/menu-intelligence' }
  ]
}

/**
 * Contextual sub-nav row under the top-level tabs — new in the design, no old-app equivalent.
 * Reads the current URL to pick which chip group applies; hides entirely off-map.
 * Plan 305 M3 Task 14.
 */
@Component({
  selector: 'app-tab-chips',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, LucideAngularModule, TranslatePipe],
  templateUrl: './tab-chips.component.html',
  styleUrl: './tab-chips.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TabChipsComponent {
  private readonly router = inject(Router)
  private readonly destroyRef = inject(DestroyRef)

  private readonly currentUrl_ = signal(this.router.url)

  protected readonly chips_ = computed<readonly TabChip[]>(() => {
    const path = this.currentUrl_().split('?')[0]
    const group = GROUP_BY_PATH_PREFIX.find(([prefix]) => path.startsWith(prefix))?.[1]
    return group ? CHIPS_BY_GROUP[group] : []
  })

  constructor() {
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((e) => this.currentUrl_.set(e.urlAfterRedirects))
  }
}
