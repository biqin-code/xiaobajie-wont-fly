export interface FlightConfig {
  gravity: number;
  flapVelocity: number;
  minFlapInterval: number;
  maxRiseSpeed: number;
  maxFallSpeed: number;
  startVelocityY: number;
  maxDeltaTime: number;
  riseTilt: number;
  fallTilt: number;
  tiltSmoothTime: number;
  startPositionX: number;
  startPositionY: number;
  visualWidth: number;
  visualHeight: number;
  designHeight: number;
  topSafeMargin: number;
  bottomSafeMargin: number;
  colliderRadius: number;
}

export const DEFAULT_FLIGHT_CONFIG: Readonly<FlightConfig> = Object.freeze({
  gravity: -1580,
  flapVelocity: 405,
  minFlapInterval: 0.09,
  maxRiseSpeed: 535,
  maxFallSpeed: -760,
  startVelocityY: 0,
  maxDeltaTime: 0.033,
  riseTilt: 14,
  fallTilt: -34,
  tiltSmoothTime: 0.10,
  startPositionX: -150,
  startPositionY: 105,
  visualWidth: 150,
  visualHeight: 135,
  designHeight: 1334,
  topSafeMargin: 90,
  bottomSafeMargin: 110,
  colliderRadius: 42,
});

/** Single mutable tuning source used by flight simulation and the debug HUD. */
export const FLIGHT_CONFIG: FlightConfig = { ...DEFAULT_FLIGHT_CONFIG };

export type TunableFlightParameter = 'gravity' | 'flapVelocity';

const PARAMETER_LIMITS: Record<TunableFlightParameter, readonly [number, number]> = {
  gravity: [-4000, -200],
  flapVelocity: [180, 800],
};

export function adjustFlightParameter(
  parameter: TunableFlightParameter,
  delta: number,
): number {
  const [minimum, maximum] = PARAMETER_LIMITS[parameter];
  FLIGHT_CONFIG[parameter] = Math.min(
    maximum,
    Math.max(minimum, FLIGHT_CONFIG[parameter] + delta),
  );
  return FLIGHT_CONFIG[parameter];
}

export function resetFlightParameters(): void {
  Object.assign(FLIGHT_CONFIG, DEFAULT_FLIGHT_CONFIG);
}

export function getFlightBounds(): Readonly<{ bottom: number; top: number }> {
  const halfHeight = FLIGHT_CONFIG.designHeight / 2;
  return {
    top: halfHeight - FLIGHT_CONFIG.topSafeMargin - FLIGHT_CONFIG.colliderRadius,
    bottom: -halfHeight + FLIGHT_CONFIG.bottomSafeMargin + FLIGHT_CONFIG.colliderRadius,
  };
}
