import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ErrorRoundedIcon from "@mui/icons-material/ErrorRounded";
import WifiFindRoundedIcon from "@mui/icons-material/WifiFindRounded";
import {
  Alert,
  Button,
  Chip,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { useMutation } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { SectionCard } from "@/components/common/SectionCard";
import { testProviderConnectivity } from "@/services/providers/testConnectivity";
import { useSettingsStore } from "@/store/useSettingsStore";
import type { ProviderKind } from "@/types/domain";
import { toUserError } from "@/utils/error";

const providerList: ProviderKind[] = ["openrouter", "ark", "comfyui"];

export const ProviderSettingsPanel = () => {
  const { t } = useTranslation();
  const selectedProvider = useSettingsStore((state) => state.selectedProvider);
  const setSelectedProvider = useSettingsStore((state) => state.setSelectedProvider);
  const analysisProvider = useSettingsStore((state) => state.analysisProvider);
  const setAnalysisProvider = useSettingsStore((state) => state.setAnalysisProvider);
  const generationProvider = useSettingsStore((state) => state.generationProvider);
  const setGenerationProvider = useSettingsStore((state) => state.setGenerationProvider);
  const providers = useSettingsStore((state) => state.providers);
  const setProviderConfig = useSettingsStore((state) => state.setProviderConfig);
  const setComfyWorkflowTemplate = useSettingsStore((state) => state.setComfyWorkflowTemplate);
  const setComfyNodeMapping = useSettingsStore((state) => state.setComfyNodeMapping);
  const promptSettings = useSettingsStore((state) => state.promptSettings);
  const setPromptSettings = useSettingsStore((state) => state.setPromptSettings);
  const lastConnectivity = useSettingsStore((state) => state.lastConnectivity);
  const setConnectivityResult = useSettingsStore((state) => state.setConnectivityResult);
  const heicExperimentalEnabled = useSettingsStore((state) => state.heicExperimentalEnabled);
  const setHeicExperimentalEnabled = useSettingsStore((state) => state.setHeicExperimentalEnabled);
  const localFallbackEnabled = useSettingsStore((state) => state.localFallbackEnabled);
  const setLocalFallbackEnabled = useSettingsStore((state) => state.setLocalFallbackEnabled);

  const [localError, setLocalError] = useState("");
  const config = providers[selectedProvider];

  const connectivityMutation = useMutation({
    mutationFn: async () => testProviderConnectivity(selectedProvider, providers),
    onSuccess: (data) => {
      setLocalError("");
      setConnectivityResult(selectedProvider, data);
    },
    onError: (error) => setLocalError(toUserError(error)),
  });

  const latestConnectivity = useMemo(
    () => lastConnectivity[selectedProvider],
    [lastConnectivity, selectedProvider],
  );

  return (
    <Stack spacing={2}>
      <SectionCard title={t("settings.providerSection")} subtitle={t("settings.routingHint")}>
        <Stack spacing={2}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>{t("settings.analysisProvider")}</InputLabel>
                <Select
                  value={analysisProvider}
                  label={t("settings.analysisProvider")}
                  onChange={(event) => setAnalysisProvider(event.target.value as ProviderKind)}
                >
                  {providerList.map((provider) => (
                    <MenuItem key={provider} value={provider}>
                      {provider}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>{t("settings.generationProvider")}</InputLabel>
                <Select
                  value={generationProvider}
                  label={t("settings.generationProvider")}
                  onChange={(event) => setGenerationProvider(event.target.value as ProviderKind)}
                >
                  {providerList.map((provider) => (
                    <MenuItem key={provider} value={provider}>
                      {provider}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <Tabs
            value={selectedProvider}
            onChange={(_, value: ProviderKind) => setSelectedProvider(value)}
            variant="scrollable"
          >
            {providerList.map((provider) => (
              <Tab key={provider} value={provider} label={provider} />
            ))}
          </Tabs>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label={t("settings.baseUrl")}
                value={config.baseUrl}
                onChange={(event) =>
                  setProviderConfig(selectedProvider, { baseUrl: event.target.value })
                }
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label={t("settings.apiKey")}
                type="password"
                value={config.apiKey}
                onChange={(event) =>
                  setProviderConfig(selectedProvider, { apiKey: event.target.value })
                }
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label={t("settings.generationModel")}
                value={config.model}
                onChange={(event) =>
                  setProviderConfig(selectedProvider, { model: event.target.value })
                }
              />
            </Grid>
            {selectedProvider !== "comfyui" && (
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label={t("settings.analysisModel")}
                  value={config.visionModel ?? ""}
                  onChange={(event) =>
                    setProviderConfig(selectedProvider, { visionModel: event.target.value })
                  }
                />
              </Grid>
            )}
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                type="number"
                label={t("settings.timeout")}
                value={config.timeoutMs}
                onChange={(event) =>
                  setProviderConfig(selectedProvider, {
                    timeoutMs: Math.max(1000, Number(event.target.value)),
                  })
                }
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                type="number"
                label={t("settings.concurrency")}
                value={config.concurrency}
                onChange={(event) =>
                  setProviderConfig(selectedProvider, {
                    concurrency: Math.max(1, Number(event.target.value)),
                  })
                }
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Typography variant="body2" color="text.secondary" sx={{ pt: 1.6 }}>
                {t("settings.currentEditingProvider")}: {selectedProvider}
              </Typography>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label={t("settings.extraHeaders")}
                value={config.extraHeaders}
                onChange={(event) =>
                  setProviderConfig(selectedProvider, { extraHeaders: event.target.value })
                }
                multiline
                minRows={2}
              />
            </Grid>
          </Grid>

          {selectedProvider === "comfyui" ? (
            <Stack spacing={2}>
              <Typography variant="subtitle2">{t("settings.workflow")}</Typography>
              <TextField
                fullWidth
                multiline
                minRows={8}
                value={providers.comfyui.workflowTemplate}
                onChange={(event) => setComfyWorkflowTemplate(event.target.value)}
              />
              <Typography variant="subtitle2">{t("settings.nodeMap")}</Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 6, md: 3 }}>
                  <TextField
                    fullWidth
                    label="positivePromptNodeId"
                    value={providers.comfyui.nodeMapping.positivePromptNodeId}
                    onChange={(event) =>
                      setComfyNodeMapping({ positivePromptNodeId: event.target.value })
                    }
                  />
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <TextField
                    fullWidth
                    label="negativePromptNodeId"
                    value={providers.comfyui.nodeMapping.negativePromptNodeId}
                    onChange={(event) =>
                      setComfyNodeMapping({ negativePromptNodeId: event.target.value })
                    }
                  />
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <TextField
                    fullWidth
                    label="seedNodeId"
                    value={providers.comfyui.nodeMapping.seedNodeId}
                    onChange={(event) => setComfyNodeMapping({ seedNodeId: event.target.value })}
                  />
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <TextField
                    fullWidth
                    label="timeVariableNodeId"
                    value={providers.comfyui.nodeMapping.timeVariableNodeId ?? ""}
                    onChange={(event) =>
                      setComfyNodeMapping({ timeVariableNodeId: event.target.value })
                    }
                  />
                </Grid>
              </Grid>
            </Stack>
          ) : null}

          <Stack direction="row" spacing={1} alignItems="center">
            <Button
              variant="contained"
              startIcon={<WifiFindRoundedIcon />}
              onClick={() => connectivityMutation.mutate()}
              disabled={connectivityMutation.isPending}
            >
              {connectivityMutation.isPending ? t("common.loading") : t("settings.test")}
            </Button>
            {latestConnectivity ? (
              <Chip
                icon={latestConnectivity.ok ? <CheckCircleRoundedIcon /> : <ErrorRoundedIcon />}
                label={`${latestConnectivity.message} (${latestConnectivity.latencyMs}ms)`}
                color={latestConnectivity.ok ? "success" : "error"}
              />
            ) : null}
          </Stack>
        </Stack>
      </SectionCard>

      <SectionCard title={t("settings.promptSettingsTitle")} subtitle={t("settings.promptSettingsDesc")}>
        <Stack spacing={2}>
          <TextField
            fullWidth
            multiline
            minRows={2}
            label={t("settings.analysisPrompt")}
            value={promptSettings.analysisUserPrompt}
            onChange={(event) =>
              setPromptSettings({ analysisUserPrompt: event.target.value })
            }
          />
          <TextField
            fullWidth
            multiline
            minRows={2}
            label={t("settings.generationPromptPrefix")}
            value={promptSettings.generationPrefix}
            onChange={(event) =>
              setPromptSettings({ generationPrefix: event.target.value })
            }
          />
          <TextField
            fullWidth
            multiline
            minRows={2}
            label={t("settings.defaultNegativePrompt")}
            value={promptSettings.defaultNegativePrompt}
            onChange={(event) =>
              setPromptSettings({ defaultNegativePrompt: event.target.value })
            }
          />
        </Stack>
      </SectionCard>

      <SectionCard title={t("settings.runtimeTitle")} subtitle={t("settings.runtimeDesc")}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          alignItems={{ xs: "flex-start", sm: "center" }}
        >
          <Typography variant="body2">{t("settings.heicExperimental")}</Typography>
          <Button
            size="small"
            variant={heicExperimentalEnabled ? "contained" : "outlined"}
            onClick={() => setHeicExperimentalEnabled(!heicExperimentalEnabled)}
          >
            {heicExperimentalEnabled ? t("common.enabled") : t("common.disabled")}
          </Button>
          <Typography variant="body2">{t("settings.localFallback")}</Typography>
          <Button
            size="small"
            variant={localFallbackEnabled ? "contained" : "outlined"}
            onClick={() => setLocalFallbackEnabled(!localFallbackEnabled)}
          >
            {localFallbackEnabled ? t("common.enabled") : t("common.disabled")}
          </Button>
        </Stack>
      </SectionCard>

      {localError ? <Alert severity="error">{t(`errors.${localError}`, localError)}</Alert> : null}
    </Stack>
  );
};
