import { AfterViewInit, DestroyRef, Directive, ElementRef, HostListener, inject } from '@angular/core'

@Directive({
  selector: '[scrollIndicators]',
  standalone: true
})
export class ScrollIndicatorsDirective implements AfterViewInit {
  private readonly el = inject(ElementRef<HTMLElement>)
  private readonly destroyRef = inject(DestroyRef)

  ngAfterViewInit(): void {
    requestAnimationFrame(() => this.update())

    // Content that arrives or changes after init (async data, paging, filters, a panel opening)
    // changes scrollHeight without a scroll or window resize — re-check on those too.
    const host = this.el.nativeElement as HTMLElement
    const schedule = (): void => {
      requestAnimationFrame(() => this.update())
    }
    const mutations = new MutationObserver(schedule)
    mutations.observe(host, { childList: true, subtree: true })
    const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule)
    resize?.observe(host)
    this.destroyRef.onDestroy(() => {
      mutations.disconnect()
      resize?.disconnect()
    })
  }

  @HostListener('scroll')
  onScroll(): void {
    this.update()
  }

  @HostListener('window:resize')
  onResize(): void {
    this.update()
  }

  private update(): void {
    const host = this.el.nativeElement
    const threshold = 1
    const scrollTop = host.scrollTop
    const clientHeight = host.clientHeight
    const scrollHeight = host.scrollHeight

    const canScrollUp = scrollTop > threshold
    const canScrollDown = scrollTop + clientHeight < scrollHeight - threshold

    host.classList.toggle('can-scroll-up', canScrollUp)
    host.classList.toggle('can-scroll-down', canScrollDown)
  }
}
