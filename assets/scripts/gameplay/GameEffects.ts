import { _decorator, Color, Component, Graphics, Node, resources, Sprite, SpriteFrame, UITransform, UIOpacity, Vec3 } from 'cc';

const { ccclass } = _decorator;

@ccclass('GameEffects')
export class GameEffects extends Component {
  private hitFrames: SpriteFrame[] = [];
  private hitNode: Node | null = null;
  private sparkleNode: Node | null = null;
  private windNode: Node | null = null;
  private flashNode: Node | null = null;
  private shakeRoot: Node | null = null;
  private hitElapsed = 0;
  private sparkleElapsed = 0;
  private flashElapsed = 0;
  private flashDuration = 0;
  private trauma = 0;
  private shakeElapsed = 0;

  protected override onLoad(): void {
    this.hitNode = this.createEffectNode('HitCloud', 190, 190);
    this.sparkleNode = this.createEffectNode('ScoreSparkle', 96, 96);
    this.windNode = this.createEffectNode('WindLines', 210, 120);
    this.flashNode = this.createFlashNode();
    this.shakeRoot = this.node.parent;
    this.hitNode.active = false;
    this.sparkleNode.active = false;
    this.windNode.active = false;
    this.flashNode.active = false;
    this.loadAssets();
  }

  protected override update(dt: number): void {
    if (this.hitNode?.active && this.hitFrames.length > 0) {
      this.hitElapsed += dt;
      const index = Math.floor(this.hitElapsed * 14);
      if (index >= this.hitFrames.length) this.hitNode.active = false;
      else this.hitNode.getComponent(Sprite)!.spriteFrame = this.hitFrames[index];
    }
    if (this.sparkleNode?.active) {
      this.sparkleElapsed += dt;
      const progress = Math.min(1, this.sparkleElapsed / 0.45);
      this.sparkleNode.setScale(0.7 + progress * 0.65, 0.7 + progress * 0.65, 1);
      this.sparkleNode.getComponent(UIOpacity)!.opacity = Math.round(255 * (1 - progress));
      if (progress >= 1) this.sparkleNode.active = false;
    }
    if (this.flashNode?.active) {
      this.flashElapsed += dt;
      const progress = Math.min(1, this.flashElapsed / Math.max(this.flashDuration, 0.001));
      this.flashNode.getComponent(UIOpacity)!.opacity = Math.round(90 * (1 - progress));
      if (progress >= 1) this.flashNode.active = false;
    }
    this.updateShake(dt);
  }

  public playHit(position: Readonly<Vec3>): void {
    if (this.hitNode && this.hitFrames.length > 0) {
      this.hitElapsed = 0;
      this.hitNode.setPosition(position.x, position.y, 0);
      this.hitNode.getComponent(Sprite)!.spriteFrame = this.hitFrames[0];
      this.hitNode.active = true;
    }
    this.startFlash(0.10);
    this.trauma = Math.min(1, this.trauma + 0.42);
  }

  public playScore(position: Readonly<Vec3>): void {
    if (this.sparkleNode?.getComponent(Sprite)?.spriteFrame) {
      this.sparkleElapsed = 0;
      this.sparkleNode.setPosition(position.x, position.y, 0);
      this.sparkleNode.getComponent(UIOpacity)!.opacity = 255;
      this.sparkleNode.active = true;
    }
    this.startFlash(0.065);
  }

  public setWind(active: boolean, position?: Readonly<Vec3>): void {
    if (!this.windNode) return;
    this.windNode.active = active && !!this.windNode.getComponent(Sprite)?.spriteFrame;
    if (position) this.windNode.setPosition(position.x - 75, position.y, 0);
  }

  private createEffectNode(name: string, width: number, height: number): Node {
    const node = new Node(name);
    node.layer = this.node.layer;
    node.addComponent(UITransform).setContentSize(width, height);
    node.addComponent(Sprite).sizeMode = Sprite.SizeMode.CUSTOM;
    node.addComponent(UIOpacity);
    this.node.addChild(node);
    return node;
  }

  private createFlashNode(): Node {
    const node = new Node('FeedbackFlash');
    node.layer = this.node.layer;
    node.addComponent(UITransform).setContentSize(750, 1334);
    const graphics = node.addComponent(Graphics);
    graphics.fillColor = new Color(255, 239, 174, 255);
    graphics.rect(-375, -667, 750, 1334);
    graphics.fill();
    node.addComponent(UIOpacity).opacity = 0;
    this.node.addChild(node);
    return node;
  }

  private startFlash(duration: number): void {
    if (!this.flashNode) return;
    this.flashElapsed = 0;
    this.flashDuration = duration;
    this.flashNode.getComponent(UIOpacity)!.opacity = 90;
    this.flashNode.active = true;
  }

  private updateShake(dt: number): void {
    if (!this.shakeRoot) return;
    if (this.trauma <= 0) {
      this.shakeRoot.setPosition(0, 0, 0);
      return;
    }
    this.shakeElapsed += Math.min(dt, 0.05) * 32;
    this.trauma = Math.max(0, this.trauma - dt * 2.8);
    const strength = this.trauma * this.trauma;
    this.shakeRoot.setPosition(
      Math.sin(this.shakeElapsed * 1.7) * 9 * strength,
      Math.sin(this.shakeElapsed * 2.3) * 6 * strength,
      0,
    );
  }

  private loadAssets(): void {
    const hitPaths = Array.from({ length: 6 }, (_, i) =>
      `effects/hit_cloud/hit_cloud_${i < 9 ? '0' : ''}${i + 1}/spriteFrame`);
    Promise.all(hitPaths.map((path) => this.loadFrame(path))).then((frames) => { this.hitFrames = frames; });
    this.loadFrame('effects/score_sparkle/spriteFrame').then((frame) => {
      if (this.sparkleNode) this.sparkleNode.getComponent(Sprite)!.spriteFrame = frame;
    });
    this.loadFrame('effects/wind_lines/spriteFrame').then((frame) => {
      if (this.windNode) {
        const sprite = this.windNode.getComponent(Sprite)!;
        sprite.spriteFrame = frame;
        sprite.color = new Color(255, 255, 255, 155);
      }
    });
  }

  private loadFrame(path: string): Promise<SpriteFrame> {
    return new Promise((resolve, reject) => resources.load(path, SpriteFrame,
      (error, frame) => error ? reject(error) : resolve(frame)));
  }
}
