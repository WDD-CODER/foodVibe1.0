import { ComponentFixture, TestBed } from '@angular/core/testing'
import { QrCodeComponent } from './qr-code.component'
import { LoggingService } from '@services/logging.service'
import { TranslationService } from '@services/translation.service'

describe('QrCodeComponent (plan 667)', () => {
  let fixture: ComponentFixture<QrCodeComponent>

  function setup(value: string): void {
    TestBed.configureTestingModule({
      imports: [QrCodeComponent],
      providers: [
        { provide: TranslationService, useValue: { translate: (k: string | undefined) => k ?? '' } },
        {
          provide: LoggingService,
          useValue: jasmine.createSpyObj('LoggingService', ['error', 'warn', 'info', 'debug'])
        }
      ]
    })
    fixture = TestBed.createComponent(QrCodeComponent)
    fixture.componentRef.setInput('value', value)
    fixture.componentRef.setInput('altKey', 'fd_qr_alt')
    fixture.detectChanges()
  }

  const img = (): HTMLImageElement | null => (fixture.nativeElement as HTMLElement).querySelector('img')

  async function settle(): Promise<void> {
    for (let i = 0; i < 40 && !img(); i++) {
      await new Promise((r) => setTimeout(r, 25))
      fixture.detectChanges()
    }
  }

  it('renders a png image for a value', async () => {
    setup('https://example.com/book/place')
    await settle()
    expect(img()).not.toBeNull()
    expect(img()!.src.startsWith('data:image/png')).toBeTrue()
    expect(img()!.getAttribute('width')).toBe('160')
  })

  it('renders nothing for an empty value', async () => {
    setup('')
    await new Promise((r) => setTimeout(r, 100))
    fixture.detectChanges()
    expect(img()).toBeNull()
  })

  it('drops the image when the value becomes empty', async () => {
    setup('https://example.com/a')
    await settle()
    fixture.componentRef.setInput('value', '')
    fixture.detectChanges()
    expect(img()).toBeNull()
  })
})
