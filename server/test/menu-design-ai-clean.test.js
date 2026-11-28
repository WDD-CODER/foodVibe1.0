'use strict'
/** Plan 766 — the prompts of the menu designer's AI and the cleaning that keeps only valid designs. Pure. */

const { menuDesignDraftSchema } = require('../generated/schemas/entities/menu-design.schema')
const { MENU_BASE_TEMPLATES, baseDesign } = require('../generated/schemas/menu-design/menu-base-templates')
const { MENU_FONT_IDS } = require('../generated/schemas/menu-design/menu-fonts')
const { MENU_TEXTURE_IDS } = require('../generated/schemas/menu-design/menu-textures')
const { menuDesignPrompt, cleanDesignVariant, cleanRefinedDesign } = require('../utils/menu-design-ai')

const PICTURE = 'https://res.cloudinary.com/demo/image/upload/bg.jpg'
const LOGO = 'https://res.cloudinary.com/demo/image/upload/logo.png'

const draft = (extra = {}) => ({ ...baseDesign('modern'), origin: 'ai', ...extra })
const mine = () => ({
  ...baseDesign('rustic'),
  background: { kind: 'image', imageUrl: PICTURE, imageFit: 'cover', veil: 0.3 },
  logo: { url: LOGO, size: 'l', placement: 'top' },
  fixedTexts: { businessName: 'מסעדת הים', contactLine: '03-5551234' },
})

describe('menuDesignPrompt', () => {
  it.each(['image', 'url', 'text', 'refine'])('%s lists every font, texture and key of a design', kind => {
    const prompt = menuDesignPrompt(kind)
    for (const id of [...MENU_FONT_IDS, ...MENU_TEXTURE_IDS, ...MENU_BASE_TEMPLATES]) expect(prompt).toContain(`"${id}"`)
    for (const key of Object.keys(baseDesign('classic'))) expect(prompt).toContain(`"${key}"`)
    expect(prompt).toContain('Hebrew restaurant menu')
    expect(prompt).toContain('Do not add any other key')
  })

  it('asks for three different variants that take the style and do not copy', () => {
    for (const kind of ['image', 'url', 'text']) {
      expect(menuDesignPrompt(kind)).toContain('three clearly different designs')
      expect(menuDesignPrompt(kind)).toContain('Do not copy it')
      expect(menuDesignPrompt(kind)).toContain('"variants"')
    }
    expect(menuDesignPrompt('refine')).not.toContain('"variants"')
    expect(menuDesignPrompt('refine')).toContain('as little else as possible')
  })
})

describe('cleanDesignVariant', () => {
  it('keeps a valid design and marks it as made by the AI', () => {
    const result = cleanDesignVariant(draft({ origin: 'manual' }), 0)
    expect(result.fallback).toBe(false)
    expect(result.design).toEqual(draft())
    expect(menuDesignDraftSchema.safeParse(result.design).success).toBe(true)
  })

  it('removes picture addresses and never takes the fixed texts', () => {
    const raw = draft({
      background: { kind: 'image', imageUrl: PICTURE, imageFit: 'cover', veil: 0.2 },
      logo: { url: 'http://evil.example/x.png', size: 's', placement: 'top' },
      fixedTexts: { businessName: 'invented', contactLine: 'invented' },
    })
    const { design, fallback } = cleanDesignVariant(raw, 0)
    expect(fallback).toBe(false)
    expect(design.background).toEqual({ kind: 'texture', textureId: 'paper', imageFit: 'cover', veil: 0.2 })
    expect(design.logo).toEqual({ size: 's', placement: 'top' })
    expect(design.fixedTexts).toEqual({})
  })

  it('drops a picture address even from a background of another kind', () => {
    const raw = draft({ background: { kind: 'color', imageUrl: PICTURE, imageFit: 'cover', veil: 0 } })
    expect(cleanDesignVariant(raw, 0).design.background.imageUrl).toBeUndefined()
  })

  it.each([
    ['a font that is not on the list', draft({ fonts: { title: 'Comic Sans', section: 'heebo', dish: 'heebo' } })],
    ['an extra key', { ...draft(), css: 'body {}' }],
    ['a colour that is not six hex digits', draft({ colors: { ...draft().colors, page: 'red' } })],
    ['a text', 'not a design'],
    ['nothing', undefined],
    ['null', null],
    ['a list', []],
  ])('answers the base design of its place for %s', (_name, raw) => {
    MENU_BASE_TEMPLATES.slice(0, 3).forEach((base, i) => {
      expect(cleanDesignVariant(raw, i)).toEqual({ design: baseDesign(base), fallback: true })
    })
  })
})

describe('cleanRefinedDesign', () => {
  it("keeps the chef's picture, logo and texts whatever the answer says", () => {
    const current = mine()
    const answer = draft({
      background: { kind: 'image', imageUrl: 'https://res.cloudinary.com/other.jpg', imageFit: 'tile', veil: 0.5 },
      logo: { size: 's', placement: 'none' },
      fixedTexts: { businessName: 'invented' },
    })
    const { design, fallback } = cleanRefinedDesign(answer, current)
    expect(fallback).toBe(false)
    expect(design.background).toEqual({ kind: 'image', imageUrl: PICTURE, imageFit: 'tile', veil: 0.5 })
    expect(design.logo).toEqual(current.logo)
    expect(design.fixedTexts).toEqual(current.fixedTexts)
    expect(design.fonts).toEqual(answer.fonts)
    expect(design.origin).toBe('ai')
  })

  it('takes a new background kind without carrying the picture over', () => {
    const answer = draft({ background: { kind: 'color', imageUrl: PICTURE, imageFit: 'cover', veil: 0 } })
    const { design } = cleanRefinedDesign(answer, mine())
    expect(design.background).toEqual({ kind: 'color', imageFit: 'cover', veil: 0 })
  })

  it('answers the current design unchanged when the answer is not valid', () => {
    const current = mine()
    for (const raw of [undefined, 'text', { ...draft(), css: 'x' }, draft({ divider: 'stars' })]) {
      expect(cleanRefinedDesign(raw, current)).toEqual({ design: current, fallback: true })
    }
  })

  it('refuses an image background when the current design has no picture', () => {
    const current = baseDesign('classic')
    const answer = draft({ background: { kind: 'image', imageUrl: PICTURE, imageFit: 'cover', veil: 0 } })
    expect(cleanRefinedDesign(answer, current)).toEqual({ design: current, fallback: true })
  })
})
