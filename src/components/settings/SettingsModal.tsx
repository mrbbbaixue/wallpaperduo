import { useTranslation } from "react-i18next";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProviderSettingsPanel } from "./ProviderSettingsPanel";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export const SettingsModal = ({ open, onClose }: SettingsModalProps) => {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={(nextOpen: boolean) => !nextOpen && onClose()}>
      <DialogContent
        motionPreset="center"
        className="flex max-h-[92vh] max-w-4xl flex-col gap-0 overflow-hidden border-border/70 bg-background/95 p-0 backdrop-blur"
      >
        <DialogHeader className="border-b border-border/70 px-5 py-4 md:px-6">
          <DialogTitle>{t("settings.dialogTitle")}</DialogTitle>
          <DialogDescription>{t("settings.securityTip")}</DialogDescription>
        </DialogHeader>
        <div className="ui-scrollbar min-h-0 flex-1 overflow-y-auto px-5 py-5 md:px-6 md:py-6">
          <ProviderSettingsPanel />
        </div>
      </DialogContent>
    </Dialog>
  );
};
