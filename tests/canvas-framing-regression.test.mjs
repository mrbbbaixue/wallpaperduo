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
    panel.includes("buildPreparedImage"),
    "analysis flow should persist the cropped frame before scene analysis",
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
});

test("framing editor fits the visible cropper viewport to the selected ratio", () => {
  const editor = read("src/components/canvas/CanvasFramingEditor.tsx");
  const framing = read("src/services/canvas/framing.ts");

  assert.ok(
    framing.includes("fitFrameBoxWithinBounds"),
    "framing helpers should expose a fit-to-bounds ratio helper for the editor viewport",
  );
  assert.ok(
    editor.includes("cropSize={frameViewportSize}"),
    "framing editor should force the cropper viewport to the fitted ratio box",
  );
  assert.ok(
    editor.includes("width: frameViewportSize.width"),
    "framing editor should render inside a measured ratio-constrained viewport",
  );
  assert.equal(
    editor.includes('type="range"'),
    false,
    "framing editor should remove the old standalone zoom slider",
  );
  assert.ok(
    editor.includes("handleZoomHandlePointerDown"),
    "framing editor should expose an on-image zoom handle interaction",
  );
});

test("composition-changing store actions invalidate derived analysis state", () => {
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
});
