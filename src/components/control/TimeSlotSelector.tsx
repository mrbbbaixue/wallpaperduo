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
  locked?: boolean;
}

export const TimeSlotSelector = ({
  currentTimeOfDay,
  selectedSlots,
  onCurrentTimeChange,
  onSelectedSlotsChange,
  locked = false,
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

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h4 className="text-sm font-semibold">
          {isZh ? "参考图所处时段" : "Reference time"}
        </h4>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {timeSlots.map((slot) => {
            const active = currentTimeOfDay === slot.key;
            return (
              <button
                key={slot.key}
                type="button"
                disabled={locked}
                onClick={() => onCurrentTimeChange(slot.key)}
                className={cn(
                  "rounded-md border px-3 py-2.5 text-sm font-medium transition-all disabled:cursor-not-allowed disabled:opacity-55",
                  active
                    ? "border-transparent text-white"
                    : "border-border/70 bg-background/65 text-foreground hover:bg-accent/70",
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
          {isZh ? "要生成的版本" : "Generate variants"}
        </h4>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {timeSlots.map((slot) => {
            const selected = selectedSlots.includes(slot.key);
            return (
              <button
                key={slot.key}
                type="button"
                disabled={locked}
                onClick={() => toggleSlot(slot.key)}
                className={cn(
                  "rounded-md border px-3 py-2.5 text-sm font-medium transition-all disabled:cursor-not-allowed disabled:opacity-55",
                  selected
                    ? "border-transparent text-white"
                    : "border-border/70 bg-background/65 text-foreground hover:bg-accent/70",
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
