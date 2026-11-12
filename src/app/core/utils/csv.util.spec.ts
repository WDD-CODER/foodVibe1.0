import { downloadCsv, toCsv } from './csv.util'

interface Row {
  a: string | number | null | undefined
  b?: string
}
const cols = [
  { header: 'A', value: (r: Row) => r.a },
  { header: 'B', value: (r: Row) => r.b }
]

describe('toCsv', () => {
  it('starts with a UTF-8 BOM, then the header row, and ends rows with CRLF', () => {
    const text = toCsv(cols, [{ a: 1, b: 'x' }])
    expect(text.charCodeAt(0)).toBe(0xfeff)
    expect(text.slice(1)).toBe('A,B\r\n1,x\r\n')
  })

  it('quotes cells with commas and quotes, doubling the quotes', () => {
    expect(toCsv(cols, [{ a: 'a,b', b: 'say "hi"' }])).toContain('"a,b","say ""hi"""')
  })

  it('keeps a line break inside one quoted cell', () => {
    expect(toCsv(cols, [{ a: 'one\ntwo', b: '' }])).toContain('"one\ntwo",')
  })

  it('keeps Hebrew and writes null / undefined as empty', () => {
    expect(toCsv(cols, [{ a: 'שלום', b: undefined }, { a: null }]).slice(1)).toBe('A,B\r\nשלום,\r\n,\r\n')
  })

  it('prefixes a cell starting with = + - or @ with an apostrophe', () => {
    for (const c of ['=SUM(A1)', '+1', '-1', '@x']) {
      expect(toCsv(cols, [{ a: c }])).toContain(`\r\n'${c},`)
    }
    expect(toCsv(cols, [{ a: 'a=b' }])).toContain('\r\na=b,')
  })
})

describe('downloadCsv', () => {
  it('clicks a link with the file name and revokes the object URL', () => {
    const create = spyOn(URL, 'createObjectURL').and.returnValue('blob:x')
    const revoke = spyOn(URL, 'revokeObjectURL')
    let name = ''
    spyOn(HTMLAnchorElement.prototype, 'click').and.callFake(function (this: HTMLAnchorElement) {
      name = this.download
    })
    downloadCsv('x', 'clients-2026-01-01.csv')
    expect(name).toBe('clients-2026-01-01.csv')
    expect(create).toHaveBeenCalled()
    expect(revoke).toHaveBeenCalledWith('blob:x')
  })
})
