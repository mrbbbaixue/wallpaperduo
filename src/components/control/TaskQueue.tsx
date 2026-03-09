import { Box, Chip, LinearProgress, Stack, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

import { useWorkflowStore } from "@/store/useWorkflowStore";
import type { GenerationStatus } from "@/types/domain";

const statusColor: Record<GenerationStatus, "default" | "info" | "warning" | "success" | "error"> = {
  idle: "default",
  queued: "info",
  running: "warning",
  succeeded: "success",
  failed: "error",
};

export const TaskQueue = () => {
  const { t, i18n } = useTranslation();
  const isZh = i18n.language === "zh";
  const tasks = useWorkflowStore((s) => s.tasks);

  if (tasks.length === 0) return null;

  const succeeded = tasks.filter((task) => task.status === "succeeded").length;
  const failed = tasks.filter((task) => task.status === "failed").length;

  return (
    <Stack spacing={1}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="subtitle2">{t("results.queue")}</Typography>
        <Typography variant="caption" color="text.secondary">
          {succeeded}/{tasks.length} {t("common.succeeded")}
          {failed > 0 ? `, ${failed} ${t("common.failed")}` : ""}
        </Typography>
      </Stack>
      <Stack spacing={0.8}>
        {tasks.map((task) => (
          <Box
            key={task.id}
            sx={{
              p: 1,
              borderRadius: 1.5,
              border: "1px solid",
              borderColor: "divider",
              bgcolor: "action.hover",
            }}
          >
            <Stack spacing={0.55}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
                <Typography variant="caption" fontWeight={600} noWrap>
                  {task.label}
                </Typography>
                <Chip
                  size="small"
                  label={t(`results.status.${task.status}`, task.status)}
                  color={statusColor[task.status]}
                  sx={{ height: 21, fontSize: "0.72rem" }}
                />
              </Stack>
              {task.status === "queued" || task.status === "running" ? (
                <>
                  <LinearProgress
                    variant="determinate"
                    value={task.progress}
                    sx={{ height: 4, borderRadius: 999 }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {isZh ? `进度 ${Math.round(task.progress)}%` : `Progress ${Math.round(task.progress)}%`}
                  </Typography>
                </>
              ) : null}
              {task.error ? (
                <Typography variant="caption" color="error.main">
                  {task.error}
                </Typography>
              ) : null}
            </Stack>
          </Box>
        ))}
      </Stack>
    </Stack>
  );
};
