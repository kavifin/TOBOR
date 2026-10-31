// The TOBOR logo as images, for places drawn on canvas (phone screen, box label, van livery).
// The film waits for `logosReady` so its textures are painted with the real logo.

function load(src) {
  const img = new Image()
  img.decoding = 'async'
  img.src = src
  return img
}

export const logos = {
  dark: load('/brand/tobor-logo.webp'),
  light: load('/brand/tobor-logo-light.webp'),
}

// Never hold the film back for long: decoding can stall in background tabs.
export const logosReady = Promise.race([
  Promise.all(Object.values(logos).map((img) => img.decode().catch(() => {}))),
  new Promise((resolve) => setTimeout(resolve, 2000)),
])

/** Draws the logo at (x, y) with the given height. Returns the drawn width. */
export function drawLogo(ctx, img, x, y, height) {
  if (!img.complete || !img.naturalWidth) return 0
  const width = (height * img.naturalWidth) / img.naturalHeight
  ctx.drawImage(img, x, y, width, height)
  return width
}
