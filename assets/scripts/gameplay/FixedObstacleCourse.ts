import {
  _decorator,
  BoxCollider2D,
  Color,
  Component,
  Graphics,
  Node,
  resources,
  Sprite,
  SpriteFrame,
  UITransform,
} from 'cc';
import {
  getDifficultyTier,
  OBSTACLE_COURSE_CONFIG,
  type GroundObstacleKind,
  type ObstacleSize,
} from '../config/ObstacleCourseConfig';
import { FLIGHT_CONFIG } from '../config/FlightConfig';
import { ObstacleGenerator, type GeneratedChannel } from './ObstacleGenerator';
import { DynamicObstacle, DYNAMIC_LIGHTNING_STATE_EVENT, type LightningState } from './DynamicObstacle';

const { ccclass } = _decorator;

export const COURSE_SCORE_EVENT = 'course-score';
export const COURSE_PLAYER_HIT_EVENT = 'course-player-hit';
export const COURSE_LIGHTNING_STATE_EVENT = 'course-lightning-state';

interface ObstacleVisual {
  readonly root: Node;
  readonly graphics: Graphics;
  readonly collider: BoxCollider2D;
  readonly sprite: Sprite;
}

interface ChannelGroup {
  readonly node: Node;
  readonly top: ObstacleVisual;
  readonly bottom: ObstacleVisual;
  readonly gate: Node;
  readonly gateGraphics: Graphics;
  readonly gateCollider: BoxCollider2D;
  readonly dynamic: DynamicObstacle;
  readonly movementGuide: Node;
  readonly movementGuideGraphics: Graphics;
  channel: GeneratedChannel;
  scored: boolean;
  baseTopY: number;
  baseBottomY: number;
  baseGateY: number;
  motionElapsed: number;
  motionStarted: boolean;
  topOffsetY: number;
  bottomOffsetY: number;
  effectiveGap: number;
  safetyClamped: boolean;
}

@ccclass('FixedObstacleCourse')
export class FixedObstacleCourse extends Component {
  private readonly groups: ChannelGroup[] = [];
  private readonly spriteFrames = new Map<string, SpriteFrame>();
  private playerRoot: Node | null = null;
  private score = 0;
  private running = false;
  private runNumber = 0;
  private seed = 0x0ba81e01;
  private generator = new ObstacleGenerator(this.seed);

  public get currentScore(): number {
    return this.score;
  }

  public get currentSeed(): number {
    return this.seed;
  }

  public getMotionDebugText(): string {
    if (!this.playerRoot || this.groups.length === 0) {
      return '动态通道: 等待生成';
    }
    const playerX = this.playerRoot.position.x;
    let target = this.groups[0];
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (const group of this.groups) {
      const distance = Math.abs(group.node.position.x - playerX);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        target = group;
      }
    }
    const topSign = target.topOffsetY >= 0 ? '+' : '';
    const bottomSign = target.bottomOffsetY >= 0 ? '+' : '';
    return `通道: ${target.effectiveGap.toFixed(0)} px  `
      + `上偏: ${topSign}${target.topOffsetY.toFixed(0)}  `
      + `下偏: ${bottomSign}${target.bottomOffsetY.toFixed(0)}  `
      + `安全: ${target.safetyClamped ? '限制中' : '正常'}`;
  }

  public initialize(playerRoot: Node): void {
    if (this.playerRoot) return;
    this.playerRoot = playerRoot;
    this.preloadObstacleArt();
    this.createPool();
    this.generator.reset(this.seed);
    this.layoutFreshCourse();
  }

  public startCourse(): void {
    this.running = true;
  }

  public stopCourse(): void {
    this.running = false;
  }

  public resetCourse(): void {
    this.running = false;
    this.score = 0;
    this.runNumber += 1;
    this.seed = (0x0ba81e01 + Math.imul(this.runNumber, 0x9e3779b9)) >>> 0;
    this.generator.reset(this.seed);
    this.layoutFreshCourse();
    this.node.emit(COURSE_SCORE_EVENT, this.score);
  }

  protected override update(deltaTime: number): void {
    if (!this.running || !this.playerRoot || this.groups.length === 0) return;

    const safeDelta = Math.min(Math.max(deltaTime, 0), 0.05);
    const travel = getDifficultyTier(this.score).moveSpeed * safeDelta;
    const recycleX = OBSTACLE_COURSE_CONFIG.playfieldLeft - OBSTACLE_COURSE_CONFIG.recycleMargin;
    const playerX = this.playerRoot.position.x;
    const playerY = this.playerRoot.position.y;

    for (const group of this.groups) {
      const previousX = group.node.position.x;
      const nextX = previousX - travel;
      this.updateIndependentMotion(group, nextX, safeDelta);
      group.dynamic.tick(safeDelta, group.topOffsetY, group.bottomOffsetY);

      if (
        this.intersectsPlayer(
          nextX,
          playerX,
          playerY,
          group.channel,
          group.topOffsetY,
          group.bottomOffsetY,
        )
        || group.dynamic.intersectsPlayer(nextX, playerX, playerY)
      ) {
        this.running = false;
        this.node.emit(COURSE_PLAYER_HIT_EVENT);
        return;
      }

      if (!group.scored && previousX >= playerX && nextX < playerX) {
        group.scored = true;
        this.score += 1;
        this.node.emit(COURSE_SCORE_EVENT, this.score);
      }

      group.node.setPosition(nextX, 0, 0);
      if (nextX < recycleX) this.recycleGroup(group);
    }
  }

  private createPool(): void {
    for (let index = 0; index < OBSTACLE_COURSE_CONFIG.poolSize; index += 1) {
      const group = this.createChannelGroup(index);
      this.node.addChild(group.node);
      this.groups.push(group);
    }
  }

  private layoutFreshCourse(): void {
    let nextX = OBSTACLE_COURSE_CONFIG.firstGroupX;
    for (const group of this.groups) {
      const channel = this.generator.generate(this.score);
      this.applyChannel(group, channel);
      group.node.setPosition(nextX, 0, 0);
      group.scored = false;
      nextX += channel.spacing;
    }
  }

  private recycleGroup(group: ChannelGroup): void {
    let rightmostX: number = OBSTACLE_COURSE_CONFIG.playfieldRight;
    for (const candidate of this.groups) {
      if (candidate !== group) rightmostX = Math.max(rightmostX, candidate.node.position.x);
    }
    const channel = this.generator.generate(this.score);
    this.applyChannel(group, channel);
    group.node.setPosition(rightmostX + channel.spacing, 0, 0);
    group.scored = false;
  }

  private intersectsPlayer(
    groupX: number,
    playerX: number,
    playerY: number,
    channel: GeneratedChannel,
    topOffsetY: number,
    bottomOffsetY: number,
  ): boolean {
    const horizontalReach = channel.obstacleWidth / 2 + FLIGHT_CONFIG.colliderRadius;
    if (Math.abs(groupX - playerX) > horizontalReach) return false;
    const gapBottom = channel.gapCenterY - channel.gapHeight / 2 + bottomOffsetY;
    const gapTop = channel.gapCenterY + channel.gapHeight / 2 + topOffsetY;
    return playerY - FLIGHT_CONFIG.colliderRadius <= gapBottom
      || playerY + FLIGHT_CONFIG.colliderRadius >= gapTop;
  }

  private createChannelGroup(index: number): ChannelGroup {
    const displayIndex = index + 1;
    const node = new Node(`PooledChannel_${displayIndex < 10 ? '0' : ''}${displayIndex}`);
    node.layer = this.node.layer;
    const top = this.createObstacle(node, 'TopObstacle');
    const bottom = this.createObstacle(node, 'BottomObstacle');

    const gate = new Node('ScoreGate');
    gate.layer = node.layer;
    gate.addComponent(UITransform);
    node.addChild(gate);
    const gateGraphics = gate.addComponent(Graphics);
    const gateCollider = gate.addComponent(BoxCollider2D);
    gateCollider.sensor = true;

    const dynamicNode = new Node('DynamicObstacle');
    dynamicNode.layer = node.layer;
    node.addChild(dynamicNode);
    const dynamic = dynamicNode.addComponent(DynamicObstacle);
    dynamic.initialize(this.spriteFrames);
    dynamicNode.on(DYNAMIC_LIGHTNING_STATE_EVENT, (state: LightningState) => {
      const x = node.position.x;
      if (this.running
        && x >= OBSTACLE_COURSE_CONFIG.playfieldLeft - 80
        && x <= OBSTACLE_COURSE_CONFIG.playfieldRight + 80) {
        this.node.emit(COURSE_LIGHTNING_STATE_EVENT, state);
      }
    }, this);

    const movementGuide = new Node('MovementWarningGuide');
    movementGuide.layer = node.layer;
    movementGuide.addComponent(UITransform);
    node.addChild(movementGuide);
    const movementGuideGraphics = movementGuide.addComponent(Graphics);

    return {
      node,
      top,
      bottom,
      gate,
      gateGraphics,
      gateCollider,
      dynamic,
      movementGuide,
      movementGuideGraphics,
      channel: this.generator.generate(0),
      scored: false,
      baseTopY: 0,
      baseBottomY: 0,
      baseGateY: 0,
      motionElapsed: 0,
      motionStarted: false,
      topOffsetY: 0,
      bottomOffsetY: 0,
      effectiveGap: OBSTACLE_COURSE_CONFIG.minimumMovingGap,
      safetyClamped: false,
    };
  }

  private createObstacle(parent: Node, name: string): ObstacleVisual {
    const root = new Node(name);
    root.layer = parent.layer;
    root.addComponent(UITransform);
    parent.addChild(root);
    const graphics = root.addComponent(Graphics);
    const collider = root.addComponent(BoxCollider2D);

    const artNode = new Node('Art');
    artNode.layer = root.layer;
    artNode.addComponent(UITransform);
    root.addChild(artNode);
    const sprite = artNode.addComponent(Sprite);
    sprite.sizeMode = Sprite.SizeMode.CUSTOM;
    sprite.color = new Color(255, 255, 255, 235);
    return { root, graphics, collider, sprite };
  }

  private applyChannel(group: ChannelGroup, channel: GeneratedChannel): void {
    group.channel = channel;
    group.motionElapsed = 0;
    group.motionStarted = false;
    group.topOffsetY = 0;
    group.bottomOffsetY = 0;
    group.effectiveGap = channel.gapHeight;
    group.safetyClamped = false;
    const gapBottom = channel.gapCenterY - channel.gapHeight / 2;
    const gapTop = channel.gapCenterY + channel.gapHeight / 2;
    this.updateObstacle(
      group.top,
      gapTop,
      OBSTACLE_COURSE_CONFIG.playfieldTop + channel.topAmplitude,
      channel.obstacleWidth,
      true,
    );
    this.updateObstacle(
      group.bottom,
      OBSTACLE_COURSE_CONFIG.playfieldBottom - channel.bottomAmplitude,
      gapBottom,
      channel.obstacleWidth,
      false,
    );
    this.updateScoreGate(group, channel);
    group.baseTopY = group.top.root.position.y;
    group.baseBottomY = group.bottom.root.position.y;
    group.baseGateY = group.gate.position.y;
    this.configureMovementGuide(group);
    group.dynamic.configure(channel);
    this.applySprite(group.bottom.sprite, channel.groundKind, channel.size, false);
    this.applySprite(group.top.sprite, 'storm_cloud', channel.size, true);
  }

  private updateIndependentMotion(
    group: ChannelGroup,
    nextX: number,
    deltaTime: number,
  ): void {
    const channel = group.channel;
    const fullyVisibleX = OBSTACLE_COURSE_CONFIG.playfieldRight - channel.obstacleWidth / 2;
    let justStarted = false;
    if (!group.motionStarted && nextX <= fullyVisibleX) {
      group.motionStarted = true;
      group.motionElapsed = 0;
      justStarted = true;
      group.dynamic.configure(channel);
    }
    if (group.motionStarted && !justStarted) group.motionElapsed += deltaTime;

    const warningComplete = group.motionElapsed > channel.movingWarningDuration;
    const movementTime = Math.max(group.motionElapsed - channel.movingWarningDuration, 0);
    let topOffsetY = warningComplete
      ? channel.topAmplitude
        * Math.sin(movementTime * Math.PI * 2 / channel.topPeriod + channel.topPhase)
      : 0;
    let bottomOffsetY = warningComplete
      ? channel.bottomAmplitude
        * Math.sin(movementTime * Math.PI * 2 / channel.bottomPeriod + channel.bottomPhase)
      : 0;
    const rawGap = channel.gapHeight + topOffsetY - bottomOffsetY;
    group.safetyClamped = rawGap < OBSTACLE_COURSE_CONFIG.minimumMovingGap;
    if (group.safetyClamped) {
      const correction = (OBSTACLE_COURSE_CONFIG.minimumMovingGap - rawGap) / 2;
      topOffsetY += correction;
      bottomOffsetY -= correction;
    }
    group.effectiveGap = channel.gapHeight + topOffsetY - bottomOffsetY;
    group.movementGuide.active = group.motionStarted && !warningComplete;
    this.applyIndependentOffsets(group, topOffsetY, bottomOffsetY);
  }

  private applyIndependentOffsets(
    group: ChannelGroup,
    topOffsetY: number,
    bottomOffsetY: number,
  ): void {
    group.topOffsetY = topOffsetY;
    group.bottomOffsetY = bottomOffsetY;
    group.top.root.setPosition(0, group.baseTopY + topOffsetY, 0);
    group.bottom.root.setPosition(0, group.baseBottomY + bottomOffsetY, 0);
    const centerOffset = (topOffsetY + bottomOffsetY) / 2;
    group.gate.setPosition(0, group.baseGateY + centerOffset, 0);
    group.movementGuide.setPosition(
      group.channel.obstacleWidth / 2 + 34,
      group.channel.gapCenterY + centerOffset,
      0,
    );
  }

  private configureMovementGuide(group: ChannelGroup): void {
    const amplitude = Math.max(
      group.channel.topAmplitude,
      group.channel.bottomAmplitude,
    );
    group.movementGuide.active = false;
    group.movementGuide.getComponent(UITransform)?.setContentSize(52, amplitude * 2 + 44);
    const graphics = group.movementGuideGraphics;
    graphics.clear();
    graphics.lineWidth = 4;
    graphics.strokeColor = new Color(255, 230, 105, 230);
    graphics.fillColor = new Color(255, 230, 105, 230);
    graphics.moveTo(-12, -group.channel.topAmplitude);
    graphics.lineTo(-12, group.channel.topAmplitude);
    graphics.moveTo(12, -group.channel.bottomAmplitude);
    graphics.lineTo(12, group.channel.bottomAmplitude);
    graphics.stroke();
    graphics.moveTo(-12, group.channel.topAmplitude + 12);
    graphics.lineTo(-21, group.channel.topAmplitude);
    graphics.lineTo(-3, group.channel.topAmplitude);
    graphics.close();
    graphics.fill();
    graphics.moveTo(12, -group.channel.bottomAmplitude - 12);
    graphics.lineTo(3, -group.channel.bottomAmplitude);
    graphics.lineTo(21, -group.channel.bottomAmplitude);
    graphics.close();
    graphics.fill();
  }

  private updateObstacle(
    visual: ObstacleVisual,
    bottom: number,
    top: number,
    width: number,
    isTop: boolean,
  ): void {
    const height = Math.max(top - bottom, 1);
    visual.root.setPosition(0, bottom + height / 2, 0);
    visual.root.getComponent(UITransform)?.setContentSize(width, height);
    visual.collider.size.set(width, height);
    visual.graphics.clear();
    visual.graphics.lineWidth = 4;
    visual.graphics.fillColor = isTop
      ? new Color(75, 97, 125, 220)
      : new Color(111, 112, 95, 230);
    visual.graphics.strokeColor = new Color(43, 57, 70, 255);
    visual.graphics.roundRect(-width / 2, -height / 2, width, height, 16);
    visual.graphics.fill();
    visual.graphics.stroke();

    const artTransform = visual.sprite.node.getComponent(UITransform);
    if (isTop) {
      const artHeight = Math.min(110, height);
      artTransform?.setContentSize(width + 34, artHeight);
      visual.sprite.node.setPosition(0, -height / 2 + artHeight / 2, 0);
    } else {
      artTransform?.setContentSize(width, height);
      visual.sprite.node.setPosition(0, 0, 0);
    }
  }

  private updateScoreGate(group: ChannelGroup, channel: GeneratedChannel): void {
    group.gate.setPosition(0, channel.gapCenterY, 0);
    group.gate.getComponent(UITransform)?.setContentSize(
      OBSTACLE_COURSE_CONFIG.scoreGateWidth,
      channel.gapHeight,
    );
    group.gateCollider.size.set(OBSTACLE_COURSE_CONFIG.scoreGateWidth, channel.gapHeight);
    group.gateGraphics.clear();
    group.gateGraphics.lineWidth = 2;
    group.gateGraphics.strokeColor = new Color(255, 226, 104, 90);
    group.gateGraphics.moveTo(0, -channel.gapHeight / 2);
    group.gateGraphics.lineTo(0, channel.gapHeight / 2);
    group.gateGraphics.stroke();
  }

  private preloadObstacleArt(): void {
    const paths: string[] = [];
    for (const kind of ['mountain', 'pillar', 'storm_cloud'] as const) {
      for (const size of ['s', 'm', 'l'] as const) {
        paths.push(`${OBSTACLE_COURSE_CONFIG.assetBasePath}/${kind}/${kind}_${size}/spriteFrame`);
      }
    }
    for (let index = 1; index <= 6; index += 1) {
      paths.push(
        `${OBSTACLE_COURSE_CONFIG.assetBasePath}/fireball/fireball_${index < 10 ? '0' : ''}${index}/spriteFrame`,
      );
    }
    for (const state of ['warning', 'active'] as const) {
      for (let index = 1; index <= 4; index += 1) {
        paths.push(
          `${OBSTACLE_COURSE_CONFIG.assetBasePath}/lightning/lightning_${state}_${index < 10 ? '0' : ''}${index}/spriteFrame`,
        );
      }
    }
    paths.push(
      `${OBSTACLE_COURSE_CONFIG.assetBasePath}/fire_wheel/fire_wheel/spriteFrame`,
    );
    let pending = paths.length;
    const refreshVisibleObstacles = (): void => {
      for (const group of this.groups) {
        this.applySprite(group.bottom.sprite, group.channel.groundKind, group.channel.size, false);
        this.applySprite(group.top.sprite, 'storm_cloud', group.channel.size, true);
        group.dynamic.setFrameCache(this.spriteFrames);
      }
    };

    for (const path of paths) {
      resources.load(path, SpriteFrame, (error, frame) => {
        pending -= 1;
        if (error || !frame) {
          console.warn(`[M4] Obstacle art failed to load: ${path}`, error);
        } else {
          this.spriteFrames.set(path, frame);
          refreshVisibleObstacles();
        }
        if (pending === 0) {
          console.info(`[M4] Obstacle art ready: ${this.spriteFrames.size}/${paths.length}`);
        }
      });
    }
  }

  private applySprite(
    sprite: Sprite,
    kind: GroundObstacleKind | 'storm_cloud',
    size: ObstacleSize,
    flipY: boolean,
  ): void {
    const path = `${OBSTACLE_COURSE_CONFIG.assetBasePath}/${kind}/${kind}_${size}/spriteFrame`;
    sprite.spriteFrame = this.spriteFrames.get(path) ?? null;
    sprite.node.setScale(1, flipY ? -1 : 1, 1);
    const fallback = sprite.node.parent?.getComponent(Graphics);
    if (fallback) fallback.enabled = sprite.spriteFrame === null;
  }
}
