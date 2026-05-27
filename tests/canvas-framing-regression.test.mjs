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
  assert.ok(source.includes("setCanvasSize"), "store should expose canvas size updates");
  assert.ok(source.includes("resetCanvasFraming"), "store should expose framing reset");
  assert.equal(
    source.includes("setCanvasCropArea"),
    false,
    "store should no longer expose the legacy crop-area updater",
  );
});

test("canvas workspace mounts framing editor for source images", () => {
  const workspace = read("src/components/canvas/CanvasWorkspace.tsx");

  assert.ok(
    workspace.includes("CanvasFramingEditor"),
    "workspace should render the framing editor when a source image exists",
  );
  assert.ok(
    workspace.includes("onCanvasSizeChange={setCanvasSize}"),
    "workspace should wire the editor's canvas-size measurements into the store",
  );
});

test("analysis flow prepares the current framing on demand", () => {
  const controls = read("src/components/canvas/CanvasControls.tsx");
  const panel = read("src/components/control/ControlPanel.tsx");

  assert.equal(
    controls.includes("prepareCanvasImage"),
    false,
    "canvas controls should stop preparing a baseline directly",
  );
  assert.ok(
    panel.includes("prepareCanvasImage"),
    "analysis flow should prepare the current framing on demand",
  );
  assert.ok(
    panel.includes("framing: canvasFraming"),
    "analysis flow should pass the current framing into prepareCanvasImage",
  );
  assert.ok(
    panel.includes("canvas: canvasSize"),
    "analysis flow should pass the measured canvas size into prepareCanvasImage",
  );
  assert.ok(
    panel.includes("buildPreparedImage"),
    "analysis flow should persist the cropped frame before scene analysis",
  );
  assert.equal(
    panel.includes("mode: prepareMode"),
    false,
    "analysis flow should stop threading legacy crop/pad mode through prepared images",
  );
});

test("control panel surfaces canvas framing summary pills", () => {
  const panel = read("src/components/control/ControlPanel.tsx");

  assert.ok(
    panel.includes('t("workspace.framingLocked")'),
    "control panel should summarize that the baseline uses the current framing",
  );
  assert.ok(
    panel.includes('t("workspace.expansionArea")'),
    "control panel should surface expansion space when relevant",
  );
  assert.ok(
    panel.includes('t("workspace.expansionCompose")'),
    "control panel should describe the canvas-framing workflow",
  );
});

test("desktop workflow keeps left gallery presentation-only and moves result actions to the right", () => {
  const panel = read("src/components/control/ControlPanel.tsx");
  const gallery = read("src/components/canvas/CanvasGalleryStrip.tsx");

  assert.ok(
    panel.includes("setPreviewMode"),
    "control panel should provide preview mode controls on the right side",
  );
  assert.ok(
    panel.includes('t("common.download")'),
    "control panel should provide the single-result download action on the right side",
  );
  assert.equal(
    gallery.includes('t("common.download")'),
    false,
    "left gallery should stay presentation-only instead of hosting extra action buttons",
  );
});

test("workspace locale files define framing editor copy", () => {
  const zh = read("src/i18n/locales/zh/common.json");
  const en = read("src/i18n/locales/en/common.json");

  assert.ok(zh.includes('"framingHint"'), "Chinese locale should include framing copy");
  assert.ok(en.includes('"framingHint"'), "English locale should include framing copy");
  assert.ok(zh.includes('"resetFraming"'), "Chinese locale should include reset framing copy");
  assert.ok(en.includes('"resetFraming"'), "English locale should include reset framing copy");
  assert.ok(
    zh.includes('"expansionCompose"'),
    "Chinese locale should include canvas-framing copy",
  );
  assert.ok(
    en.includes('"expansionCompose"'),
    "English locale should include canvas-framing copy",
  );
});

test("framing editor uses a full-canvas placement layer separate from the ratio framing box", () => {
  const editor = read("src/components/canvas/CanvasFramingEditor.tsx");
  const framing = read("src/services/canvas/framing.ts");
  const controls = read("src/components/canvas/CanvasControls.tsx");

  assert.ok(
    framing.includes("resolveOutputAreaBox"),
    "framing helpers should expose the output-area resolver for the bright framing box",
  );
  assert.ok(
    framing.includes("resolveImageBoxOnCanvas"),
    "framing helpers should expose the image-box-on-canvas resolver",
  );
  assert.ok(
    framing.includes("resolveDefaultViewport"),
    "framing helpers should expose a canvas-aware default viewport resolver",
  );
  assert.ok(
    editor.includes('className="absolute inset-0"'),
    "framing editor should render the canvas filling the host viewport",
  );
  assert.ok(
    editor.includes("resolveOutputAreaBox"),
    "framing editor should compute the bright framing box from the canvas+ratio",
  );
  assert.ok(
    editor.includes("resolveImageBoxOnCanvas"),
    "framing editor should resolve the image box on the canvas",
  );
  assert.equal(
    editor.includes('type="range"'),
    false,
    "framing editor should remove the old standalone zoom slider",
  );
  assert.ok(
    editor.includes('from "react-moveable"'),
    "framing editor should use react-moveable for direct manipulation",
  );
  assert.ok(
    editor.includes("renderDirections"),
    "framing editor should render explicit moveable handle directions around the image",
  );
  assert.ok(
    editor.includes("keepRatio"),
    "framing editor should preserve aspect ratio while resizing from any handle",
  );
  assert.equal(
    editor.includes("Cropper"),
    false,
    "framing editor should stop using react-easy-crop as the interaction layer",
  );
  assert.equal(
    controls.includes("setPrepareMode"),
    false,
    "canvas controls should stop exposing a crop/pad mode toggle",
  );
});

test("ratio changes invalidate derived analysis state without resetting the viewport", () => {
  const store = read("src/store/useWorkflowStore.ts");

  assert.ok(
    store.includes("const clearDerivedState"),
    "workflow store should centralize invalidation of prepared and analysis-derived state",
  );
  assert.ok(
    store.includes("preparedImage: undefined"),
    "composition updates should invalidate preparedImage and downstream results",
  );
  assert.ok(
    store.includes("sceneAnalysis: undefined"),
    "composition updates should invalidate previous scene analysis",
  );

  const setRatioBody = store.split("setRatioId:")[1]?.split("setCustomRatio:")[0] ?? "";
  assert.ok(setRatioBody, "setRatioId block should be present");
  assert.equal(
    /\bcanvasFraming\s*:/.test(setRatioBody),
    false,
    "setRatioId should not overwrite canvasFraming so the image stays put on ratio changes",
  );

  const setCustomRatioBody =
    store.split("setCustomRatio:")[1]?.split("setActiveResultId:")[0] ?? "";
  assert.ok(setCustomRatioBody, "setCustomRatio block should be present");
  assert.equal(
    /\bcanvasFraming\s*:/.test(setCustomRatioBody),
    false,
    "setCustomRatio should not overwrite canvasFraming on ratio changes",
  );
});

test("prepareCanvasImage outputs transparent-background PNG with the framing box pixel size", () => {
  const prepare = read("src/services/canvas/prepareCanvas.ts");
  const framing = read("src/services/canvas/framing.ts");

  assert.ok(
    prepare.includes("canvas: canvasSize"),
    "prepareCanvasImage should accept the measured canvas size to interpret normalized viewport",
  );
  assert.ok(
    prepare.includes("clearRect"),
    "prepareCanvasImage should clear the output canvas to keep alpha transparent",
  );
  assert.equal(
    /ctx\.filter\s*=\s*"blur/.test(prepare),
    false,
    "prepareCanvasImage should no longer paint a blur backdrop",
  );
  assert.ok(
    framing.includes("resolveImageDrawBoxInOutput"),
    "framing helpers should expose the image-draw-box resolver used by prepareCanvasImage",
  );
});
