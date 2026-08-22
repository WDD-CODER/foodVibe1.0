// Shared swipeable-field-carousel logic for mobile row cards.
// Markup contract per carousel instance:
//   <div class="fc-car-outer" data-car-outer>
//     <div class="fc-car-track" data-car-track>
//       <div data-label="שם שדה">value</div>  (one child per page)
//     </div>
//     <button data-car-prev>‹</button>
//     <button data-car-next>›</button>
//     <div class="fc-car-dots"><button data-car-dot data-idx="0"></button>...</div>
//   </div>

export function measureCarousel(outerEl) {
  if (!outerEl) return;
  const track = outerEl.querySelector('[data-car-track]');
  if (!track) return;
  let max = 0;
  Array.from(track.children).forEach((child) => { max = Math.max(max, child.scrollWidth); });
  if (max) outerEl.style.width = max + 'px';
  updateArrows(track);
  if (!track.dataset.scrollBound) {
    track.dataset.scrollBound = '1';
    track.addEventListener('scroll', () => updateArrows(track));
  }
}

export function updateArrows(track) {
  const outer = track.closest('[data-car-outer]');
  if (!outer) return;
  const prev = outer.querySelector('[class*="-car-prev"]');
  const next = outer.querySelector('[class*="-car-next"]');
  const dots = outer.querySelectorAll('[data-idx]');
  const w = track.clientWidth || 1;
  const idx = Math.round(Math.abs(track.scrollLeft) / w) || 0;
  const maxIdx = track.children.length - 1;
  if (prev) prev.style.visibility = idx > 0 ? 'visible' : 'hidden';
  if (next) next.style.visibility = idx < maxIdx ? 'visible' : 'hidden';
  dots.forEach((d, i) => { d.style.opacity = i === idx ? '1' : '0.35'; });
}

export function scrollCarousel(fromEl, dir) {
  const outer = fromEl.closest('[data-car-outer]');
  const track = outer && outer.querySelector('[data-car-track]');
  if (!track) return;
  const rtl = getComputedStyle(track).direction === 'rtl';
  track.scrollBy({ left: track.clientWidth * (rtl ? -dir : dir), behavior: 'smooth' });
}

export function scrollCarouselToDot(dotEl) {
  const idx = Number(dotEl.dataset.idx || 0);
  const outer = dotEl.closest('[data-car-outer]');
  const track = outer && outer.querySelector('[data-car-track]');
  if (!track) return;
  const rtl = getComputedStyle(track).direction === 'rtl';
  track.scrollTo({ left: track.clientWidth * idx * (rtl ? -1 : 1), behavior: 'smooth' });
}

export function measureAll(root) {
  (root || document).querySelectorAll('[data-car-outer]').forEach(measureCarousel);
}

// Call from componentDidMount(); returns a disposer for componentWillUnmount().
export function attachCarouselWatcher() {
  requestAnimationFrame(() => measureAll());
  const onResize = () => measureAll();
  window.addEventListener('resize', onResize);
  let raf = null;
  const observer = new MutationObserver(() => {
    if (raf) return;
    raf = requestAnimationFrame(() => { raf = null; measureAll(); });
  });
  observer.observe(document.body, { childList: true, subtree: true });
  return () => { window.removeEventListener('resize', onResize); observer.disconnect(); };
}
