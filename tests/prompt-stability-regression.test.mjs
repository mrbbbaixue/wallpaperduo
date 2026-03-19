import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

const read = (relativePath) => readFileSync(join(root, relativePath), "utf8");

test("default prompt settings emphasize reference-preserving time variants", () => {
  const source = read("src/store/useSettingsStore.ts");

  assert.ok(
    source.includes("锁定核心主体、主体轮廓、主构图、相机视角、背景主地标与天际线轮廓"),
    "Default analysis prompt should ask for immutable anchors",
  );
  assert.ok(
    source.includes("参考图一致性优先"),
    "Default generation prefix should frame the task as reference-preserving variation",
  );
  assert.ok(
    source.includes("只允许光照、天空、阴影、灯光和少量时间相关元素变化"),
    "Default generation prefix should only allow temporal changes",
  );
  assert.ok(
    source.includes("subject replacement, composition change, camera shift"),
    "Default negative prompt should suppress subject and composition drift",
  );
  assert.ok(
    source.includes("tower shape change"),
    "Default negative prompt should suppress tower/landmark shape drift",
  );
  assert.ok(
    source.includes("const legacyPromptSettingsV1"),
    "Settings migration should recognize old prompt defaults",
  );
  assert.ok(
    source.includes("version: 2"),
    "Settings persistence version should bump so legacy defaults can migrate",
  );
});

test("auto-generated time prompts lock subject and layout", () => {
  const source = read("src/components/control/ControlPanel.tsx");

  assert.ok(
    source.includes("保持核心主体、主体轮廓、背景主地标、天际线、相机视角和主构图不变"),
    "ControlPanel prompt template should hard-code the main stability constraint",
  );
  assert.ok(
    source.includes("只允许光照、天空颜色、阴影、灯光与少量时间相关细节变化"),
    "ControlPanel prompt template should limit allowed edits to temporal details",
  );
});

test("planner variants describe immutable anchors and allowed changes", () => {
  const source = read("src/services/prompt/promptPlanner.ts");

  assert.ok(
    source.includes("Must preserve the core subject, silhouette, composition, camera viewpoint, landmark shapes, skyline, and spatial relationships."),
    "Prompt planner should encode immutable anchors in each variant",
  );
  assert.ok(
    source.includes("Only time-of-day dependent elements may change."),
    "Prompt planner should limit non-temporal edits",
  );
});

test("worker prompts reinforce stability for analysis and generation", () => {
  const source = read("worker/providers.ts");

  assert.ok(
    source.includes("reference-preserving time-of-day wallpaper variation"),
    "Worker analysis prompt should define the task as reference-preserving variation",
  );
  assert.ok(
    source.includes("immutable anchors"),
    "Worker analysis prompt should ask the model to identify immutable anchors",
  );
  assert.ok(
    source.includes("Keep the core subject, silhouette, background landmarks, skyline, camera angle, and composition fixed."),
    "Worker generation prompt should lock subject and layout",
  );
  assert.ok(
    source.includes("Only change lighting, sky tone, shadows, practical lights, and small time-dependent details."),
    "Worker generation prompt should restrict allowed changes",
  );
});
