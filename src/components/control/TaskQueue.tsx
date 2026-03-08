import {
  Box,
  Chip,
  LinearProgress,
  Stack,
  Typography,
} from "@mui/material";
import { useTranslation } from "react-i18next";

import { useWorkflowStore } from "@/store/useWorkflowStore";

export const TaskQueue = () => {
  const { t } = useTranslation();
  const tasks = useWorkflowStore((s) => s.tasks);

  if (tasks.length === 0) return null;

  const succeeded = tasks.filter((t) => t.status === "succeeded").length;
  const failed = tasks.filter((t) => t.status === "failed").length;

  return (
    <Stack spacing={1}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="subtitle2">
          {t("results.queue")}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {succeeded}/{tasks.length} {t("common.succeeded")}
          {failed > 0 && `, ${failed} ${t("common.failed")}`}
        </Typography>
      </Stack>
      <Stack spacing={1}>
        {tasks.map((task) => (
          <Box
            key={task.id}
            sx={{
              p: 1,
              borderRadius: 1.5,
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <Stack spacing={0.5}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="caption" fontWeight={600}>
                  {task.label}
                </Typography>
                <Chip
                  size="small"
                  label={task.status}
                  color={
                    task.status === "succeeded"
                      ? "success"
                      : task.status === "failed"
                        ? "error"
                        : task.status === "running"
                          ? "warning"
                          : "default"
                  }
                  sx={{ height: 20, fontSize: "0.7rem" }}
                />
              </Stack>
              {(task.status === "running" || task.status === "queued") && (
                <LinearProgress
                  variant="determinate"
                  value={task.progress}
                  sx={{ height: 3, borderRadius: 1 }}
                />
              )}
              {task.error && (
                <Typography variant="caption" color="error.main">
                  {task.error}
                </Typography>
              )}
            </Stack>
          </Box>
        ))}
      </Stack>
    </Stack>
  );
};
