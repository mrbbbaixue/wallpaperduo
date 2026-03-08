import UploadRoundedIcon from "@mui/icons-material/UploadRounded";
import { Alert, Box, Button, Stack, Typography } from "@mui/material";
import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { SectionCard } from "@/components/common/SectionCard";
import { CanvasControls } from "@/components/canvas/CanvasControls";
import { buildLoadedImage, useWorkflowStore } from "@/store/useWorkflowStore";
import { getImageSize, readFileAsBlob } from "@/utils/image";
import type { TimeVariant } from "@/types/domain";

const checkerboardBg = `
  repeating-conic-gradient(
    rgba(128,128,128,0.15) 0% 25%,
    transparent 0% 50%
  ) 50% / 20px 20px
`;

export const CanvasWorkspace = () => {
  const { t, i18n } = useTranslation();
  const isZh = i18n.language === "zh";
  const inputRef = useRef<HTMLInputElement>(null);
  const sourceImage = useWorkflowStore((s) => s.sourceImage);
  const preparedImage = useWorkflowStore((s) => s.preparedImage);
  const setSourceImage = useWorkflowStore((s) => s.setSourceImage);
  const tasks = useWorkflowStore((s) => s.tasks);
  const [error, setError] = useState("");
  const [previewSlot, setPreviewSlot] = useState<TimeVariant | "source">("source");
  const [isDragging, setIsDragging] = useState(false);

  const succeededTasks = tasks.filter((t) => t.status === "succeeded" && t.result);

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
        setPreviewSlot("source");
      } catch {
        setError("INVALID_IMAGE");
      }
    },
    [setSourceImage],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("image/")) {
        void onFile(file);
      }
    },
    [onFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Determine what image to show
  const previewUrl = (() => {
    if (previewSlot !== "source" && succeededTasks.length > 0) {
      const match = succeededTasks.find((task) => task.timeOfDay === previewSlot);
      if (match?.result?.objectUrl) return match.result.objectUrl;
    }
    if (preparedImage) return preparedImage.objectUrl;
    if (sourceImage) return sourceImage.objectUrl;
    return null;
  })();

  return (
    <SectionCard
      title={t("workspace.uploadTitle")}
      subtitle={isZh ? "主画布采用 3:1 展板比例，优先保证构图完整。" : "Primary board uses a 3:1 ratio to preserve composition."}
      actions={
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            style={{ display: "none" }}
            onChange={(e) => void onFile(e.currentTarget.files?.[0])}
          />
          <Button
            variant="contained"
            size="small"
            startIcon={<UploadRoundedIcon />}
            onClick={() => inputRef.current?.click()}
            sx={{ minWidth: 116 }}
          >
            {t("common.upload")}
          </Button>
        </>
      }
    >
      <Stack spacing={2}>
        {/* Canvas Area */}
        <Box
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          sx={{
            position: "relative",
            width: "100%",
            aspectRatio: "3 / 1",
            minHeight: { xs: 230, md: 350 },
            borderRadius: 2.25,
            border: isDragging ? "2px dashed" : "1px solid",
            borderColor: isDragging ? "primary.main" : "divider",
            background: checkerboardBg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            isolation: "isolate",
            backdropFilter: "blur(10px)",
            transition: "border-color 0.2s, box-shadow 0.2s, transform 0.2s",
            boxShadow: isDragging
              ? "0 0 0 1px rgba(88, 189, 208, 0.35), 0 24px 60px rgba(88, 189, 208, 0.22)"
              : "0 20px 56px rgba(16, 24, 29, 0.22)",
            "&::after": {
              content: '""',
              position: "absolute",
              inset: "10% 8% auto 8%",
              height: "52%",
              background:
                "radial-gradient(circle at 24% 36%, rgba(64, 131, 152, 0.28), transparent 54%), radial-gradient(circle at 72% 28%, rgba(178, 126, 74, 0.24), transparent 50%)",
              filter: "blur(30px)",
              pointerEvents: "none",
            },
            "&::before": {
              content: '""',
              position: "absolute",
              inset: 0,
              borderRadius: "inherit",
              border: "1px solid rgba(255,255,255,0.16)",
              mixBlendMode: "overlay",
              pointerEvents: "none",
              zIndex: 1,
            },
          }}
        >
          {previewUrl ? (
            <Box
              component="img"
              src={previewUrl}
              alt="canvas preview"
              sx={{
                maxWidth: "100%",
                maxHeight: "100%",
                objectFit: "contain",
                position: "relative",
                zIndex: 2,
              }}
            />
          ) : (
            <Stack
              alignItems="center"
              spacing={1}
              sx={{ py: 6, position: "relative", zIndex: 2 }}
            >
              <UploadRoundedIcon sx={{ fontSize: 48, color: "text.disabled" }} />
              <Typography variant="body2" color="text.secondary">
                {t("workspace.uploadHint")}
              </Typography>
            </Stack>
          )}
        </Box>

        {/* Source image info */}
        {sourceImage && (
          <Typography variant="caption" color="text.secondary">
            {sourceImage.name} · {sourceImage.width}x{sourceImage.height}
          </Typography>
        )}

        {/* Time slot preview tabs (only when there are generated results) */}
        {succeededTasks.length > 0 && (
          <Stack direction="row" spacing={0.75} flexWrap="wrap">
            <Button
              size="small"
              variant={previewSlot === "source" ? "contained" : "outlined"}
              onClick={() => setPreviewSlot("source")}
            >
              {t("results.baseSelect")}
            </Button>
            {succeededTasks.map((task) => (
              <Button
                key={task.id}
                size="small"
                variant={previewSlot === task.timeOfDay ? "contained" : "outlined"}
                onClick={() => setPreviewSlot(task.timeOfDay)}
              >
                {task.label}
              </Button>
            ))}
          </Stack>
        )}

        {error && <Alert severity="error">{t(`errors.${error}`, error)}</Alert>}

        {/* Canvas Controls */}
        {sourceImage && <CanvasControls />}
      </Stack>
    </SectionCard>
  );
};
