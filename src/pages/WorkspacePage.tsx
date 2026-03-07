import { Grid, Stack } from "@mui/material";

import { CanvasPreparePanel } from "@/components/workspace/CanvasPreparePanel";
import { ImageUploadPanel } from "@/components/workspace/ImageUploadPanel";
import { QuickGeneratePanel } from "@/components/workspace/QuickGeneratePanel";

export const WorkspacePage = () => (
  <Grid container spacing={2}>
    <Grid size={{ xs: 12, lg: 7 }}>
      <Stack spacing={2}>
        <ImageUploadPanel />
        <CanvasPreparePanel />
      </Stack>
    </Grid>
    <Grid size={{ xs: 12, lg: 5 }}>
      <QuickGeneratePanel />
    </Grid>
  </Grid>
);
