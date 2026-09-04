import { EventMouse, EventTouch, Game, Input, game, input } from 'cc';

/** Converts device events into the single continuous action used by gameplay. */
export class FlightInput {
  private readonly activeTouches = new Set<number>();
  private mouseHeld = false;
  private flapPending = false;
  private attached = false;

  public consumeFlapPressed(): boolean {
    if (!this.flapPending) return false;
    this.flapPending = false;
    return true;
  }

  public attach(): void {
    if (this.attached) return;
    this.attached = true;

    input.on(Input.EventType.TOUCH_START, this.onTouchStart, this);
    input.on(Input.EventType.TOUCH_END, this.onTouchEnd, this);
    input.on(Input.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
    input.on(Input.EventType.MOUSE_DOWN, this.onMouseDown, this);
    input.on(Input.EventType.MOUSE_UP, this.onMouseUp, this);
    game.on(Game.EVENT_HIDE, this.reset, this);
  }

  public detach(): void {
    if (!this.attached) return;
    this.attached = false;

    input.off(Input.EventType.TOUCH_START, this.onTouchStart, this);
    input.off(Input.EventType.TOUCH_END, this.onTouchEnd, this);
    input.off(Input.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
    input.off(Input.EventType.MOUSE_DOWN, this.onMouseDown, this);
    input.off(Input.EventType.MOUSE_UP, this.onMouseUp, this);
    game.off(Game.EVENT_HIDE, this.reset, this);
    this.reset();
  }

  public reset(): void {
    this.activeTouches.clear();
    this.mouseHeld = false;
    this.flapPending = false;
  }

  private onTouchStart(event: EventTouch): void {
    const touchId = event.getID();
    if (touchId === null || this.activeTouches.has(touchId)) return;
    this.activeTouches.add(touchId);
    this.flapPending = true;
  }

  private onTouchEnd(event: EventTouch): void {
    const touchId = event.getID();
    if (touchId !== null) this.activeTouches.delete(touchId);
  }

  private onMouseDown(event: EventMouse): void {
    if (event.getButton() !== EventMouse.BUTTON_LEFT || this.mouseHeld) return;
    this.mouseHeld = true;
    this.flapPending = true;
  }

  private onMouseUp(event: EventMouse): void {
    if (event.getButton() === EventMouse.BUTTON_LEFT) this.mouseHeld = false;
  }
}
