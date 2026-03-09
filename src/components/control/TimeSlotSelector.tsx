import {
  Box,
  Stack,
  Typography,
} from "@mui/material";
import { useTranslation } from "react-i18next";

import type { TimeVariant } from "@/types/domain";

const timeSlots: { key: TimeVariant; labelZh: string; labelEn: string; color: string }[] = [
  { key: "dawn", labelZh: "晨", labelEn: "Dawn", color: "#9d5f16" },
  { key: "day", labelZh: "昼", labelEn: "Day", color: "#245b97" },
  { key: "dusk", labelZh: "昏", labelEn: "Dusk", color: "#7f2f52" },
  { key: "night", labelZh: "夜", labelEn: "Night", color: "#2e3f86" },
];

interface TimeSlotSelectorProps {
  currentTimeOfDay: TimeVariant | null;
  detectedTimeOfDay: TimeVariant | null;
  selectedSlots: TimeVariant[];
  onCurrentTimeChange: (time: TimeVariant) => void;
  onSelectedSlotsChange: (slots: TimeVariant[]) => void;
}

export const TimeSlotSelector = ({
  currentTimeOfDay,
  detectedTimeOfDay,
  selectedSlots,
  onCurrentTimeChange,
  onSelectedSlotsChange,
}: TimeSlotSelectorProps) => {
  const { i18n } = useTranslation();
  const isZh = i18n.language === "zh";

  const toggleSlot = (slot: TimeVariant) => {
    if (selectedSlots.includes(slot)) {
      onSelectedSlotsChange(selectedSlots.filter((s) => s !== slot));
    } else {
      onSelectedSlotsChange([...selectedSlots, slot]);
    }
  };

  const getLabel = (slot: typeof timeSlots[number]) => (isZh ? slot.labelZh : slot.labelEn);
  const detectedSlot = timeSlots.find((slot) => slot.key === detectedTimeOfDay);
  const detectedLabel = detectedSlot ? getLabel(detectedSlot) : isZh ? "未识别" : "N/A";

  return (
    <Stack spacing={2}>
      {/* Current Time of Day */}
      <Stack spacing={1}>
        <Typography variant="subtitle2">
          {isZh ? "参考图所处时段" : "Reference Time of Day"}
        </Typography>

        {/* Timeline progress bar */}
        <Stack direction="row" spacing={0} sx={{ width: "100%" }}>
          {timeSlots.map((slot) => {
            const isActive = currentTimeOfDay === slot.key;
            return (
              <Box
                key={slot.key}
                onClick={() => onCurrentTimeChange(slot.key)}
                sx={{
                  flex: 1,
                  py: 0.8,
                  border: "1px solid",
                  borderColor: isActive ? slot.color : "divider",
                  textAlign: "center",
                  cursor: "pointer",
                  bgcolor: isActive ? slot.color : "action.selected",
                  color: isActive ? "#ffffff" : "text.primary",
                  "&:first-of-type": { borderRadius: "6px 0 0 6px" },
                  "&:last-of-type": { borderRadius: "0 6px 6px 0" },
                  transition: "all 0.2s",
                  fontWeight: isActive ? 700 : 400,
                  fontSize: "0.8rem",
                  "&:hover": { opacity: 0.9 },
                }}
              >
                {getLabel(slot)}
              </Box>
            );
          })}
        </Stack>

        <Typography variant="caption" color="text.secondary">
          {isZh ? `AI判断：${detectedLabel}` : `AI detected: ${detectedLabel}`}
        </Typography>
      </Stack>

      {/* Target Slots to Generate */}
      <Stack spacing={1}>
        <Typography variant="subtitle2">
          {isZh ? "要生成的版本（可多选）" : "Versions to Generate (multi-select)"}
        </Typography>
        <Stack direction="row" spacing={0} sx={{ width: "100%" }}>
          {timeSlots.map((slot) => {
            const isSelected = selectedSlots.includes(slot.key);
            return (
              <Box
                key={slot.key}
                onClick={() => toggleSlot(slot.key)}
                sx={{
                  flex: 1,
                  py: 0.8,
                  border: "1px solid",
                  borderColor: isSelected ? slot.color : "divider",
                  textAlign: "center",
                  cursor: "pointer",
                  bgcolor: isSelected ? slot.color : "action.selected",
                  color: isSelected ? "#ffffff" : "text.primary",
                  "&:first-of-type": { borderRadius: "6px 0 0 6px" },
                  "&:last-of-type": { borderRadius: "0 6px 6px 0" },
                  transition: "all 0.2s",
                  fontWeight: isSelected ? 700 : 500,
                  fontSize: "0.8rem",
                  "&:hover": { opacity: 0.9 },
                }}
              >
                {getLabel(slot)}
              </Box>
            );
          })}
        </Stack>
      </Stack>
    </Stack>
  );
};
