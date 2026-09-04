export const FLIGHT_TELEMETRY_EVENT = 'flight-telemetry';
export const PLAYER_RESTART_REQUEST_EVENT = 'player-restart-request';
export const PLAYER_DEATH_COMPLETE_EVENT = 'player-death-complete';
export const PLAYER_FLAP_EVENT = 'player-flap';

export type FlightStatus = 'Ready' | 'Flying' | 'Paused' | 'Dead';
export type FlightBoundary = 'None' | 'Top' | 'Bottom';

export interface FlightTelemetry {
  readonly status: FlightStatus;
  readonly flapPressed: boolean;
  readonly height: number;
  readonly velocityY: number;
  readonly gravity: number;
  readonly flapVelocity: number;
  readonly boundary: FlightBoundary;
}
