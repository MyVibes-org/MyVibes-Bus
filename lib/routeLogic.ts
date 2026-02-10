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

export function estimateETA(
  busLocation: Point,
  stopLocation: Point,
  shape: [number, number][],
  speedKmH: number = 30
): number | null {
  const busDist = getDistanceAlongRoute(busLocation, shape);
  const stopDist = getDistanceAlongRoute(stopLocation, shape);
  
  const totalLength = getShapeLength(shape);
  
  // Check if circular (start and end within 200m)
  const isCircular = getDistanceFromLatLonInKm(
      shape[0][0], shape[0][1],
      shape[shape.length-1][0], shape[shape.length-1][1]
  ) < 0.2;

  let distDiff = stopDist - busDist;

  // Buffer of 50m (0.05km) before considering it "passed"
  if (distDiff < -0.05) {
      if (isCircular) {
          // If circular, assume wrap-around
          distDiff += totalLength;
      } else {
          // Linear route, bus has passed
          return null;
      }
  }

  // If within the buffer (e.g. -0.02), treat as 0 (at stop)
  if (distDiff < 0) distDiff = 0;

  const timeHours = distDiff / speedKmH;
  const timeMinutes = timeHours * 60;

  return timeMinutes;
}
