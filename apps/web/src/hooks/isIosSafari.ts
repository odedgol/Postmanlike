export function isIosSafariUA(ua: string): boolean {
  // Only iOS Safari lacks beforeinstallprompt. Chrome/Firefox on iOS (CriOS,
  // FxiOS) share WebKit but still don't fire it either — treat them the same
  // since the Add-to-Home-Screen path is identical.
  const isIOS = /iPhone|iPad|iPod/.test(ua);
  if (!isIOS) return false;
  // Edge cases: iPad on iPadOS 13+ reports as Mac; we only show the hint for
  // explicit iOS UAs to avoid showing it on desktop Safari.
  return /AppleWebKit/.test(ua);
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia?.('(display-mode: standalone)').matches) return true;
  // iOS Safari: navigator.standalone is a vendor property.
  return (navigator as unknown as { standalone?: boolean }).standalone === true;
}
