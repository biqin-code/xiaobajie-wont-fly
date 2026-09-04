/** Platform boundary. Gameplay code must not call `wx.*` directly. */
export interface PlatformBridge {
  readonly platform: 'web' | 'wechat-minigame';
  getSafeArea(): Readonly<SafeAreaInsets>;
  onEnterBackground(callback: () => void): () => void;
  onEnterForeground(callback: () => void): () => void;
}

export interface SafeAreaInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

