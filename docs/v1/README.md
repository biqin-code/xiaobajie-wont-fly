# 《飞行小八戒》V1 文档索引

> 文档状态：基线草案 v0.2  
> 产品阶段：第一版原型与核心玩法验证  
> 目标平台：微信小游戏  
> 开发引擎：Cocos Creator 3.8 LTS（正式开发前锁定具体补丁版本）+ TypeScript

## 文档用途

本目录是《飞行小八戒》第一版的唯一需求基线。出现口头需求、聊天记录与本文档冲突时，应先更新文档并记录变更，再实施开发。

| 文档 | 负责回答的问题 |
| --- | --- |
| [00-PROTOTYPE-BRIEF.md](./00-PROTOTYPE-BRIEF.md) | 第一轮灰盒原型到底要验证什么、何时保留或推翻 |
| [01-GDD.md](./01-GDD.md) | 游戏是什么、怎么玩、第一版做什么 |
| [02-TECHNICAL-DESIGN.md](./02-TECHNICAL-DESIGN.md) | Cocos Creator 中如何组织和实现 |
| [03-ART-BIBLE.md](./03-ART-BIBLE.md) | 角色、场景、障碍、动画和 UI 应该长什么样 |
| [04-BALANCE-CONFIG.md](./04-BALANCE-CONFIG.md) | 飞行手感、障碍生成和难度初值是多少 |
| [05-PRODUCTION-PLAN.md](./05-PRODUCTION-PLAN.md) | 按什么顺序制作、每个里程碑交付什么 |
| [06-QA-ACCEPTANCE.md](./06-QA-ACCEPTANCE.md) | 什么情况下可以称为第一版完成 |
| [07-ART-DIRECTION-BRIEF.md](./07-ART-DIRECTION-BRIEF.md) | 美术制作和导入必须遵守哪些技术约束 |
| [08-GENERATED-ASSETS.md](./08-GENERATED-ASSETS.md) | 已生成素材在哪里、如何导入 Cocos、还缺哪些验收 |
| [09-PROJECT-STRUCTURE.md](./09-PROJECT-STRUCTURE.md) | Cocos Creator 工程基线、目录职责和当前搭建状态 |
| [10-M1-ACCEPTANCE-REPORT.md](./10-M1-ACCEPTANCE-REPORT.md) | M1-1 至 M1-6 的回归、10 局调参记录与阶段决策 |
| [11-M2-OBSTACLE-LOOP.md](./11-M2-OBSTACLE-LOOP.md) | M2 障碍对象池、安全随机、难度曲线与自动验收记录 |
| [12-M3-DYNAMIC-OBSTACLES.md](./12-M3-DYNAMIC-OBSTACLES.md) | M3 动态障碍状态机、轨迹、碰撞开关与安全约束 |
| [13-M4-ART-UI-INTEGRATION.md](./13-M4-ART-UI-INTEGRATION.md) | M4 正式美术、动画、界面、图集与碰撞体接入记录 |
| [14-M5-FEEL-AUDIO-FEEDBACK.md](./14-M5-FEEL-AUDIO-FEEDBACK.md) | M5 飞行手感、得分与撞击反馈、音频分组和难度节奏记录 |
| [asset-manifest.json](./asset-manifest.json) | 每项 V1 美术资产的状态、规格、来源与验收记录 |

## 当前已确认

- 游戏名：《飞行小八戒》。
- 核心操作：连续点击屏幕让八戒反复向上扑飞；停止点击后自由下落。
- 核心目标：持续穿过上下障碍物组成的通道，存活并获得更高分数。
- 世界观：东方神话天宫。
- 视觉方向：原创的温暖手绘动画电影感、自然主义奇幻、水彩与赛璐璐结合；不直接复制特定作品、角色或在世艺术家的个人风格。
- 第一版地面障碍：山峰、石柱、火球。
- 第一版天空障碍：乌云、雷电、风火轮。
- 第一版视觉素材已生成并通过透明通道、画布、命名和 `750 × 1334` 合成预览检查，当前状态为 `review`。
- 第一版不做：广告复活、皮肤、道具、任务、排行榜、关卡模式、联网账号和商业化。

## 尚待验证而非阻塞开发的事项

- 竖屏 `9:16` 目前作为推荐基线，老板可在首个可玩原型评审时最终确认。
- 飞行、速度、通道宽度等数值均为首轮试玩初值，不是最终数值。
- 当前素材尚未在 Cocos Creator 和微信真机中验收；锚点、碰撞、压缩与长屏裁切仍可能需要调整。
- 微信小游戏 AppID、主体、隐私与提审资料在发布里程碑前补齐。

## 变更规则

每次范围变更必须说明：变更内容、原因、影响的文档、开发成本、是否进入 V1。未明确进入 V1 的新想法默认放入后续版本候选池，避免第一版持续膨胀。
