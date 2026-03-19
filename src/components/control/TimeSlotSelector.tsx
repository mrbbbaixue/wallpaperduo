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
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="space-y-1">
            <h4 className="text-sm font-semibold">
              {isZh ? "参考图所处时段" : "Reference time of day"}
            </h4>
            <p className="text-xs text-muted-foreground">
              {isZh
                ? "先确定参考图时段，再勾选你想生成的目标版本。"
                : "Confirm the source time first, then choose the target variants."}
            </p>
          </div>
          <span className="rounded-full border border-border/70 bg-background/65 px-2.5 py-1 text-[11px] text-muted-foreground">
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
                  "rounded-lg border px-3 py-2.5 text-sm font-medium transition-all",
                  active
                    ? "border-transparent text-white shadow-md"
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
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-sm font-semibold">
            {isZh ? "要生成的时段版本" : "Time variants to generate"}
          </h4>
          <span className="text-xs text-muted-foreground">
            {isZh ? `已选 ${selectedSlots.length} 个版本` : `${selectedSlots.length} selected`}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {timeSlots.map((slot) => {
            const selected = selectedSlots.includes(slot.key);
            return (
              <button
                key={slot.key}
                type="button"
                onClick={() => toggleSlot(slot.key)}
                className={cn(
                  "rounded-lg border px-3 py-2.5 text-sm font-medium transition-all",
                  selected
                    ? "border-transparent text-white shadow-md"
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
