import { ChangeDetectionStrategy, Component, inject, OnInit, OnDestroy } from '@angular/core'
import { Router } from '@angular/router'
import { MenuLibraryListComponent } from './components/menu-library-list/menu-library-list.component'
import { HeroFabService } from '@services/hero-fab.service'
import { AiMenuModalService } from '../../shared/ai-menu-modal/ai-menu-modal.service'
import { MenuEventDataService } from '@services/menu-event-data.service'
import { ServingType } from '@models/menu-event.model'
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
              predictedTakeRate: dish.predictedTakeRate ?? 0.4,
              derivedPortions: Math.round(matched.guestCount * (dish.predictedTakeRate ?? 0.4)),
              sellPrice: dish.sellPrice ?? undefined,
              servingPortions: dish.servingPortions ?? 1
            }
          })
      }))
      const draft = {
        name: matched.name,
        eventType: matched.eventType,
        eventDate: matched.eventDate ?? undefined,
        servingType: matched.servingType as ServingType,
        guestCount: matched.guestCount,
        sections: sections,
        createdAt: now,
        updatedAt: now
      }
      const created = await this.menuEventData.addMenuEvent(draft)
      void this.router.navigate(['/menu-intelligence', created._id])
    })
  }
}
