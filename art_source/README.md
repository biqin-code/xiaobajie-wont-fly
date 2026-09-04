# 《飞行小八戒》V1 美术源文件归档

本目录保存生成源图、规范化 spritesheet、提示词记录、预览和 QA 报告，不属于 Cocos Creator 运行资源。可发布候选素材位于项目的 `assets/art/`。

## 目录

- `generated/`：22 张 AI 生成源图，保留生成时的完整画布。
- `normalized_sheets/`：10 张规范化动画/图标条带，仅供美术审阅或再次切片；运行目录使用逐帧 PNG，避免重复打包。
- `previews/`：角色、障碍、UI、特效联系表，以及两张 `750 × 1334` 玩法合成图。
- `reports/`：自动技术检查摘要。
- `generation-prompts.md`：本批资产的最终提示词体系和各资产差异项。
- `provenance.json`：来源、工具、日期和源图路径。

## 使用边界

- 源图与 spritesheet 不应整体复制到 Cocos `assets/`。
- 运行素材当前状态是 `review`，不是最终批准；仍需在 Cocos Creator 和微信真机中检查压缩、锚点、碰撞与长屏裁切。
- 商业发布前需完成人工知识产权与相似性复核。

