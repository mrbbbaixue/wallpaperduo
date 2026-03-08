import {
  Box,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import { useTranslation } from "react-i18next";

import type { TimeVariant } from "@/types/domain";

const timeSlots: { key: TimeVariant; labelZh: string; labelEn: string; color: string }[] = [
  { key: "dawn", labelZh: "晨", labelEn: "Dawn", color: "#ff9800" },
  { key: "day", labelZh: "昼", labelEn: "Day", color: "#2196f3" },
  { key: "dusk", labelZh: "昏", labelEn: "Dusk", color: "#e91e63" },
  { key: "night", labelZh: "夜", labelEn: "Night", color: "#3f51b5" },
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

  return (
    <Stack spacing={2}>
      {/* Current Time of Day */}
      <Stack spacing={1}>
        <Typography variant="subtitle2">
          {isZh ? "当前时段" : "Current Time of Day"}
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
                  textAlign: "center",
                  cursor: "pointer",
                  bgcolor: isActive ? slot.color : "action.hover",
                  color: isActive ? "white" : "text.secondary",
                  "&:first-of-type": { borderRadius: "8px 0 0 8px" },
                  "&:last-of-type": { borderRadius: "0 8px 8px 0" },
                  transition: "all 0.2s",
                  fontWeight: isActive ? 700 : 400,
                  fontSize: "0.8rem",
                  "&:hover": { opacity: 0.85 },
                }}
              >
                {getLabel(slot)}
              </Box>
            );
          })}
        </Stack>

        {/* Dropdown fallback */}
        <FormControl size="small" sx={{ maxWidth: 200 }}>
          <InputLabel>{isZh ? "AI 判断" : "AI Detected"}</InputLabel>
          <Select
            value={currentTimeOfDay ?? ""}
            label={isZh ? "AI 判断" : "AI Detected"}
            onChange={(e) => onCurrentTimeChange(e.target.value as TimeVariant)}
          >
            {timeSlots.map((slot) => (
              <MenuItem key={slot.key} value={slot.key}>
                {getLabel(slot)}
                {detectedTimeOfDay === slot.key && " (AI)"}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      {/* Target Slots to Generate */}
      <Stack spacing={1}>
        <Typography variant="subtitle2">
          {isZh ? "要生成的版本（可多选）" : "Versions to Generate (multi-select)"}
        </Typography>
        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
          {timeSlots.map((slot) => {
            const isSelected = selectedSlots.includes(slot.key);
            const isCurrent = currentTimeOfDay === slot.key;
            return (
              <Chip
                key={slot.key}
                label={`${getLabel(slot)}${isCurrent ? (isZh ? " (当前)" : " (current)") : ""}`}
                onClick={() => toggleSlot(slot.key)}
                variant={isSelected ? "filled" : "outlined"}
                color={isSelected ? "primary" : "default"}
                sx={{
                  borderColor: isSelected ? undefined : slot.color,
                  fontWeight: isSelected ? 600 : 400,
                }}
              />
            );
          })}
        </Stack>
      </Stack>
    </Stack>
  );
};
