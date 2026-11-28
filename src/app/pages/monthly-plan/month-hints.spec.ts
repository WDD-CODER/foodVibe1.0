import { defaultFixed, type FixedGroup } from '@schemas/month/month-rules'
import { missingHint, unenteredLinesHint } from './month-hints'

const WORDS: Record<string, string> = {
  mp_missing: 'חסר: {{list}}',
  mp_missing_revenue: 'הכנסה בפועל',
  mp_missing_labour: 'עלות צוות בפועל',
  mp_missing_plan_revenue: 'הכנסה צפויה',
  mp_missing_plan_food: 'עלות מזון צפויה',
  mp_missing_plan_labour: 'עלות צוות צפויה',
  mp_missing_plan_fixed: 'הוצאות קבועות צפויות',
  mp_fixed_missing_lines: 'לא הוזנו בפועל: {{list}}',
  mp_fixed_electricity: 'חשמל',
  mp_fixed_water: 'מים',
  mp_fixed_unnamed: 'שורה ללא שם'
}
const translate = (key: string) => WORDS[key] ?? key

describe('month hints (plan 749)', () => {
  it('lists the missing inputs with the labels of their column', () => {
    expect(missingHint(['revenue', 'labour'], 'actual', translate)).toBe('חסר: הכנסה בפועל, עלות צוות בפועל')
    expect(missingHint(['revenue', 'foodCost', 'labour', 'fixed'], 'plan', translate)).toBe(
      'חסר: הכנסה צפויה, עלות מזון צפויה, עלות צוות צפויה, הוצאות קבועות צפויות'
    )
  })

  it('is empty when nothing is missing', () => {
    expect(missingHint([], 'actual', translate)).toBe('')
  })

  it('names the lines without an actual: starter lines by the dictionary, own lines by name', () => {
    const fixed: FixedGroup = {
      mode: 'lines',
      rough: { plan: null, actual: null },
      lines: [
        { id: 'electricity', starterKey: 'electricity', plan: 1, actual: null },
        { id: 'rent', starterKey: 'rent', plan: null, actual: 0 },
        { id: 'water', starterKey: 'water', plan: null, actual: null },
        { id: 'own1', name: 'הנהלת חשבונות', plan: null, actual: null },
        { id: 'own2', name: '  ', plan: null, actual: null }
      ]
    }
    expect(unenteredLinesHint(fixed, translate)).toBe('לא הוזנו בפועל: חשמל, מים, הנהלת חשבונות, שורה ללא שם')
  })

  it('is empty in the estimated mode and when every line is entered', () => {
    expect(unenteredLinesHint({ ...defaultFixed(), mode: 'rough' }, translate)).toBe('')
    const entered = { ...defaultFixed(), lines: defaultFixed().lines.map((l) => ({ ...l, actual: 1 })) }
    expect(unenteredLinesHint(entered, translate)).toBe('')
  })
})
