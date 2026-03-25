import { CookViewStateService } from './cook-view-state.service'

describe('CookViewStateService', () => {
  let service: CookViewStateService

  beforeEach(() => {
    sessionStorage.clear()
    localStorage.clear()
    service = new CookViewStateService()
  })

  it('stores last viewed recipe id', () => {
    service.setLastViewedRecipeId('r1')
    expect(service.lastRecipeId()).toBe('r1')
  })

  it('keeps unique recent ids capped to three', () => {
    service.setLastViewedRecipeId('r1')
    service.setLastViewedRecipeId('r2')
    service.setLastViewedRecipeId('r3')
    service.setLastViewedRecipeId('r2')
    service.setLastViewedRecipeId('r4')

    expect(service.recentIds()).toEqual(['r4', 'r2', 'r3'])
  })
})
