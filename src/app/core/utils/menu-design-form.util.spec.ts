import { menuDesignDraftSchema, type MenuDesignDraft } from '@schemas/entities/menu-design.schema'
import { MENU_BASE_TEMPLATES, baseDesign } from '@schemas/menu-design/menu-base-templates'
import { MENU_TEXTURE_IDS } from '@schemas/menu-design/menu-textures'
import { designFromForm, formFromDesign, isHexColor } from './menu-design-form.util'

const PICTURE = 'https://res.cloudinary.com/demo/image/upload/bg.jpg'

/** Every result of the mapping must be a design the shared schema accepts. */
function valid(design: MenuDesignDraft): MenuDesignDraft {
  const parsed = menuDesignDraftSchema.safeParse(design)
  expect(parsed.success).withContext(JSON.stringify(parsed.error?.issues)).toBeTrue()
  return design
}

describe('menu design form', () => {
  it('designFromForm(baseDesign("classic")) round-trips to the same object', () => {
    expect(valid(designFromForm(baseDesign('classic')))).toEqual(baseDesign('classic'))
  })

  it('every base design survives design -> form -> design', () => {
    for (const id of MENU_BASE_TEMPLATES) {
      expect(valid(designFromForm(formFromDesign(baseDesign(id))))).toEqual(baseDesign(id))
    }
  })

  it('formFromDesign copies only the look of a stored design', () => {
    const stored = {
      ...baseDesign('modern'),
      _id: 'd1',
      name: 'ערב',
      schemaVersion: 2,
      businessId: 'b1',
      createdBy: 'u1',
      createdAt: 1,
      updatedAt: 2
    }
    expect(formFromDesign(stored)).toEqual(baseDesign('modern'))
  })

  it('formFromDesign gives a copy: changing the form leaves the design as it was', () => {
    const design = baseDesign('classic')
    const form = formFromDesign(design)
    form.colors.page = '#000000'
    form.fixedTexts.businessName = 'אחר'
    expect(design).toEqual(baseDesign('classic'))
  })

  it('a texture background without a texture picks the first texture', () => {
    const previous = baseDesign('modern')
    const form = formFromDesign(previous)
    form.background.kind = 'texture'
    const result = valid(designFromForm(form, previous))
    expect(result.background.kind).toBe('texture')
    expect(result.background.textureId).toBe(MENU_TEXTURE_IDS[0])
  })

  it('an image background without a picture keeps the old kind', () => {
    for (const previous of [baseDesign('modern'), baseDesign('rustic')]) {
      const form = formFromDesign(previous)
      form.background.kind = 'image'
      const result = valid(designFromForm(form, previous))
      expect(result.background.kind).toBe(previous.background.kind)
      expect(result.background.imageUrl).toBeUndefined()
    }
  })

  it('an image background without a picture and without an old design keeps the base kind', () => {
    const form = formFromDesign(baseDesign('rustic'))
    form.background = { kind: 'image', imageFit: 'cover', veil: 0 }
    expect(valid(designFromForm(form)).background.kind).toBe('texture')
  })

  it('an image background with a Cloudinary picture is applied', () => {
    const form = formFromDesign(baseDesign('classic'))
    form.background = { ...form.background, kind: 'image', imageUrl: PICTURE, imageFit: 'tile', veil: 0.4 }
    const result = valid(designFromForm(form, baseDesign('classic')))
    expect(result.background).toEqual(jasmine.objectContaining({ kind: 'image', imageUrl: PICTURE, veil: 0.4 }))
  })

  it('a picture from another host is dropped', () => {
    const form = formFromDesign(baseDesign('modern'))
    form.background = { kind: 'image', imageUrl: 'https://example.com/a.jpg', imageFit: 'cover', veil: 0 }
    form.logo.url = 'http://res.cloudinary.com/demo/logo.png'
    const result = valid(designFromForm(form, baseDesign('modern')))
    expect(result.background.kind).toBe('color')
    expect(result.logo.url).toBeUndefined()
  })

  it('a half-typed colour keeps the old colour', () => {
    const previous = baseDesign('classic')
    const form = formFromDesign(previous)
    form.colors.title = '#12'
    form.colors.text = '#ABCDEF'
    const result = valid(designFromForm(form, previous))
    expect(result.colors.title).toBe(previous.colors.title)
    expect(result.colors.text).toBe('#ABCDEF')
  })

  it('keeps the frame width and the veil inside their limits', () => {
    const form = formFromDesign(baseDesign('classic'))
    form.frame.width = 9.4
    form.background.veil = 2
    const result = valid(designFromForm(form))
    expect(result.frame.width).toBe(6)
    expect(result.background.veil).toBe(0.8)
  })

  it('drops empty fixed texts and cuts long ones', () => {
    const form = formFromDesign(baseDesign('classic'))
    form.fixedTexts = { businessName: '', contactLine: 'x'.repeat(200) }
    const result = valid(designFromForm(form))
    expect('businessName' in result.fixedTexts).toBeFalse()
    expect(result.fixedTexts.contactLine?.length).toBe(120)
  })

  it('isHexColor accepts six hex digits only', () => {
    expect(isHexColor('#a1B2c3')).toBeTrue()
    for (const bad of ['a1b2c3', '#abc', '#gggggg', '#a1b2c3d', '', 'red']) expect(isHexColor(bad)).toBeFalse()
  })
})
