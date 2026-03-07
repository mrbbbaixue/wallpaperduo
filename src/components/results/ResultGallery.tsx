import { Box, Grid, Stack, Typography } from "@mui/material";

import { SectionCard } from "@/components/common/SectionCard";
import { useWorkflowStore } from "@/store/useWorkflowStore";

export const ResultGallery = () => {
  const tasks = useWorkflowStore((state) => state.tasks);
  const alignmentResults = useWorkflowStore((state) => state.alignmentResults);

  const succeeded = tasks.filter((task) => task.status === "succeeded" && task.result?.objectUrl);

  return (
    <SectionCard title="Result Preview">
      {succeeded.length ? (
        <Grid container spacing={2}>
          {succeeded.map((task) => {
            const aligned = alignmentResults[task.id];
            return (
              <Grid key={task.id} size={{ xs: 12, md: 6, lg: 4 }}>
                <Stack spacing={1}>
                  <Typography variant="subtitle2">{task.label}</Typography>
                  <Box
                    component="img"
                    src={task.result?.objectUrl}
                    alt={task.label}
                    sx={{
                      width: "100%",
                      borderRadius: 2,
                      border: "1px solid rgba(120,140,150,0.3)",
                    }}
                  />
                  {aligned?.status === "succeeded" && aligned.alignedObjectUrl ? (
                    <Box
                      component="img"
                      src={aligned.alignedObjectUrl}
                      alt={`${task.label} aligned`}
                      sx={{
                        width: "100%",
                        borderRadius: 2,
                        border: "1px solid rgba(120,140,150,0.3)",
                      }}
                    />
                  ) : null}
                  <Typography variant="caption" color="text.secondary">
                    {aligned?.status === "succeeded"
                      ? `Aligned score: ${(aligned.score * 100).toFixed(1)}%`
                      : "Not aligned"}
                  </Typography>
                </Stack>
              </Grid>
            );
          })}
        </Grid>
      ) : (
        <Typography variant="body2" color="text.secondary">
          No generated images yet.
        </Typography>
      )}
    </SectionCard>
  );
};
