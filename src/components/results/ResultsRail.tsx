import CompareArrowsRoundedIcon from "@mui/icons-material/CompareArrowsRounded";
import ImageRoundedIcon from "@mui/icons-material/ImageRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import { Box, Button, ButtonBase, Chip, Stack, Typography } from "@mui/material";
import { useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";

import { SectionCard } from "@/components/common/SectionCard";
import { useWorkflowStore } from "@/store/useWorkflowStore";

interface ResultsRailProps {
  inSheet?: boolean;
}

export const ResultsRail = ({ inSheet = false }: ResultsRailProps) => {
  const { t, i18n } = useTranslation();
  const isZh = i18n.language === "zh";

  const tasks = useWorkflowStore((s) => s.tasks);
  const activeResultId = useWorkflowStore((s) => s.activeResultId);
  const previewMode = useWorkflowStore((s) => s.previewMode);
  const setActiveResultId = useWorkflowStore((s) => s.setActiveResultId);
  const setPreviewMode = useWorkflowStore((s) => s.setPreviewMode);

  const succeeded = useMemo(
    () => tasks.filter((task) => task.status === "succeeded" && task.result?.blob),
    [tasks],
  );

  const activeIndex = useMemo(
    () => succeeded.findIndex((task) => task.id === activeResultId),
    [activeResultId, succeeded],
  );

  const railRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const previousCountRef = useRef(0);

  useEffect(() => {
    if (succeeded.length === 0) {
      if (activeResultId) setActiveResultId(undefined);
      if (previewMode !== "single") setPreviewMode("single");
      previousCountRef.current = 0;
      return;
    }

    const hasActive = activeResultId
      ? succeeded.some((task) => task.id === activeResultId)
      : false;

    if (!hasActive) {
      setActiveResultId(succeeded[0].id);
    }

    if (succeeded.length > previousCountRef.current) {
      const firstId = succeeded[0].id;
      window.setTimeout(() => {
        if (!inSheet) {
          railRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
        cardRefs.current[firstId]?.focus();
      }, 40);
    }

    previousCountRef.current = succeeded.length;
  }, [
    activeResultId,
    inSheet,
    previewMode,
    setActiveResultId,
    setPreviewMode,
    succeeded,
  ]);

  if (succeeded.length === 0) return null;

  const selectAt = (nextIndex: number) => {
    const wrapped = (nextIndex + succeeded.length) % succeeded.length;
    const nextTask = succeeded[wrapped];
    if (!nextTask) return;
    setActiveResultId(nextTask.id);
    cardRefs.current[nextTask.id]?.focus();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      selectAt((activeIndex < 0 ? 0 : activeIndex) + 1);
      return;
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      selectAt((activeIndex < 0 ? 0 : activeIndex) - 1);
      return;
    }
    if (event.key === "Home") {
      event.preventDefault();
      selectAt(0);
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      selectAt(succeeded.length - 1);
      return;
    }
  };

  return (
    <Box ref={railRef}>
      <SectionCard
        title={isZh ? "结果胶片" : "Results Rail"}
        subtitle={
          isZh
            ? "左右方向键切换结果，点击可回填主画布预览。"
            : "Use Left/Right keys to switch results and click to update canvas preview."
        }
        actions={
          <Stack direction="row" spacing={0.75} alignItems="center" useFlexGap flexWrap="wrap">
            <Button
              size="small"
              variant={activeResultId ? "outlined" : "contained"}
              startIcon={<RestartAltRoundedIcon />}
              onClick={() => setActiveResultId(undefined)}
            >
              {t("results.baseSelect")}
            </Button>
            <Button
              size="small"
              variant={previewMode === "single" ? "contained" : "outlined"}
              startIcon={<ImageRoundedIcon />}
              onClick={() => setPreviewMode("single")}
              disabled={!activeResultId}
            >
              {t("results.singleMode")}
            </Button>
            <Button
              size="small"
              variant={previewMode === "compare" ? "contained" : "outlined"}
              startIcon={<CompareArrowsRoundedIcon />}
              onClick={() => setPreviewMode("compare")}
              disabled={!activeResultId}
            >
              {t("results.compareMode")}
            </Button>
            <Chip
              size="small"
              label={isZh ? `${succeeded.length} 张结果` : `${succeeded.length} results`}
            />
          </Stack>
        }
      >
        <Box
          role="listbox"
          aria-label={isZh ? "结果胶片" : "Results rail"}
          aria-activedescendant={activeResultId ? `result-option-${activeResultId}` : undefined}
          tabIndex={0}
          onKeyDown={handleKeyDown}
          sx={{
            display: "flex",
            gap: 1,
            overflowX: "auto",
            pb: 0.5,
            outline: "none",
            "&::-webkit-scrollbar": { height: 7 },
            "&::-webkit-scrollbar-thumb": {
              borderRadius: 999,
              backgroundColor: "action.hover",
            },
          }}
        >
          {succeeded.map((task) => {
            const selected = task.id === activeResultId;
            return (
              <ButtonBase
                key={task.id}
                id={`result-option-${task.id}`}
                ref={(node) => {
                  cardRefs.current[task.id] = node;
                }}
                role="option"
                aria-selected={selected}
                onClick={() => setActiveResultId(task.id)}
                sx={{
                  width: 198,
                  flexShrink: 0,
                  p: 0.75,
                  borderRadius: 2,
                  textAlign: "left",
                  border: "1px solid",
                  borderColor: selected ? "primary.main" : "divider",
                  backgroundColor: selected ? "action.selected" : "background.paper",
                  boxShadow: selected
                    ? "0 12px 30px rgba(42, 92, 104, 0.24)"
                    : "0 6px 18px rgba(17, 24, 39, 0.12)",
                  transition: "all 0.18s ease",
                  "&:focus-visible": {
                    outline: "2px solid",
                    outlineColor: "primary.main",
                    outlineOffset: 2,
                  },
                }}
              >
                <Stack spacing={0.75} sx={{ width: "100%" }}>
                  <Box
                    component="img"
                    src={task.result?.objectUrl}
                    alt={task.label}
                    sx={{
                      width: "100%",
                      aspectRatio: "4 / 3",
                      borderRadius: 1.5,
                      objectFit: "cover",
                      border: "1px solid",
                      borderColor: "divider",
                    }}
                  />
                  <Stack direction="row" justifyContent="space-between" alignItems="center" gap={0.75}>
                    <Typography variant="caption" fontWeight={700} noWrap>
                      {task.label}
                    </Typography>
                    {selected ? (
                      <Chip size="small" label={isZh ? "当前" : "Selected"} color="primary" />
                    ) : null}
                  </Stack>
                </Stack>
              </ButtonBase>
            );
          })}
        </Box>
      </SectionCard>
    </Box>
  );
};
