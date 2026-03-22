import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

const read = (relativePath) => readFileSync(join(root, relativePath), "utf8");

test("workflow store exposes canvas framing state", () => {
  const source = read("src/store/useWorkflowStore.ts");

  assert.ok(source.includes("canvasFraming"), "store should keep canvas framing state");
  assert.ok(source.includes("setCanvasViewport"), "store should expose viewport updates");
  assert.ok(source.includes("setCanvasCropArea"), "store should expose crop-area updates");
  assert.ok(source.includes("resetCanvasFraming"), "store should expose framing reset");
});

test("canvas workspace mounts framing editor for source images", () => {
  const workspace = read("src/components/canvas/CanvasWorkspace.tsx");

  assert.ok(
    workspace.includes("CanvasFramingEditor"),
    "workspace should render the framing editor when a source image exists",
  );
});

test("prepare flow passes framing state into prepareCanvasImage", () => {
  const controls = read("src/components/canvas/CanvasControls.tsx");

  assert.ok(
    controls.includes("canvasFraming"),
    "prepare controls should read framing state from the workflow store",
  );
  assert.ok(
    controls.includes("framing: canvasFraming"),
    "prepare flow should pass framing into prepareCanvasImage",
  );
});

test("control panel surfaces framing and expansion summary pills", () => {
  const panel = read("src/components/control/ControlPanel.tsx");

  assert.ok(
    panel.includes('t("workspace.framingLocked")'),
    "control panel should summarize that the baseline uses the current framing",
  );
  assert.ok(
    panel.includes('t("workspace.expansionArea")'),
    "control panel should surface pad-mode expansion space when relevant",
  );
});

test("workspace locale files define framing editor copy", () => {
  const zh = read("src/i18n/locales/zh/common.json");
  const en = read("src/i18n/locales/en/common.json");

  assert.ok(zh.includes('"framingHint"'), "Chinese locale should include framing copy");
  assert.ok(en.includes('"framingHint"'), "English locale should include framing copy");
  assert.ok(zh.includes('"resetFraming"'), "Chinese locale should include reset framing copy");
  assert.ok(en.includes('"resetFraming"'), "English locale should include reset framing copy");
});
