import { Component } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { By } from '@angular/platform-browser'
import { LucideAngularModule } from 'lucide-angular'
import { ListShellComponent } from './list-shell.component'
import { TranslationService } from '@services/translation.service'
import { TEST_LUCIDE_ICONS } from 'src/testing/test-lucide-icons'

@Component({
  standalone: true,
  imports: [ListShellComponent],
  template: `
    <app-list-shell [gridTemplate]="'1fr 1fr'" [mobileGridTemplate]="'1fr 1fr'">
      <ng-container shell-title>Items</ng-container>
      <ng-container shell-pagination>
        <div class="c-pagination-controls"><button type="button" class="next">next</button></div>
      </ng-container>
      <ng-container shell-table-header>
        <div class="c-grid-header-cell">A</div>
        <div class="c-grid-header-cell">B</div>
      </ng-container>
      <ng-container shell-table-body>
        @for (i of rows; track i) {
          <div class="c-list-body-cell" style="height: 60px">{{ i }}</div>
          <div class="c-list-body-cell" style="height: 60px">{{ i }}</div>
        }
      </ng-container>
    </app-list-shell>
  `
})
class HostComponent {
  readonly rows = Array.from({ length: 60 }, (_, i) => i)
}

describe('ListShellComponent — pinned table top (plan 346)', () => {
  let fixture: ComponentFixture<HostComponent>

  beforeEach(async () => {
    const translation = jasmine.createSpyObj<TranslationService>('TranslationService', ['translate'])
    translation.translate.and.callFake((k: string | undefined) => k ?? '')
    await TestBed.configureTestingModule({
      imports: [HostComponent, LucideAngularModule.pick(TEST_LUCIDE_ICONS)],
      providers: [{ provide: TranslationService, useValue: translation }]
    }).compileComponents()
    fixture = TestBed.createComponent(HostComponent)
    fixture.detectChanges()
  })

  afterEach(() => window.scrollTo(0, 0))

  it('puts the pagination slot above the column header, inside the pinned table top', () => {
    const top = fixture.debugElement.query(By.css('.table-top')).nativeElement as HTMLElement
    const pagination = top.querySelector('.c-pagination-controls')
    const header = top.querySelector('.table-header')
    expect(pagination).not.toBeNull()
    expect(header).not.toBeNull()
    expect(pagination!.compareDocumentPosition(header!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('keeps the table top pinned while the page scrolls (narrow widths)', () => {
    const top = fixture.debugElement.query(By.css('.table-top')).nativeElement as HTMLElement
    expect(getComputedStyle(top).position).toBe('sticky')
    const area = fixture.debugElement.query(By.css('.table-area')).nativeElement as HTMLElement
    expect(getComputedStyle(area).overflow).not.toBe('hidden')

    if (window.innerWidth > 1023) return // desktop scrolls the body internally instead
    const stickyTop = parseFloat(getComputedStyle(top).insetBlockStart || getComputedStyle(top).top) || 0
    window.scrollTo(0, top.getBoundingClientRect().top + window.scrollY + 600)
    expect(Math.round(top.getBoundingClientRect().top)).toBe(Math.round(stickyTop))
  })
})
