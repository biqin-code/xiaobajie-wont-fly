import type { FlightConfig } from '../config/FlightConfig';

export interface FlightStep {
  readonly velocityY: number;
  readonly deltaY: number;
}

export function stepFlight(
  velocityY: number,
  flapPressed: boolean,
  deltaTime: number,
  config: FlightConfig,
): FlightStep {
  const safeDelta = Math.min(Math.max(deltaTime, 0), config.maxDeltaTime);
  const nextVelocity = flapPressed
    ? Math.min(config.maxRiseSpeed, Math.max(config.maxFallSpeed, config.flapVelocity))
    : Math.min(
      config.maxRiseSpeed,
      Math.max(config.maxFallSpeed, velocityY + config.gravity * safeDelta),
    );

  return {
    velocityY: nextVelocity,
    deltaY: nextVelocity * safeDelta,
  };
}

export function velocityToTilt(velocityY: number, config: FlightConfig): number {
  if (velocityY >= 0) {
    return config.riseTilt * Math.min(velocityY / config.maxRiseSpeed, 1);
  }

  return config.fallTilt * Math.min(velocityY / config.maxFallSpeed, 1);
}
