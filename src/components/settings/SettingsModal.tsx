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
        className="flex h-[min(88vh,760px)] max-h-[92vh] max-w-5xl flex-col gap-0 overflow-hidden rounded-lg border-border/70 bg-background/95 p-0 backdrop-blur sm:rounded-lg"
      >
        <DialogHeader className="border-b border-border/70 px-5 py-4 md:px-6">
          <DialogTitle>{t("settings.title")}</DialogTitle>
          <DialogDescription>{t("settings.dialogSubtitle")}</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-hidden">
          <ProviderSettingsPanel onClose={onClose} />
        </div>
      </DialogContent>
    </Dialog>
  );
};
