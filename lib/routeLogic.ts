import { getDistanceFromLatLonInKm } from './utils';

type Point = { lat: number, lon: number };

// Returns distance in km from start of shape to the point projected onto the shape
export function getDistanceAlongRoute(point: Point, shape: [number, number][]): number {
  if (shape.length < 2) return 0;

  let minDistanceToShape = Infinity;
  let bestCumulativeDistance = 0;
  let currentCumulativeDistance = 0;

  for (let i = 0; i < shape.length - 1; i++) {
    const start = { lat: shape[i][0], lon: shape[i][1] };
    const end = { lat: shape[i+1][0], lon: shape[i+1][1] };

    const segmentLength = getDistanceFromLatLonInKm(start.lat, start.lon, end.lat, end.lon);

    // Project point onto segment
    const { fraction } = projectPointOnSegment(point, start, end);
    
    // Calculate actual projected point for accurate distance to segment
    const projectedLat = start.lat + fraction * (end.lat - start.lat);
    const projectedLon = start.lon + fraction * (end.lon - start.lon);

    // Distance from point to the line segment
    const distToSegment = getDistanceFromLatLonInKm(point.lat, point.lon, projectedLat, projectedLon);

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

export function getShapeLength(shape: [number, number][]): number {
    let length = 0;
    for (let i = 0; i < shape.length - 1; i++) {
        length += getDistanceFromLatLonInKm(
            shape[i][0], shape[i][1], 
            shape[i+1][0], shape[i+1][1]
        );
    }
    return length;
}

/**
 * Estimates the ETA (in minutes) for a bus to reach a stop.
 * 
 * For loop/circular routes, when the bus is past the stop, it calculates
 * the wrap-around distance: (totalShapeLength - busDist) + stopDist
 * 
 * @param busLocation - Current bus GPS coordinates
 * @param stopLocation - Target stop GPS coordinates  
 * @param shape - Route shape as array of [lat, lon] points
 * @param speedKmH - Average bus speed in km/h (default: 30)
 * @param isLoop - Whether route is circular/loop (default: true)
 * @returns Minutes until arrival, 0 if arriving (< 50m), or null if bus has passed (linear routes only)
 */
export function estimateETA(
  busLocation: Point,
  stopLocation: Point,
  shape: [number, number][],
  speedKmH: number = 30,
  isLoop: boolean = true
): number | null {
  // Edge case: empty or single-point shapes
  if (!shape || shape.length < 2) {
    return null;
  }

  // Edge case: invalid speed
  if (speedKmH <= 0) {
    speedKmH = 30; // fallback to default
  }

  const busDist = getDistanceAlongRoute(busLocation, shape);
  const stopDist = getDistanceAlongRoute(stopLocation, shape);
  
  const totalLength = getShapeLength(shape);
  
  // Edge case: invalid shape length
  if (totalLength <= 0) {
    return null;
  }

  let distanceRemaining = stopDist - busDist;

  // Minimum distance threshold: 50m (0.05km)
  // If bus is within 50m of the stop, return 0 (UI can show "Arriving")
  const ARRIVING_THRESHOLD_KM = 0.05;

  // Check if bus has passed the stop (stopDist < busDist)
  if (distanceRemaining < -ARRIVING_THRESHOLD_KM) {
      if (isLoop) {
          // Loop/circular route: calculate wrap-around distance
          // Distance = (distance remaining to end of route) + (distance from start to stop)
          // Which simplifies to: (totalLength - busDist) + stopDist
          distanceRemaining = (totalLength - busDist) + stopDist;
      } else {
          // Linear route: bus has passed the stop, no valid ETA
          return null;
      }
  }

  // If bus is within the arriving threshold or slightly behind due to GPS variance
  if (distanceRemaining < ARRIVING_THRESHOLD_KM) {
    distanceRemaining = 0;
  }

  const timeHours = distanceRemaining / speedKmH;
  const timeMinutes = timeHours * 60;

  return timeMinutes;
}
