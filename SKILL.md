---
name: historical-figure-video-draft
description: Generate a complete Chinese historical-figure short-video draft from one historical person name. Use when the user asks to generate a historical figure script, images, videos, captions, audio, or a final CapCut/Jianying draft link.
---

# Historical Figure Video Draft

Use this skill when the user provides one historical figure name and wants a finished short-video draft.

## Required Workflow

Always complete these stages in order:

1. Generate the script.
2. Generate 8 images in parallel and download them.
3. Generate 7 first-frame/last-frame videos in parallel and download them.
4. Create and save the Jianying/CapCut draft.

Create a new output folder named `<人物名>完整流程` and keep all intermediate files there.

## Security

- Ask for or use the user's own Ark API Key. Never invent one.
- Pass the key only through the `ARK_API_KEY` environment variable.
- Never write the API Key into input files, output files, logs, README files, or Git history.
- Tell the user that image and video generation may incur API charges.
- Do not commit generated media or API responses unless the user explicitly asks for them.

## Script Requirements

Create exactly 1 title, 8 chronological life-experience lines, 8 matching scene descriptions, and 7 transition prompts for adjacent image pairs 1→2 through 7→8.

Each scene description should describe the person's appearance, clothing, environment, action, emotion, and historical atmosphere. End each scene description with `真实中国古代历史纪录片风格。`

Each transition prompt should explain natural movement and aging from the first image to the next image, include `一镜到底`, and avoid modern objects or implausible transitions.

## Defaults

- Image model: `doubao-seedream-5-0-260128`
- Image size: `1600x2848` (9:16)
- Video model: `doubao-seedance-1-5-pro-251215`
- Video settings: 5 seconds, 480p, 9:16, silent, no watermark
- Draft canvas: `1080 x 1920`
- Default audio: `https://od.cdnux.com/3561/i/2026/02/20/3kvn0.mp3`

## Automation

Run the bundled script from the repository root:

```bash
ARK_API_KEY='your-own-key' node scripts/run_historical_figure_video_draft.mjs input.json
```

The input JSON must be UTF-8 and contain `person`, `title`, `experiences` (8 items), `sceneDescriptions` (8 items), `videoPrompts` (7 items), `outputDir`, and optionally `audioUrl`. See `examples/input.example.json`.

The script performs image generation/downloads in parallel, video task creation/polling/downloads in parallel, then calls:

`create_draft` → `add_videos` → `add_captions` for title → `add_captions` for subtitles → `add_audios` → `save_draft`

Video timeline segments are 0–5s, 5–10s, ..., 30–35s. Audio covers the full 35 seconds.

## Captions

Use two separate caption calls.

Title: `border_color=#000000`, `font=江湖体`, `font_size=15`, `line_spacing=10`, `text_color=#ffffff`, `transform_y=1369`.

Subtitles: `border_color=#000000`, `font=江湖体`, `font_size=12`, `line_spacing=10`, `text_color=#ffde00`, `transform_y=-794`.

Distribute the 8 subtitles across the 35-second timeline so they match the corresponding life stages.

## Reporting

After each stage, briefly report the saved result and show the user the script summary, image summary and at least one preview, video summary and success count, then the final draft link and summary file.

Final response must include the final draft link and absolute output folder path.
