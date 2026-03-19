import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

const read = (relativePath) => readFileSync(join(root, relativePath), "utf8");

test("regular surfaces and controls keep only micro corners", () => {
  const globals = read("src/styles/globals.css");
  assert.match(
    globals,
    /--radius:\s*0\.375rem;/,
    "Global radius token should tighten to a 6px cap for regular surfaces",
  );

  const expectations = [
    {
      file: "src/components/settings/SettingsModal.tsx",
      include: ['className="flex h-[min(88vh,760px)] max-h-[92vh] max-w-5xl flex-col gap-0 overflow-hidden rounded-lg'],
    },
    {
      file: "src/pages/MainPage.tsx",
      include: ['className="max-h-[78vh] rounded-t-lg border border-border/70 bg-background/98 p-0 shadow-2xl sm:rounded-t-lg"'],
      exclude: ['rounded-t-[1.75rem]'],
    },
    {
      file: "src/components/canvas/CanvasControls.tsx",
      include: ['className="h-11 rounded-md bg-background/65"'],
      exclude: ['rounded-none'],
    },
    {
      file: "src/components/control/ControlPanel.tsx",
      include: ['className="rounded-lg border border-border/70 bg-background/70 p-3"'],
      exclude: ['rounded-none'],
    },
    {
      file: "src/components/control/GenerateControls.tsx",
      include: ['className="rounded-lg border border-border/70 bg-background/70 p-3"'],
      exclude: ['rounded-none'],
    },
    {
      file: "src/components/control/TimeSlotSelector.tsx",
      include: ['"rounded-md border px-3 py-2.5 text-sm font-medium transition-all disabled:cursor-not-allowed disabled:opacity-55"'],
      exclude: ['rounded-none'],
    },
    {
      file: "src/components/control/PromptEditor.tsx",
      include: ['className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-3"'],
      exclude: ['rounded-none'],
    },
    {
      file: "src/components/control/WorkflowStepCard.tsx",
      include: ['"overflow-hidden rounded-lg border border-b border-l-0 border-r-0 border-t-0 transition-colors"'],
      exclude: ['rounded-none'],
    },
    {
      file: "src/components/control/TaskQueue.tsx",
      include: ['className="space-y-2 rounded-lg border border-border/70 bg-background/70 p-3"'],
      exclude: ['rounded-none'],
    },
    {
      file: "src/components/settings/ProviderSettingsPanel.tsx",
      include: ['"min-h-28 w-full rounded-md border border-input bg-background/75'],
      exclude: ['rounded-none'],
    },
    {
      file: "src/components/settings/ProviderConfig.tsx",
      include: ['const fieldClassName = "h-11 rounded-md bg-background/75";'],
      exclude: ['rounded-none'],
    },
    {
      file: "src/components/results/ExportPanel.tsx",
      include: ['className="rounded-lg border border-border/70 bg-background p-4"'],
      exclude: ['rounded-none'],
    },
    {
      file: "src/components/ui/toast.tsx",
      include: ['overflow-hidden rounded-lg border p-4 pr-10 shadow-lg'],
      exclude: ['rounded-xl'],
    },
  ];

  for (const expectation of expectations) {
    const source = read(expectation.file);

    for (const snippet of expectation.include) {
      assert.ok(
        source.includes(snippet),
        `${expectation.file} should include ${snippet}`,
      );
    }

    for (const snippet of expectation.exclude ?? []) {
      assert.equal(
        source.includes(snippet),
        false,
        `${expectation.file} should avoid ${snippet}`,
      );
    }
  }
});
