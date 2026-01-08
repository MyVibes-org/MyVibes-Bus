import { getDistanceFromLatLonInKm } from './utils';

type Point = { lat: number, lon: number };

// Returns distance in km from start of shape to the point projected onto the shape
export function getDistanceAlongRoute(point: Point, shape: [number, number][]): number {
  if (shape.length < 2) return 0;

  let minDistanceToShape = Infinity;
  let distanceAlongShape = 0;
  let bestCumulativeDistance = 0;

  let currentCumulativeDistance = 0;

  for (let i = 0; i < shape.length - 1; i++) {
    const start = { lat: shape[i][0], lon: shape[i][1] };
    const end = { lat: shape[i+1][0], lon: shape[i+1][1] };

    const segmentLength = getDistanceFromLatLonInKm(start.lat, start.lon, end.lat, end.lon);

    // Project point onto segment
    const { projectedPoint, fraction } = projectPointOnSegment(point, start, end);

    // Distance from point to the line segment
    const distToSegment = getDistanceFromLatLonInKm(point.lat, point.lon, projectedPoint.lat, projectedPoint.lon);

    if (distToSegment < minDistanceToShape) {
      minDistanceToShape = distToSegment;
      bestCumulativeDistance = currentCumulativeDistance + (fraction * segmentLength);
    }

    currentCumulativeDistance += segmentLength;
  }

  return bestCumulativeDistance;
}

function projectPointOnSegment(p: Point, a: Point, b: Point): { projectedPoint: Point, fraction: number } {
  const L2 = (b.lat - a.lat)**2 + (b.lon - a.lon)**2;
  if (L2 === 0) return { projectedPoint: a, fraction: 0 };

  // This is a planar projection approximation, which is okay for short distances (bus stops)
  // For high precision GPS, we would use spherical projection, but this is sufficient for relative progress.
  let t = ((p.lat - a.lat) * (b.lat - a.lat) + (p.lon - a.lon) * (b.lon - a.lon)) / L2;
  t = Math.max(0, Math.min(1, t));

  return {
    projectedPoint: {
      lat: a.lat + t * (b.lat - a.lat),
      lon: a.lon + t * (b.lon - a.lon)
    },
    fraction: t
  };
}

export function estimateETA(
  busLocation: Point,
  stopLocation: Point,
  shape: [number, number][],
  speedKmH: number = 30
): number | null {
  const busDist = getDistanceAlongRoute(busLocation, shape);
  const stopDist = getDistanceAlongRoute(stopLocation, shape);

  // If bus is ahead of stop by a small margin, it might be passing.
  // If bus is far ahead, it has passed.
  // We assume linear route (A -> B).

  if (stopDist < busDist) {
      // Stop is behind the bus
      return null;
  }

  const distDiff = stopDist - busDist; // km
  const timeHours = distDiff / speedKmH;
  const timeMinutes = timeHours * 60;

  return timeMinutes;
}
