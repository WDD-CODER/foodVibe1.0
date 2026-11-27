'use strict'
/** Plan 764 (C-DESIGN, C-MENU-FIELDS, C-SETTINGS): the stored shapes, read from the compiled shared schemas. */

const S = require('../generated/schemas/entities')
const { MENU_BASE_TEMPLATES, baseDesign } = require('../generated/schemas/menu-design')
const { COLLECTIONS } = require('../constants/collections')

const base = { _id: 'd1', schemaVersion: 2, businessId: 'b1', createdBy: 'u1', createdAt: 1, updatedAt: 1 }
const stored = (changes = {}) => ({ ...base, name: 'ערב', ...baseDesign('classic'), ...changes })
const accepts = changes => S.menuDesignSchema.safeParse(stored(changes)).success
const background = value => ({ background: { imageFit: 'cover', veil: 0, ...value } })
const IMAGE = 'https://res.cloudinary.com/demo/image/upload/bg.jpg'

describe('menuDesignSchema', () => {
  it.each([...MENU_BASE_TEMPLATES])('accepts baseDesign(%s) as a draft and as a stored design', id => {
    expect(S.menuDesignDraftSchema.safeParse(baseDesign(id)).success).toBe(true)
    expect(S.menuDesignSchema.safeParse({ ...base, name: 'x', ...baseDesign(id) }).success).toBe(true)
  })

  it.each(['#12345', 'red'])('rejects the color %s', color => {
    const colors = { ...baseDesign('classic').colors, page: color }
    expect(accepts({ colors })).toBe(false)
  })

  it('accepts an upper-case hex color', () => {
    expect(accepts({ colors: { ...baseDesign('classic').colors, page: '#ABCDEF' } })).toBe(true)
  })

  it('rejects an unknown font id', () => {
    expect(accepts({ fonts: { title: 'comic-sans', section: 'heebo', dish: 'heebo' } })).toBe(false)
  })

  it('an image background needs a Cloudinary imageUrl', () => {
    expect(accepts(background({ kind: 'image' }))).toBe(false)
    expect(accepts(background({ kind: 'image', imageUrl: IMAGE }))).toBe(true)
    for (const imageUrl of ['https://evil.example/bg.jpg', 'http://res.cloudinary.com/bg.jpg', 'https://res.cloudinary.com.evil.example/bg.jpg']) {
      expect(accepts(background({ kind: 'image', imageUrl })), imageUrl).toBe(false)
    }
    expect(accepts({ logo: { url: 'https://evil.example/logo.png', size: 'm', placement: 'top' } })).toBe(false)
  })

  it('a texture background needs a known textureId', () => {
    expect(accepts(background({ kind: 'texture' }))).toBe(false)
    expect(accepts(background({ kind: 'texture', textureId: 'wood' }))).toBe(false)
    expect(accepts(background({ kind: 'texture', textureId: 'linen' }))).toBe(true)
  })

  it('fills imageFit, veil and origin, and bounds veil, frame width and name', () => {
    const { origin: _origin, ...draft } = baseDesign('modern')
    const parsed = S.menuDesignDraftSchema.parse({ ...draft, background: { kind: 'color' } })
    expect(parsed.background).toEqual({ kind: 'color', imageFit: 'cover', veil: 0 })
    expect(parsed.origin).toBe('manual')
    expect(accepts(background({ kind: 'color', veil: 0.9 }))).toBe(false)
    expect(accepts({ frame: { style: 'line', width: 7, inset: 'normal' } })).toBe(false)
    expect(accepts({ name: '   ' })).toBe(false)
    expect(accepts({ name: 'x'.repeat(61) })).toBe(false)
  })

  it('a draft carries no name or stored fields, and a design takes no unknown or lineage field', () => {
    expect(S.menuDesignDraftSchema.safeParse({ ...baseDesign('classic'), name: 'x' }).success).toBe(false)
    expect(accepts({ isDefault: true })).toBe(false)
    expect(accepts({ _masterId: 'd1' })).toBe(false)
  })

  it('is registered for the menuDesigns collection: soft delete, not cloneable, not searchable', () => {
    expect(S.SCHEMA_BY_COLLECTION.menuDesigns).toBe(S.menuDesignSchema)
    expect(COLLECTIONS.find(c => c.name === 'menuDesigns')).toEqual({
      name: 'menuDesigns', userData: true, cloneable: false, backup: true, searchable: false, softDelete: true,
    })
  })
})

describe('menu fields of menuEvents', () => {
  const event = { ...base, name: 'אירוע', eventType: 'wedding', servingType: 'plated', guestCount: 10, sections: [] }
  const ok = changes => S.menuEventSchema.safeParse({ ...event, ...changes }).success

  it('accepts designId, subtitle, bottomNote, latestExport and a menu-only section title', () => {
    expect(ok({})).toBe(true)
    expect(ok({
      designId: 'd1', subtitle: 's'.repeat(120), bottomNote: 'n'.repeat(300),
      latestExport: { fileId: 'f1', at: 1, designId: 'd1' },
      sections: [{ _id: 's1', name: '', unlinkedName: 'א'.repeat(60), sortOrder: 1, items: [] }],
    })).toBe(true)
  })

  it('refuses a text over its limit', () => {
    expect(ok({ subtitle: 's'.repeat(121) })).toBe(false)
    expect(ok({ bottomNote: 'n'.repeat(301) })).toBe(false)
    expect(ok({ sections: [{ _id: 's1', name: '', unlinkedName: 'א'.repeat(61), sortOrder: 1, items: [] }] })).toBe(false)
  })

  it('latestExport is a server-owned event field', () => {
    expect([...S.EVENT_SERVER_FIELDS]).toContain('latestExport')
  })
})

describe('business menuDesign settings', () => {
  const biz = { _id: 'b1', name: 'עסק', ownerId: 'u1', createdAt: 1, internal: false, lastSyncedMasterVersion: 0 }

  it('is optional, and holds the default design id and the powered-by flag', () => {
    expect(S.businessSchema.safeParse(biz).success).toBe(true)
    expect(S.businessSchema.safeParse({ ...biz, menuDesign: { hidePoweredBy: false } }).success).toBe(true)
    expect(S.businessSchema.safeParse({ ...biz, menuDesign: { defaultDesignId: 'd1', hidePoweredBy: true } }).success).toBe(true)
    expect(S.businessSchema.safeParse({ ...biz, menuDesign: { defaultDesignId: 'd1' } }).success).toBe(false)
  })
})
