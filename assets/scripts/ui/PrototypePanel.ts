import {
  _decorator,
  Color,
  Component,
  EventMouse,
  EventTouch,
  EventKeyboard,
  Game,
  Graphics,
  HorizontalTextAlignment,
  Input,
  input,
  game,
  KeyCode,
  Label,
  Mask,
  Node,
  profiler,
  UITransform,
  VerticalTextAlignment,
} from 'cc';
import {
  adjustFlightParameter,
  FLIGHT_CONFIG,
  getFlightBounds,
  resetFlightParameters,
} from '../config/FlightConfig';
import {
  FLIGHT_TELEMETRY_EVENT,
  PLAYER_DEATH_COMPLETE_EVENT,
  PLAYER_RESTART_REQUEST_EVENT,
  type FlightTelemetry,
} from '../gameplay/FlightTelemetry';
import {
  COURSE_PLAYER_HIT_EVENT,
  COURSE_SCORE_EVENT,
  FixedObstacleCourse,
} from '../gameplay/FixedObstacleCourse';
import { PlayerFlight } from '../gameplay/PlayerFlight';
import { ParallaxBackground } from '../gameplay/ParallaxBackground';
import { GameEffects } from '../gameplay/GameEffects';
import { GameAudio } from '../audio/GameAudio';
import { FormalGameUI } from './FormalGameUI';

const { ccclass, property } = _decorator;
const DESIGN_WIDTH = 750;
const DESIGN_HEIGHT = 1334;

@ccclass('PrototypePanel')
export class PrototypePanel extends Component {
  @property(Node)
  public backgroundRoot: Node | null = null;

  @property(Node)
  public uiRoot: Node | null = null;

  @property(Node)
  public playerRoot: Node | null = null;

  @property
  public showProfiler = false;

  private telemetryLabel: Label | null = null;
  private scoreLabel: Label | null = null;
  private instructionLabel: Label | null = null;
  private obstacleCourse: FixedObstacleCourse | null = null;
  private playerFlight: PlayerFlight | null = null;
  private courseStarted = false;
  private isPaused = false;
  private lastFlightStatus: FlightTelemetry['status'] = 'Ready';
  private formalUI: FormalGameUI | null = null;
  private effects: GameEffects | null = null;
  private gameAudio: GameAudio | null = null;
  private parallaxBackground: ParallaxBackground | null = null;

  protected override onLoad(): void {
    if (!this.backgroundRoot || !this.uiRoot || !this.playerRoot) {
      console.error('[PrototypePanel] Scene references are incomplete.');
      return;
    }

    this.prepareRoot(this.backgroundRoot);
    this.prepareRoot(this.uiRoot);
    this.installBackgroundViewportMask();
    this.installGameplayViewportMask();
    this.createBackground(this.backgroundRoot);
    this.formalUI = this.uiRoot.getComponent(FormalGameUI) ?? this.uiRoot.addComponent(FormalGameUI);
    this.formalUI.initialize(() => this.togglePause());
    const effectRoot = this.playerRoot.parent?.getChildByName('EffectRoot');
    if (effectRoot) this.effects = effectRoot.getComponent(GameEffects) ?? effectRoot.addComponent(GameEffects);
    const audioNode = new Node('GameAudio');
    this.node.addChild(audioNode);
    this.gameAudio = audioNode.addComponent(GameAudio);
    this.createFixedObstacleCourse();
  }

  protected override onEnable(): void {
    this.playerRoot?.on(FLIGHT_TELEMETRY_EVENT, this.onFlightTelemetry, this);
    this.obstacleCourse?.node.on(COURSE_SCORE_EVENT, this.onCourseScore, this);
    this.obstacleCourse?.node.on(COURSE_PLAYER_HIT_EVENT, this.onPlayerHit, this);
    this.playerRoot?.on(PLAYER_RESTART_REQUEST_EVENT, this.onRestartRequested, this);
    this.playerRoot?.on(PLAYER_DEATH_COMPLETE_EVENT, this.onDeathComplete, this);
    input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
    input.on(Input.EventType.TOUCH_START, this.onResumeTouch, this);
    input.on(Input.EventType.MOUSE_DOWN, this.onResumeMouse, this);
    game.on(Game.EVENT_HIDE, this.onEnterBackground, this);
  }

  protected override start(): void {
    if (this.showProfiler) profiler.showStats();
  }

  protected override onDisable(): void {
    this.playerRoot?.off(FLIGHT_TELEMETRY_EVENT, this.onFlightTelemetry, this);
    this.obstacleCourse?.node.off(COURSE_SCORE_EVENT, this.onCourseScore, this);
    this.obstacleCourse?.node.off(COURSE_PLAYER_HIT_EVENT, this.onPlayerHit, this);
    this.playerRoot?.off(PLAYER_RESTART_REQUEST_EVENT, this.onRestartRequested, this);
    this.playerRoot?.off(PLAYER_DEATH_COMPLETE_EVENT, this.onDeathComplete, this);
    input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
    input.off(Input.EventType.TOUCH_START, this.onResumeTouch, this);
    input.off(Input.EventType.MOUSE_DOWN, this.onResumeMouse, this);
    game.off(Game.EVENT_HIDE, this.onEnterBackground, this);
    if (this.showProfiler) profiler.hideStats();
  }

  private prepareRoot(root: Node): void {
    const transform = root.getComponent(UITransform) ?? root.addComponent(UITransform);
    transform.setContentSize(DESIGN_WIDTH, DESIGN_HEIGHT);
  }

  private installGameplayViewportMask(): void {
    const viewport = this.playerRoot?.parent;
    if (!viewport) return;
    const transform = viewport.getComponent(UITransform) ?? viewport.addComponent(UITransform);
    transform.setContentSize(DESIGN_WIDTH, DESIGN_HEIGHT);
    const mask = viewport.getComponent(Mask) ?? viewport.addComponent(Mask);
    mask.type = Mask.Type.GRAPHICS_RECT;
    mask.inverted = false;
  }

  private installBackgroundViewportMask(): void {
    if (!this.backgroundRoot) return;
    const transform = this.backgroundRoot.getComponent(UITransform)
      ?? this.backgroundRoot.addComponent(UITransform);
    transform.setContentSize(DESIGN_WIDTH, DESIGN_HEIGHT);
    const mask = this.backgroundRoot.getComponent(Mask) ?? this.backgroundRoot.addComponent(Mask);
    mask.type = Mask.Type.GRAPHICS_RECT;
    mask.inverted = false;
  }

  private createBackground(parent: Node): void {
    const background = new Node('TiangongParallaxBackground');
    background.layer = parent.layer;
    background.addComponent(UITransform).setContentSize(DESIGN_WIDTH, DESIGN_HEIGHT);
    parent.addChild(background);

    this.parallaxBackground = background.addComponent(ParallaxBackground);
  }

  private createInterface(parent: Node): void {
    this.createLabel(parent, 'PrototypeTitle', '飞行小八戒 · 完整玩法循环', 0, 610, 34, 700, 56);
    this.createScoreDisplay(parent);
    this.telemetryLabel = this.createLabel(
      parent,
      'TelemetryLabel',
      this.defaultTelemetryText(),
      -345,
      500,
      25,
      670,
      178,
      HorizontalTextAlignment.LEFT,
    );
    this.instructionLabel = this.createLabel(
      parent,
      'InstructionLabel',
      '连续点击起飞 · 停止点击降落',
      0,
      205,
      42,
      700,
      70,
    );
    this.createLabel(
      parent,
      'TuningHelpLabel',
      '实时调参  Q/A：减弱/增强重力   W/S：增强/减弱点击冲量   R：重置',
      0,
      -545,
      23,
      710,
      56,
    );
    this.createLabel(parent, 'StageLabel', 'M3  上下独立移动 · 动态安全钳制', 0, -620, 22, 700, 38);
  }

  private createFixedObstacleCourse(): void {
    if (!this.playerRoot) return;
    const obstacleRoot = this.playerRoot.parent?.getChildByName('ObstacleRoot');
    if (!obstacleRoot) {
      console.error('[PrototypePanel] ObstacleRoot was not found.');
      return;
    }

    this.obstacleCourse = obstacleRoot.getComponent(FixedObstacleCourse)
      ?? obstacleRoot.addComponent(FixedObstacleCourse);
    this.obstacleCourse.initialize(this.playerRoot);
    this.playerFlight = this.playerRoot.getComponent(PlayerFlight);
  }

  private createScoreDisplay(parent: Node): void {
    const panel = new Node('ScorePanel');
    panel.layer = parent.layer;
    panel.setPosition(250, 405, 0);
    panel.addComponent(UITransform).setContentSize(190, 104);
    parent.addChild(panel);

    const graphics = panel.addComponent(Graphics);
    graphics.fillColor = new Color(24, 67, 91, 205);
    graphics.strokeColor = new Color(255, 230, 145, 255);
    graphics.lineWidth = 4;
    graphics.roundRect(-95, -52, 190, 104, 20);
    graphics.fill();
    graphics.stroke();

    this.scoreLabel = this.createLabel(
      panel,
      'ScoreLabel',
      '当前得分\n0',
      0,
      0,
      32,
      170,
      88,
    );
    this.scoreLabel.color = new Color(255, 247, 213, 255);
  }

  private defaultTelemetryText(): string {
    return `状态: Ready  输入: 等待点击  边界: 无\n` +
      `高度: 0.0  速度: 0.0 px/s\n` +
      `重力: ${FLIGHT_CONFIG.gravity.toFixed(0)} px/s²  ` +
      `点击冲量: +${FLIGHT_CONFIG.flapVelocity.toFixed(0)} px/s`;
  }

  private createLabel(
    parent: Node,
    name: string,
    text: string,
    x: number,
    y: number,
    fontSize: number,
    width: number,
    height: number,
    horizontalAlign = HorizontalTextAlignment.CENTER,
  ): Label {
    const node = new Node(name);
    node.layer = parent.layer;
    node.setPosition(x, y, 0);
    node.addComponent(UITransform).setContentSize(width, height);
    parent.addChild(node);

    const label = node.addComponent(Label);
    label.string = text;
    label.fontSize = fontSize;
    label.lineHeight = Math.ceil(fontSize * 1.25);
    label.color = new Color(35, 60, 83, 255);
    label.horizontalAlign = horizontalAlign;
    label.verticalAlign = VerticalTextAlignment.CENTER;
    label.overflow = Label.Overflow.SHRINK;
    return label;
  }

  private onKeyDown(event: EventKeyboard): void {
    switch (event.keyCode) {
      case KeyCode.KEY_Q:
        adjustFlightParameter('gravity', 100);
        break;
      case KeyCode.KEY_A:
        adjustFlightParameter('gravity', -100);
        break;
      case KeyCode.KEY_W:
        adjustFlightParameter('flapVelocity', 20);
        break;
      case KeyCode.KEY_S:
        adjustFlightParameter('flapVelocity', -20);
        break;
      case KeyCode.KEY_R:
        resetFlightParameters();
        break;
      case KeyCode.KEY_P:
        this.togglePause();
        break;
      default:
        return;
    }
  }

  private onFlightTelemetry(telemetry: FlightTelemetry): void {
    this.lastFlightStatus = telemetry.status;
    if (!this.courseStarted && telemetry.status === 'Flying') {
      this.courseStarted = true;
      this.obstacleCourse?.startCourse();
      this.parallaxBackground?.setPlaying(true);
      this.gameAudio?.startMusic();
      this.formalUI?.showPlaying();
    }
    this.effects?.setWind(telemetry.status === 'Flying' && telemetry.velocityY > 0, this.playerRoot?.position);
    if (!this.telemetryLabel) return;

    const inputText = telemetry.flapPressed ? '点击' : '等待';
    const boundaryText = telemetry.boundary === 'None'
      ? '无'
      : telemetry.boundary === 'Top' ? '顶部' : '底部';
    const riseSign = telemetry.flapVelocity >= 0 ? '+' : '';
    const score = this.obstacleCourse?.currentScore ?? 0;
    this.telemetryLabel.string =
      `状态: ${telemetry.status}  输入: ${inputText}  得分: ${score}  边界: ${boundaryText}\n` +
      `高度: ${telemetry.height.toFixed(1)}  速度: ${telemetry.velocityY.toFixed(1)} px/s\n` +
      `重力: ${telemetry.gravity.toFixed(0)} px/s²  ` +
      `点击冲量: ${riseSign}${telemetry.flapVelocity.toFixed(0)} px/s\n` +
      (this.obstacleCourse?.getMotionDebugText() ?? '动态通道: 等待生成');
  }

  private onCourseScore(score: number): void {
    if (this.scoreLabel) this.scoreLabel.string = `当前得分\n${score}`;
    this.formalUI?.setScore(score);
    this.gameAudio?.playScore();
    if (this.playerRoot) this.effects?.playScore(this.playerRoot.position);
  }

  private onPlayerHit(): void {
    this.obstacleCourse?.stopCourse();
    this.parallaxBackground?.stopMotion();
    this.playerFlight?.kill();
    this.gameAudio?.playImpact();
    this.gameAudio?.pauseMusic();
    if (this.playerRoot) this.effects?.playHit(this.playerRoot.position);
    this.effects?.setWind(false);
    if (this.instructionLabel) {
      this.instructionLabel.string = '撞到障碍！点击屏幕重新开始';
      this.instructionLabel.color = new Color(142, 47, 42, 255);
    }
  }

  private onRestartRequested(): void {
    this.isPaused = false;
    this.courseStarted = false;
    this.obstacleCourse?.resetCourse();
    this.parallaxBackground?.resetMotion();
    this.playerFlight?.resetFlight();
    this.formalUI?.showReady();
    this.gameAudio?.stopMusic();
    if (this.instructionLabel) {
      this.instructionLabel.string = '连续点击起飞 · 停止点击降落';
      this.instructionLabel.color = new Color(35, 60, 83, 255);
    }
  }

  private onDeathComplete(): void {
    this.formalUI?.showGameOver(this.obstacleCourse?.currentScore ?? 0);
  }

  private onEnterBackground(): void {
    this.pauseGame();
  }

  private onResumeTouch(_event: EventTouch): void {
    this.resumeGame();
  }

  private onResumeMouse(event: EventMouse): void {
    if (event.getButton() === EventMouse.BUTTON_LEFT) this.resumeGame();
  }

  private togglePause(): void {
    if (this.isPaused) {
      this.resumeGame();
    } else {
      this.pauseGame();
    }
  }

  private pauseGame(): void {
    if (this.isPaused || this.lastFlightStatus !== 'Flying') return;
    this.isPaused = true;
    this.obstacleCourse?.stopCourse();
    this.parallaxBackground?.setPaused(true);
    this.playerFlight?.setPaused(true);
    this.effects?.setWind(false);
    this.gameAudio?.pauseMusic();
    this.formalUI?.showPaused();
    if (this.instructionLabel) {
      this.instructionLabel.string = '已暂停 · 点击屏幕继续';
    }
  }

  private resumeGame(): void {
    if (!this.isPaused) return;
    this.isPaused = false;
    this.playerFlight?.setPaused(false);
    this.formalUI?.hidePaused();
    if (this.courseStarted) this.obstacleCourse?.startCourse();
    this.parallaxBackground?.setPaused(false);
    this.gameAudio?.resumeMusic();
    if (this.instructionLabel) {
      this.instructionLabel.string = '连续点击起飞 · 停止点击降落';
    }
  }
}
