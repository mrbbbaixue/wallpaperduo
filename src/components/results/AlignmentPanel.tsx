import AlignHorizontalCenterRoundedIcon from "@mui/icons-material/AlignHorizontalCenterRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import {
  Alert,
  Box,
  Button,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Slider,
  Stack,
  Typography,
} from "@mui/material";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { SectionCard } from "@/components/common/SectionCard";
import { alignToReference } from "@/services/alignment/alignmentService";
import { useWorkflowStore } from "@/store/useWorkflowStore";
import { canvasToBlob, loadImageFromBlob } from "@/utils/image";

const nudgeBlob = async (blob: Blob, offsetX: number, offsetY: number): Promise<Blob> => {
  const image = await loadImageFromBlob(blob);
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("CANVAS_CONTEXT_UNAVAILABLE");
  }
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, offsetX, offsetY);
  return canvasToBlob(canvas, "image/png");
};

export const AlignmentPanel = () => {
  const { t } = useTranslation();
  const tasks = useWorkflowStore((state) => state.tasks);
  const setAlignmentResult = useWorkflowStore((state) => state.setAlignmentResult);
  const alignmentResults = useWorkflowStore((state) => state.alignmentResults);

  const succeeded = useMemo(
    () => tasks.filter((task) => task.status === "succeeded" && task.result?.blob),
    [tasks],
  );
  const [referenceId, setReferenceId] = useState<string>("");
  const [nudgeTargetId, setNudgeTargetId] = useState<string>("");
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  const runAlign = async () => {
    if (!succeeded.length) {
      setError("No generated images");
      return;
    }
    const reference = succeeded.find((task) => task.id === referenceId) ?? succeeded[0];
    if (!reference.result?.blob) {
      setError("Reference image is missing");
      return;
    }

    try {
      setRunning(true);
      setError("");
      for (const task of succeeded) {
        if (!task.result?.blob) {
          continue;
        }
        if (task.id === reference.id) {
          setAlignmentResult({
            variantId: task.id,
            score: 1,
            alignedBlob: task.result.blob,
            alignedObjectUrl: task.result.objectUrl,
            status: "succeeded",
          });
          continue;
        }

        try {
          const output = await alignToReference(reference.result.blob, task.result.blob);
          setAlignmentResult({
            variantId: task.id,
            score: output.score,
            alignedBlob: output.blob,
            alignedObjectUrl: URL.createObjectURL(output.blob),
            status: "succeeded",
          });
        } catch (exception) {
          setAlignmentResult({
            variantId: task.id,
            score: 0,
            status: "failed",
            error: String(exception),
          });
        }
      }
    } finally {
      setRunning(false);
    }
  };

  const applyNudge = async () => {
    const target = succeeded.find((item) => item.id === nudgeTargetId);
    if (!target?.result?.blob) {
      return;
    }
    const current = alignmentResults[nudgeTargetId];
    const sourceBlob = current?.alignedBlob ?? target.result.blob;
    const nudged = await nudgeBlob(sourceBlob, offsetX, offsetY);
    setAlignmentResult({
      variantId: nudgeTargetId,
      status: "succeeded",
      score: current?.score ?? 0.5,
      alignedBlob: nudged,
      alignedObjectUrl: URL.createObjectURL(nudged),
    });
  };

  return (
    <SectionCard title={t("results.align")} subtitle={t("results.alignDesc")}>
      <Stack spacing={2}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <FormControl fullWidth>
              <InputLabel>{t("results.baseSelect")}</InputLabel>
              <Select
                value={referenceId}
                label={t("results.baseSelect")}
                onChange={(event) => setReferenceId(event.target.value)}
              >
                {succeeded.map((task) => (
                  <MenuItem key={task.id} value={task.id}>
                    {task.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Button
              fullWidth
              variant="contained"
              startIcon={<AlignHorizontalCenterRoundedIcon />}
              onClick={() => void runAlign()}
              disabled={!succeeded.length || running}
            >
              {running ? t("common.loading") : t("results.align")}
            </Button>
          </Grid>
        </Grid>

        <Box sx={{ p: 2, borderRadius: 2, border: "1px solid rgba(120,140,150,0.2)" }}>
          <Stack spacing={2}>
            <Stack direction="row" spacing={1} alignItems="center">
              <TuneRoundedIcon />
              <Typography variant="subtitle2">{t("results.manualNudge")}</Typography>
            </Stack>
            <FormControl fullWidth>
              <InputLabel>Target</InputLabel>
              <Select
                value={nudgeTargetId}
                label="Target"
                onChange={(event) => setNudgeTargetId(event.target.value)}
              >
                {succeeded.map((task) => (
                  <MenuItem key={task.id} value={task.id}>
                    {task.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Typography variant="caption">X Offset</Typography>
            <Slider
              value={offsetX}
              min={-80}
              max={80}
              onChange={(_, value) => setOffsetX(Number(value))}
            />
            <Typography variant="caption">Y Offset</Typography>
            <Slider
              value={offsetY}
              min={-80}
              max={80}
              onChange={(_, value) => setOffsetY(Number(value))}
            />
            <Button variant="outlined" onClick={() => void applyNudge()} disabled={!nudgeTargetId}>
              Apply nudge
            </Button>
          </Stack>
        </Box>

        {error ? <Alert severity="error">{error}</Alert> : null}
      </Stack>
    </SectionCard>
  );
};
