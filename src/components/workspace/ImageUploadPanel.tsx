import UploadRoundedIcon from "@mui/icons-material/UploadRounded";
import { Alert, Box, Button, Stack, Typography } from "@mui/material";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { SectionCard } from "@/components/common/SectionCard";
import { buildLoadedImage, useWorkflowStore } from "@/store/useWorkflowStore";
import { getImageSize, readFileAsBlob } from "@/utils/image";

export const ImageUploadPanel = () => {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const setSourceImage = useWorkflowStore((state) => state.setSourceImage);
  const sourceImage = useWorkflowStore((state) => state.sourceImage);
  const [error, setError] = useState<string>("");

  const onFile = async (file?: File) => {
    if (!file) {
      return;
    }

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
      setError("Unsupported image file");
    }
  };

  return (
    <SectionCard title={t("workspace.uploadTitle")} subtitle={t("workspace.uploadHint")}>
      <Stack spacing={2}>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          style={{ display: "none" }}
          onChange={(event) => void onFile(event.currentTarget.files?.[0])}
        />
        <Button
          variant="contained"
          startIcon={<UploadRoundedIcon />}
          onClick={() => inputRef.current?.click()}
          sx={{ width: "fit-content" }}
        >
          Upload
        </Button>
        {error ? <Alert severity="error">{error}</Alert> : null}
        {sourceImage ? (
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={2}
            alignItems={{ xs: "flex-start", md: "center" }}
          >
            <Box
              component="img"
              src={sourceImage.objectUrl}
              alt="source"
              sx={{
                width: { xs: "100%", md: 340 },
                borderRadius: 3,
                border: "1px solid rgba(120,140,150,0.4)",
              }}
            />
            <Typography variant="body2" color="text.secondary">
              {sourceImage.name} · {sourceImage.width}x{sourceImage.height}
            </Typography>
          </Stack>
        ) : null}
      </Stack>
    </SectionCard>
  );
};
