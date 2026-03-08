import DarkModeRoundedIcon from "@mui/icons-material/DarkModeRounded";
import LanguageRoundedIcon from "@mui/icons-material/LanguageRounded";
import LightModeRoundedIcon from "@mui/icons-material/LightModeRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import {
  AppBar,
  Box,
  Chip,
  IconButton,
  Stack,
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
          inset: "-24% -8% auto -8%",
          height: "52vh",
          background:
            "radial-gradient(circle at 12% 24%, rgba(158, 114, 72, 0.2), transparent 48%), radial-gradient(circle at 82% 16%, rgba(58, 109, 124, 0.24), transparent 50%)",
          filter: "blur(70px)",
          pointerEvents: "none",
          zIndex: 0,
        },
        "&::after": {
          content: '""',
          position: "absolute",
          inset: "auto -14% -32% -14%",
          height: "40vh",
          background:
            "radial-gradient(circle at 22% 64%, rgba(141, 161, 186, 0.22), transparent 48%), radial-gradient(circle at 74% 54%, rgba(189, 149, 102, 0.2), transparent 44%)",
          filter: "blur(90px)",
          pointerEvents: "none",
          zIndex: 0,
        },
      }}
    >
      <AppBar position="sticky" color="transparent" elevation={0} sx={{ zIndex: 3 }}>
        <Toolbar
          sx={{
            px: { xs: 1.5, md: 2.5 },
            py: 1,
            alignItems: { xs: "flex-start", sm: "center" },
            flexWrap: "wrap",
            gap: 1.25,
          }}
        >
          <Stack spacing={0.25} sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography
              variant="overline"
              color="text.secondary"
              sx={{ lineHeight: 1.1, fontSize: 11 }}
            >
              WallpaperDuo Studio
            </Typography>
            <Typography variant="h5" sx={{ lineHeight: 1 }}>
              {t("appName")}
            </Typography>
          </Stack>
          <Chip
            label={t("tagline")}
            size="small"
            sx={{
              maxWidth: { xs: "100%", md: 560 },
              alignSelf: { xs: "stretch", sm: "center" },
              "& .MuiChip-label": { overflow: "hidden", textOverflow: "ellipsis" },
            }}
          />
          <Stack direction="row" spacing={0.8} alignItems="center">
            <IconButton onClick={toggleLanguage} aria-label="language" size="small">
              <LanguageRoundedIcon fontSize="small" />
            </IconButton>
            <IconButton
              onClick={() => setThemeMode(themeMode === "light" ? "dark" : "light")}
              aria-label="theme"
              size="small"
            >
              {themeMode === "light" ? (
                <DarkModeRoundedIcon fontSize="small" />
              ) : (
                <LightModeRoundedIcon fontSize="small" />
              )}
            </IconButton>
            <IconButton onClick={() => setSettingsOpen(true)} aria-label="settings" size="small">
              <SettingsRoundedIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Toolbar>
      </AppBar>

      <Box sx={{ position: "relative", zIndex: 1, px: { xs: 0.75, md: 1.25 }, pb: 1.25 }}>
        {children}
      </Box>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </Box>
  );
};
