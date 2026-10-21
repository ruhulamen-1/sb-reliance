// Google Analytics 4 events for leads. Nothing happens unless Analytics is on (Admin > Settings > measurement ID),
// and the tag is never loaded on /admin, so admin work is not counted.
type Gtag = (...a: unknown[]) => void;

export function track(name: string, params: Record<string, string | number | undefined> = {}) {
  const gtag = (window as unknown as { gtag?: Gtag }).gtag;
  if (gtag) gtag('event', name, params);
}

// where on the page a link sits, so reports can tell the hero button from the footer link
function placeOf(el: Element) {
  if (el.closest('.cardpage')) return 'qr_page';
  if (el.closest('.hero')) return 'hero';
  if (el.closest('#quote')) return 'quote_section';
  if (el.closest('footer, .foot')) return 'footer';
  if (el.closest('header, .topbar')) return 'header';
  if (el.closest('.fab, .mbar, .chat, .cp-bar, [class*="float"]')) return 'floating_button';
  return 'page';
}

/** One listener for the whole site: WhatsApp, phone and email links are counted wherever they are. */
export function trackContactClicks() {
  document.addEventListener('click', (e) => {
    const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
    if (!a) return;
    const href = a.getAttribute('href') || '';
    const name = /^https:\/\/(wa\.me|api\.whatsapp\.com)\//i.test(href) ? 'whatsapp_click'
      : /^tel:/i.test(href) ? 'phone_click'
      : /^mailto:/i.test(href) ? 'email_click'
      : /google\.[a-z.]+\/maps|maps\.app\.goo\.gl/i.test(href) ? 'map_click'
      : /g\.page\/r\/|search\.google\.com\/local\/writereview/i.test(href) ? 'review_click'
      : '';
    if (name) track(name, { link_location: placeOf(a) });
  }, { capture: true });
}
