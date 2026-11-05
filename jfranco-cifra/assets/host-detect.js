// Cifra — the host signature (canonical snippet for Fanal and its skins).
// Detects the operating system and the form factor, exposes body classes
// and the OS-adaptive text matrix. Embed this in any Fanal skin.
(function () {
  const ua = navigator.userAgent || "";
  const touch = ("ontouchstart" in window) || navigator.maxTouchPoints > 2;
  let os = "other";
  if (/iPhone|iPad|iPod/.test(ua)) os = "ios";
  else if (/Android/.test(ua)) os = "android";
  else if (/Mac|Macintosh/.test(ua)) os = "mac";
  else if (/Windows/.test(ua)) os = "win";
  else if (/Linux/.test(ua)) os = "linux";
  let form = "desktop";
  if (os === "ios" || os === "android") form = "phone";
  else if (touch && Math.min(screen.width, screen.height) > 700) form = "tablet";
  const electron = !!(window.process && window.process.versions && window.process.versions.electron);
  const kiosk = electron && /kiosk/.test(ua);
  const standalone = navigator.standalone === true || (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches);
  const HOST = { os, form, touch, electron, kiosk, standalone };
  document.body.classList.add("os-" + os, "form-" + form);
  if (touch) document.body.classList.add("touch");
  if (standalone) document.body.classList.add("standalone");
  if (electron) document.body.classList.add("electron");
  if (kiosk) document.body.classList.add("kiosk");
  window.CIFRA = HOST;
  return HOST;
})();
