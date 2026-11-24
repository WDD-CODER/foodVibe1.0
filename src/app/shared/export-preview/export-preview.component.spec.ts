import { ComponentFixture, TestBed } from '@angular/core/testing'
import { LucideAngularModule } from 'lucide-angular'
import { ExportPreviewComponent } from './export-preview.component'
import { TranslationService } from '@services/translation.service'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'
import type { ExportPayload } from '@utils/export.util'

describe('ExportPreviewComponent', () => {
  let fixture: ComponentFixture<ExportPreviewComponent>

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExportPreviewComponent, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [{ provide: TranslationService, useValue: { translate: (k: string) => k } }]
    }).compileComponents()
    fixture = TestBed.createComponent(ExportPreviewComponent)
  })

  afterEach(() => fixture.destroy())

  it('keeps the paper box inside the visible screen when the paper holds 80 lines', () => {
    const payload: ExportPayload = {
      title: 'T',
      sections: [{ title: 'S', rows: Array.from({ length: 80 }, (_, i) => [`line ${i}`, `${i}`]) }]
    }
    fixture.componentRef.setInput('payload', payload)
    fixture.detectChanges()
    const wrap = (fixture.nativeElement as HTMLElement).querySelector('.export-preview-paper-wrap') as HTMLElement
    const box = wrap.getBoundingClientRect()
    expect(box.top).toBeGreaterThanOrEqual(0)
    expect(box.bottom).toBeLessThanOrEqual(window.innerHeight)
  })
})
