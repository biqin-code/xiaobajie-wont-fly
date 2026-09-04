import {
  getDifficultyTier,
  OBSTACLE_COURSE_CONFIG,
  type DynamicObstacleKind,
  type DynamicObstacleSide,
  type GroundObstacleKind,
  type ObstacleSize,
  type SkyObstacleKind,
} from '../config/ObstacleCourseConfig';
import { FLIGHT_CONFIG } from '../config/FlightConfig';
import { SeededRandom } from './SeededRandom';

export interface GeneratedChannel {
  readonly gapCenterY: number;
  readonly gapHeight: number;
  readonly spacing: number;
  readonly obstacleWidth: number;
  readonly groundKind: GroundObstacleKind;
  readonly skyKind: SkyObstacleKind;
  readonly size: ObstacleSize;
  readonly difficultyLevel: number;
  readonly dynamicKind: DynamicObstacleKind;
  readonly dynamicSide: DynamicObstacleSide;
  readonly dynamicPhase: number;
  readonly topAmplitude: number;
  readonly bottomAmplitude: number;
  readonly topPeriod: number;
  readonly bottomPeriod: number;
  readonly topPhase: number;
  readonly bottomPhase: number;
  readonly movingWarningDuration: number;
}

const GROUND_KINDS: readonly GroundObstacleKind[] = ['mountain', 'pillar'];
const SIZES: readonly ObstacleSize[] = ['s', 'm', 'l'];
const DYNAMIC_KINDS: readonly Exclude<DynamicObstacleKind, 'none'>[] = [
  'fireball',
  'lightning',
  'fire_wheel',
];

export class ObstacleGenerator {
  private random: SeededRandom;
  private previousCenterY = 0;
  private generatedCount = 0;
  private consecutiveStaticCount = 0;
  private consecutiveDynamicCount = 0;

  public constructor(seed: number) {
    this.random = new SeededRandom(seed);
  }

  public reset(seed: number): void {
    this.random = new SeededRandom(seed);
    this.previousCenterY = 0;
    this.generatedCount = 0;
    this.consecutiveStaticCount = 0;
    this.consecutiveDynamicCount = 0;
  }

  public generate(score: number): GeneratedChannel {
    const tier = getDifficultyTier(score);
    const tierIndex = OBSTACLE_COURSE_CONFIG.tiers.indexOf(tier);
    const gapHeight = Math.round(this.random.range(tier.gapHeightMin, tier.gapHeightMax));
    const spacing = Math.round(this.random.range(tier.spacingMin, tier.spacingMax));
    const topAmplitude = Math.round(this.random.range(
      OBSTACLE_COURSE_CONFIG.topAmplitudeRange[0],
      OBSTACLE_COURSE_CONFIG.topAmplitudeRange[1],
    ));
    const bottomAmplitude = Math.round(this.random.range(
      OBSTACLE_COURSE_CONFIG.bottomAmplitudeRange[0],
      OBSTACLE_COURSE_CONFIG.bottomAmplitudeRange[1],
    ));
    const halfGap = gapHeight / 2;
    const clearance = FLIGHT_CONFIG.colliderRadius + OBSTACLE_COURSE_CONFIG.pathSafetyMargin;
    const minCenter = OBSTACLE_COURSE_CONFIG.playfieldBottom
      + halfGap + clearance + bottomAmplitude;
    const maxCenter = OBSTACLE_COURSE_CONFIG.playfieldTop
      - halfGap - clearance - topAmplitude;
    const requestedCenter = this.previousCenterY
      + this.random.range(-tier.maxCenterStep, tier.maxCenterStep);
    const gapCenterY = Math.round(Math.min(Math.max(requestedCenter, minCenter), maxCenter));
    this.previousCenterY = gapCenterY;

    const dynamicRollPassed = this.random.next()
      < OBSTACLE_COURSE_CONFIG.dynamicWeights[tierIndex];
    const dynamicDue = this.consecutiveStaticCount >= 1;
    const allowDynamic = this.generatedCount >= 2
      && this.consecutiveDynamicCount < 2
      && (dynamicRollPassed || dynamicDue);
    const dynamicKind: DynamicObstacleKind = allowDynamic
      ? this.random.pick(DYNAMIC_KINDS)
      : 'none';
    this.consecutiveStaticCount = dynamicKind === 'none'
      ? this.consecutiveStaticCount + 1
      : 0;
    this.consecutiveDynamicCount = dynamicKind === 'none'
      ? 0
      : this.consecutiveDynamicCount + 1;
    this.generatedCount += 1;

    return {
      gapCenterY,
      gapHeight,
      spacing,
      obstacleWidth: Math.round(this.random.range(tier.widthMin, tier.widthMax)),
      groundKind: this.random.pick(GROUND_KINDS),
      skyKind: 'storm_cloud',
      size: this.random.pick(SIZES),
      difficultyLevel: tierIndex + 1,
      dynamicKind,
      dynamicSide: this.random.next() < 0.5 ? 'bottom' : 'top',
      dynamicPhase: this.random.range(0, Math.PI * 2),
      topAmplitude,
      bottomAmplitude,
      topPeriod: this.random.range(
        OBSTACLE_COURSE_CONFIG.topPeriodRange[0],
        OBSTACLE_COURSE_CONFIG.topPeriodRange[1],
      ),
      bottomPeriod: this.random.range(
        OBSTACLE_COURSE_CONFIG.bottomPeriodRange[0],
        OBSTACLE_COURSE_CONFIG.bottomPeriodRange[1],
      ),
      topPhase: this.random.range(0, Math.PI * 2),
      bottomPhase: this.random.range(0, Math.PI * 2),
      movingWarningDuration: OBSTACLE_COURSE_CONFIG.movingChannelWarningDuration,
    };
  }
}
