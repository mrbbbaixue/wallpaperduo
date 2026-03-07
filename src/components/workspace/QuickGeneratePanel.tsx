import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import {
  Alert,
  Button,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
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
import type { GenerationTask } from "@/types/domain";
import { createId } from "@/utils/id";
import { toUserError } from "@/utils/error";

export const QuickGeneratePanel = () => {
  const { t } = useTranslation();
  const prepared = useWorkflowStore((state) => state.preparedImage);
  const tasks = useWorkflowStore((state) => state.tasks);
  const setTasks = useWorkflowStore((state) => state.setTasks);
  const selectedProvider = useSettingsStore((state) => state.selectedProvider);
  const providers = useSettingsStore((state) => state.providers);
  const localFallbackEnabled = useSettingsStore((state) => state.localFallbackEnabled);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [passphrase, setPassphrase] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const latestSucceeded = useMemo(
    () => [...tasks].reverse().find((item) => item.status === "succeeded" && item.result?.blob),
    [tasks],
  );

  const onGenerate = async () => {
    if (!prepared) {
      setError(t("workspace.needPrepared"));
      return;
    }

    const quickTask: GenerationTask = {
      id: createId("quick"),
      label: `quick-${theme}`,
      theme,
      timeOfDay: "day",
      prompt: `${theme} wallpaper version, preserve composition and details`,
      negativePrompt: "geometry shift, blur, artifact, text",
      seed: Math.floor(Math.random() * 100000000),
      status: "idle",
      progress: 0,
    };

    try {
      setLoading(true);
      setError("");
      const provider = createProvider(selectedProvider, providers, passphrase || undefined);
      const completed = await runGenerationQueue({
        provider,
        prepared,
        tasks: [quickTask],
        concurrency: 1,
        retries: 1,
        localFallback: localFallbackEnabled,
      });
      setTasks([...tasks, ...completed]);
    } catch (exception) {
      setError(toUserError(exception));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SectionCard
      title="Quick One-shot"
      subtitle="Single light/dark generation for fast verification."
    >
      <Stack spacing={2}>
        <ToggleButtonGroup
          exclusive
          value={theme}
          onChange={(_, value) => value && setTheme(value)}
        >
          <ToggleButton value="dark">{t("workspace.singleDark")}</ToggleButton>
          <ToggleButton value="light">{t("workspace.singleLight")}</ToggleButton>
        </ToggleButtonGroup>
        <TextField
          size="small"
          label={t("settings.passphrase")}
          type="password"
          value={passphrase}
          onChange={(event) => setPassphrase(event.target.value)}
          helperText="Needed only if API keys are encrypted."
        />
        <Stack direction="row" spacing={1}>
          <Button
            variant="contained"
            startIcon={<AutoAwesomeRoundedIcon />}
            onClick={() => void onGenerate()}
            disabled={!prepared || loading}
          >
            {loading ? t("common.loading") : t("common.generate")}
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadRoundedIcon />}
            disabled={!latestSucceeded?.result?.blob}
            onClick={() =>
              latestSucceeded?.result?.blob
                ? saveAs(latestSucceeded.result.blob, `${latestSucceeded.id}.png`)
                : undefined
            }
          >
            {t("common.download")} PNG
          </Button>
        </Stack>
        {latestSucceeded?.error ? <Alert severity="warning">{latestSucceeded.error}</Alert> : null}
        {error ? <Alert severity="error">{error}</Alert> : null}
        <Typography variant="caption" color="text.secondary">
          Provider: {selectedProvider}
        </Typography>
      </Stack>
    </SectionCard>
  );
};
