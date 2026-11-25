import { Component } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { By } from '@angular/platform-browser'
import { LucideAngularModule } from 'lucide-angular'
import { ScrollAreaComponent } from './scroll-area.component'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'

@Component({
  standalone: true,
  imports: [ScrollAreaComponent],
  template: `
    <app-scroll-area maxBlockSize="50px">
      <div class="tall" style="block-size: 300px">long content</div>
    </app-scroll-area>
  `
})
class HostComponent {}

const nextFrame = (): Promise<void> => new Promise((resolve) => requestAnimationFrame(() => resolve()))

describe('ScrollAreaComponent', () => {
  let fixture: ComponentFixture<HostComponent>

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent, LucideAngularModule.pick(TEST_LUCIDE_ICONS)]
    }).compileComponents()
    fixture = TestBed.createComponent(HostComponent)
    document.body.appendChild(fixture.nativeElement)
    fixture.detectChanges()
  })

  afterEach(() => fixture.nativeElement.remove())

  const scroller = (): HTMLElement => fixture.debugElement.query(By.css('.scroll-area')).nativeElement
  const bottomArrow = (): HTMLElement => fixture.debugElement.query(By.css('.scroll-arrow--bottom')).nativeElement

  it('renders the projected content', () => {
    expect(scroller().textContent).toContain('long content')
  })

  it('shows the bottom arrow while there is more to scroll and hides it at the end', async () => {
    await nextFrame()
    await nextFrame()
    // The arrow is shown by the CSS rule `.can-scroll-down ~ .scroll-arrow--bottom`.
    expect(bottomArrow().matches('.can-scroll-down ~ .scroll-arrow--bottom')).toBeTrue()

    scroller().scrollTop = scroller().scrollHeight
    scroller().dispatchEvent(new Event('scroll'))
    fixture.detectChanges()
    expect(bottomArrow().matches('.can-scroll-down ~ .scroll-arrow--bottom')).toBeFalse()
  })
})
