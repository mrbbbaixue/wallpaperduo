import { Box, Grid } from "@mui/material";

import { CanvasWorkspace } from "@/components/canvas/CanvasWorkspace";
import { ControlPanel } from "@/components/control/ControlPanel";
import { ResultsAndExport } from "@/components/results/ResultsAndExport";

export const MainPage = () => {
  return (
    <Grid
      container
      spacing={1.25}
      sx={{
        px: 0,
        alignItems: "flex-start",
      }}
    >
      <Grid size={{ xs: 12, md: 9 }}>
        <CanvasWorkspace />
      </Grid>

      <Grid size={{ xs: 12, md: 3 }}>
        <ControlPanel />
      </Grid>

      <Grid size={12} sx={{ pt: 1.25 }}>
        <Box
          sx={{
            borderTop: "1px solid",
            borderColor: "divider",
            pt: 1.5,
            position: "relative",
            "&::before": {
              content: '""',
              position: "absolute",
              inset: "-14px 4% auto 4%",
              height: 28,
              background:
                "radial-gradient(circle at 24% 50%, rgba(80, 131, 150, 0.24), transparent 52%), radial-gradient(circle at 76% 50%, rgba(168, 123, 72, 0.2), transparent 46%)",
              filter: "blur(22px)",
              pointerEvents: "none",
            },
          }}
        >
          <ResultsAndExport />
        </Box>
      </Grid>
    </Grid>
  );
};
