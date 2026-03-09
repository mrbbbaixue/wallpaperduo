import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import ExpandLessRoundedIcon from "@mui/icons-material/ExpandLessRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import {
  Box,
  Button,
  ButtonBase,
  Chip,
  Collapse,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import { saveAs } from "file-saver";
import { useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";

import { useWorkflowStore } from "@/store/useWorkflowStore";

interface CanvasGalleryStripProps {
  expanded: boolean;
  onToggleExpanded: () => void;
}

export const CanvasGalleryStrip = ({
  expanded,
  onToggleExpanded,
}: CanvasGalleryStripProps) => {
  const { i18n, t } = useTranslation();
  const isZh = i18n.language === "zh";

  const tasks = useWorkflowStore((s) => s.tasks);
  const activeResultId = useWorkflowStore((s) => s.activeResultId);
  const setActiveResultId = useWorkflowStore((s) => s.setActiveResultId);

  const succeeded = useMemo(
    () => tasks.filter((task) => task.status === "succeeded" && task.result?.blob),
    [tasks],
  );

  const activeIndex = useMemo(
    () => succeeded.findIndex((task) => task.id === activeResultId),
    [activeResultId, succeeded],
  );
  const activeTask = useMemo(
    () => (activeResultId ? succeeded.find((task) => task.id === activeResultId) : undefined),
    [activeResultId, succeeded],
  );

  const cardRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const previousIdsRef = useRef<string[]>([]);

  useEffect(() => {
    if (succeeded.length === 0) {
      previousIdsRef.current = [];
      return;
    }

    const previousIds = previousIdsRef.current;
    const previousSet = new Set(previousIds);
    const newcomer = succeeded.find((task) => !previousSet.has(task.id));

    if (newcomer) {
      if (expanded) {
        window.setTimeout(() => {
          cardRefs.current[newcomer.id]?.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
            inline: "nearest",
          });
        }, 40);
      }
    }

    previousIdsRef.current = succeeded.map((task) => task.id);
  }, [expanded, succeeded]);

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
    }
  };

  const handleDownloadSingle = () => {
    if (!activeTask?.result?.blob) return;
    const safeLabel = activeTask.label.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_-]/g, "");
    const filename = safeLabel ? `${safeLabel}.png` : `result_${activeTask.id}.png`;
    saveAs(activeTask.result.blob, filename);
  };

  return (
    <Box sx={{ borderTop: "1px solid", borderColor: "divider" }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        spacing={1}
        sx={{
          py: 0.75,
          borderBottom: expanded ? "1px solid" : "none",
          borderColor: "divider",
        }}
      >
        <Stack direction="row" alignItems="center" spacing={0.75}>
          <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: "0.07em" }}>
            {isZh ? "结果画廊" : "Result Gallery"}
          </Typography>
          <Chip
            size="small"
            label={isZh ? `${succeeded.length} 张` : `${succeeded.length} items`}
            sx={{ borderRadius: 0 }}
          />
        </Stack>
        <Stack direction="row" alignItems="center" spacing={0.75}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<DownloadRoundedIcon />}
            onClick={handleDownloadSingle}
            disabled={!activeTask?.result?.blob}
            sx={{ borderRadius: 0 }}
          >
            {t("common.download")}
          </Button>
          <IconButton
            size="small"
            onClick={onToggleExpanded}
            aria-label={expanded ? (isZh ? "收起画廊" : "Collapse gallery") : isZh ? "展开画廊" : "Expand gallery"}
            sx={{ borderRadius: 0 }}
          >
            {expanded ? <ExpandLessRoundedIcon fontSize="small" /> : <ExpandMoreRoundedIcon fontSize="small" />}
          </IconButton>
        </Stack>
      </Stack>

      <Collapse in={expanded} timeout={220} unmountOnExit>
        <Box
          role="listbox"
          aria-label={isZh ? "结果画廊" : "Result gallery"}
          aria-activedescendant={activeResultId ? `gallery-option-${activeResultId}` : undefined}
          tabIndex={0}
          onKeyDown={handleKeyDown}
          sx={{
            display: "flex",
            gap: 1,
            overflowX: "auto",
            py: 1,
            outline: "none",
            "&::-webkit-scrollbar": { height: 6 },
            "&::-webkit-scrollbar-thumb": {
              borderRadius: 0,
              backgroundColor: "action.hover",
            },
          }}
        >
          {succeeded.map((task) => {
            const selected = task.id === activeResultId;
            return (
              <ButtonBase
                key={task.id}
                id={`gallery-option-${task.id}`}
                ref={(node) => {
                  cardRefs.current[task.id] = node;
                }}
                role="option"
                aria-selected={selected}
                onClick={() => setActiveResultId(task.id)}
                sx={{
                  width: 168,
                  flexShrink: 0,
                  p: 0.75,
                  borderRadius: 0,
                  border: "1px solid",
                  borderColor: selected ? "primary.main" : "divider",
                  backgroundColor: selected ? "action.selected" : "background.paper",
                  textAlign: "left",
                  transition: "all 0.2s ease",
                  "&:focus-visible": {
                    outline: "2px solid",
                    outlineColor: "primary.main",
                    outlineOffset: 2,
                  },
                }}
              >
                <Stack spacing={0.6} sx={{ width: "100%" }}>
                  <Box
                    component="img"
                    src={task.result?.objectUrl}
                    alt={task.label}
                    loading="lazy"
                    sx={{
                      width: "100%",
                      aspectRatio: "4 / 3",
                      objectFit: "cover",
                      borderRadius: 0,
                      border: "1px solid",
                      borderColor: "divider",
                    }}
                  />
                  <Typography variant="caption" fontWeight={700} noWrap>
                    {task.label}
                  </Typography>
                </Stack>
              </ButtonBase>
            );
          })}
        </Box>
      </Collapse>
    </Box>
  );
};
