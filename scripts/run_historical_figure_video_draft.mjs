import { createWriteStream } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { get } from "node:https";

const arkKey = process.env.ARK_API_KEY;
if (!arkKey) throw new Error("ARK_API_KEY is required");

const inputPath = process.argv[2];
if (!inputPath) throw new Error("Usage: node run_historical_figure_video_draft.mjs input.json");

const imageApi = "https://ark.cn-beijing.volces.com/api/v3/images/generations";
const videoTaskApi = "https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks";
const jianyingApi = "https://capcut-mate.jcaigc.cn/openapi/capcut-mate/v1";
const defaultAudioUrl = "https://od.cdnux.com/3561/i/2026/02/20/3kvn0.mp3";
const totalDuration = 35_000_000;
const segmentDuration = 5_000_000;

const input = JSON.parse(await readFile(inputPath, "utf8"));
validateInput(input);

const outputDir = resolve(input.outputDir);
await mkdir(outputDir, { recursive: true });

function pad2(value) {
  return String(value).padStart(2, "0");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function download(url, destination) {
  return new Promise((resolvePromise, reject) => {
    const request = get(url, (response) => {
      if ([301, 302, 303, 307, 308].includes(response.statusCode)) {
        response.resume();
        download(response.headers.location, destination).then(resolvePromise, reject);
        return;
      }
      if (response.statusCode !== 200) {
        response.resume();
        reject(new Error(`Download failed for ${destination}: HTTP ${response.statusCode}`));
        return;
      }
      const file = createWriteStream(destination);
      response.pipe(file);
      file.on("finish", () => file.close(resolvePromise));
      file.on("error", reject);
    });
    request.on("error", reject);
  });
}

async function requestJson(url, options = {}, responseFile = "") {
  const response = await fetch(url, options);
  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  const result = { status: response.status, json };
  if (responseFile) await writeFile(responseFile, JSON.stringify(result, null, 2), "utf8");
  return result;
}

async function arkRequestJson(url, body, responseFile) {
  return requestJson(
    url,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Authorization: `Bearer ${arkKey}`
      },
      body: JSON.stringify(body)
    },
    responseFile
  );
}

async function jianyingRequest(path, body, responseFile) {
  const result = await requestJson(
    `${jianyingApi}/${path}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(body)
    },
    responseFile
  );
  if (result.status < 200 || result.status >= 300) {
    throw new Error(`${path} failed: HTTP ${result.status}`);
  }
  if (!result.json.draft_url) {
    throw new Error(`${path} did not return draft_url`);
  }
  return result.json.draft_url;
}

function validateInput(data) {
  const requiredArrays = ["experiences", "sceneDescriptions", "videoPrompts"];
  if (!data.person || !data.title || !data.outputDir) throw new Error("person, title, and outputDir are required");
  for (const key of requiredArrays) {
    if (!Array.isArray(data[key])) throw new Error(`${key} must be an array`);
  }
  if (data.experiences.length !== 8) throw new Error("experiences must have 8 items");
  if (data.sceneDescriptions.length !== 8) throw new Error("sceneDescriptions must have 8 items");
  if (data.videoPrompts.length !== 7) throw new Error("videoPrompts must have 7 items");
}

async function writeScriptMarkdown() {
  const md = [
    `标题：${input.title}`,
    "",
    "生平经历：",
    ...input.experiences.map((item, index) => `${index + 1}. ${item}`),
    "",
    "画面描述：",
    ...input.sceneDescriptions.map((item, index) => `${index + 1}. ${item}`),
    "",
    "视频提示词：",
    ...input.videoPrompts.map((item, index) => `${index + 1}. ${item}`)
  ].join("\n");
  await writeFile(join(outputDir, `${input.person}剧本.md`), md, "utf8");
}

async function generateImage(index, prompt, attempt = 1) {
  const responseFile = join(outputDir, `seedream_image_response_${input.person}第${pad2(index)}幕${attempt > 1 ? `_retry${attempt - 1}` : ""}.json`);
  const result = await arkRequestJson(
    imageApi,
    {
      model: "doubao-seedream-5-0-260128",
      prompt,
      size: "1600x2848",
      output_format: "png",
      response_format: "url",
      watermark: false,
      sequential_image_generation: "disabled"
    },
    responseFile
  );
  const item = result.json.data?.[0];
  if (result.status >= 200 && result.status < 300 && item?.url) {
    return {
      index,
      status: "succeeded",
      prompt,
      url: item.url,
      size: item.size,
      responseFile: basename(responseFile),
      image: `${input.person}第${pad2(index)}幕_seedream.png`
    };
  }
  if (attempt < 3) {
    await sleep(2000 * attempt);
    return generateImage(index, prompt, attempt + 1);
  }
  return { index, status: "failed", prompt, url: "", size: "", responseFile: basename(responseFile), image: "" };
}

async function generateImages() {
  console.log("Step 2: generating 8 images in parallel...");
  const results = await Promise.all(input.sceneDescriptions.map((prompt, idx) => generateImage(idx + 1, prompt)));
  const failed = results.filter((item) => item.status !== "succeeded");
  await writeFile(join(outputDir, `${input.person}图片生成结果汇总.json`), JSON.stringify(results, null, 2), "utf8");
  if (failed.length) throw new Error(`Image generation failed: ${failed.map((item) => item.index).join(", ")}`);
  console.log("Step 2: downloading 8 images in parallel...");
  await Promise.all(results.map((item) => download(item.url, join(outputDir, item.image))));
  const md = [
    `# ${input.person}图片生成结果汇总`,
    "",
    "状态：8 张配图已生成并下载到本地。",
    "",
    ...results.flatMap((item) => [
      `## 第 ${item.index} 幕`,
      `尺寸：${item.size}`,
      `本地图片：${item.image}`,
      `图片链接：${item.url}`,
      ""
    ])
  ].join("\n");
  await writeFile(join(outputDir, `${input.person}图片生成结果汇总.md`), md, "utf8");
  return results;
}

async function imageToDataUrl(path) {
  const image = await readFile(path);
  return `data:image/png;base64,${image.toString("base64")}`;
}

async function createVideoTask(job) {
  const firstFrame = await imageToDataUrl(join(outputDir, job.first));
  const lastFrame = await imageToDataUrl(join(outputDir, job.last));
  const responseFile = join(outputDir, `seedance_video_create_${input.person}_${job.id}.json`);
  const result = await arkRequestJson(
    videoTaskApi,
    {
      model: "doubao-seedance-1-5-pro-251215",
      content: [
        { type: "text", text: job.prompt },
        { type: "image_url", role: "first_frame", image_url: { url: firstFrame } },
        { type: "image_url", role: "last_frame", image_url: { url: lastFrame } }
      ],
      resolution: "480p",
      ratio: "9:16",
      duration: 5,
      generate_audio: false,
      watermark: false
    },
    responseFile
  );
  return { ...job, taskId: result.json.id ?? "", createStatus: result.status };
}

function getVideoUrl(result) {
  const value =
    result?.json?.content?.video_url ||
    result?.json?.video_url ||
    result?.json?.data?.video_url ||
    result?.json?.data?.[0]?.video_url?.url ||
    result?.json?.data?.[0]?.url;
  return typeof value === "string" ? value : value?.url ?? "";
}

async function pollVideoTask(job) {
  if (!job.taskId) return { ...job, finalStatus: "create_failed", videoUrl: "", localVideo: "" };
  const queryUrl = `${videoTaskApi}/${job.taskId}`;
  let latest = null;
  for (let attempt = 1; attempt <= 180; attempt += 1) {
    latest = await requestJson(
      queryUrl,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          Authorization: `Bearer ${arkKey}`
        }
      },
      join(outputDir, `seedance_video_status_${input.person}_${job.id}.json`)
    );
    const status = latest.json.status;
    if (["succeeded", "failed", "expired", "cancelled"].includes(status)) break;
    await sleep(10000);
  }
  const videoUrl = getVideoUrl(latest);
  return {
    ...job,
    finalStatus: latest?.json?.status ?? "unknown",
    videoUrl,
    localVideo: latest?.json?.status === "succeeded" && videoUrl ? job.video : ""
  };
}

async function generateVideos() {
  const jobs = input.videoPrompts.map((prompt, index) => ({
    id: pad2(index + 1),
    title: `第${index + 1}幕到第${index + 2}幕`,
    first: `${input.person}第${pad2(index + 1)}幕_seedream.png`,
    last: `${input.person}第${pad2(index + 2)}幕_seedream.png`,
    video: `${input.person}视频${pad2(index + 1)}_第${index + 1}幕到第${index + 2}幕.mp4`,
    prompt
  }));
  console.log("Step 3: creating 7 video tasks in parallel...");
  const created = await Promise.all(jobs.map(createVideoTask));
  console.log("Step 3: polling 7 video tasks in parallel...");
  const finished = await Promise.all(created.map(pollVideoTask));
  const failed = finished.filter((item) => item.finalStatus !== "succeeded" || !item.videoUrl);
  await writeFile(join(outputDir, `${input.person}视频生成结果汇总.json`), JSON.stringify(finished, null, 2), "utf8");
  if (failed.length) throw new Error(`Video generation failed: ${failed.map((item) => item.id).join(", ")}`);
  console.log("Step 3: downloading 7 videos in parallel...");
  await Promise.all(finished.map((item) => download(item.videoUrl, join(outputDir, item.video))));
  const md = [
    `# ${input.person}视频生成结果汇总`,
    "",
    "状态：7 段首尾帧视频已生成并下载到本地。",
    "",
    ...finished.flatMap((item) => [
      `## ${item.title}`,
      `状态：${item.finalStatus}`,
      `任务 ID：${item.taskId}`,
      `本地视频：${item.localVideo}`,
      `视频链接：${item.videoUrl}`,
      `提示词：${item.prompt}`,
      ""
    ])
  ].join("\n");
  await writeFile(join(outputDir, `${input.person}视频生成结果汇总.md`), md, "utf8");
  return finished;
}

function subtitleCaptions() {
  const times = [
    [0, 2_500_000],
    [2_500_000, 7_500_000],
    [7_500_000, 12_500_000],
    [12_500_000, 17_500_000],
    [17_500_000, 22_500_000],
    [22_500_000, 27_500_000],
    [27_500_000, 32_500_000],
    [32_500_000, totalDuration]
  ];
  return input.experiences.map((text, index) => ({ start: times[index][0], end: times[index][1], text }));
}

function makeVideoInfos(videos) {
  return videos.map((item, index) => ({
    video_url: item.videoUrl,
    width: 1080,
    height: 1920,
    start: index * segmentDuration,
    end: (index + 1) * segmentDuration,
    duration: segmentDuration,
    volume: 0
  }));
}

function makeSceneTimelines(videos) {
  return videos.map((_item, index) => ({ start: index * segmentDuration, end: (index + 1) * segmentDuration }));
}

async function createDraft(videos) {
  console.log("Step 4: creating Jianying draft...");
  let draftUrl = await jianyingRequest("create_draft", { width: 1080, height: 1920 }, join(outputDir, `jcaigc_01_create_draft_response_${input.person}.json`));
  draftUrl = await jianyingRequest(
    "add_videos",
    {
      draft_url: draftUrl,
      video_infos: JSON.stringify(makeVideoInfos(videos)),
      scene_timelines: makeSceneTimelines(videos),
      alpha: 1.0,
      scale_x: 1.0,
      scale_y: 1.0,
      transform_x: 0,
      transform_y: 0
    },
    join(outputDir, `jcaigc_02_add_videos_response_${input.person}.json`)
  );
  draftUrl = await jianyingRequest(
    "add_captions",
    {
      draft_url: draftUrl,
      captions: JSON.stringify([{ start: 0, end: totalDuration, text: input.title }]),
      border_color: "#000000",
      font: "江湖体",
      font_size: 15,
      line_spacing: 10,
      text_color: "#ffffff",
      transform_y: 1369,
      alignment: 1,
      alpha: 1.0
    },
    join(outputDir, `jcaigc_03_add_title_response_${input.person}.json`)
  );
  draftUrl = await jianyingRequest(
    "add_captions",
    {
      draft_url: draftUrl,
      captions: JSON.stringify(subtitleCaptions()),
      border_color: "#000000",
      font: "江湖体",
      font_size: 12,
      line_spacing: 10,
      text_color: "#ffde00",
      transform_y: -794,
      alignment: 1,
      alpha: 1.0
    },
    join(outputDir, `jcaigc_04_add_subtitles_response_${input.person}.json`)
  );
  draftUrl = await jianyingRequest(
    "add_audios",
    {
      draft_url: draftUrl,
      audio_infos: JSON.stringify([
        {
          audio_url: input.audioUrl || defaultAudioUrl,
          start: 0,
          end: totalDuration,
          duration: totalDuration,
          volume: 1.0
        }
      ])
    },
    join(outputDir, `jcaigc_05_add_audio_response_${input.person}.json`)
  );
  draftUrl = await jianyingRequest("save_draft", { draft_url: draftUrl }, join(outputDir, `jcaigc_06_save_draft_response_${input.person}.json`));
  const summary = {
    status: "success",
    draftUrl,
    width: 1080,
    height: 1920,
    totalDuration,
    totalSeconds: 35,
    videoCount: 7,
    title: input.title,
    audioUrl: input.audioUrl || defaultAudioUrl
  };
  await writeFile(join(outputDir, `剪映草稿结果-${input.person}.json`), JSON.stringify(summary, null, 2), "utf8");
  await writeFile(
    join(outputDir, `剪映草稿结果-${input.person}.md`),
    [
      `# 剪映草稿结果 - ${input.person}`,
      "",
      "状态：成功",
      "",
      `草稿链接：${draftUrl}`,
      "",
      "画布：1080 x 1920",
      "",
      "总时长：35秒",
      "",
      "视频：7段，每段5秒，按顺序首尾相接",
      "",
      `标题：${input.title}`,
      "",
      "字幕：8条生平经历，已按时间顺序添加",
      "",
      `音频：${input.audioUrl || defaultAudioUrl}`
    ].join("\n"),
    "utf8"
  );
  return summary;
}

await writeFile(join(outputDir, `${input.person}流程输入.json`), JSON.stringify(input, null, 2), "utf8");
await writeScriptMarkdown();
const images = await generateImages();
const videos = await generateVideos();
const draft = await createDraft(videos);

await writeFile(
  join(outputDir, `${input.person}完整流程汇总.md`),
  [
    `# ${input.person}完整流程汇总`,
    "",
    "最终状态：成功",
    "",
    `最终草稿链接：${draft.draftUrl}`,
    "",
    `剧本文件：${input.person}剧本.md`,
    "",
    `图片：${images.length}张，汇总文件：${input.person}图片生成结果汇总.md`,
    "",
    `视频：${videos.length}段，汇总文件：${input.person}视频生成结果汇总.md`,
    "",
    `剪映草稿结果：剪映草稿结果-${input.person}.md`
  ].join("\n"),
  "utf8"
);

console.log(JSON.stringify(draft, null, 2));
