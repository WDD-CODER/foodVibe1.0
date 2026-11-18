import { HttpErrorResponse } from '@angular/common/http'
import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { LucideAngularModule } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { GeminiService } from '@services/gemini.service'
import { DishDataService } from '@services/dish-data.service'
import { getGeminiUsage } from '@utils/gemini-usage.util'
import type { AiMenuDraft, MatchedMenu } from '@models/ai-menu-draft.model'
import { AiMenuModalComponent } from './ai-menu-modal.component'
import { AiMenuModalService } from './ai-menu-modal.service'

type Internals = { buildMatchedMenu_: (d: AiMenuDraft) => MatchedMenu }

function makeComponent(): AiMenuModalComponent {
  const gemini = jasmine.createSpyObj<GeminiService>('GeminiService', ['fetchUsage'])
  gemini.fetchUsage.and.callFake(() => Promise.resolve(getGeminiUsage()))
  TestBed.configureTestingModule({
    imports: [AiMenuModalComponent, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: GeminiService, useValue: gemini },
      { provide: DishDataService, useValue: { allDishes_: signal([]) } },
      {
        provide: AiMenuModalService,
        useValue: { isOpen: signal(true), mode: signal('create'), getEditContext: () => null, close: () => {} }
      }
    ]
  })
  return TestBed.createComponent(AiMenuModalComponent).componentInstance
}

describe('AiMenuModalComponent dish numbers (plan 587)', () => {
  it('does not copy serving_portions or sell_price into the menu line', async () => {
    const component = makeComponent()
    const draft: AiMenuDraft = {
      name: 'אירוע',
      eventType: 'חתונה',
      eventDate: null,
      servingType: 'buffet',
      guestCount: 120,
      sections: [{ category: 'קינוחים', items: [{ nameHebrew: 'עוגה', serving_portions: 100, sell_price: 50 }] }]
    }
    const matched = (component as unknown as Internals).buildMatchedMenu_(draft)
    const line = matched.sections[0].items[0]
    expect(line.servingPortions).toBeUndefined()
    expect(line.sellPrice).toBeUndefined()
  })

  it('no guest count: the menu is made for 1 guest and flagged for the warning (plan 614)', () => {
    const component = makeComponent()
    const draft = {
      name: 'אירוע',
      eventType: '',
      eventDate: null,
      servingType: 'buffet',
      guestCount: null as unknown as number,
      sections: [{ category: 'ראשונות', items: [{ nameHebrew: 'חומוס' }] }]
    } as AiMenuDraft
    const matched = (component as unknown as Internals).buildMatchedMenu_(draft)
    expect(matched.guestCount).toBe(1)
    expect(matched.guestCountMissing).toBeTrue()
  })
})

describe('AiMenuModalComponent monthly cap (plan 620)', () => {
  it('shows the monthly cap message for the cap refusal', () => {
    const component = makeComponent()
    const key = (component as unknown as { resolveErrorKey_(e: unknown): string }).resolveErrorKey_(
      new HttpErrorResponse({ status: 429, error: { error: 'ai_monthly_cap_reached', code: 'ai_monthly_cap_reached' } })
    )
    expect(key).toBe('ai_monthly_cap_reached')
  })
})
