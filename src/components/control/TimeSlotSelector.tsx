import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";
import type { TimeVariant } from "@/types/domain";

const timeSlots: { key: TimeVariant; labelZh: string; labelEn: string; color: string }[] = [
  { key: "dawn", labelZh: "晨", labelEn: "Dawn", color: "#b46a21" },
  { key: "day", labelZh: "昼", labelEn: "Day", color: "#2b68a3" },
  { key: "dusk", labelZh: "昏", labelEn: "Dusk", color: "#8b4761" },
  { key: "night", labelZh: "夜", labelEn: "Night", color: "#33458c" },
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
      return;
    }
    onSelectedSlotsChange([...selectedSlots, slot]);
  };

  const getLabel = (slot: (typeof timeSlots)[number]) => (isZh ? slot.labelZh : slot.labelEn);
  const detectedSlot = timeSlots.find((slot) => slot.key === detectedTimeOfDay);

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-sm font-semibold">
            {isZh ? "参考图所处时段" : "Reference time of day"}
          </h4>
          <span className="text-xs text-muted-foreground">
            {isZh ? "AI 判断" : "AI detected"}:{" "}
            {detectedSlot ? getLabel(detectedSlot) : isZh ? "未识别" : "N/A"}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {timeSlots.map((slot) => {
            const active = currentTimeOfDay === slot.key;
            return (
              <button
                key={slot.key}
                type="button"
                onClick={() => onCurrentTimeChange(slot.key)}
                className={cn(
                  "rounded-lg border px-3 py-2 text-sm font-medium transition-all",
                  active
                    ? "border-transparent text-white shadow-md"
                    : "border-border bg-background text-foreground hover:bg-accent",
                )}
                aria-pressed={active}
                style={active ? { backgroundColor: slot.color } : undefined}
              >
                {getLabel(slot)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="text-sm font-semibold">
          {isZh ? "要生成的时段版本" : "Time variants to generate"}
        </h4>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {timeSlots.map((slot) => {
            const selected = selectedSlots.includes(slot.key);
            return (
              <button
                key={slot.key}
                type="button"
                onClick={() => toggleSlot(slot.key)}
                className={cn(
                  "rounded-lg border px-3 py-2 text-sm font-medium transition-all",
                  selected
                    ? "border-transparent text-white shadow-md"
                    : "border-border bg-background text-foreground hover:bg-accent",
                )}
                aria-pressed={selected}
                style={selected ? { backgroundColor: slot.color } : undefined}
              >
                {getLabel(slot)}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
