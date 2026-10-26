import { FormControl, FormGroup } from '@angular/forms'
import { useUnsavedChanges } from './unsaved-changes'

describe('useUnsavedChanges', () => {
  let form: FormGroup
  let extra: boolean

  beforeEach(() => {
    form = new FormGroup({ name: new FormControl('a') })
    extra = false
  })

  const make = (snapshot?: () => string) =>
    useUnsavedChanges({ form: () => form, extra: () => extra, ...(snapshot ? { snapshot } : {}) })

  it('is false right after markSaved', () => {
    const u = make()
    u.markSaved()
    expect(u.hasChanges()).toBeFalse()
  })

  it('is true after an edit and false again after markSaved', () => {
    const u = make()
    u.markSaved()
    form.patchValue({ name: 'b' })
    expect(u.hasChanges()).toBeTrue()
    u.markSaved()
    expect(u.hasChanges()).toBeFalse()
  })

  it('is false when the edit is put back', () => {
    const u = make()
    u.markSaved()
    form.patchValue({ name: 'b' })
    form.patchValue({ name: 'a' })
    expect(u.hasChanges()).toBeFalse()
  })

  it('extra forces true', () => {
    const u = make()
    u.markSaved()
    extra = true
    expect(u.hasChanges()).toBeTrue()
  })

  it('uses a custom snapshot', () => {
    const u = make(() => form.getRawValue().name.toLowerCase())
    u.markSaved()
    form.patchValue({ name: 'A' })
    expect(u.hasChanges()).toBeFalse()
    form.patchValue({ name: 'z' })
    expect(u.hasChanges()).toBeTrue()
  })

  it('falls back to dirty before markSaved, and after reset', () => {
    const u = make()
    expect(u.hasChanges()).toBeFalse()
    form.markAsDirty()
    expect(u.hasChanges()).toBeTrue()
    u.markSaved()
    expect(u.hasChanges()).toBeFalse()
    u.reset()
    expect(u.hasChanges()).toBeTrue()
  })

  it('is false when there is no form yet', () => {
    const u = useUnsavedChanges({ form: () => null })
    expect(u.hasChanges()).toBeFalse()
  })
})
