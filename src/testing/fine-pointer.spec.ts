import { stubFinePointer } from './fine-pointer'

describe('stubFinePointer', () => {
  beforeEach(() => {
    spyOn(window, 'matchMedia').and.callFake((query: string) => ({ matches: true, media: query }) as MediaQueryList)
    stubFinePointer()
  })

  it('reports a fine pointer for (pointer: coarse)', () => {
    expect(window.matchMedia('(pointer: coarse)').matches).toBeFalse()
  })

  it('leaves other queries to the fake', () => {
    expect(window.matchMedia('(min-width: 1px)').matches).toBeTrue()
  })
})
