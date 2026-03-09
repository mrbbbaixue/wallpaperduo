import CollectionsRoundedIcon from "@mui/icons-material/CollectionsRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import {
  Box,
  Drawer,
  Fab,
  Grid,
  IconButton,
  Stack,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { CanvasWorkspace } from "@/components/canvas/CanvasWorkspace";
import { ControlPanel } from "@/components/control/ControlPanel";
import { ExportPanel } from "@/components/results/ExportPanel";
import { ResultsRail } from "@/components/results/ResultsRail";
import { useWorkflowStore } from "@/store/useWorkflowStore";

export const MainPage = () => {
  const { i18n } = useTranslation();
  const isZh = i18n.language === "zh";

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const tasks = useWorkflowStore((s) => s.tasks);

  const succeeded = tasks.filter((task) => task.status === "succeeded" && task.result?.blob);
  const [sheetOpen, setSheetOpen] = useState(false);
  const previousSucceededRef = useRef(0);

  useEffect(() => {
    if (!isMobile) {
      previousSucceededRef.current = succeeded.length;
      return;
    }

    const hasNewResult = succeeded.length > previousSucceededRef.current;
    previousSucceededRef.current = succeeded.length;

    if (!hasNewResult) return;

    const timer = window.setTimeout(() => {
      setSheetOpen(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [isMobile, succeeded.length]);

  return (
    <>
      <Grid
        container
        spacing={0}
        sx={{
          px: 0,
          alignItems: "stretch",
        }}
      >
        <Grid
          size={{ xs: 12, md: 9 }}
          sx={{
            minWidth: 0,
            pb: { xs: 1, md: 0 },
          }}
        >
          <CanvasWorkspace />
        </Grid>

        <Grid
          size={{ xs: 12, md: 3 }}
          sx={{
            borderColor: "divider",
            borderTop: { xs: "1px solid", md: "none" },
            position: "relative",
            "&::before": {
              content: '""',
              display: { xs: "none", md: "block" },
              position: "absolute",
              top: 0,
              bottom: 0,
              left: 0,
              width: 18,
              transform: "translateX(-100%)",
              pointerEvents: "none",
              background:
                "linear-gradient(90deg, rgba(20, 22, 25, 0) 0%, rgba(20, 22, 25, 0.05) 55%, rgba(20, 22, 25, 0.1) 100%)",
            },
            pb: 1,
          }}
        >
          <Stack spacing={0}>
            <ControlPanel />
            <ExportPanel />
          </Stack>
        </Grid>
      </Grid>

      {isMobile && succeeded.length > 0 ? (
        <>
          <Fab
            color="primary"
            variant="extended"
            onClick={() => setSheetOpen(true)}
            sx={{
              position: "fixed",
              right: 14,
              bottom: 16,
              zIndex: 1200,
            }}
          >
            <CollectionsRoundedIcon sx={{ mr: 0.75 }} />
            {isZh ? `结果 ${succeeded.length}` : `Results ${succeeded.length}`}
          </Fab>

          <Drawer
            anchor="bottom"
            open={sheetOpen}
            onClose={() => setSheetOpen(false)}
            PaperProps={{
              sx: {
                borderTopLeftRadius: 16,
                borderTopRightRadius: 16,
                maxHeight: "78vh",
                px: 1,
                pt: 0.75,
                pb: 1,
              },
            }}
          >
            <Stack spacing={0.75}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="subtitle2" sx={{ px: 0.5 }}>
                  {isZh ? "结果胶片" : "Results Rail"}
                </Typography>
                <IconButton size="small" onClick={() => setSheetOpen(false)}>
                  <CloseRoundedIcon fontSize="small" />
                </IconButton>
              </Stack>
              <Box sx={{ overflowY: "auto", pb: 0.5 }}>
                <ResultsRail inSheet />
              </Box>
            </Stack>
          </Drawer>
        </>
      ) : null}
    </>
  );
};
