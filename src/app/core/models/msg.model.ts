export interface Msg {
  txt: string
  type: string
  /** Optional undo callback; when set, the message UI shows an "Undo" action. */
  undo?: () => void
}
