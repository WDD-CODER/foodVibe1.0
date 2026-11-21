import { ReturnToService } from './return-to.service'

describe('ReturnToService (plan 651)', () => {
  const service = new ReturnToService()

  it('accepts only an in-app path', () => {
    expect(service.safeUrl('/inventory/count')).toBe('/inventory/count')
    expect(service.safeUrl('//evil.example')).toBeNull()
    expect(service.safeUrl('https://evil.example')).toBeNull()
    expect(service.safeUrl('inventory/count')).toBeNull()
    expect(service.safeUrl(null)).toBeNull()
  })

  it('gives the kept line back once', () => {
    service.setPending({ spoken: 'אבוקדו', quantity: 2, unit: 'kg' })
    expect(service.takePending()).toEqual({ spoken: 'אבוקדו', quantity: 2, unit: 'kg' })
    expect(service.takePending()).toBeNull()
  })
})
