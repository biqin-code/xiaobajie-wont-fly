# 《飞行小八戒》V1 美术方向 Brief

## Game frame

- Player fantasy：成为一只努力用大耳朵飞行、滑稽但可爱的八戒，在壮阔天宫中险中求生。
- Core verbs：连续点击触发耳朵扑扇并获得向上冲量、停止点击后下落、穿过上下障碍通道。
- Engine and renderer：Cocos Creator 3.8 LTS，2D Sprite/UI，TypeScript 项目。
- Target platforms：微信小游戏，优先中档手机性能与包体。
- Camera/view/facing：固定侧视 2D；八戒面朝右；障碍和背景向左移动。
- Native viewport and common display scale：竖屏设计分辨率 `750 × 1334`；兼容约 `16:9～20:9`。
- Typical asset size on screen：八戒视觉约 `150 × 135 px`；碰撞核心约 `92 × 84 px`；正式值须用真机截图确认。

## Visual system

- Shape language：角色以圆形、软曲线为主；危险物以三角、尖角、旋转线和明暗突变为主；天宫建筑使用稳定的横梁与柱体。
- Silhouette priorities：八戒大耳朵 > 通道边界 > 动态危险状态 > 天宫装饰。
- Value structure：玩家和危险主体使用中高对比；核心通道后方压低对比；远景低对比、低饱和。
- Palette roles：天空 `#168BE8`、暖云 `#F5F1DD`、天宫金 `#E8B84A`、宫墙红 `#B94A3D`、山石 `#C98A49`、植被 `#5E8737`、八戒衣服 `#244F73`、火焰 `#EF643C`、雷云 `#55516D`。
- Materials and surface cues：岩石有暖色水彩颗粒，布料哑光柔软，白玉柱微暖且不过度镜面，云雾半透明柔软，火与电清晰明亮。
- Edge/line treatment：深蓝灰或暖深褐手绘轮廓；同类资产线宽一致；远景弱化描边。
- Lighting direction and contrast：默认左上方暖光；角色、障碍和背景遵循同一光向；不使用强烈现代霓虹光。
- Detail density and focal hierarchy：脸与耳朵细节最高，障碍通道侧次之，背景通道区域最低。
- Background motion：天空、远景天宫、中景云和近景云必须是独立图层；天空仅做轻微呼吸。当前 V4 透明层不是可无缝平铺素材，因此远景天宫、中景云、近景云各使用单实例宽幅缓慢横向漂移，远景至近景的速度和位移幅度逐级增大，并保留轻微上下浮动。禁止复制整幅透明画布横向拼接；背景层缩放后必须始终覆盖视口，全部内容由 `750 × 1334` 视口 Mask 裁剪。待机速度为正式速度的约 `28%`，游戏进行中恢复正常速度，暂停及死亡时停止。
- Motion character：八戒是用力、柔软、略笨拙；火球有呼吸和拖尾；雷电先蓄势后爆发；风火轮规律而机械。
- Explicit exclusions：不复制特定动画电影镜头、受保护角色、标志性建筑或在世艺术家的个人笔触；不做写实 3D、厚重页游金边、赛博霓虹、恐怖血腥、细碎噪点轮廓。

## Technical contract

- Asset dimensions/aspect：角色序列单帧建议以 `512 × 512` 源文件制作，导入后按目标显示尺寸缩放；障碍变体在目标尺寸下分别绘制；背景层单张边长优先不超过 `2048 px`，超出时拆层/分片。
- Alpha/background：角色、障碍、特效和 UI 使用直边无污染的透明 PNG；背景为不透明图或明确的半透明云层。
- Grid/tile/frame size：同一动画所有帧画布一致；第一版角色每状态 `4～10` 帧；合图切片尺寸和帧顺序写入源文件记录。
- Anchor/pivot/baseline：八戒统一以身体核心中心为主锚点；上下障碍以朝向通道的一端作为布局基准；动画帧不得跳锚点。
- Filtering/mipmaps/compression：2D 手绘默认线性过滤；Sprite/UI 通常关闭 mipmap；压缩格式与质量以微信真机无明显色带、白边和文字模糊为准。
- Color space：统一按 sRGB 制作和审阅，避免不同软件导出导致颜色漂移。
- Texture/poly/material budgets：V1 控制透明大图层数量和粒子叠加；尽量复用 Sprite 材质；实际纹理内存和 draw call 在 M4 真机记录后设硬阈值。
- Naming and folders：小写英文 + 下划线；角色 `assets/art/characters/bajie/`，障碍 `assets/art/obstacles/`，背景 `assets/art/backgrounds/`，特效 `assets/art/effects/`，UI `assets/art/ui/`。

## Visual target

- Approved seed/reference paths：用户附图 `/Volumes/bi/workspace/codex_workspace_qin/飞行小八戒/images/飞行小八戒2.png`，仅用于气质、色彩、空间层次和角色可爱度参考，不作为可发布资产；本轮代表性风格板位于 `assets/art/style_targets/gameplay_style_target_v1.png`。
- Required do examples：温暖手绘、东方神话、清晰剪影、四层空气透视、危险预警明确、实际游戏尺寸可读。
- Required don't examples：直接临摹参考图构图/角色/刺球，背景云与危险乌云混淆，障碍视觉超出碰撞太多，生成图直接当成成品。
- Native-scale gameplay capture：已生成 `art_source/previews/gameplay_static_preview.png` 与 `gameplay_dynamic_preview.png` 两张 `750 × 1334` 合成检查图；真正的 Cocos/真机截图仍需在 M3 前补齐。
- Approval owner/date：老板最终批准；当前视觉方向已口头采纳，生成素材状态为 `review`，尚未标记 `approved`。

## Seed approval gate

代表性风格板和完整 V1 素材家族已生成。内部技术检查及原生比例合成预览已通过；老板视觉确认、Cocos 引擎导入和微信真机验收尚未完成，因此所有条目保持 `review` 状态。
