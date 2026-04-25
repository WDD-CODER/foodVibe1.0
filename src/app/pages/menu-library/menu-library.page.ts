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
  changeDetection: ChangeDetectionStrategy.OnPush,
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
        { labelKey: 'ai_menu_create_new', icon: 'sparkles', run: () => this.openAiCreateModal() },
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
        name_: section.category,
        sort_order_: si + 1,
        items_: section.items
          .filter((dish) => resolutions.get(`${si}:${dish.name_hebrew}`) !== 'skip')
          .map((dish) => {
            const resolution = resolutions.get(`${si}:${dish.name_hebrew}`)
            const recipeId = (resolution && resolution !== 'skip') ? resolution : (dish.recipeId ?? '')
            return {
              recipe_id_: recipeId,
              recipe_type_: 'dish' as const,
              predicted_take_rate_: dish.predictedTakeRate ?? 0.4,
              derived_portions_: Math.round(matched.guest_count_ * (dish.predictedTakeRate ?? 0.4)),
              sell_price_: dish.sellPrice ?? undefined,
              serving_portions_: dish.servingPortions ?? 1,
            }
          }),
      }))
      const draft = {
        name_: matched.name_,
        event_type_: matched.event_type_,
        event_date_: matched.event_date_ ?? undefined,
        serving_type_: matched.serving_type_ as ServingType,
        guest_count_: matched.guest_count_,
        sections_: sections,
        created_at_: now,
        updated_at_: now,
      }
      const created = await this.menuEventData.addMenuEvent(draft)
      void this.router.navigate(['/menu-intelligence', created._id])
    })
  }
}
