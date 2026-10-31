// Server-side STL volume check, so instant prices for STL uploads can't be tampered with.

function signedVolume(ax, ay, az, bx, by, bz, cx, cy, cz) {
  return (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)) / 6
}

/** Returns volume in cm³ (STL units assumed mm) from the file's bytes, or null if it isn't a readable STL. */
export function stlVolumeCm3(buf) {
  if (buf.length < 84) return null
  const count = buf.readUInt32LE(80)
  let vol = 0
  if (84 + count * 50 === buf.length) {
    for (let i = 0; i < count; i++) {
      const o = 84 + i * 50 + 12
      const f = (k) => buf.readFloatLE(o + k * 4)
      vol += signedVolume(f(0), f(1), f(2), f(3), f(4), f(5), f(6), f(7), f(8))
    }
  } else {
    const text = buf.toString('utf8')
    if (!text.trimStart().startsWith('solid')) return null
    const v = [...text.matchAll(/vertex\s+(\S+)\s+(\S+)\s+(\S+)/g)].map((m) => [+m[1], +m[2], +m[3]])
    for (let i = 0; i + 2 < v.length; i += 3) vol += signedVolume(...v[i], ...v[i + 1], ...v[i + 2])
  }
  return Math.abs(vol) / 1000
}
