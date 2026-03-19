import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

const read = (relativePath) =>
  readFileSync(join(root, relativePath), "utf8");

test("desktop workbench uses tighter radius and lighter shadows", () => {
  const filesWithoutRoundedXl = [
    "src/components/common/SectionCard.tsx",
    "src/components/control/WorkflowStepCard.tsx",
    "src/components/control/ControlPanel.tsx",
    "src/components/control/TaskQueue.tsx",
    "src/components/results/ExportPanel.tsx",
    "src/components/results/ResultsRail.tsx",
    "src/components/canvas/CanvasGalleryStrip.tsx",
    "src/components/canvas/CanvasWorkspace.tsx",
  ];

  for (const file of filesWithoutRoundedXl) {
    const source = read(file);
    assert.equal(
      source.includes("rounded-xl"),
      false,
      `${file} should avoid rounded-xl in the compact desktop workbench`,
    );
    assert.equal(
      source.includes("rounded-2xl"),
      false,
      `${file} should avoid rounded-2xl in the compact desktop workbench`,
    );
  }

  const resultsRail = read("src/components/results/ResultsRail.tsx");
  assert.equal(
    resultsRail.includes("shadow-lg"),
    false,
    "Results rail should avoid jumpy heavy selection shadows",
  );

  const galleryStrip = read("src/components/canvas/CanvasGalleryStrip.tsx");
  assert.equal(
    galleryStrip.includes("shadow-lg"),
    false,
    "Canvas gallery should avoid jumpy heavy selection shadows",
  );

  const sectionCard = read("src/components/common/SectionCard.tsx");
  assert.equal(
    sectionCard.includes("shadow-[0_18px_55px"),
    false,
    "SectionCard should use a lighter desktop panel shadow",
  );

  const globals = read("src/styles/globals.css");
  const radiusMatch = globals.match(/--radius:\s*([0-9.]+)rem;/);
  assert.ok(radiusMatch, "Global radius token should exist");
  assert.ok(
    Number(radiusMatch[1]) <= 0.75,
    `Global radius should be tightened for desktop workbench, got ${radiusMatch?.[1]}rem`,
  );
});

test("desktop editor layout stays seamless and lower steps remain expandable", () => {
  const mainPage = read("src/pages/MainPage.tsx");
  assert.ok(
    mainPage.includes("md:gap-0"),
    "MainPage should remove desktop gutter between canvas and sidebar",
  );
  assert.ok(
    mainPage.includes("md:px-0"),
    "MainPage should remove desktop outer padding for the editor layout",
  );
  assert.ok(
    mainPage.includes("md:border-l"),
    "MainPage should use a hard split between canvas and the right sidebar",
  );

  const controlPanel = read("src/components/control/ControlPanel.tsx");
  assert.ok(
    controlPanel.includes("useState<StepKey | null>(null)"),
    "ControlPanel should default workflow cards to collapsed state",
  );
  assert.equal(
    controlPanel.includes("handleStepToggle = (step: StepKey, allowed: boolean)"),
    false,
    "ControlPanel should not block opening later steps behind prerequisite gates",
  );
  assert.equal(
    controlPanel.includes("disabled={!sceneAnalysis}"),
    false,
    "Later workflow cards should stay viewable even before analysis completes",
  );
  assert.equal(
    controlPanel.includes("disabled={!promptsReady}"),
    false,
    "Generate step card should stay expandable before prompts are ready",
  );

  const workflowCard = read("src/components/control/WorkflowStepCard.tsx");
  assert.equal(
    workflowCard.includes("disabled={!onToggle || disabled}"),
    false,
    "WorkflowStepCard header toggle should stay clickable for collapsed pending steps",
  );
  assert.equal(
    workflowCard.includes("rounded-lg"),
    false,
    "WorkflowStepCard should drop rounded corners for the editor-style sidebar",
  );
  assert.ok(
    workflowCard.includes("expanded ? ("),
    "WorkflowStepCard should only show the full description while expanded",
  );

  const canvasWorkspace = read("src/components/canvas/CanvasWorkspace.tsx");
  assert.equal(
    canvasWorkspace.includes("rounded-lg"),
    false,
    "Canvas workspace desktop surfaces should drop rounded corners for the editor layout",
  );
});

test("app shell uses a compact fixed header height for desktop viewport math", () => {
  const appShell = read("src/components/layout/AppShell.tsx");
  assert.equal(
    appShell.includes("WallpaperDuo Studio"),
    false,
    "AppShell should only show the logo and app name in the top-left brand area",
  );
  assert.ok(
    appShell.includes("--app-header-height"),
    "AppShell should expose a shared header-height token",
  );
  assert.ok(
    appShell.includes("h-14"),
    "AppShell should use a shorter fixed header height",
  );
  assert.ok(
    appShell.includes("WD"),
    "AppShell should render a compact logo mark next to the app name",
  );

  const mainPage = read("src/pages/MainPage.tsx");
  assert.ok(
    mainPage.includes("md:h-[calc(100dvh-var(--app-header-height))]"),
    "MainPage should size the desktop workbench from the shared header height token",
  );
});
