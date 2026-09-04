import {
  _decorator,
  BoxCollider2D,
  CircleCollider2D,
  Color,
  Component,
  Graphics,
  Node,
  Sprite,
  SpriteFrame,
  UITransform,
} from 'cc';
import {
  OBSTACLE_COURSE_CONFIG,
  type DynamicObstacleKind,
} from '../config/ObstacleCourseConfig';
import { FLIGHT_CONFIG } from '../config/FlightConfig';
import type { GeneratedChannel } from './ObstacleGenerator';

const { ccclass } = _decorator;

export type LightningState = 'warning' | 'active' | 'ending';
export const DYNAMIC_LIGHTNING_STATE_EVENT = 'dynamic-lightning-state';

@ccclass('DynamicObstacle')
export class DynamicObstacle extends Component {
  private sprite: Sprite | null = null;
  private graphics: Graphics | null = null;
  private circleCollider: CircleCollider2D | null = null;
  private boxCollider: BoxCollider2D | null = null;
  private frames: ReadonlyMap<string, SpriteFrame> = new Map();
  private channel: GeneratedChannel | null = null;
  private elapsed = 0;
  private lightningState: LightningState = 'warning';
  private collisionEnabled = false;
  private collisionRadius = 0;
  private collisionWidth = 0;
  private collisionHeight = 0;
  private topOffsetY = 0;
  private bottomOffsetY = 0;

  public initialize(frames: ReadonlyMap<string, SpriteFrame>): void {
    this.frames = frames;
    if (this.sprite) return;
    this.node.addComponent(UITransform).setContentSize(96, 96);
    this.graphics = this.node.addComponent(Graphics);
    this.circleCollider = this.node.addComponent(CircleCollider2D);
    this.boxCollider = this.node.addComponent(BoxCollider2D);
    const artNode = new Node('Art');
    artNode.layer = this.node.layer;
    artNode.addComponent(UITransform).setContentSize(96, 96);
    this.node.addChild(artNode);
    this.sprite = artNode.addComponent(Sprite);
    this.sprite.sizeMode = Sprite.SizeMode.CUSTOM;
    this.setCollision(false, false);
  }

  public setFrameCache(frames: ReadonlyMap<string, SpriteFrame>): void {
    this.frames = frames;
    if (!this.channel || !this.node.active) return;
    this.updateVisualFrame();
    this.updateFallbackVisibility();
  }

  public configure(channel: GeneratedChannel): void {
    this.channel = channel;
    this.elapsed = channel.dynamicKind === 'lightning' ? 0 : channel.dynamicPhase;
    this.lightningState = 'warning';
    this.topOffsetY = 0;
    this.bottomOffsetY = 0;
    this.node.active = channel.dynamicKind !== 'none';
    this.node.setRotationFromEuler(0, 0, 0);
    this.node.setScale(1, 1, 1);
    if (this.sprite) {
      // Pooled nodes may previously have been a dimmed lightning obstacle.
      // Always restore neutral tint before applying the new obstacle state.
      this.sprite.color = new Color(255, 255, 255, 255);
    }
    if (!this.node.active) {
      this.setCollision(false, false);
      return;
    }

    if (channel.dynamicKind === 'lightning') {
      this.enterLightningState('warning');
    } else {
      this.setCollision(true, true);
      this.updateVisualFrame();
      this.updateFallbackVisibility();
    }
    this.updateMotion(0);
    this.drawFallback();
    this.updateFallbackVisibility();
  }

  public tick(deltaTime: number, topOffsetY = 0, bottomOffsetY = 0): void {
    if (!this.channel || !this.node.active) return;
    this.topOffsetY = topOffsetY;
    this.bottomOffsetY = bottomOffsetY;
    this.elapsed += deltaTime;
    if (this.channel.dynamicKind === 'lightning') {
      this.updateLightningState();
    } else {
      this.updateMotion(deltaTime);
      this.updateVisualFrame();
      this.updateFallbackVisibility();
    }
  }

  public intersectsPlayer(groupX: number, playerX: number, playerY: number): boolean {
    if (!this.collisionEnabled || !this.channel) return false;
    const obstacleX = groupX + this.node.position.x;
    const obstacleY = this.node.position.y;
    if (this.channel.dynamicKind === 'lightning') {
      const reachX = this.collisionWidth / 2 + FLIGHT_CONFIG.colliderRadius;
      const reachY = this.collisionHeight / 2 + FLIGHT_CONFIG.colliderRadius;
      return Math.abs(obstacleX - playerX) <= reachX
        && Math.abs(obstacleY - playerY) <= reachY;
    }
    const dx = obstacleX - playerX;
    const dy = obstacleY - playerY;
    const reach = this.collisionRadius + FLIGHT_CONFIG.colliderRadius;
    return dx * dx + dy * dy <= reach * reach;
  }

  private updateMotion(_deltaTime: number): void {
    if (!this.channel) return;
    const sideSign = this.channel.dynamicSide === 'top' ? 1 : -1;
    const safeHalf = OBSTACLE_COURSE_CONFIG.dynamicSafeCorridorHeight / 2;
    const margin = OBSTACLE_COURSE_CONFIG.dynamicSafetyMargin;
    let x = 0;
    const effectiveCenter = this.channel.gapCenterY
      + (this.topOffsetY + this.bottomOffsetY) / 2;
    const effectiveGap = this.channel.gapHeight
      + this.topOffsetY - this.bottomOffsetY;
    let y = effectiveCenter;
    let rotation = 0;

    if (this.channel.dynamicKind === 'fireball') {
      const settings = OBSTACLE_COURSE_CONFIG.fireball;
      const wave = (Math.sin(this.elapsed * Math.PI * 2 / settings.period) + 1) / 2;
      y += sideSign * (safeHalf + settings.radius + margin + wave * settings.travel);
      this.collisionRadius = settings.radius;
      if (this.circleCollider) this.circleCollider.radius = settings.radius;
      this.setVisualSize(82, 82);
    } else if (this.channel.dynamicKind === 'fire_wheel') {
      const settings = OBSTACLE_COURSE_CONFIG.fireWheel;
      const angle = this.elapsed * Math.PI * 2 / settings.period;
      x = Math.cos(angle) * settings.travel;
      const awayTravel = (Math.sin(angle) + 1) * settings.travel / 2;
      y += sideSign * (safeHalf + settings.radius + margin + awayTravel);
      rotation = -this.elapsed * 360 / settings.rotationPeriod;
      this.collisionRadius = settings.radius;
      if (this.circleCollider) this.circleCollider.radius = settings.radius;
      this.setVisualSize(92, 92);
    } else if (this.channel.dynamicKind === 'lightning') {
      const angle = this.elapsed * Math.PI * 2 / OBSTACLE_COURSE_CONFIG.lightning.period;
      x = Math.sin(angle) * OBSTACLE_COURSE_CONFIG.lightning.travelX;
      const gapEdge = effectiveCenter + sideSign * effectiveGap / 2;
      const safeEdge = effectiveCenter + sideSign * (safeHalf + margin);
      this.collisionHeight = Math.max(Math.abs(gapEdge - safeEdge), 36);
      this.collisionWidth = OBSTACLE_COURSE_CONFIG.lightning.width;
      if (this.boxCollider) {
        this.boxCollider.size.set(this.collisionWidth, this.collisionHeight);
      }
      y = (gapEdge + safeEdge) / 2;
      this.setVisualSize(this.collisionWidth, this.collisionHeight);
      this.node.setScale(1, sideSign, 1);
    }
    this.node.setPosition(x, y, 0);
    if (this.channel.dynamicKind !== 'lightning') {
      this.node.setRotationFromEuler(0, 0, rotation);
    }
  }

  private updateLightningState(): void {
    const settings = OBSTACLE_COURSE_CONFIG.lightning;
    const cycle = settings.warningDuration + settings.activeDuration + settings.endingDuration;
    const cycleTime = this.elapsed % cycle;
    const nextState: LightningState = cycleTime < settings.warningDuration
      ? 'warning'
      : cycleTime < settings.warningDuration + settings.activeDuration
        ? 'active'
        : 'ending';
    if (nextState !== this.lightningState) this.enterLightningState(nextState);
    this.updateMotion(0);
    this.updateVisualFrame();
    this.updateFallbackVisibility();
  }

  private enterLightningState(state: LightningState): void {
    this.lightningState = state;
    this.node.emit(DYNAMIC_LIGHTNING_STATE_EVENT, state);
    this.setCollision(state === 'active', false);
    if (this.sprite) {
      this.sprite.color = state === 'warning'
        ? new Color(255, 218, 90, 150)
        : state === 'active'
          ? new Color(255, 255, 255, 255)
          : new Color(150, 175, 205, 95);
    }
    this.drawFallback();
    this.updateVisualFrame();
    this.updateFallbackVisibility();
  }

  private setCollision(enabled: boolean, useCircle: boolean): void {
    this.collisionEnabled = enabled;
    if (this.circleCollider) this.circleCollider.enabled = enabled && useCircle;
    if (this.boxCollider) this.boxCollider.enabled = enabled && !useCircle;
  }

  private updateVisualFrame(): void {
    if (!this.channel || !this.sprite) return;
    let path = '';
    if (this.channel.dynamicKind === 'fireball') {
      const index = Math.floor(this.elapsed * OBSTACLE_COURSE_CONFIG.fireball.animationFps) % 6 + 1;
      path = `obstacles/fireball/fireball_${index < 10 ? '0' : ''}${index}/spriteFrame`;
    } else if (this.channel.dynamicKind === 'fire_wheel') {
      path = 'obstacles/fire_wheel/fire_wheel/spriteFrame';
    } else if (this.channel.dynamicKind === 'lightning') {
      const prefix = this.lightningState === 'active' ? 'active' : 'warning';
      const index = Math.floor(this.elapsed * OBSTACLE_COURSE_CONFIG.lightning.animationFps) % 4 + 1;
      path = `obstacles/lightning/lightning_${prefix}_${index < 10 ? '0' : ''}${index}/spriteFrame`;
    }
    this.sprite.spriteFrame = this.frames.get(path) ?? null;
  }

  private updateFallbackVisibility(): void {
    if (!this.graphics || !this.sprite) return;
    this.graphics.enabled = this.sprite.spriteFrame === null;
  }

  private setVisualSize(width: number, height: number): void {
    this.node.getComponent(UITransform)?.setContentSize(width, height);
    this.sprite?.node.getComponent(UITransform)?.setContentSize(width, height);
  }

  private drawFallback(): void {
    if (!this.graphics || !this.channel) return;
    const transform = this.node.getComponent(UITransform);
    const width = transform?.contentSize.width ?? 80;
    const height = transform?.contentSize.height ?? 80;
    this.graphics.clear();
    this.graphics.fillColor = this.channel.dynamicKind === 'lightning'
      ? this.lightningState === 'active'
        ? new Color(255, 247, 150, 220)
        : new Color(255, 210, 70, 100)
      : this.channel.dynamicKind === 'fireball'
        ? new Color(242, 103, 42, 210)
        : new Color(230, 154, 42, 210);
    if (this.channel.dynamicKind === 'lightning') {
      this.graphics.roundRect(-width / 2, -height / 2, width, height, 12);
    } else {
      this.graphics.circle(0, 0, Math.min(width, height) * 0.42);
    }
    this.graphics.fill();
  }
}
