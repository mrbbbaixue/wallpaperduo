import AutoFixHighRoundedIcon from "@mui/icons-material/AutoFixHighRounded";
import PsychologyRoundedIcon from "@mui/icons-material/PsychologyRounded";
import { Alert, Box, Button, Divider, Grid, Stack, TextField, Typography } from "@mui/material";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { SectionCard } from "@/components/common/SectionCard";
import { buildPromptPlan } from "@/services/prompt/promptPlanner";
import { runSceneAnalysis } from "@/services/prompt/sceneAnalyzer";
import { createProvider } from "@/services/providers";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useWorkflowStore } from "@/store/useWorkflowStore";
import { toUserError } from "@/utils/error";

export const PromptEditorPanel = () => {
  const { t } = useTranslation();
  const preparedImage = useWorkflowStore((state) => state.preparedImage);
  const sceneAnalysis = useWorkflowStore((state) => state.sceneAnalysis);
  const promptPlan = useWorkflowStore((state) => state.promptPlan);
  const setSceneAnalysis = useWorkflowStore((state) => state.setSceneAnalysis);
  const setPromptPlan = useWorkflowStore((state) => state.setPromptPlan);
  const replaceTasksFromPromptPlan = useWorkflowStore((state) => state.replaceTasksFromPromptPlan);
  const updatePromptVariant = useWorkflowStore((state) => state.updatePromptVariant);

  const selectedProvider = useSettingsStore((state) => state.selectedProvider);
  const providers = useSettingsStore((state) => state.providers);

  const [basePrompt, setBasePrompt] = useState(promptPlan?.basePrompt ?? "");
  const [localChanges, setLocalChanges] = useState(promptPlan?.localChanges ?? "");
  const [userOverlayPrompt, setUserOverlayPrompt] = useState(promptPlan?.userOverlayPrompt ?? "");
  const [passphrase, setPassphrase] = useState("");
  const [loadingAnalyze, setLoadingAnalyze] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [error, setError] = useState("");

  const onAnalyze = async () => {
    if (!preparedImage) {
      setError(t("workspace.needPrepared"));
      return;
    }
    try {
      setLoadingAnalyze(true);
      setError("");
      const provider = createProvider(selectedProvider, providers, passphrase || undefined);
      const analysis = await runSceneAnalysis(provider, preparedImage, basePrompt);
      setSceneAnalysis(analysis);
    } catch (exception) {
      setError(toUserError(exception));
    } finally {
      setLoadingAnalyze(false);
    }
  };

  const onBuildPlan = () => {
    if (!sceneAnalysis) {
      setError("Please run scene analysis first");
      return;
    }
    try {
      setLoadingPlan(true);
      const plan = buildPromptPlan({
        analysis: sceneAnalysis,
        basePrompt,
        userOverlayPrompt,
        localChanges,
      });
      setPromptPlan(plan);
      replaceTasksFromPromptPlan(plan);
      setError("");
    } finally {
      setLoadingPlan(false);
    }
  };

  return (
    <Stack spacing={2}>
      <SectionCard title={t("prompts.title")} subtitle="SceneAnalysis -> PromptPlan JSON">
        <Stack spacing={2}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 7 }}>
              <TextField
                fullWidth
                multiline
                minRows={3}
                label={t("prompts.basePrompt")}
                value={basePrompt}
                onChange={(event) => setBasePrompt(event.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 5 }}>
              <TextField
                fullWidth
                label={t("settings.passphrase")}
                type="password"
                value={passphrase}
                onChange={(event) => setPassphrase(event.target.value)}
                helperText="Required only for encrypted provider keys"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                multiline
                minRows={3}
                label={t("prompts.userOverlay")}
                value={userOverlayPrompt}
                onChange={(event) => setUserOverlayPrompt(event.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                multiline
                minRows={3}
                label={t("prompts.localChanges")}
                value={localChanges}
                onChange={(event) => setLocalChanges(event.target.value)}
              />
            </Grid>
          </Grid>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <Button
              variant="contained"
              startIcon={<PsychologyRoundedIcon />}
              onClick={() => void onAnalyze()}
              disabled={loadingAnalyze || !preparedImage}
            >
              {loadingAnalyze ? t("common.loading") : t("prompts.analyze")}
            </Button>
            <Button
              variant="outlined"
              startIcon={<AutoFixHighRoundedIcon />}
              onClick={onBuildPlan}
              disabled={!sceneAnalysis || loadingPlan}
            >
              {loadingPlan ? t("common.loading") : t("prompts.plan")}
            </Button>
          </Stack>
          {error ? <Alert severity="error">{t(`errors.${error}`, error)}</Alert> : null}
        </Stack>
      </SectionCard>

      <SectionCard title="SceneAnalysis">
        {sceneAnalysis ? (
          <Stack spacing={1}>
            <Typography variant="body2">{sceneAnalysis.summary}</Typography>
            <Typography variant="caption" color="text.secondary">
              subjects: {sceneAnalysis.subjects.join(", ")}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              lighting: {sceneAnalysis.lighting}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              risks: {sceneAnalysis.risks.join(", ")}
            </Typography>
          </Stack>
        ) : (
          <Typography variant="body2" color="text.secondary">
            {t("prompts.analysisReady")}
          </Typography>
        )}
      </SectionCard>

      <SectionCard title={t("prompts.variants")}>
        <Stack spacing={2}>
          {promptPlan?.variants.map((variant) => (
            <Box
              key={variant.id}
              sx={{
                p: 2,
                borderRadius: 2,
                border: "1px solid rgba(120,140,150,0.25)",
                background: "rgba(0,0,0,0.02)",
              }}
            >
              <Stack spacing={1}>
                <Typography variant="subtitle2">{variant.label}</Typography>
                <TextField
                  fullWidth
                  multiline
                  minRows={2}
                  label="Prompt"
                  value={variant.prompt}
                  onChange={(event) =>
                    updatePromptVariant(variant.id, { prompt: event.target.value })
                  }
                />
                <TextField
                  fullWidth
                  multiline
                  minRows={2}
                  label="Negative Prompt"
                  value={variant.negativePrompt}
                  onChange={(event) =>
                    updatePromptVariant(variant.id, {
                      negativePrompt: event.target.value,
                    })
                  }
                />
                <TextField
                  fullWidth
                  type="number"
                  label="Seed"
                  value={variant.seed}
                  onChange={(event) =>
                    updatePromptVariant(variant.id, {
                      seed: Number(event.target.value || 0),
                    })
                  }
                />
              </Stack>
            </Box>
          ))}
          {!promptPlan?.variants.length ? (
            <Typography variant="body2" color="text.secondary">
              No prompt variants yet.
            </Typography>
          ) : null}
          <Divider />
          <Typography variant="caption" color="text.secondary">
            Structured JSON is stored in-memory to keep generation reproducible.
          </Typography>
        </Stack>
      </SectionCard>
    </Stack>
  );
};
