export interface BulkEditableField {
  key: string
  label: string
  options: { value: string; label: string }[]
  addNewValue?: string
  multi?: boolean
}
