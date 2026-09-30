import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { provideHttpClient } from '@angular/common/http'
import { InventoryPage } from './inventory.page'
import { provideRouter, RouterLink } from '@angular/router'
import { By } from '@angular/platform-browser'

describe('InventoryPage', () => {
  let fixture: ComponentFixture<InventoryPage>

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InventoryPage],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents()

    fixture = TestBed.createComponent(InventoryPage)
    fixture.detectChanges()
  })

  it('should have router outlet (nav links live in child route components)', fakeAsync(() => {
    fixture.detectChanges()
    tick()
    const linkDebugElements = fixture.debugElement.queryAll(By.directive(RouterLink))
    // Page template is only <router-outlet>; list/add nav is in InventoryProductListComponent
    expect(linkDebugElements.length).toBe(0)
  }))

  it('should render router outlet', () => {
    const outlet = fixture.nativeElement.querySelector('router-outlet')
    expect(outlet).toBeTruthy()
  })
})
