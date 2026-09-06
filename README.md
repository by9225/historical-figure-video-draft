# Historical Figure Video Draft

输入一个中国历史人物名字，自动生成：

1. 历史人物剧本
2. 8 张竖版配图
3. 7 段首尾帧图生视频
4. 带标题、字幕和音频的剪映/CapCut 草稿链接
5. 通过剪映小助手导入剪映后继续编辑

## 使用前准备

- Node.js 18 或更高版本
- 火山引擎 Ark API Key
- 剪映小助手（免费客户端）：[www.jcaigc.cn](http://www.jcaigc.cn)
- 剪映小助手 API 文档：[docs.jcaigc.cn](https://docs.jcaigc.cn/)

### 剪映小助手使用说明

剪辑草稿生成后，还需要在电脑上打开剪映小助手，并点击“创建剪映草稿”按钮，才能把草稿中的视频、标题、字幕和音频素材放入剪映。之后可以在剪映内继续修改和调整。

请先从 [www.jcaigc.cn](http://www.jcaigc.cn) 下载并安装剪映小助手。脚本会生成草稿链接，但不会替用户安装客户端或点击客户端按钮。

操作顺序：

1. 安装并打开剪映小助手。
2. 运行本项目，等待生成剪映草稿链接。
3. 在剪映小助手中打开或粘贴草稿链接。
4. 点击“创建剪映草稿”。
5. 打开剪映，在剪映内继续修改。

![剪映小助手中的“创建剪映草稿”按钮](docs/jianying-helper-create-draft.png)

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
- 剪映小助手需要提前安装；草稿链接生成后，必须点击“创建剪映草稿”才能导入剪映。

## 许可证

本项目使用 MIT License。
