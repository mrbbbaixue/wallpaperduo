import CompareArrowsRoundedIcon from "@mui/icons-material/CompareArrowsRounded";
import ImageRoundedIcon from "@mui/icons-material/ImageRounded";
import UploadRoundedIcon from "@mui/icons-material/UploadRounded";
import {
  Alert,
  Box,
  Button,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { CanvasGalleryStrip } from "@/components/canvas/CanvasGalleryStrip";
import { buildLoadedImage, useWorkflowStore } from "@/store/useWorkflowStore";
import { getImageSize, readFileAsBlob } from "@/utils/image";

const checkerboardBg = `
  repeating-conic-gradient(
    rgba(128,128,128,0.15) 0% 25%,
    transparent 0% 50%
  ) 50% / 20px 20px
`;

export const CanvasWorkspace = () => {
  const { t, i18n } = useTranslation();
  const isZh = i18n.language === "zh";
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const sourceImage = useWorkflowStore((s) => s.sourceImage);
  const preparedImage = useWorkflowStore((s) => s.preparedImage);
  const setSourceImage = useWorkflowStore((s) => s.setSourceImage);
  const tasks = useWorkflowStore((s) => s.tasks);
  const activeResultId = useWorkflowStore((s) => s.activeResultId);
  const setActiveResultId = useWorkflowStore((s) => s.setActiveResultId);
  const previewMode = useWorkflowStore((s) => s.previewMode);
  const setPreviewMode = useWorkflowStore((s) => s.setPreviewMode);

  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isGalleryExpanded, setIsGalleryExpanded] = useState(true);
  const previousSucceededCountRef = useRef(0);

  const succeededTasks = useMemo(
    () => tasks.filter((task) => task.status === "succeeded" && task.result?.blob),
    [tasks],
  );
  const hasResults = succeededTasks.length > 0;
  const activeTask = activeResultId
    ? succeededTasks.find((task) => task.id === activeResultId)
    : undefined;

  useEffect(() => {
    if (succeededTasks.length === 0) {
      if (activeResultId) setActiveResultId(undefined);
      if (previewMode !== "single") setPreviewMode("single");
      previousSucceededCountRef.current = 0;
      return;
    }

    const hasActive = activeResultId
      ? succeededTasks.some((task) => task.id === activeResultId)
      : false;
    const hadResultsBefore = previousSucceededCountRef.current > 0;

    if (!activeResultId && !hadResultsBefore) {
      setActiveResultId(succeededTasks[0].id);
      previousSucceededCountRef.current = succeededTasks.length;
      return;
    }

    if (activeResultId && !hasActive) {
      setActiveResultId(succeededTasks[0].id);
    }
    previousSucceededCountRef.current = succeededTasks.length;
  }, [
    activeResultId,
    previewMode,
    setActiveResultId,
    setPreviewMode,
    succeededTasks,
  ]);

  const onFile = useCallback(
    async (file?: File) => {
      if (!file) return;
      try {
        const blob = await readFileAsBlob(file);
        const size = await getImageSize(blob);
        const loaded = buildLoadedImage({
          name: file.name,
          mimeType: blob.type || "image/png",
          blob,
          width: size.width,
          height: size.height,
          objectUrl: URL.createObjectURL(blob),
        });
        setError("");
        setSourceImage(loaded);
      } catch {
        setError("INVALID_IMAGE");
      }
    },
    [setSourceImage],
  );

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      setIsDragging(false);
      const file = event.dataTransfer.files[0];
      if (file && file.type.startsWith("image/")) {
        void onFile(file);
      }
    },
    [onFile],
  );

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const basePreviewUrl = preparedImage?.objectUrl ?? sourceImage?.objectUrl ?? null;
  const resultPreviewUrl = activeTask?.result?.objectUrl ?? null;
  const previewUrl = resultPreviewUrl ?? basePreviewUrl;
  const compareReady = previewMode === "compare" && !!basePreviewUrl && !!resultPreviewUrl;

  return (
    <Box sx={{ minWidth: 0 }}>
      <Stack spacing={1.5}>
        {hasResults ? (
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Button
              size="small"
              variant={activeResultId ? "outlined" : "contained"}
              onClick={() => setActiveResultId(undefined)}
              sx={{ borderRadius: 0 }}
            >
              {t("results.baseSelect")}
            </Button>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={previewMode}
              onChange={(_, next: "single" | "compare" | null) => {
                if (next) setPreviewMode(next);
              }}
            >
              <ToggleButton value="single" sx={{ borderRadius: 0 }}>
                <ImageRoundedIcon sx={{ mr: 0.5, fontSize: 16 }} />
                {t("results.singleMode")}
              </ToggleButton>
              <ToggleButton value="compare" sx={{ borderRadius: 0 }}>
                <CompareArrowsRoundedIcon sx={{ mr: 0.5, fontSize: 16 }} />
                {t("results.compareMode")}
              </ToggleButton>
            </ToggleButtonGroup>
            <Typography variant="caption" color="text.secondary">
              {activeTask
                ? isZh
                  ? `当前结果：${activeTask.label}`
                  : `Current result: ${activeTask.label}`
                : isZh
                  ? "当前预览：基准图"
                  : "Current preview: baseline"}
            </Typography>
          </Stack>
        ) : null}

        <Box
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          sx={{
            position: "relative",
            width: "100%",
            aspectRatio: "3 / 1",
            minHeight: {
              xs: 230,
              // Keep the canvas stage near full viewport height on desktop by default.
              md: "clamp(520px, calc(100vh - 190px), 920px)",
            },
            borderRadius: 0,
            border: 0,
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(0,0,0,0.02)), " +
              checkerboardBg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            isolation: "isolate",
            transition: "outline-color 0.2s, box-shadow 0.2s",
            outline: isDragging ? "2px dashed" : "none",
            outlineColor: "primary.main",
            outlineOffset: -2,
            boxShadow: isDragging
              ? "0 0 0 1px rgba(88, 189, 208, 0.35), 0 20px 48px rgba(88, 189, 208, 0.22)"
              : "none",
          }}
        >
          {compareReady ? (
            <Box
              sx={{
                width: "100%",
                height: "100%",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
              }}
            >
              <Stack spacing={0.5} sx={{ p: 1, borderRight: "1px solid", borderColor: "divider" }}>
                <Typography variant="caption" fontWeight={600} color="text.secondary">
                  {isZh ? "基准图" : "Baseline"}
                </Typography>
                <Box
                  component="img"
                  src={basePreviewUrl ?? ""}
                  alt="base preview"
                  sx={{ width: "100%", height: "100%", objectFit: "contain" }}
                />
              </Stack>
              <Stack spacing={0.5} sx={{ p: 1 }}>
                <Typography variant="caption" fontWeight={600} color="text.secondary">
                  {isZh ? "当前结果" : "Current result"}
                </Typography>
                <Box
                  component="img"
                  src={resultPreviewUrl ?? ""}
                  alt={activeTask?.label ?? "result preview"}
                  sx={{ width: "100%", height: "100%", objectFit: "contain" }}
                />
              </Stack>
            </Box>
          ) : previewUrl ? (
            <Box
              component="img"
              src={previewUrl}
              alt="canvas preview"
              sx={{
                maxWidth: "100%",
                maxHeight: "100%",
                objectFit: "contain",
              }}
            />
          ) : (
            <Stack alignItems="center" spacing={1} sx={{ py: 6 }}>
              <UploadRoundedIcon sx={{ fontSize: 48, color: "text.disabled" }} />
              <Typography variant="body2" color="text.secondary">
                {t("workspace.uploadHint")}
              </Typography>
            </Stack>
          )}
        </Box>

        {!isMobile ? (
          <CanvasGalleryStrip
            expanded={isGalleryExpanded}
            onToggleExpanded={() => setIsGalleryExpanded((expanded) => !expanded)}
          />
        ) : null}

        {error ? <Alert severity="error">{t(`errors.${error}`, error)}</Alert> : null}
      </Stack>
    </Box>
  );
};
