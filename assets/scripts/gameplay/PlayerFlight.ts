import {
  _decorator,
  CircleCollider2D,
  Component,
  Node,
  UITransform,
} from 'cc';
import { FLIGHT_CONFIG, getFlightBounds } from '../config/FlightConfig';
import { FlightInput } from '../input/FlightInput';
import {
  FLIGHT_TELEMETRY_EVENT,
  PLAYER_DEATH_COMPLETE_EVENT,
  PLAYER_FLAP_EVENT,
  PLAYER_RESTART_REQUEST_EVENT,
  type FlightBoundary,
  type FlightTelemetry,
} from './FlightTelemetry';
import { stepFlight, velocityToTilt } from './FlightMath';
import { BAJIE_HIT_DURATION, BajieAnimator } from './BajieAnimator';

const { ccclass } = _decorator;
const HOME_POSITION_X = 0;
const ENTER_FLIGHT_DURATION = 0.24;
const FALL_ANIMATION_TRIGGER_SPEED = -260;
const FALL_ANIMATION_TRIGGER_DELAY = 0.16;
const DEATH_GRAVITY = -2100;
const DEATH_MAX_FALL_SPEED = -1250;
const DEATH_EXIT_Y = -770;
const DEATH_MAX_DURATION = 1.5;
const IMPACT_FREEZE_DURATION = 0.055;

@ccclass('PlayerFlight')
export class PlayerFlight extends Component {
  private readonly flightInput = new FlightInput();
  private velocityY: number = FLIGHT_CONFIG.startVelocityY;
  private visualRoot: Node | null = null;
  private animator: BajieAnimator | null = null;
  private visualTilt = 0;
  private hasStarted = false;
  private isDead = false;
  private isPaused = false;
  private restartArmed = false;
  private flapCooldown = 0;
  private flapPressedThisFrame = false;
  private boundary: FlightBoundary = 'None';
  private enterFlightElapsed = 0;
  private sustainedFallTime = 0;
  private deathSequenceElapsed = 0;
  private deathVelocityY = 0;
  private deathComplete = false;
  private impactFreezeRemaining = 0;
  private impactAnimationStarted = false;

  protected override onLoad(): void {
    this.node.setPosition(
      HOME_POSITION_X,
      FLIGHT_CONFIG.startPositionY,
      0,
    );
    this.installStableCollider();
    this.visualRoot = this.createFormalBajie();
  }

  protected override onEnable(): void {
    this.flightInput.attach();
  }

  protected override onDisable(): void {
    this.flightInput.detach();
  }

  protected override update(deltaTime: number): void {
    this.flapPressedThisFrame = this.flightInput.consumeFlapPressed();

    if (this.isPaused) {
      this.animator?.playState('idle');
      this.publishTelemetry('Paused');
      return;
    }

    if (this.isDead) {
      const restartPressed = this.flapPressedThisFrame;
      if (this.impactFreezeRemaining > 0) {
        this.impactFreezeRemaining = Math.max(0, this.impactFreezeRemaining - Math.min(deltaTime, 0.05));
        if (this.impactFreezeRemaining === 0 && !this.impactAnimationStarted) {
          this.impactAnimationStarted = true;
          this.animator?.playHit();
        }
        this.publishTelemetry('Dead');
        return;
      }
      this.updateDeathFall(deltaTime);
      this.flapPressedThisFrame = false;
      if (this.deathComplete && !this.restartArmed) {
        this.restartArmed = true;
      } else if (this.deathComplete && restartPressed) {
        this.restartArmed = false;
        this.node.emit(PLAYER_RESTART_REQUEST_EVENT);
        return;
      }
      this.publishTelemetry('Dead');
      return;
    }

    if (!this.hasStarted) {
      this.animator?.playState('idle');
      if (!this.flapPressedThisFrame) {
        this.publishTelemetry('Ready');
        return;
      }
      this.hasStarted = true;
      this.enterFlightElapsed = 0;
    }

    const safeDelta = Math.min(deltaTime, FLIGHT_CONFIG.maxDeltaTime);
    this.flapCooldown = Math.max(0, this.flapCooldown - safeDelta);
    const applyFlap = this.flapPressedThisFrame && this.flapCooldown <= 0;
    if (applyFlap) this.flapCooldown = FLIGHT_CONFIG.minFlapInterval;

    const step = stepFlight(
      this.velocityY,
      applyFlap,
      deltaTime,
      FLIGHT_CONFIG,
    );
    this.velocityY = step.velocityY;
    if (applyFlap) {
      this.sustainedFallTime = 0;
      this.animator?.playState('fly_up', true);
      this.animator?.playFlapFeedback();
      this.node.emit(PLAYER_FLAP_EVENT);
    } else if (this.velocityY <= FALL_ANIMATION_TRIGGER_SPEED) {
      this.sustainedFallTime += safeDelta;
      if (this.sustainedFallTime >= FALL_ANIMATION_TRIGGER_DELAY) {
        this.animator?.playState('fall');
      }
    } else {
      this.sustainedFallTime = 0;
    }

    const position = this.node.position;
    const nextY = position.y + step.deltaY;
    const boundedY = this.applyVerticalBounds(nextY);
    this.enterFlightElapsed = Math.min(
      ENTER_FLIGHT_DURATION,
      this.enterFlightElapsed + safeDelta,
    );
    const transition = this.enterFlightElapsed / ENTER_FLIGHT_DURATION;
    const easedTransition = transition * transition * (3 - 2 * transition);
    const flightX = HOME_POSITION_X
      + (FLIGHT_CONFIG.startPositionX - HOME_POSITION_X) * easedTransition;
    this.node.setPosition(flightX, boundedY, position.z);
    this.updateVisualTilt(Math.min(deltaTime, FLIGHT_CONFIG.maxDeltaTime));
    this.publishTelemetry('Flying');
  }

  public kill(): void {
    if (this.isDead) return;
    this.isDead = true;
    this.restartArmed = false;
    this.deathSequenceElapsed = 0;
    this.deathVelocityY = 0;
    this.deathComplete = false;
    this.impactFreezeRemaining = IMPACT_FREEZE_DURATION;
    this.impactAnimationStarted = false;
    this.velocityY = 0;
    this.boundary = 'None';
    this.visualRoot?.setRotationFromEuler(0, 0, -20);
    const collider = this.node.getComponent(CircleCollider2D);
    if (collider) collider.enabled = false;
    this.publishTelemetry('Dead');
  }

  public setPaused(paused: boolean): void {
    if (this.isDead) return;
    this.isPaused = paused;
    if (paused) this.publishTelemetry('Paused');
  }

  public resetFlight(): void {
    this.isDead = false;
    this.isPaused = false;
    this.restartArmed = false;
    this.hasStarted = false;
    this.velocityY = FLIGHT_CONFIG.startVelocityY;
    this.boundary = 'None';
    this.visualTilt = 0;
    this.flapCooldown = 0;
    this.flapPressedThisFrame = false;
    this.enterFlightElapsed = 0;
    this.sustainedFallTime = 0;
    this.deathSequenceElapsed = 0;
    this.deathVelocityY = 0;
    this.deathComplete = false;
    this.impactFreezeRemaining = 0;
    this.impactAnimationStarted = false;
    this.flightInput.reset();
    this.node.setPosition(
      HOME_POSITION_X,
      FLIGHT_CONFIG.startPositionY,
      0,
    );
    this.visualRoot?.setRotationFromEuler(0, 0, 0);
    this.animator?.playState('idle', true);
    const collider = this.node.getComponent(CircleCollider2D);
    if (collider) collider.enabled = true;
    this.publishTelemetry('Ready');
  }

  private installStableCollider(): void {
    const collider = this.node.getComponent(CircleCollider2D)
      ?? this.node.addComponent(CircleCollider2D);
    collider.radius = FLIGHT_CONFIG.colliderRadius;
    collider.sensor = true;
  }

  private updateDeathFall(deltaTime: number): void {
    if (this.deathComplete) return;
    const dt = Math.min(deltaTime, FLIGHT_CONFIG.maxDeltaTime);
    this.deathSequenceElapsed += dt;

    if (this.deathSequenceElapsed >= BAJIE_HIT_DURATION) {
      this.deathVelocityY = Math.max(
        DEATH_MAX_FALL_SPEED,
        this.deathVelocityY + DEATH_GRAVITY * dt,
      );
      const position = this.node.position;
      this.node.setPosition(position.x, position.y + this.deathVelocityY * dt, position.z);
      const fallProgress = Math.min(1, (this.deathSequenceElapsed - BAJIE_HIT_DURATION) / 0.55);
      this.visualRoot?.setRotationFromEuler(0, 0, -20 - 55 * fallProgress);
    }

    if (this.node.position.y <= DEATH_EXIT_Y || this.deathSequenceElapsed >= DEATH_MAX_DURATION) {
      this.deathComplete = true;
      this.node.emit(PLAYER_DEATH_COMPLETE_EVENT);
    }
  }

  private applyVerticalBounds(nextY: number): number {
    const bounds = getFlightBounds();
    if (nextY >= bounds.top) {
      this.boundary = 'Top';
      if (this.velocityY > 0) this.velocityY = 0;
      return bounds.top;
    }
    if (nextY <= bounds.bottom) {
      this.boundary = 'Bottom';
      if (this.velocityY < 0) this.velocityY = 0;
      return bounds.bottom;
    }

    this.boundary = 'None';
    return nextY;
  }

  private publishTelemetry(status: FlightTelemetry['status']): void {
    const telemetry: FlightTelemetry = {
      status,
      flapPressed: this.flapPressedThisFrame,
      height: this.node.position.y - FLIGHT_CONFIG.startPositionY,
      velocityY: this.velocityY,
      gravity: FLIGHT_CONFIG.gravity,
      flapVelocity: FLIGHT_CONFIG.flapVelocity,
      boundary: this.boundary,
    };
    this.node.emit(FLIGHT_TELEMETRY_EVENT, telemetry);
  }

  private updateVisualTilt(deltaTime: number): void {
    if (!this.visualRoot) return;

    const targetTilt = velocityToTilt(this.velocityY, FLIGHT_CONFIG);
    const blend = 1 - Math.exp(-deltaTime / FLIGHT_CONFIG.tiltSmoothTime);
    this.visualTilt += (targetTilt - this.visualTilt) * blend;
    this.visualRoot.setRotationFromEuler(0, 0, this.visualTilt);
  }

  private createFormalBajie(): Node {
    const visual = new Node('BajieVisual');
    visual.layer = this.node.layer;
    visual.addComponent(UITransform).setContentSize(
      FLIGHT_CONFIG.visualWidth,
      FLIGHT_CONFIG.visualHeight,
    );
    this.node.addChild(visual);

    this.animator = visual.addComponent(BajieAnimator);
    return visual;
  }
}
