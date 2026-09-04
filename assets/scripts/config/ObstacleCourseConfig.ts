export type GroundObstacleKind = 'mountain' | 'pillar';
export type SkyObstacleKind = 'storm_cloud';
export type ObstacleSize = 's' | 'm' | 'l';
export type DynamicObstacleKind = 'none' | 'fireball' | 'lightning' | 'fire_wheel';
export type DynamicObstacleSide = 'top' | 'bottom';

export interface DifficultyTier {
  readonly minScore: number;
  readonly moveSpeed: number;
  readonly gapHeightMin: number;
  readonly gapHeightMax: number;
  readonly spacingMin: number;
  readonly spacingMax: number;
  readonly widthMin: number;
  readonly widthMax: number;
  readonly maxCenterStep: number;
}

export const OBSTACLE_COURSE_CONFIG = Object.freeze({
  poolSize: 7,
  firstGroupX: 520,
  playfieldLeft: -375,
  playfieldRight: 375,
  playfieldTop: 577,
  playfieldBottom: -511,
  recycleMargin: 190,
  pathSafetyMargin: 28,
  scoreGateWidth: 8,
  assetBasePath: 'obstacles',
  dynamicSafeCorridorHeight: 240,
  dynamicSafetyMargin: 10,
  dynamicWeights: Object.freeze([0.48, 0.60, 0.72, 0.82]),
  movingChannelWarningDuration: 0.80,
  minimumMovingGap: 300,
  topAmplitudeRange: Object.freeze([48, 60]),
  bottomAmplitudeRange: Object.freeze([48, 60]),
  topPeriodRange: Object.freeze([2.5, 2.9]),
  bottomPeriodRange: Object.freeze([3.1, 3.5]),
  fireball: Object.freeze({
    radius: 32,
    travel: 82,
    period: 1.65,
    animationFps: 10,
  }),
  lightning: Object.freeze({
    width: 52,
    travelX: 56,
    period: 1.75,
    warningDuration: 0.70,
    activeDuration: 0.32,
    endingDuration: 1.10,
    animationFps: 12,
  }),
  fireWheel: Object.freeze({
    radius: 38,
    travel: 68,
    period: 1.90,
    rotationPeriod: 0.85,
  }),
  tiers: Object.freeze<readonly DifficultyTier[]>([
    {
      minScore: 0,
      moveSpeed: 176,
      gapHeightMin: 420,
      gapHeightMax: 450,
      spacingMin: 430,
      spacingMax: 470,
      widthMin: 104,
      widthMax: 116,
      maxCenterStep: 55,
    },
    {
      minScore: 10,
      moveSpeed: 190,
      gapHeightMin: 400,
      gapHeightMax: 430,
      spacingMin: 410,
      spacingMax: 450,
      widthMin: 108,
      widthMax: 122,
      maxCenterStep: 70,
    },
    {
      minScore: 24,
      moveSpeed: 204,
      gapHeightMin: 380,
      gapHeightMax: 410,
      spacingMin: 395,
      spacingMax: 435,
      widthMin: 112,
      widthMax: 128,
      maxCenterStep: 85,
    },
    {
      minScore: 42,
      moveSpeed: 218,
      gapHeightMin: 360,
      gapHeightMax: 395,
      spacingMin: 380,
      spacingMax: 420,
      widthMin: 116,
      widthMax: 132,
      maxCenterStep: 95,
    },
  ]),
} as const);

export function getDifficultyTier(score: number): DifficultyTier {
  const tiers = OBSTACLE_COURSE_CONFIG.tiers;
  for (let index = tiers.length - 1; index >= 0; index -= 1) {
    if (score >= tiers[index].minScore) return tiers[index];
  }
  return tiers[0];
}
