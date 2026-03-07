import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ErrorRoundedIcon from "@mui/icons-material/ErrorRounded";
import SecurityRoundedIcon from "@mui/icons-material/SecurityRounded";
import WifiFindRoundedIcon from "@mui/icons-material/WifiFindRounded";
import {
  Alert,
  Button,
  Chip,
  Divider,
  Grid,
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
  const providers = useSettingsStore((state) => state.providers);
  const setProviderConfig = useSettingsStore((state) => state.setProviderConfig);
  const setComfyWorkflowTemplate = useSettingsStore((state) => state.setComfyWorkflowTemplate);
  const setComfyNodeMapping = useSettingsStore((state) => state.setComfyNodeMapping);
  const lastConnectivity = useSettingsStore((state) => state.lastConnectivity);
  const setConnectivityResult = useSettingsStore((state) => state.setConnectivityResult);
  const keysEncrypted = useSettingsStore((state) => state.keysEncrypted);
  const encryptAllKeys = useSettingsStore((state) => state.encryptAllKeys);
  const decryptAllKeys = useSettingsStore((state) => state.decryptAllKeys);
  const heicExperimentalEnabled = useSettingsStore((state) => state.heicExperimentalEnabled);
  const setHeicExperimentalEnabled = useSettingsStore((state) => state.setHeicExperimentalEnabled);
  const localFallbackEnabled = useSettingsStore((state) => state.localFallbackEnabled);
  const setLocalFallbackEnabled = useSettingsStore((state) => state.setLocalFallbackEnabled);

  const [passphrase, setPassphrase] = useState("");
  const [localError, setLocalError] = useState("");
  const config = providers[selectedProvider];
  const isLocalhost =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

  const connectivityMutation = useMutation({
    mutationFn: async () =>
      testProviderConnectivity(selectedProvider, providers, passphrase || undefined),
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
      <SectionCard title={t("settings.title")} subtitle={t("settings.securityTip")}>
        <Stack spacing={2}>
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
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                label={t("settings.model")}
                value={config.model}
                onChange={(event) =>
                  setProviderConfig(selectedProvider, { model: event.target.value })
                }
              />
            </Grid>
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
          {selectedProvider === "ark" && isLocalhost && config.baseUrl !== "/api/ark" ? (
            <Alert severity="warning">
              Local dev detected. Set Ark Base URL to <code>/api/ark</code> to bypass browser CORS
              via Vite proxy.
            </Alert>
          ) : null}

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
          {localError ? (
            <Alert severity="error">{t(`errors.${localError}`, localError)}</Alert>
          ) : null}
        </Stack>
      </SectionCard>

      <SectionCard
        title={t("settings.encryption")}
        subtitle="localStorage + optional passphrase encryption"
      >
        <Stack spacing={2}>
          <TextField
            label={t("settings.passphrase")}
            type="password"
            value={passphrase}
            onChange={(event) => setPassphrase(event.target.value)}
          />
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <Button
              variant="contained"
              startIcon={<SecurityRoundedIcon />}
              onClick={() => {
                try {
                  encryptAllKeys(passphrase);
                  setLocalError("");
                } catch (error) {
                  setLocalError(toUserError(error));
                }
              }}
            >
              {t("settings.encrypt")}
            </Button>
            <Button
              variant="outlined"
              onClick={() => {
                try {
                  decryptAllKeys(passphrase);
                  setLocalError("");
                } catch (error) {
                  setLocalError(toUserError(error));
                }
              }}
            >
              {t("settings.decrypt")}
            </Button>
            <Chip
              label={keysEncrypted ? "Encrypted" : "Plain text"}
              color={keysEncrypted ? "warning" : "default"}
            />
          </Stack>
          <Divider />
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            alignItems={{ xs: "flex-start", sm: "center" }}
          >
            <Typography variant="body2">HEIC experimental</Typography>
            <Button
              size="small"
              variant={heicExperimentalEnabled ? "contained" : "outlined"}
              onClick={() => setHeicExperimentalEnabled(!heicExperimentalEnabled)}
            >
              {heicExperimentalEnabled ? "Enabled" : "Disabled"}
            </Button>
            <Typography variant="body2">Local fallback</Typography>
            <Button
              size="small"
              variant={localFallbackEnabled ? "contained" : "outlined"}
              onClick={() => setLocalFallbackEnabled(!localFallbackEnabled)}
            >
              {localFallbackEnabled ? "Enabled" : "Disabled"}
            </Button>
          </Stack>
          {localError ? (
            <Alert severity="error">{t(`errors.${localError}`, localError)}</Alert>
          ) : null}
        </Stack>
      </SectionCard>
    </Stack>
  );
};
