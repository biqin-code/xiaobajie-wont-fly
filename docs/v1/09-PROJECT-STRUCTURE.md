# 《飞行小八戒》Cocos Creator 工程结构

## 1. 已锁定基线

- Cocos Creator：`3.8.8`（3.8 LTS）。
- 工程目录：`/Volumes/bi/workspace/codex_workspace_qin/飞行小八戒`。
- Cocos/npm 技术包名：`flying-bajie`。
- TypeScript：严格模式。
- 类型：2D 竖屏微信小游戏，设计分辨率 `750 × 1334`。

工程基础文件来自本机 Cocos Creator 3.8.8 的官方 `empty-2d` 模板，再按项目技术设计补充目录和约束。

## 2. 目录结构

```text
飞行小八戒/
├── .creator/                    # Creator 项目默认导入配置
├── assets/                      # 会被 Creator 导入的运行资源
│   ├── art/                     # 已生成的正式候选美术
│   ├── audio/
│   │   ├── bgm/
│   │   └── sfx/
│   ├── bundles/core/            # 首屏及核心玩法资源预留
│   ├── prefabs/
│   │   ├── player/
│   │   ├── obstacles/
│   │   └── ui/
│   ├── scenes/                  # Boot.scene、Game.scene
│   ├── resources/obstacles/     # M2 运行时加载的首批障碍图
│   └── scripts/
│       ├── app/
│       ├── gameplay/
│       ├── systems/
│       ├── platform/
│       ├── config/
│       ├── ui/
│       └── utils/
├── art_source/                  # 不进入运行包的美术源图和 QA 预览
├── docs/v1/                     # V1 产品、技术、美术和验收基线
├── extensions/                  # Creator 编辑器扩展预留
├── images/                      # 用户参考图，不作为运行资源
├── settings/                    # 可提交的 Creator 项目设置
├── package.json                 # Creator 版本、工程名、UUID
└── tsconfig.json                # TypeScript 严格模式入口
```

`library/`、`temp/`、`local/`、`build/`、`profiles/`、`native/` 和 `node_modules/` 均为生成物或本机状态，已加入 `.gitignore`。

## 3. 初始代码边界

- `ProjectConfig.ts` 只保存工程级不可变常量，不混入飞行手感参数。
- `GameState.ts` 先锁定 V1 状态名称，状态机实现留到后续阶段。
- `PlatformBridge.ts` 只定义平台边界，后续浏览器和微信实现必须通过该接口接入。
- M1-2 已加入独立飞行配置、纯速度积分、输入动作适配和玩家表现组件；障碍、碰撞、计分与正式 UI 仍未实现。

## 4. 场景安排

- `Boot.scene`：只负责初始化服务、平台适配和切换到正式流程。
- `Game.scene`：承载背景、玩法、特效和 UI 四层节点。
- 场景基于 Cocos Creator 3.8.8 官方 `scene-2d` 模板生成，并配套标准 `.meta`；编辑器导入后继续由 Creator 维护序列化内容。

`Game.scene` 当前节点骨架：

```text
Canvas
├── Camera
└── GameRoot
    ├── BackgroundRoot
    │   ├── SkyLayer
    │   ├── FarLayer
    │   ├── MidLayer
    │   └── NearCloudLayer
    ├── GameplayRoot
    │   ├── ObstacleRoot
    │   ├── PlayerRoot
    │   └── EffectRoot
    ├── UIRoot
    │   ├── HomePanel
    │   ├── HUDPanel
    │   ├── PausePanel
    │   ├── ResultPanel
    │   └── SafeArea
    └── Services
```

Canvas 逻辑尺寸为 `750 × 1334`。`PlayerRoot` 已挂载 `PlayerFlight`，运行时创建 `GreyboxBajie` 占位表现；`ObstacleRoot` 运行时挂载对象池障碍管理器，完成随机通道、碰撞、计分和回收。

## 5. 本阶段验收

- [x] 使用本机官方 3.8.8 `empty-2d` 模板建立工程元数据。
- [x] 锁定技术包名、项目 UUID、TypeScript 严格模式与 2D 引擎模块。
- [x] 建立脚本、场景、预制体、音频、核心 Bundle 和扩展目录。
- [x] 保留已有美术、源图、参考图和文档，不迁移、不覆盖。
- [x] 用 Cocos Creator 3.8.8 首次打开工程；`asset-db` 就绪并为现有资源生成 `.meta`。
- [x] 使用 Creator 自带 TypeScript 编译器执行严格模式 `--noEmit` 检查，无错误。
- [x] 创建并保存 `Boot.scene`、`Game.scene`，生成对应 `.meta`。
- [x] 建立 `GameRoot`、背景、玩法、UI、服务及玩家/障碍/特效空容器。
- [x] 锁定场景 Canvas 逻辑尺寸为 `750 × 1334`。
- [x] M1-2：旧版长按/松开原型已完成并留作历史实现。
- [x] M1-2 PIVOT：`PlayerRoot` 已改为点击边沿触发单次向上冲量；长按不重复触发。
- [x] M1-2.1：蓝色原型背景、正确项目标题、操作提示、Ready/Flying 状态、高度/速度遥测和 FPS 面板已接入。
- [x] M1-3：玩家中心被约束在 `-511～531`，使用半径 `46 px` 的固定圆形碰撞体；HUD 展示输入、速度、边界、重力和上升加速度。
- [x] M1-3：`FlightConfig.ts` 集中管理默认值、运行时值、参数范围和重置；预览中使用 `Q/A`、`W/S`、`R` 即时调参。
- [x] M2：`ObstacleGenerator.ts` 使用独立种子随机，并在生成后约束边界与相邻通道中心变化。
- [x] M2：`FixedObstacleCourse.ts` 保留兼容类名，内部已升级为 7 组预热对象池；接入山峰、石柱、乌云和四档难度。
- [x] M2：首批障碍复制到 `assets/resources/obstacles/`，确保动态加载资源进入网页和微信构建包。
- [x] M3：`DynamicObstacle.ts` 统一驱动火球帧动画、雷电 FSM、风火轮轨迹和状态碰撞。
- [x] M3：动态资源位于 `assets/resources/obstacles/{fireball,lightning,fire_wheel}/`。
- [ ] 完成浏览器试玩验证与微信小游戏空包构建。
