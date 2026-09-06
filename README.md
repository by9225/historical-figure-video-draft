# Historical Figure Video Draft

输入一个中国历史人物名字，自动生成：

1. 历史人物剧本
2. 8 张竖版配图
3. 7 段首尾帧图生视频
4. 带标题、字幕和音频的剪映/CapCut 草稿链接

## 使用前准备

- Node.js 18 或更高版本
- 火山引擎 Ark API Key
- 剪映草稿 API 的可用访问环境

图片和视频生成可能产生费用，请使用自己的 API Key。

## 安装为 Codex Skill

将整个仓库复制到 Codex 的技能目录：

```bash
git clone https://github.com/你的用户名/historical-figure-video-draft.git ~/.codex/skills/historical-figure-video-draft
```

## 使用方式

使用你自己的 Ark API Key：

```bash
export ARK_API_KEY='你的Ark API Key'
node scripts/run_historical_figure_video_draft.mjs input.json
```

不要把 API Key 写入 `input.json`，也不要提交到 GitHub。

输入文件可以参考 [examples/input.example.json](examples/input.example.json)。

## 默认参数

- 图片：Seedream 5.0，1600x2848，9:16
- 视频：Seedance 1.5 Pro，5 秒，480p，9:16，无声
- 剪映画布：1080x1920
- 7 段视频总时长：35 秒

## 注意事项

- 生成内容可能存在历史事实、服饰和画面细节错误，请人工审核。
- 图片、视频和草稿链接可能会过期，脚本会同时下载本地副本。
- 音频链接需要拥有合法使用权限。
- 不要把生成结果、API 响应和个人密钥提交到公开仓库。

## 许可证

本项目使用 MIT License。
