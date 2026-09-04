import { _decorator, AudioClip, AudioSource, Component, game, Game, Node, resources } from 'cc';

const { ccclass } = _decorator;

type AudioCue = 'score' | 'impact';

const AUDIO_PATHS: Readonly<Record<AudioCue, string>> = Object.freeze({
  score: 'audio/sfx/sfx_score',
  impact: 'audio/sfx/sfx_impact',
});

const MASTER_DB = -3;
const MUSIC_DB = -10;
const SFX_DB = -5;

function dbToLinear(db: number): number {
  return Math.pow(10, db / 20);
}

@ccclass('GameAudio')
export class GameAudio extends Component {
  private readonly clips = new Map<AudioCue, AudioClip>();
  private musicSource: AudioSource | null = null;
  private sfxSource: AudioSource | null = null;
  private musicRequested = false;
  private pausedByGame = false;
  private resumeAfterForeground = false;
  private readonly masterGain = dbToLinear(MASTER_DB);
  private readonly musicGain = dbToLinear(MUSIC_DB);
  private readonly sfxGain = dbToLinear(SFX_DB);

  protected override onLoad(): void {
    this.musicSource = this.createSource('MusicSource');
    this.musicSource.loop = true;
    this.musicSource.volume = this.masterGain * this.musicGain;
    this.sfxSource = this.createSource('SfxSource');
    this.sfxSource.volume = this.masterGain * this.sfxGain;
    this.preload();
    game.on(Game.EVENT_HIDE, this.onHide, this);
    game.on(Game.EVENT_SHOW, this.onShow, this);
  }

  protected override onDestroy(): void {
    game.off(Game.EVENT_HIDE, this.onHide, this);
    game.off(Game.EVENT_SHOW, this.onShow, this);
  }

  public startMusic(): void {
    this.musicRequested = true;
    this.pausedByGame = false;
    this.playMusicIfReady();
  }

  public pauseMusic(): void {
    this.pausedByGame = true;
    this.musicSource?.pause();
  }

  public resumeMusic(): void {
    this.pausedByGame = false;
    this.playMusicIfReady();
  }

  public stopMusic(): void {
    this.musicRequested = false;
    this.pausedByGame = false;
    this.musicSource?.stop();
  }

  public playScore(): void { this.playCue('score', 0.82); }
  public playImpact(): void { this.playCue('impact', 0.90); }

  private createSource(name: string): AudioSource {
    const node = new Node(name);
    this.node.addChild(node);
    return node.addComponent(AudioSource);
  }

  private preload(): void {
    resources.load('audio/music/bgm_journey_clouds_lyrical', AudioClip, (error, clip) => {
      if (error || !clip || !this.musicSource) {
        console.warn('[GameAudio] BGM failed to load.', error);
        return;
      }
      this.musicSource.clip = clip;
      this.playMusicIfReady();
    });
    for (const cue of Object.keys(AUDIO_PATHS) as AudioCue[]) {
      resources.load(AUDIO_PATHS[cue], AudioClip, (error, clip) => {
        if (error || !clip) console.warn(`[GameAudio] ${cue} failed to load.`, error);
        else this.clips.set(cue, clip);
      });
    }
  }

  private playMusicIfReady(): void {
    if (!this.musicRequested || this.pausedByGame || !this.musicSource?.clip) return;
    if (!this.musicSource.playing) this.musicSource.play();
  }

  private playCue(cue: AudioCue, gain: number): void {
    const clip = this.clips.get(cue);
    if (!clip || !this.sfxSource) return;
    this.sfxSource.playOneShot(clip, gain);
  }

  private onHide(): void {
    this.resumeAfterForeground = !!this.musicSource?.playing && this.musicRequested;
    this.musicSource?.pause();
  }

  private onShow(): void {
    if (this.resumeAfterForeground && !this.pausedByGame) this.playMusicIfReady();
    this.resumeAfterForeground = false;
  }
}
