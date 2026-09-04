import { _decorator, Color, Component, Graphics, HorizontalTextAlignment, Label, Node, resources, Sprite, SpriteFrame, tween, Tween, UITransform, Vec3, VerticalTextAlignment } from 'cc';

const { ccclass } = _decorator;

@ccclass('FormalGameUI')
export class FormalGameUI extends Component {
  private home: Node | null = null;
  private hud: Node | null = null;
  private pause: Node | null = null;
  private result: Node | null = null;
  private scoreLabel: Label | null = null;
  private resultScore: Label | null = null;
  private onPause: (() => void) | null = null;

  public initialize(onPause: () => void): void {
    this.onPause = onPause;
    this.home = this.createHome();
    this.hud = this.createHud();
    this.pause = this.createOverlay('PausePanel', '暂停', '点击屏幕继续', 'ui/panels/panel_jade/spriteFrame');
    this.result = this.createResult();
    this.showReady();
  }

  public showReady(): void {
    if (this.home) this.home.active = true;
    if (this.hud) this.hud.active = false;
    if (this.pause) this.pause.active = false;
    if (this.result) this.result.active = false;
    this.setScore(0);
  }

  public showPlaying(): void {
    if (this.home) this.home.active = false;
    if (this.hud) this.hud.active = true;
    if (this.pause) this.pause.active = false;
    if (this.result) this.result.active = false;
  }

  public showPaused(): void {
    if (this.pause) this.pause.active = true;
  }

  public hidePaused(): void {
    if (this.pause) this.pause.active = false;
  }

  public showGameOver(score: number): void {
    if (this.pause) this.pause.active = false;
    if (this.result) this.result.active = true;
    if (this.resultScore) this.resultScore.string = `${score}`;
  }

  public setScore(score: number): void {
    if (!this.scoreLabel) return;
    this.scoreLabel.string = `${score}`;
    if (score <= 0) {
      this.scoreLabel.node.setScale(1, 1, 1);
      return;
    }
    Tween.stopAllByTarget(this.scoreLabel.node);
    this.scoreLabel.node.setScale(1.34, 0.82, 1);
    tween(this.scoreLabel.node)
      .to(0.18, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
      .start();
  }

  private createHome(): Node {
    const root = this.createRoot('HomeScreen');
    const title = this.createSprite(root, 'GameTitle', 'ui/title/game_title/spriteFrame', 560, 250, 0, 315);
    title.setScale(0.94, 0.94, 1);
    return root;
  }

  private createHud(): Node {
    const root = this.createRoot('HUD');
    this.createSprite(root, 'ScorePanel', 'ui/panels/panel_jade/spriteFrame', 190, 116, 0, 545);
    this.scoreLabel = this.createLabel(root, 'Score', '0', 58, 160, 90, 0, 546, new Color(255, 247, 210));
    const pauseButton = this.createSprite(root, 'PauseButton', 'ui/icons/icon_pause/spriteFrame', 82, 82, 304, 550);
    pauseButton.on(Node.EventType.TOUCH_END, () => this.onPause?.(), this);
    pauseButton.on(Node.EventType.MOUSE_UP, () => this.onPause?.(), this);
    return root;
  }

  private createResult(): Node {
    const root = this.createRoot('ResultScreen');
    this.createDim(root);
    this.createSprite(root, 'ResultPanel', 'ui/panels/panel_wood/spriteFrame', 560, 560, 0, 20);
    this.createLabel(root, 'ResultTitle', '本局结束', 48, 460, 75, 0, 175, new Color(82, 44, 26));
    this.createLabel(root, 'ScoreCaption', '飞越通道', 28, 360, 48, 0, 75, new Color(91, 57, 36));
    this.resultScore = this.createLabel(root, 'ResultScore', '0', 76, 280, 100, 0, -10, new Color(174, 70, 38));
    this.createSprite(root, 'RetryButton', 'ui/panels/button_jade/spriteFrame', 300, 108, 0, -160);
    this.createSprite(root, 'RetryIcon', 'ui/icons/icon_retry/spriteFrame', 58, 58, -92, -160);
    this.createLabel(root, 'RetryText', '点击重开', 34, 190, 60, 38, -160, new Color(255, 247, 210));
    return root;
  }

  private createOverlay(name: string, title: string, prompt: string, panelPath: string): Node {
    const root = this.createRoot(name);
    this.createDim(root);
    this.createSprite(root, `${name}Art`, panelPath, 500, 350, 0, 20);
    this.createLabel(root, `${name}Title`, title, 56, 360, 80, 0, 80, new Color(255, 247, 210));
    this.createLabel(root, `${name}Prompt`, prompt, 30, 360, 55, 0, -35, new Color(255, 247, 210));
    return root;
  }

  private createRoot(name: string): Node {
    const root = new Node(name);
    root.layer = this.node.layer;
    root.addComponent(UITransform).setContentSize(750, 1334);
    this.node.addChild(root);
    return root;
  }

  private createDim(parent: Node): void {
    const dim = new Node('Dim');
    dim.layer = parent.layer;
    dim.addComponent(UITransform).setContentSize(750, 1334);
    const graphics = dim.addComponent(Graphics);
    graphics.fillColor = new Color(19, 32, 44, 145);
    graphics.rect(-375, -667, 750, 1334);
    graphics.fill();
    parent.addChild(dim);
  }

  private createSprite(parent: Node, name: string, path: string, width: number, height: number, x: number, y: number): Node {
    const node = new Node(name);
    node.layer = parent.layer;
    node.setPosition(x, y, 0);
    node.addComponent(UITransform).setContentSize(width, height);
    const sprite = node.addComponent(Sprite);
    sprite.sizeMode = Sprite.SizeMode.CUSTOM;
    if (path.indexOf('ui/panels/') === 0) sprite.type = Sprite.Type.SLICED;
    parent.addChild(node);
    resources.load(path, SpriteFrame, (error, frame) => {
      if (error) console.error(`[FormalGameUI] Failed to load ${path}`, error);
      else sprite.spriteFrame = frame;
    });
    return node;
  }

  private createLabel(parent: Node, name: string, text: string, size: number, width: number, height: number, x: number, y: number, color: Color): Label {
    const node = new Node(name);
    node.layer = parent.layer;
    node.setPosition(x, y, 0);
    node.addComponent(UITransform).setContentSize(width, height);
    parent.addChild(node);
    const label = node.addComponent(Label);
    label.string = text;
    label.fontSize = size;
    label.lineHeight = Math.ceil(size * 1.18);
    label.color = color;
    label.horizontalAlign = HorizontalTextAlignment.CENTER;
    label.verticalAlign = VerticalTextAlignment.CENTER;
    label.overflow = Label.Overflow.SHRINK;
    return label;
  }
}
