/** Immutable project-wide constants. Gameplay tuning belongs in GameBalanceConfig later. */
export const PROJECT_CONFIG = Object.freeze({
  displayName: '飞行小八戒',
  technicalName: 'flying-bajie',
  version: '0.1.0',
  creatorVersion: '3.8.8',
  designResolution: Object.freeze({
    width: 750,
    height: 1334,
  }),
  orientation: 'portrait',
  targetPlatform: 'wechat-minigame',
} as const);

export type ProjectConfig = typeof PROJECT_CONFIG;

