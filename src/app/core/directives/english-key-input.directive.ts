import { Directive, ElementRef, inject } from '@angular/core'
import { codeToEnglishChar, finalizeEnglishKey, liveEnglishKey } from '@utils/english-key.util'

/**
 * English translation-key input: physical keys type English even when the OS layout is Hebrew,
 * spaces become `_` and letters are lowercased live; blur finalizes (collapse/trim `_`).
 * Every value change dispatches `input` so a bound `ngModel` sees it.
 */
@Directive({
  selector: 'input[englishKeyInput]',
  standalone: true,
  host: {
    dir: 'ltr',
    lang: 'en',
    autocomplete: 'off',
    autocorrect: 'off',
    autocapitalize: 'off',
    spellcheck: 'false',
    '(keydown)': 'onKeydown($event)',
    '(input)': 'onInput($event)',
    '(compositionend)': 'normalizeLive()',
    '(blur)': 'onBlur()'
  }
})
export class EnglishKeyInputDirective {
  private readonly el = inject<ElementRef<HTMLInputElement>>(ElementRef)

  protected onKeydown(event: KeyboardEvent): void {
    if (event.ctrlKey || event.metaKey || event.altKey) return
    // Mobile on-screen keyboards send key 'Unidentified' / keyCode 229 — the input handler covers them
    if (event.isComposing || event.key === 'Unidentified' || event.keyCode === 229) return
    const char = event.code === 'Space' ? '_' : codeToEnglishChar(event.code)
    if (!char || event.key === char) return
    event.preventDefault()
    this.insertAtCaret(char)
  }

  protected onInput(event: Event): void {
    if ((event as InputEvent).isComposing) return
    this.normalizeLive()
  }

  protected normalizeLive(): void {
    this.applyValue(liveEnglishKey(this.el.nativeElement.value))
  }

  protected onBlur(): void {
    this.applyValue(finalizeEnglishKey(this.el.nativeElement.value))
  }

  private insertAtCaret(char: string): void {
    const input = this.el.nativeElement
    const start = input.selectionStart ?? input.value.length
    const end = input.selectionEnd ?? start
    input.setRangeText(char, start, end, 'end')
    this.notifyChange()
  }

  /** Writes the value only when it changed, keeping the caret when the length is unchanged. */
  private applyValue(next: string): void {
    const input = this.el.nativeElement
    if (next === input.value) return
    const sameLength = next.length === input.value.length
    const start = input.selectionStart
    const end = input.selectionEnd
    input.value = next
    if (sameLength && start !== null && end !== null && document.activeElement === input) {
      input.setSelectionRange(start, end)
    }
    this.notifyChange()
  }

  private notifyChange(): void {
    this.el.nativeElement.dispatchEvent(new Event('input', { bubbles: true }))
  }
}
