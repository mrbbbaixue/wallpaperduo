import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
} from "@mui/material";
import { useTranslation } from "react-i18next";

import { ProviderSettingsPanel } from "./ProviderSettingsPanel";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export const SettingsModal = ({ open, onClose }: SettingsModalProps) => {
  const { t } = useTranslation();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          maxHeight: "92vh",
          backdropFilter: "blur(20px)",
          borderRadius: 2.5,
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          pb: 1,
        }}
      >
        {t("settings.dialogTitle")}
        <IconButton onClick={onClose} edge="end" aria-label="close">
          <CloseRoundedIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ p: { xs: 1.25, md: 1.75 } }}>
        <ProviderSettingsPanel />
      </DialogContent>
    </Dialog>
  );
};
