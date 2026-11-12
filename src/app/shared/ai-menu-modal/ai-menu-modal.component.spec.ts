import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { LucideAngularModule } from 'lucide-angular'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import { GeminiService } from '@services/gemini.service'
import { KitchenStateService } from '@services/kitchen-state.service'
import { getGeminiUsage } from '@utils/gemini-usage.util'
import type { AiMenuDraft, MatchedMenu } from '@models/ai-menu-draft.model'
import { AiMenuModalComponent } from './ai-menu-modal.component'
import { AiMenuModalService } from './ai-menu-modal.service'

type Internals = { buildMatchedMenu_: (d: AiMenuDraft) => MatchedMenu }

describe('AiMenuModalComponent dish numbers (plan 587)', () => {
  it('does not copy serving_portions or sell_price into the menu line', async () => {
    const gemini = jasmine.createSpyObj<GeminiService>('GeminiService', ['fetchUsage'])
    gemini.fetchUsage.and.callFake(() => Promise.resolve(getGeminiUsage()))
    TestBed.configureTestingModule({
      imports: [AiMenuModalComponent, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: GeminiService, useValue: gemini },
        { provide: KitchenStateService, useValue: { recipes_: signal([]) } },
        {
          provide: AiMenuModalService,
          useValue: { isOpen: signal(true), mode: signal('create'), getEditContext: () => null, close: () => {} }
        }
      ]
    })
    const component = TestBed.createComponent(AiMenuModalComponent).componentInstance
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
})
