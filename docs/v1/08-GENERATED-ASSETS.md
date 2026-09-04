# 《飞行小八戒》V1 已生成美术资产与导入说明

> 生成日期：2026-08-26  
> QA 更新：2026-08-27  
> 当前状态：`review`（技术检查与原生比例预览通过；引擎、真机和老板最终批准待完成）

## 1. 交付位置

### Cocos 运行素材

运行候选素材统一位于 `assets/art/`，共 71 张 PNG，原始合计约 13.6 MiB：

```text
assets/art/
├── backgrounds/                 # 4 张：天空底图 + 3 层视差层
├── characters/bajie/
│   ├── idle/                    # 6 帧
│   ├── fly_up/                  # 6 帧
│   ├── fall/                    # 4 帧
│   ├── hit/                     # 4 帧
│   ├── dead/                    # 4 帧
│   └── equipment/               # 九齿钉耙，独立背部装备层
├── obstacles/
│   ├── mountain/                # S/M/L
│   ├── pillar/                  # S/M/L
│   ├── storm_cloud/             # S/M/L
│   ├── fireball/                # 6 帧
│   ├── lightning/               # 预警 4 帧 + 生效 4 帧
│   └── fire_wheel/              # 1 张，程序旋转
├── effects/
│   ├── hit_cloud/               # 6 帧
│   ├── wind_lines.png
│   └── score_sparkle.png
├── ui/
│   ├── title/game_title.png
│   ├── panels/                  # 云牌、玉牌、木牌、玉按钮
│   └── icons/                   # 暂停、音乐、主页、重试、点击提示
└── style_targets/               # 风格板，仅评审使用
```

运行目录没有重复放置 spritesheet。Cocos Creator 应从逐帧 PNG 生成 Auto Atlas；这能保留独立 SpriteFrame 的易用性，同时避免同时打包逐帧图和整条图。

> 输入玩法已改为连续点击。现有文件 `assets/art/ui/icons/icon_hold.png` 暂时保留，不在本轮删除或重命名；代码实施前应重新设计为“点击/连点”提示图，或新增 `icon_tap.png` 后废弃旧图标。

### 源图与过程文件

`art_source/` 不属于运行包：

- `generated/`：22 张完整生成源图。
- `normalized_sheets/`：10 张规范化 spritesheet，仅供检查或再次切片。
- `previews/`：联系表、玩法合成图和总览。
- `generation-prompts.md`：最终提示词体系。
- `provenance.json`：来源记录。
- `reports/qa_summary.json`：技术检查摘要。

## 2. 动画建议

| 动画 | 帧数 | 建议播放 | 循环 | 说明 |
| --- | ---: | ---: | --- | --- |
| `bajie_idle` | 6 | 8 fps | 是 | 程序再叠加轻微上下浮动 |
| `bajie_fly_up` | 6 | 12 fps | 否/短播 | 每次有效点击时从起始帧播放一次；连续点击可重触发 |
| `bajie_fall` | 4 | 8 fps | 是 | 点击冲量结束并进入下降时播放 |
| `bajie_hit` | 4 | 14 fps | 否 | 播完进入死亡/结算流程 |
| `bajie_dead` | 4 | 8 fps | 可选 | 主要下坠和旋转由程序控制 |
| `fireball` | 6 | 12 fps | 是 | 位移由程序控制，碰撞取金色核心 |
| `lightning_warning` | 4 | 8 fps | 否 | 不造成伤害；前两帧刻意较淡 |
| `lightning_active` | 4 | 16 fps | 短循环 | 仅主闪电通道造成伤害 |
| `hit_cloud` | 6 | 15 fps | 否 | 播完回收节点 |

角色所有帧均为 `512 × 512`，主体已经对齐到统一画布。Sprite 节点可保持中心锚点；碰撞体必须使用独立子节点，不能直接跟随耳朵和衣摆轮廓变化。

九齿钉耙运行素材位于 `assets/resources/characters/bajie/equipment/bajie_nine_tooth_rake.png`，生成源文件位于 `art_source/generated/characters/bajie/equipment/`。运行时作为 `BajieVisual/NineToothRake` 独立装备层，不烘焙进动画帧且不影响碰撞体。待机状态下斜背在身体后方，并以接近呼吸动画的节奏轻微上下浮动和摆角；进入起飞和正常下落后切换为握持姿态。撞击阶段暂时保持当前姿态，进入真正死亡状态后与八戒分离，向侧下方加速坠落并持续旋转；重开时停止掉落并恢复待机背负姿态。

## 3. Cocos Creator 导入建议

- 角色、障碍、特效和 UI：PNG/SpriteFrame、线性过滤、关闭 mipmap、Clamp；确认透明边无白边后再启用项目所选压缩格式。
- 当前 V2 背景位于 `assets/art/backgrounds/v2/`：四层统一为 `750 × 1334`；天空不透明，远景/中景/近景具备 Alpha。运行时位于 `assets/resources/backgrounds/v2/`，每层只使用一张 Sprite，通过超扫后的轻微往返漂移实现视差，禁止横向复制拼接。旧版背景保留但不再被代码引用。
- V2 合成检查图：`art_source/previews/background_v2_composite.png`。中景与近景生成稿曾包含烘焙棋盘格，已经过确定性低饱和背景提取与 Alpha 校验后接入。
- 当前运行背景已升级为 V4 元素拆分版，位于 `assets/resources/backgrounds/v4/`：`bg_sky_v4.png` 为唯一不透明底层，`bg_far_tiangong_v4.png`、`bg_mid_clouds_v4.png`、`bg_near_clouds_v4.png` 均为带 Alpha 的独立元素层。由于这些透明层不具备无缝平铺边缘，运行时每层只使用一个放大后的 Sprite，在不会露出素材边界的安全范围内横向漂移；远景至近景速度和位移幅度依次增大，并叠加轻微垂直漂浮。禁止复制整幅画布进行首尾拼接。待机时慢速运动，游戏进行中正常运动，暂停及死亡时停止；V2/V3 仅保留用于版本追溯，不再加载。
- V4 生成源文件位于 `art_source/generated/backgrounds_v4/`。四张运行素材统一规范为 `750 × 1334`；远景天宫、中云和近云保留大面积透明区域，避免出现整张画布堆叠边界。
- Auto Atlas：角色、动态障碍/特效、UI 分成至少三个图集；建议最大边长先设 `2048`，在微信真机检查纹理内存和 draw call 后再调整。
- 山峰/石柱：以通道侧顶端作为布局基准；碰撞轮廓向内收，云脚和植被尖端不计入伤害。
- 乌云/雷电：乌云使用下侧危险边；预警阶段关闭伤害 Collider，生效帧才启用。
- 火球/风火轮：使用内缩圆形 Collider；外焰、光晕和细小装饰不计碰撞。
- UI 面板：在引擎中根据实际边框设置九宫格 inset；文字和点击区域由独立节点实现，不把交互区域限制在图标可见像素内。

## 4. 已完成检查

- 71 张运行 PNG 命名均为小写英文、数字和下划线，无空格。
- 70 张应透明的运行图全部具有有效 RGBA 和透明像素。
- 天空底图为 `750 × 1334` RGB；三层视差图为 `2048 × 1024` RGBA。
- 24 张八戒角色帧均为 `512 × 512` RGBA，动画主体锚点稳定。
- 山峰、石柱、乌云、火球、雷电和 UI 已消除跨格切片残片。
- 天宫中景/远景抠图洋红边已清理。
- 静态组合和动态组合均完成 `750 × 1334` 原生比例合成检查。

## 5. 仍需完成的验收

1. 老板查看 `art_source/previews/asset_overview.png`，决定批准或提出定向修改。
2. 导入 Cocos Creator，制作 AnimationClip、Auto Atlas、九宫格和碰撞体。
3. 在至少一台中档微信真机检查快速连续点击时的动画重触发、透明边、压缩色带、长屏裁切与峰值纹理内存。
4. 商业发布前进行人工知识产权与相似性复核。

在上述第 1～3 项完成前，`asset-manifest.json` 中资产状态不应改为 `approved`。
