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
