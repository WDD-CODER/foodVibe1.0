import { ChangeDetectionStrategy, Component, inject, OnInit, OnDestroy } from '@angular/core'
import { Router } from '@angular/router'
import { MenuLibraryListComponent } from './components/menu-library-list/menu-library-list.component'
import { HeroFabService } from '@services/hero-fab.service'
import { AiMenuModalService } from '../../shared/ai-menu-modal/ai-menu-modal.service'
import { MenuEventDataService } from '@services/menu-event-data.service'
import { ServingType } from '@models/menu-event.model'
import { EventTypeSnapshotService } from '@services/event-type-snapshot.service'
import { TaxonomyStore } from '@services/taxonomy-store.service'
import { MenuIntelligenceService } from '@services/menu-intelligence.service'
import type { MatchedMenu } from '@models/ai-menu-draft.model'

@Component({
  selector: 'app-menu-library-page',
  standalone: true,
  imports: [MenuLibraryListComponent],
  templateUrl: './menu-library.page.html',
  styleUrl: './menu-library.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MenuLibraryPage implements OnInit, OnDestroy {
  private readonly router = inject(Router)
  private readonly heroFab = inject(HeroFabService)
  private readonly aiMenuModal_ = inject(AiMenuModalService)
  private readonly menuEventData = inject(MenuEventDataService)
  private readonly menuIntelligence_ = inject(MenuIntelligenceService)
  private readonly snapshots_ = inject(EventTypeSnapshotService)
  private readonly taxonomy_ = inject(TaxonomyStore)

  ngOnInit(): void {
    this.heroFab.setPageActions(
      [
        { labelKey: 'menu_new_event', icon: 'file-plus', run: () => void this.router.navigate(['/menu-intelligence']) },
        { labelKey: 'ai_menu_create_new', icon: 'sparkles', run: () => this.openAiCreateModal() }
      ],
      'replace'
    )
  }

  ngOnDestroy(): void {
    this.heroFab.clearPageActions()
  }

  private openAiCreateModal(): void {
    this.aiMenuModal_.open('create', undefined, async (matched: MatchedMenu, resolutions) => {
      await this.taxonomy_.ensureLoaded() // a snapshot taken before the terms load would freeze coefficient 1
      const now = Date.now()
      const sections = matched.sections.map((section, si) => ({
        _id: crypto.randomUUID(),
        name: section.category,
        sortOrder: si + 1,
        items: section.items
          .filter((dish) => resolutions.get(`${si}:${dish.nameHebrew}`) !== 'skip')
          .map((dish) => {
            const resolution = resolutions.get(`${si}:${dish.nameHebrew}`)
            const recipeId = resolution && resolution !== 'skip' ? resolution : (dish.recipeId ?? '')
            return {
              recipeId: recipeId,
              recipeType: 'dish' as const,
              derivedPortions: 0,
              sellPrice: dish.sellPrice ?? undefined,
              portionsPerDiner: dish.servingPortions ?? 1
            }
          })
      }))
      const eventTypeSnapshot = this.snapshots_.snapshotFor('eventType', matched.eventType)
      const servingTypeSnapshot = this.snapshots_.snapshotFor('menuType', matched.servingType)
      const draft = {
        name: matched.name,
        eventType: matched.eventType,
        eventDate: matched.eventDate ?? undefined,
        servingType: matched.servingType as ServingType,
        ...(eventTypeSnapshot && { eventTypeSnapshot }),
        ...(servingTypeSnapshot && { servingTypeSnapshot }),
        guestCount: matched.guestCount,
        sections: sections,
        createdAt: now,
        updatedAt: now
      }
      const created = await this.menuEventData.addMenuEvent(this.menuIntelligence_.hydrateDerivedPortions(draft))
      void this.router.navigate(['/menu-intelligence', created._id])
    })
  }
}
