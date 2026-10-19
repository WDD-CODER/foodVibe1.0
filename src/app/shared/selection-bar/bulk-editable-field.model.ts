export interface BulkEditableField {
  key: string
  label: string
  options: { value: string; label: string }[]
  addNewValue?: string
  /** Generic "add new <thing>" key for the add option (add-option rule 2). */
  addNewLabelKey?: string
  multi?: boolean
}
