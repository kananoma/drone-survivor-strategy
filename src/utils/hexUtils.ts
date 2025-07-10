import { AxialCoordinates, CubeCoordinates, Hex } from '../types'

export function axialToId(q: number, r: number): string {
  return `${q},${r}`
}

export function idToAxial(id: string): AxialCoordinates {
  const parts = id.split(',')
  return { q: parseInt(parts[0], 10), r: parseInt(parts[1], 10) }
}

export function axialToCube(hex: AxialCoordinates): CubeCoordinates {
  return { q: hex.q, r: hex.r, s: -hex.q - hex.r }
}

export function cubeToAxial(cube: CubeCoordinates): AxialCoordinates {
  return { q: cube.q, r: cube.r }
}

const AXIAL_DIRECTIONS: AxialCoordinates[] = [
  { q: +1, r: 0 },
  { q: +1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: +1 },
  { q: 0, r: +1 },
] // These directions are universal for axial coordinates

export function getNeighbors(coords: AxialCoordinates): AxialCoordinates[] {
  return AXIAL_DIRECTIONS.map((direction) => ({
    q: coords.q + direction.q,
    r: coords.r + direction.r,
  }))
}

export function axialDistance(a: AxialCoordinates, b: AxialCoordinates): number {
  const ac = axialToCube(a)
  const bc = axialToCube(b)
  return (Math.abs(ac.q - bc.q) + Math.abs(ac.r - bc.r) + Math.abs(ac.s - bc.s)) / 2
}

export function generateHexMap(radius: number): Map<string, Hex> {
  const hexes = new Map<string, Hex>()
  for (let q = -radius; q <= radius; q++) {
    for (let r = -radius; r <= radius; r++) {
      const s = -q - r
      if (Math.abs(s) <= radius) {
        const id = axialToId(q, r)
        hexes.set(id, { id, q, r, dangerLevel: 0 })
      }
    }
  }
  return hexes
}

// For rendering: convert axial to pixel (using pointy-top layout logic for vertical columns, but rendering flat-top shapes)
export function axialToPixel(coords: AxialCoordinates, hexSize: number): { x: number; y: number } {
  const x = hexSize * ((3 / 2) * coords.q)
  const y = hexSize * ((Math.sqrt(3) / 2) * coords.q + Math.sqrt(3) * coords.r)
  return { x, y }
}

// For click handling: convert pixel to axial (pointy-top layout logic, approximate)
export function pixelToAxial(x: number, y: number, hexSize: number): AxialCoordinates {
  const q_approx = ((2 / 3) * x) / hexSize
  const r_approx = ((-1 / 3) * x + (Math.sqrt(3) / 3) * y) / hexSize
  return cubeToAxial(cubeRound({ q: q_approx, r: r_approx, s: -q_approx - r_approx })) // Round to nearest hex
}

function cubeRound(cube: CubeCoordinates): CubeCoordinates {
  let rq = Math.round(cube.q)
  let rr = Math.round(cube.r)
  let rs = Math.round(cube.s)

  const qDiff = Math.abs(rq - cube.q)
  const rDiff = Math.abs(rr - cube.r)
  const sDiff = Math.abs(rs - cube.s)

  if (qDiff > rDiff && qDiff > sDiff) {
    rq = -rr - rs
  } else if (rDiff > sDiff) {
    rr = -rq - rs
  } else {
    rs = -rq - rr
  }
  return { q: rq, r: rr, s: rs }
}

export function getLineOfSight(
  start: AxialCoordinates,
  end: AxialCoordinates,
  maxDistance: number,
  hexes: Map<string, Hex>
): AxialCoordinates[] {
  const distance = axialDistance(start, end)
  if (distance > maxDistance) return []

  const N = distance
  const results: AxialCoordinates[] = []
  if (N === 0) return [start]

  for (let i = 0; i <= N; i++) {
    const t = N === 0 ? 0.0 : i / N
    const q_lerp = start.q + (end.q - start.q) * t
    const r_lerp = start.r + (end.r - start.r) * t
    const roundedHex = cubeToAxial(cubeRound({ q: q_lerp, r: r_lerp, s: -q_lerp - r_lerp }))
    if (hexes.has(axialToId(roundedHex.q, roundedHex.r))) {
      // Add only if it's a new hex in the line
      if (!results.find((h) => h.q === roundedHex.q && h.r === roundedHex.r)) {
        results.push(roundedHex)
      }
    }
  }
  return results
}

export function getHexesInRange(center: AxialCoordinates, range: number, allHexes: Map<string, Hex>): Hex[] {
  const results: Hex[] = []
  for (let q = -range; q <= range; q++) {
    for (let r = -range; r <= range; r++) {
      const s = -q - r
      if (Math.abs(s) <= range) {
        // This condition forms a hexagonal area
        const targetQ = center.q + q
        const targetR = center.r + r
        // Check if the cube coordinates sum to 0 for validity if needed,
        // but axialDistance from center is implicitly handled by loops.
        // We only care if the hex exists in allHexes.
        if (axialDistance(center, { q: targetQ, r: targetR }) <= range) {
          const hex = allHexes.get(axialToId(targetQ, targetR))
          if (hex) {
            results.push(hex)
          }
        }
      }
    }
  }
  return results
}

export function areAxialCoordsEqual(a: AxialCoordinates, b: AxialCoordinates): boolean {
  return a.q === b.q && a.r === b.r
}
