import { Grid } from "@mui/material";

import { CanvasWorkspace } from "@/components/canvas/CanvasWorkspace";
import { ControlPanel } from "@/components/control/ControlPanel";
import { ResultsAndExport } from "@/components/results/ResultsAndExport";

export const MainPage = () => {
  return (
    <Grid container spacing={0} sx={{ px: 0 }}>
      {/* Left: Canvas Workspace */}
      <Grid size={{ xs: 12, md: 9 }}>
        <CanvasWorkspace />
      </Grid>

      {/* Right: Control Panel */}
      <Grid size={{ xs: 12, md: 3 }}>
        <ControlPanel />
      </Grid>

      {/* Bottom: Results Gallery + Export */}
      <Grid size={12}>
        <ResultsAndExport />
      </Grid>
    </Grid>
  );
};
