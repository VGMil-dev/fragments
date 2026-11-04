const task = await taskSpace(1);
const page = task.page('p1');
for (const [width, height, mobile, label] of [[390, 844, true, 'mobile'], [768, 1024, true, 'tablet'], [1440, 960, false, 'desktop']]) {
  await page.cdp('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });
  await page.goto('http://127.0.0.1:5173/');
  await page.waitForSelector('.hero .button');
  await page.waitForTimeout(100);
  console.log(label, JSON.stringify(await page.evaluate(() => ({
    viewport: innerWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
    ctaWithinViewport: (() => { const r = document.querySelector('.button').getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth; })(),
    imageLoaded: document.querySelector('.art-frame img').naturalWidth > 0,
    missingAnchors: [...document.querySelectorAll('a[href^="#"]')].map(a => a.hash).filter(h => !document.querySelector(h)),
  }))));
  console.log(`${label} screenshot`, await page.screenshot({ path: `C:/Users/vgmil/.codex/worktrees/f01-brand/Fragments/task-list/F01/screenshots/f01-${label}-${width}.png` }));
}
await page.cdp('Emulation.setDeviceMetricsOverride', { width: 768, height: 1024, deviceScaleFactor: 1, mobile: true });
await page.goto('http://127.0.0.1:5173/');
await page.waitForSelector('.hero .button');
await page.keyboard.press('Tab');
await page.waitForTimeout(250);
console.log('tablet focus screenshot', await page.screenshot({ path: 'C:/Users/vgmil/.codex/worktrees/f01-brand/Fragments/task-list/F01/screenshots/f01-tablet-focus-768.png' }));
console.log('focus', JSON.stringify(await page.evaluate(() => ({
  target: document.activeElement.getAttribute('href'),
  outlineStyle: getComputedStyle(document.activeElement).outlineStyle,
  outlineWidth: getComputedStyle(document.activeElement).outlineWidth,
  skipTransform: getComputedStyle(document.activeElement).transform,
}))));
await page.press('.skip-link', 'Enter');
console.log('skip activation', JSON.stringify(await page.evaluate(() => ({ hash: location.hash, focus: document.activeElement.id }))));
await page.focus('.hero .button');
await page.press('.hero .button', 'Enter');
await page.waitForTimeout(100);
console.log('CTA activation', JSON.stringify(await page.evaluate(() => ({ hash: location.hash, targetExists: Boolean(document.querySelector(location.hash)) }))));
await page.cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
console.log('reduced motion', JSON.stringify(await page.evaluate(() => ({
  preference: matchMedia('(prefers-reduced-motion: reduce)').matches,
  transition: getComputedStyle(document.querySelector('.button')).transitionDuration,
  animatedDecorations: [...document.querySelectorAll('*')].filter(el => getComputedStyle(el).animationName !== 'none' && getComputedStyle(el).animationDuration !== '0s').length,
}))));
console.log('meta', JSON.stringify(await page.evaluate(() => Object.fromEntries(
  ['title', 'description', 'theme-color', 'og:title', 'og:description', 'og:image'].map(k => [
    k,
    k === 'title' ? document.title : document.querySelector(`meta[name="${k}"],meta[property="${k}"]`)?.content,
  ]),
))));
const assets = await Promise.all(['/icon.svg', '/favicon.svg', '/apple-touch-icon.svg', '/og-image.svg', '/hero-fragments.webp', '/flower.svg', '/sparkle.svg'].map(async path => {
  const response = await page.fetch(path);
  return { path, status: response.status };
}));
console.log('assets', JSON.stringify(assets));
