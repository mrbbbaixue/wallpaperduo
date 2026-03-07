import {
  Alert,
  Box,
  Button,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { SectionCard } from "@/components/common/SectionCard";
import { aspectRatios } from "@/data/aspectRatios";
import { prepareCanvasImage } from "@/services/canvas/prepareCanvas";
import { buildPreparedImage, useWorkflowStore } from "@/store/useWorkflowStore";
import { createId } from "@/utils/id";

export const CanvasPreparePanel = () => {
  const { t } = useTranslation();
  const sourceImage = useWorkflowStore((state) => state.sourceImage);
  const preparedImage = useWorkflowStore((state) => state.preparedImage);
  const ratioId = useWorkflowStore((state) => state.ratioId);
  const customRatio = useWorkflowStore((state) => state.customRatio);
  const prepareMode = useWorkflowStore((state) => state.prepareMode);
  const setRatioId = useWorkflowStore((state) => state.setRatioId);
  const setCustomRatio = useWorkflowStore((state) => state.setCustomRatio);
  const setPrepareMode = useWorkflowStore((state) => state.setPrepareMode);
  const setPreparedImage = useWorkflowStore((state) => state.setPreparedImage);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const ratio =
    ratioId === "custom"
      ? customRatio
      : (() => {
          const preset = aspectRatios.find((item) => item.id === ratioId);
          return preset ? { width: preset.width, height: preset.height } : { width: 16, height: 9 };
        })();

  const onPrepare = async () => {
    if (!sourceImage) {
      setError(t("workspace.needPrepared"));
      return;
    }

    try {
      setLoading(true);
      setError("");
      const output = await prepareCanvasImage({
        source: sourceImage.blob,
        ratio,
        mode: prepareMode,
      });
      const prepared = buildPreparedImage({
        sourceImageId: sourceImage.id,
        blob: output.blob,
        width: output.width,
        height: output.height,
        objectUrl: URL.createObjectURL(output.blob),
        ratioId,
        mode: prepareMode,
      });
      setPreparedImage(prepared);
    } catch (exception) {
      setError(String(exception));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SectionCard title="Canvas Prep" subtitle={t("workspace.mode")}>
      <Stack spacing={2}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 4 }}>
            <FormControl fullWidth>
              <InputLabel>{t("workspace.ratio")}</InputLabel>
              <Select
                value={ratioId}
                label={t("workspace.ratio")}
                onChange={(event) => setRatioId(event.target.value)}
              >
                {aspectRatios.map((item) => (
                  <MenuItem key={item.id} value={item.id}>
                    {item.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          {ratioId === "custom" ? (
            <>
              <Grid size={{ xs: 6, md: 2 }}>
                <TextField
                  fullWidth
                  type="number"
                  label="W"
                  value={customRatio.width}
                  onChange={(event) =>
                    setCustomRatio({
                      ...customRatio,
                      width: Math.max(1, Number(event.target.value || 1)),
                    })
                  }
                />
              </Grid>
              <Grid size={{ xs: 6, md: 2 }}>
                <TextField
                  fullWidth
                  type="number"
                  label="H"
                  value={customRatio.height}
                  onChange={(event) =>
                    setCustomRatio({
                      ...customRatio,
                      height: Math.max(1, Number(event.target.value || 1)),
                    })
                  }
                />
              </Grid>
            </>
          ) : null}
          <Grid size={{ xs: 12, md: 4 }}>
            <ToggleButtonGroup
              exclusive
              value={prepareMode}
              onChange={(_, value) => value && setPrepareMode(value)}
              color="primary"
            >
              <ToggleButton value="crop">{t("workspace.modeCrop")}</ToggleButton>
              <ToggleButton value="pad">{t("workspace.modePad")}</ToggleButton>
            </ToggleButtonGroup>
          </Grid>
        </Grid>
        <Button
          variant="contained"
          onClick={() => void onPrepare()}
          disabled={loading || !sourceImage}
        >
          {loading ? t("common.loading") : t("workspace.prepare")}
        </Button>
        {error ? <Alert severity="error">{error}</Alert> : null}
        {preparedImage ? (
          <Stack spacing={1}>
            <Typography variant="body2" color="text.secondary">
              {t("workspace.prepared")} · {preparedImage.width}x{preparedImage.height}
            </Typography>
            <Box
              component="img"
              src={preparedImage.objectUrl}
              alt={createId("prepared")}
              sx={{
                width: { xs: "100%", md: 420 },
                borderRadius: 3,
                border: "1px solid rgba(120,140,150,0.35)",
              }}
            />
          </Stack>
        ) : null}
      </Stack>
    </SectionCard>
  );
};
