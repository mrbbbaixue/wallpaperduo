import DarkModeRoundedIcon from "@mui/icons-material/DarkModeRounded";
import LanguageRoundedIcon from "@mui/icons-material/LanguageRounded";
import LightModeRoundedIcon from "@mui/icons-material/LightModeRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import {
  AppBar,
  Box,
  Chip,
  IconButton,
  Toolbar,
  Typography,
} from "@mui/material";
import { useState, type PropsWithChildren } from "react";
import { useTranslation } from "react-i18next";

import { SettingsModal } from "@/components/settings/SettingsModal";
import { useSettingsStore } from "@/store/useSettingsStore";

export const AppShell = ({ children }: PropsWithChildren) => {
  const { t, i18n } = useTranslation();
  const language = useSettingsStore((state) => state.language);
  const setLanguage = useSettingsStore((state) => state.setLanguage);
  const themeMode = useSettingsStore((state) => state.themeMode);
  const setThemeMode = useSettingsStore((state) => state.setThemeMode);

  const [settingsOpen, setSettingsOpen] = useState(false);

  const toggleLanguage = () => {
    const next = language === "zh" ? "en" : "zh";
    setLanguage(next);
    void i18n.changeLanguage(next);
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        position: "relative",
        overflow: "hidden",
        "&::before": {
          content: '""',
          position: "absolute",
          inset: "-18% -12% auto -12%",
          height: "68vh",
          background:
            "radial-gradient(circle at 22% 30%, rgba(66, 165, 193, 0.34), transparent 46%), radial-gradient(circle at 78% 20%, rgba(255, 167, 106, 0.32), transparent 42%)",
          filter: "blur(80px)",
          pointerEvents: "none",
          zIndex: 0,
        },
      }}
    >
      <AppBar
        position="sticky"
        color="transparent"
        elevation={0}
        sx={{ backdropFilter: "blur(18px)", zIndex: 2 }}
      >
        <Toolbar sx={{ gap: 2, flexWrap: "wrap" }}>
          <Typography variant="h5" sx={{ flexGrow: 1 }}>
            {t("appName")}
          </Typography>
          <Chip
            label={t("tagline")}
            size="small"
            sx={{
              maxWidth: { xs: "100%", md: 520 },
              "& .MuiChip-label": { overflow: "hidden", textOverflow: "ellipsis" },
            }}
          />
          <IconButton onClick={toggleLanguage} aria-label="language">
            <LanguageRoundedIcon />
          </IconButton>
          <IconButton
            onClick={() => setThemeMode(themeMode === "light" ? "dark" : "light")}
            aria-label="theme"
          >
            {themeMode === "light" ? <DarkModeRoundedIcon /> : <LightModeRoundedIcon />}
          </IconButton>
          <IconButton onClick={() => setSettingsOpen(true)} aria-label="settings">
            <SettingsRoundedIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Box sx={{ mt: 0, px: 0, position: "relative", zIndex: 1 }}>
        {children}
      </Box>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </Box>
  );
};
