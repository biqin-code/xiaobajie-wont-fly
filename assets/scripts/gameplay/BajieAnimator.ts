import {
  _decorator,
  Animation,
  AnimationClip,
  Component,
  Node,
  resources,
  Sprite,
  SpriteFrame,
  tween,
  Tween,
  UITransform,
  Vec3,
} from 'cc';

const { ccclass } = _decorator;
export type BajieAnimationState = 'idle' | 'fly_up' | 'fall' | 'hit' | 'dead';

const FRAME_COUNTS: Readonly<Record<BajieAnimationState, number>> = {
  idle: 6,
  fly_up: 6,
  fall: 4,
  hit: 4,
  dead: 4,
};

const FPS: Readonly<Record<BajieAnimationState, number>> = {
  idle: 8,
  fly_up: 12,
  fall: 8,
  hit: 14,
  dead: 6,
};

export const BAJIE_HIT_DURATION = FRAME_COUNTS.hit / FPS.hit;
export const BAJIE_DEATH_SEQUENCE_DURATION =
  BAJIE_HIT_DURATION + FRAME_COUNTS.dead / FPS.dead;

@ccclass('BajieAnimator')
export class BajieAnimator extends Component {
  private animation: Animation | null = null;
  private rake: Node | null = null;
  private currentState: BajieAnimationState | null = null;
  private loaded = false;
  private equipmentElapsed = 0;

  protected override onLoad(): void {
    const transform = this.node.getComponent(UITransform) ?? this.node.addComponent(UITransform);
    transform.setContentSize(198, 186);

    const rake = new Node('NineToothRake');
    this.rake = rake;
    rake.layer = this.node.layer;
    rake.addComponent(UITransform).setContentSize(176, 176);
    this.setIdleRakePose(0);
    const rakeSprite = rake.addComponent(Sprite);
    rakeSprite.sizeMode = Sprite.SizeMode.CUSTOM;
    rakeSprite.trim = false;
    this.node.addChild(rake);
    resources.load(
      'characters/bajie/equipment/bajie_nine_tooth_rake/spriteFrame',
      SpriteFrame,
      (error, frame) => {
        if (error || !frame) {
          console.error('[BajieAnimator] Failed to load the nine-tooth rake.', error);
          return;
        }
        rakeSprite.spriteFrame = frame;
      },
    );

    const body = new Node('AnimatedBody');
    body.layer = this.node.layer;
    body.addComponent(UITransform).setContentSize(168, 152);
    this.node.addChild(body);
    const sprite = body.addComponent(Sprite);
    sprite.sizeMode = Sprite.SizeMode.CUSTOM;
    this.animation = body.addComponent(Animation);
    void this.loadClips(sprite);
  }

  public playState(state: BajieAnimationState, force = false): void {
    if (!force && this.currentState === state) return;
    this.currentState = state;
    if (state === 'dead') {
      this.dropRake();
    } else if (state === 'idle') {
      if (this.rake) Tween.stopAllByTarget(this.rake);
      this.equipmentElapsed = 0;
      this.setIdleRakePose(0);
    } else if (state !== 'hit') {
      this.resetHeldRakePose();
    }
    if (!this.loaded || !this.animation) return;
    this.animation.play(`bajie_${state}`);
  }

  public playHit(): void {
    this.playState('hit', true);
    this.scheduleOnce(() => this.playState('dead', true), FRAME_COUNTS.hit / FPS.hit);
  }

  public playFlapFeedback(): void {
    Tween.stopAllByTarget(this.node);
    this.node.setScale(0.94, 1.07, 1);
    tween(this.node)
      .to(0.14, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
      .start();
  }

  protected override update(deltaTime: number): void {
    if (this.currentState !== 'idle' || !this.rake) return;
    this.equipmentElapsed += Math.min(Math.max(deltaTime, 0), 0.05);
    this.setIdleRakePose(this.equipmentElapsed);
  }

  private setIdleRakePose(time: number): void {
    if (!this.rake) return;
    const breathe = Math.sin(time * Math.PI * 2 * 0.72);
    // Keep the weapon behind the body; the torso hides its middle section so
    // the silhouette reads as a rake strapped across Bajie's back.
    this.rake.setPosition(-18 + breathe * 1.5, 7 + breathe * 3, 0);
    this.rake.setRotationFromEuler(0, 0, -18 + breathe * 2.2);
    this.rake.setScale(0.96, 0.96, 1);
  }

  private resetHeldRakePose(): void {
    if (!this.rake) return;
    Tween.stopAllByTarget(this.rake);
    // The body sprite is rendered above this point, so the right hand covers
    // the handle and visually grips the weapon.
    this.rake.setPosition(25, -7, 0);
    this.rake.setRotationFromEuler(0, 0, -7);
    this.rake.setScale(1, 1, 1);
  }

  private dropRake(): void {
    if (!this.rake) return;
    Tween.stopAllByTarget(this.rake);
    tween(this.rake)
      .to(0.82, {
        position: new Vec3(-72, -225, 0),
        eulerAngles: new Vec3(0, 0, -205),
        scale: new Vec3(0.92, 0.92, 1),
      }, { easing: 'quadIn' })
      .start();
  }

  private async loadClips(sprite: Sprite): Promise<void> {
    const states = Object.keys(FRAME_COUNTS) as BajieAnimationState[];
    for (const state of states) {
      const frames = await Promise.all(
        Array.from({ length: FRAME_COUNTS[state] }, (_, index) =>
          this.loadFrame(`characters/bajie/${state}/bajie_${state}_${index < 9 ? '0' : ''}${index + 1}/spriteFrame`),
        ),
      );
      const clip = AnimationClip.createWithSpriteFrames(frames, FPS[state]);
      clip.name = `bajie_${state}`;
      clip.wrapMode = state === 'fly_up' || state === 'hit' || state === 'dead'
        ? AnimationClip.WrapMode.Normal
        : AnimationClip.WrapMode.Loop;
      this.animation?.addClip(clip);
      if (state === 'idle') sprite.spriteFrame = frames[0];
    }
    this.loaded = true;
    this.playState(this.currentState ?? 'idle', true);
  }

  private loadFrame(path: string): Promise<SpriteFrame> {
    return new Promise((resolve, reject) => {
      resources.load(path, SpriteFrame, (error, frame) => error ? reject(error) : resolve(frame));
    });
  }
}
