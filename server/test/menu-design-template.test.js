'use strict'
/**
 * Plan 764 (C-TEMPLATE): the shared menu template, read from its compiled copy (`server/generated/schemas`).
 * Its output goes into a headless browser, so the safety rules are pinned here.
 */

const fs = require('fs')
const {
  MENU_BASE_TEMPLATES, MENU_FONTS, MENU_FONT_IDS, MENU_TEXTURES, MENU_TEXTURE_IDS, SAMPLE_MENU_DOC,
  baseDesign, designCssVars, menuDocFromEvent, renderMenuDocument, resolveMenuDesign,
} = require('../generated/schemas/menu-design')
const { writeSamples } = require('../scripts/menu-sample-html')

const OPTIONS = { poweredBy: true, fonts: 'link' }
const CLOUD = 'https://res.cloudinary.com/demo/image/upload/logo.png'
const render = (design = baseDesign('classic'), doc = SAMPLE_MENU_DOC, options = OPTIONS) => renderMenuDocument(design, doc, options)
const bodyOf = html => html.slice(html.indexOf('<body>'), html.indexOf('</body>'))

/** Every visible text of the body with the opening tag that holds it. */
function textNodes(html) {
  return [...bodyOf(html).matchAll(/(<[^<>]*>)([^<>]+)(?=<)/g)]
    .map(([, tag, text]) => ({ tag, text: text.trim() }))
    .filter(node => node.text)
}

const withTexts = () => {
  const design = baseDesign('classic')
  design.fixedTexts = { businessName: 'המטבח <i>', contactLine: '050 "x" & \'y\'' }
  return design
}

describe('renderMenuDocument safety', () => {
  const nasty = {
    title: '<b>title</b>',
    subtitle: '"sub" & <x>',
    bottomNote: '</p><script>alert(1)</script>',
    sections: [{ title: '<h9>', dishes: [{ name: '<b>' }] }],
  }

  it('HTML-escapes every menu text', () => {
    const html = render(withTexts(), nasty)
    expect(html).toContain('&lt;b&gt;title&lt;/b&gt;')
    expect(html).toContain('<span dir="auto">&lt;b&gt;</span>')
    expect(html).toContain('&quot;sub&quot; &amp; &lt;x&gt;')
    expect(html).toContain('&lt;h9&gt;')
    expect(html).toContain('המטבח &lt;i&gt;')
    expect(html).toContain('050 &quot;x&quot; &amp; &#39;y&#39;')
    expect(html).not.toContain('<b>')
    expect(html).not.toContain('<i>')
  })

  it('puts dir="auto" on every text node', () => {
    const html = render(withTexts())
    const nodes = textNodes(html)
    expect(nodes.length).toBeGreaterThan(20)
    for (const node of nodes) expect(node.tag, node.text).toContain('dir="auto"')
    expect(html).toContain('<title dir="auto">')
  })

  it('writes no script, whatever the texts or the design values hold', () => {
    const design = withTexts()
    design.colors.page = '</style><script>alert(1)</script>'
    design.fonts.title = '</style><script>'
    design.frame.style = '"><script>'
    design.divider = '"><script>'
    design.logo = { url: `${CLOUD}"><script>alert(1)</script>`, size: '"><script>', placement: 'top' }
    design.background = { kind: 'image', imageUrl: `${CLOUD}")</style><script>`, imageFit: 'cover', veil: 0 }
    const html = render(design, nasty)
    expect(html.toLowerCase()).not.toContain('<script')
    expect(html.split('</style>')).toHaveLength(2)
    expect(designCssVars(design)['--md-page']).toBe(baseDesign('classic').colors.page)
  })

  it('leaves out an image that is not from Cloudinary', () => {
    for (const url of ['https://evil.example/x.png', 'http://res.cloudinary.com/x.png', 'https://res.cloudinary.com.evil.example/x.png', 'data:image/png;base64,AAAA']) {
      const design = baseDesign('modern')
      design.logo = { url, size: 'm', placement: 'top' }
      design.background = { kind: 'image', imageUrl: url, imageFit: 'cover', veil: 0.4 }
      const html = render(design)
      expect(html).not.toContain(url)
      expect(html).not.toContain('<img')
      expect(designCssVars(design)['--md-bg']).toBe('#ffffff')
    }
  })

  it('draws a Cloudinary logo and background, and no logo when its placement is none', () => {
    const design = baseDesign('modern')
    design.logo = { url: CLOUD, size: 'l', placement: 'top' }
    design.background = { kind: 'image', imageUrl: CLOUD, imageFit: 'tile', veil: 0.5 }
    expect(render(design)).toContain(`<img class="md-logo md-logo--l" src="${CLOUD}" alt="">`)
    expect(designCssVars(design)['--md-bg']).toBe(`linear-gradient(rgba(255, 255, 255, 0.5), rgba(255, 255, 255, 0.5)), url("${CLOUD}") repeat, #ffffff`)
    design.logo.placement = 'none'
    expect(render(design)).not.toContain('<img')
  })
})

describe('renderMenuDocument page', () => {
  it('is a complete A4 portrait document whose sections do not split', () => {
    const html = render()
    expect(html.startsWith('<!doctype html>')).toBe(true)
    expect(html.endsWith('</html>')).toBe(true)
    expect(html).toContain('@page { size: A4 portrait;')
    expect(html).toMatch(/\.md-section \{ break-inside: avoid;/)
    expect(html.match(/<section class="md-section">/g)).toHaveLength(4)
  })

  it('prints the powered-by line last only when asked', () => {
    const on = render()
    expect(textNodes(on).at(-1).text).toBe('Powered by FoodVibe')
    expect(render(baseDesign('classic'), SAMPLE_MENU_DOC, { poweredBy: false, fonts: 'link' })).not.toContain('Powered by FoodVibe')
  })

  it('links the design fonts from Google only in link mode', () => {
    const linked = render()
    expect(linked).toContain('https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@300;400;700&amp;family=David+Libre:wght@400;700&amp;display=swap')
    expect(render(baseDesign('classic'), SAMPLE_MENU_DOC, { poweredBy: true, fonts: 'embedded' })).not.toContain('fonts.googleapis.com')
  })

  it('writes no empty element for a missing text', () => {
    const html = render(baseDesign('minimal'), { sections: [] }, { poweredBy: false, fonts: 'link' })
    expect(textNodes(html)).toEqual([])
    expect(html).not.toContain('<header')
    expect(html).not.toContain('<footer')
  })

  it('the sample menu has four sections of Hebrew, English and mixed names', () => {
    expect(SAMPLE_MENU_DOC.sections).toHaveLength(4)
    const names = SAMPLE_MENU_DOC.sections.flatMap(s => s.dishes.map(d => d.name))
    expect(names).toContain('Beef Bourguignon')
    expect(names).toContain("פוקאצ'ה with spreads")
  })
})

describe('designCssVars and the base designs', () => {
  const KEYS = [
    '--md-page', '--md-text', '--md-title', '--md-section', '--md-accent', '--md-border', '--md-font-title', '--md-font-section',
    '--md-font-dish', '--md-title-size', '--md-section-size', '--md-dish-size', '--md-gap', '--md-frame-width', '--md-bg',
  ]

  it('returns every --md-* key for the classic design', () => {
    const vars = designCssVars(baseDesign('classic'))
    expect(Object.keys(vars).sort()).toEqual([...KEYS].sort())
    for (const key of KEYS) expect(vars[key], key).toBeTruthy()
    expect(vars['--md-font-dish']).toBe('"David Libre", serif')
  })

  it('there are four base designs and each is a fresh copy', () => {
    expect([...MENU_BASE_TEMPLATES]).toEqual(['classic', 'modern', 'rustic', 'minimal'])
    const first = baseDesign('classic')
    first.colors.page = '#000000'
    expect(baseDesign('classic').colors.page).not.toBe('#000000')
    expect(new Set(MENU_BASE_TEMPLATES.map(id => JSON.stringify(designCssVars(baseDesign(id))))).size).toBe(4)
  })

  it('lists the fourteen fonts and the six textures, each drawn in code', () => {
    expect(MENU_FONTS.map(f => f.family)).toEqual([
      'Heebo', 'Rubik', 'Assistant', 'Alef', 'Varela Round', 'Frank Ruhl Libre', 'David Libre', 'Noto Serif Hebrew', 'Bellefair',
      'Secular One', 'Suez One', 'Karantina', 'Amatic SC', 'Miriam Libre',
    ])
    expect([...MENU_FONT_IDS]).toEqual(MENU_FONTS.map(f => f.id))
    expect([...MENU_TEXTURE_IDS]).toEqual(['paper', 'linen', 'kraft', 'slate', 'marble', 'dots'])
    for (const texture of MENU_TEXTURES) {
      expect(texture.layers, texture.id).not.toMatch(/https?:\/\/(?!www\.w3\.org)/)
      expect(texture.layers, texture.id).toMatch(/gradient\(|data:image\/svg\+xml/)
      const design = baseDesign('classic')
      design.background = { kind: 'texture', textureId: texture.id, imageFit: 'cover', veil: 0 }
      expect(designCssVars(design)['--md-bg']).toBe(`${texture.layers}, ${design.colors.page}`)
    }
  })
})

describe('menuDocFromEvent', () => {
  const lookups = {
    dishName: id => ({ r1: 'שניצל', r2: 'Soup' })[id],
    sectionLabel: key => ({ starters: 'פתיחה', mains: 'עיקריות' })[key],
  }

  it('names linked dishes from the catalog and writes unlinked dishes and sections as stored', () => {
    const doc = menuDocFromEvent({
      name: 'ערב', subtitle: 'sub', bottomNote: 'note',
      sections: [
        { name: 'mains', sortOrder: 2, items: [{ recipeId: 'r1' }, { recipeId: '', unlinkedName: '  Chef <special>  ' }] },
        { name: '', unlinkedName: 'מהטאבון  ', sortOrder: 3, items: [] },
        { name: 'starters', sortOrder: 1, items: [{ recipeId: 'r2' }, { recipeId: 'gone' }] },
        { name: 'no_label', sortOrder: 4 },
      ],
    }, lookups)
    expect(doc).toEqual({
      title: 'ערב', subtitle: 'sub', bottomNote: 'note',
      sections: [
        { title: 'פתיחה', dishes: [{ name: 'Soup' }] },
        { title: 'עיקריות', dishes: [{ name: 'שניצל' }, { name: '  Chef <special>  ' }] },
        { title: 'מהטאבון  ', dishes: [] },
        { title: 'no_label', dishes: [] },
      ],
    })
  })

  it('an empty event gives an empty doc', () => {
    expect(menuDocFromEvent({}, lookups)).toEqual({ sections: [] })
  })
})

describe('resolveMenuDesign', () => {
  const own = { _id: 'own', createdAt: 3 }
  const standard = { _id: 'std', createdAt: 2 }
  const oldest = { _id: 'old', createdAt: 1 }
  const designs = [own, standard, oldest]
  const business = { menuDesign: { defaultDesignId: 'std', hidePoweredBy: false } }

  it('takes the menu\'s own live design', () => {
    expect(resolveMenuDesign({ designId: 'own' }, designs, business)).toBe(own)
  })

  it('takes the business default when the menu has none or its design was deleted', () => {
    expect(resolveMenuDesign({}, designs, business)).toBe(standard)
    expect(resolveMenuDesign({ designId: 'own' }, [{ ...own, deletedAt: 5 }, standard, oldest], business)).toBe(standard)
  })

  it('takes the first live design by createdAt when there is no live default', () => {
    expect(resolveMenuDesign({}, designs, {})).toBe(oldest)
    expect(resolveMenuDesign({ designId: 'nope' }, [own, { ...standard, deletedAt: 5 }, { ...oldest, deletedAt: 5 }], business)).toBe(own)
  })

  it('takes the classic base template when there is no live design', () => {
    expect(resolveMenuDesign({ designId: 'own' }, [], business)).toEqual(baseDesign('classic'))
    expect(resolveMenuDesign(null, [{ ...own, deletedAt: 5 }], null)).toEqual(baseDesign('classic'))
  })
})

describe('menu-sample-html script', () => {
  it('writes one HTML file per base template and returns the four paths', () => {
    const files = writeSamples()
    try {
      expect(files).toHaveLength(4)
      for (const [i, id] of MENU_BASE_TEMPLATES.entries()) {
        expect(files[i].endsWith(`menu-sample-${id}.html`)).toBe(true)
        expect(fs.readFileSync(files[i], 'utf8')).toContain('Beef Bourguignon')
      }
    } finally {
      for (const file of files) fs.rmSync(file)
    }
  })
})
