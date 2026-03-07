import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import {
  Alert,
  Box,
  Button,
  Chip,
  LinearProgress,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { saveAs } from "file-saver";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { SectionCard } from "@/components/common/SectionCard";
import { runGenerationQueue } from "@/services/generation/generationQueue";
import { createProvider } from "@/services/providers";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useWorkflowStore } from "@/store/useWorkflowStore";
import { toUserError } from "@/utils/error";

export const GenerationQueuePanel = () => {
  const { t } = useTranslation();
  const preparedImage = useWorkflowStore((state) => state.preparedImage);
  const tasks = useWorkflowStore((state) => state.tasks);
  const setTasks = useWorkflowStore((state) => state.setTasks);
  const updateTask = useWorkflowStore((state) => state.updateTask);

  const selectedProvider = useSettingsStore((state) => state.selectedProvider);
  const providers = useSettingsStore((state) => state.providers);
  const localFallbackEnabled = useSettingsStore((state) => state.localFallbackEnabled);
  const [passphrase, setPassphrase] = useState("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  const summary = useMemo(() => {
    const total = tasks.length;
    const succeeded = tasks.filter((task) => task.status === "succeeded").length;
    const failed = tasks.filter((task) => task.status === "failed").length;
    return { total, succeeded, failed };
  }, [tasks]);

  const runBatch = async () => {
    if (!preparedImage) {
      setError(t("workspace.needPrepared"));
      return;
    }
    if (!tasks.length) {
      setError("No tasks found. Build prompt plan first.");
      return;
    }

    try {
      setRunning(true);
      setError("");
      const provider = createProvider(selectedProvider, providers, passphrase || undefined);
      const concurrency = Math.max(1, providers[selectedProvider].concurrency || 1);
      const completed = await runGenerationQueue({
        provider,
        prepared: preparedImage,
        tasks,
        concurrency,
        retries: 1,
        localFallback: localFallbackEnabled,
        onTaskUpdate: (taskId, patch) => updateTask(taskId, patch),
      });
      setTasks(completed);
    } catch (exception) {
      setError(toUserError(exception));
    } finally {
      setRunning(false);
    }
  };

  return (
    <SectionCard
      title={t("results.queue")}
      subtitle={`${summary.succeeded}/${summary.total} succeeded, ${summary.failed} failed`}
    >
      <Stack spacing={2}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <TextField
            label={t("settings.passphrase")}
            type="password"
            size="small"
            value={passphrase}
            onChange={(event) => setPassphrase(event.target.value)}
            sx={{ maxWidth: 320 }}
          />
          <Button
            variant="contained"
            startIcon={<PlayArrowRoundedIcon />}
            onClick={() => void runBatch()}
            disabled={running || !tasks.length}
          >
            {running ? t("common.loading") : t("results.batchGenerate")}
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshRoundedIcon />}
            onClick={() =>
              setTasks(
                tasks.map((task) => ({
                  ...task,
                  status: "idle",
                  progress: 0,
                  error: undefined,
                })),
              )
            }
          >
            Reset Status
          </Button>
        </Stack>
        {error ? <Alert severity="error">{t(`errors.${error}`, error)}</Alert> : null}
        {tasks.length ? (
          <Stack spacing={1.5}>
            {tasks.map((task) => (
              <Box
                key={task.id}
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  border: "1px solid rgba(120,140,150,0.25)",
                  background: "rgba(255,255,255,0.04)",
                }}
              >
                <Stack spacing={1}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="subtitle2">{task.label}</Typography>
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
                    />
                  </Stack>
                  <LinearProgress variant="determinate" value={task.progress} />
                  {task.error ? (
                    <Typography
                      variant="caption"
                      color={task.status === "failed" ? "error.main" : "warning.main"}
                    >
                      {task.error}
                    </Typography>
                  ) : null}
                  {task.result?.blob ? (
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => saveAs(task.result!.blob, `${task.id}.png`)}
                      >
                        {t("common.download")}
                      </Button>
                      <Typography variant="caption" color="text.secondary">
                        {task.result.source}
                      </Typography>
                    </Stack>
                  ) : null}
                </Stack>
              </Box>
            ))}
          </Stack>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No queued variants yet.
          </Typography>
        )}
      </Stack>
    </SectionCard>
  );
};
