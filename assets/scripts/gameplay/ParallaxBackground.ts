import { _decorator, Color, Component, Node, resources, Sprite, SpriteFrame, UITransform } from 'cc';

const { ccclass } = _decorator;
const WIDTH = 750;
const HEIGHT = 1334;

interface FloatingLayer {
  readonly node: Node;
  readonly driftX: number;
  readonly speed: number;
  readonly driftY: number;
  readonly frequency: number;
  readonly phase: number;
}

const LAYERS = Object.freeze([
  {
    name: 'FarTiangong',
    path: 'backgrounds/v4/bg_far_tiangong_v4/spriteFrame',
    driftX: 62,
    speed: 0.16,
    driftY: 8,
    frequency: 0.20,
    phase: 0.4,
    scale: 1.24,
    opacity: 198,
  },
  {
    name: 'MidClouds',
    path: 'backgrounds/v4/bg_mid_clouds_v4/spriteFrame',
    driftX: 96,
    speed: 0.24,
    driftY: 14,
    frequency: 0.31,
    phase: 1.5,
    scale: 1.34,
    opacity: 218,
  },
  {
    name: 'NearClouds',
    path: 'backgrounds/v4/bg_near_clouds_v4/spriteFrame',
    driftX: 132,
    speed: 0.32,
    driftY: 20,
    frequency: 0.43,
    phase: 2.7,
    scale: 1.46,
    opacity: 232,
  },
] as const);

@ccclass('ParallaxBackground')
export class ParallaxBackground extends Component {
  private sky: Node | null = null;
  private readonly floatingLayers: FloatingLayer[] = [];
  private elapsed = 0;
  private motionElapsed = 0;
  private speedScale = 0.28;

  protected override onLoad(): void {
    const transform = this.node.getComponent(UITransform) ?? this.node.addComponent(UITransform);
    transform.setContentSize(WIDTH, HEIGHT);

    this.sky = this.createSpriteNode(
      'SkyBase',
      'backgrounds/v4/bg_sky_v4/spriteFrame',
      255,
      1.05,
    );

    for (const config of LAYERS) {
      const node = this.createSpriteNode(config.name, config.path, config.opacity, config.scale);
      this.floatingLayers.push({
        node,
        driftX: config.driftX,
        speed: config.speed,
        driftY: config.driftY,
        frequency: config.frequency,
        phase: config.phase,
      });
    }
  }

  protected override update(deltaTime: number): void {
    const safeDelta = Math.min(Math.max(deltaTime, 0), 0.05);
    this.elapsed += safeDelta;
    this.motionElapsed += safeDelta * this.speedScale;

    if (this.sky) {
      const breath = 1.05 + Math.sin(this.elapsed * 0.18) * 0.004;
      this.sky.setScale(breath, breath, 1);
      this.sky.setPosition(0, Math.sin(this.elapsed * 0.13) * 4, 0);
    }

    for (const layer of this.floatingLayers) {
      const wave = this.motionElapsed * layer.frequency + layer.phase;
      const offsetY = Math.sin(wave * 0.73 + 0.9) * layer.driftY;
      const horizontalWave = this.motionElapsed * layer.speed + layer.phase;
      layer.node.setPosition(Math.sin(horizontalWave) * layer.driftX, offsetY, 0);
    }
  }

  public setPlaying(playing: boolean): void {
    this.speedScale = playing ? 1 : 0.28;
  }

  public setPaused(paused: boolean): void {
    if (paused) {
      this.speedScale = 0;
    } else if (this.speedScale === 0) {
      this.speedScale = 1;
    }
  }

  public stopMotion(): void {
    this.speedScale = 0;
  }

  public resetMotion(): void {
    this.speedScale = 0.28;
  }

  private createSpriteNode(
    name: string,
    path: string,
    opacity: number,
    scale: number,
  ): Node {
    const node = new Node(name);
    node.layer = this.node.layer;
    node.addComponent(UITransform).setContentSize(WIDTH, HEIGHT);
    node.setScale(scale, scale, 1);
    const sprite = node.addComponent(Sprite);
    sprite.sizeMode = Sprite.SizeMode.CUSTOM;
    sprite.trim = false;
    sprite.color = new Color(255, 255, 255, opacity);
    this.node.addChild(node);
    resources.load(path, SpriteFrame, (error, frame) => {
      if (error || !frame) {
        console.error(`[ParallaxBackground] Failed to load ${path}`, error);
        return;
      }
      sprite.spriteFrame = frame;
    });
    return node;
  }
}
