import { Stack } from "@mui/material";

import { AlignmentPanel } from "@/components/results/AlignmentPanel";
import { GenerationQueuePanel } from "@/components/results/GenerationQueuePanel";
import { ResultGallery } from "@/components/results/ResultGallery";

export const ResultsPage = () => (
  <Stack spacing={2}>
    <GenerationQueuePanel />
    <AlignmentPanel />
    <ResultGallery />
  </Stack>
);
