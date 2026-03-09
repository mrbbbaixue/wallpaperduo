import BrightnessAutoRoundedIcon from "@mui/icons-material/BrightnessAutoRounded";
import DarkModeRoundedIcon from "@mui/icons-material/DarkModeRounded";
import LanguageRoundedIcon from "@mui/icons-material/LanguageRounded";
import LightModeRoundedIcon from "@mui/icons-material/LightModeRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import { AppBar, Box, Chip, IconButton, Stack, Toolbar, Typography } from "@mui/material";
import { useEffect, useState, type PropsWithChildren } from "react";
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

  useEffect(() => {
    document.title = t("appName");
  }, [t, i18n.language]);

  const toggleLanguage = () => {
    const next = language === "zh" ? "en" : "zh";
    setLanguage(next);
    void i18n.changeLanguage(next);
  };

  const cycleThemeMode = () => {
    if (themeMode === "system") {
      setThemeMode("light");
      return;
    }
    if (themeMode === "light") {
      setThemeMode("dark");
      return;
    }
    setThemeMode("system");
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
          inset: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(circle at 16% -8%, rgba(78, 124, 136, 0.07), transparent 40%), radial-gradient(circle at 88% 0%, rgba(179, 138, 89, 0.06), transparent 36%)",
          zIndex: 0,
        },
      }}
    >
      <AppBar position="sticky" color="transparent" elevation={0} sx={{ zIndex: 3 }}>
        <Toolbar
          sx={{
            px: { xs: 1.25, md: 2.25 },
            py: 0.9,
            alignItems: { xs: "flex-start", sm: "center" },
            flexWrap: "wrap",
            gap: 1,
          }}
        >
          <Stack spacing={0.2} sx={{ flexGrow: 1, minWidth: 0 }}>
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
            variant="outlined"
            sx={{
              maxWidth: { xs: "100%", md: 560 },
              alignSelf: { xs: "stretch", sm: "center" },
              backgroundColor: "transparent",
              "& .MuiChip-label": { overflow: "hidden", textOverflow: "ellipsis" },
            }}
          />
          <Stack direction="row" spacing={0.75} alignItems="center">
            <IconButton
              onClick={toggleLanguage}
              aria-label="language"
              size="small"
              sx={{ backgroundColor: "transparent" }}
            >
              <LanguageRoundedIcon fontSize="small" />
            </IconButton>
            <IconButton
              onClick={cycleThemeMode}
              aria-label="theme-mode"
              size="small"
              sx={{ backgroundColor: "transparent" }}
            >
              {themeMode === "system" ? <BrightnessAutoRoundedIcon fontSize="small" /> : null}
              {themeMode === "light" ? <LightModeRoundedIcon fontSize="small" /> : null}
              {themeMode === "dark" ? <DarkModeRoundedIcon fontSize="small" /> : null}
            </IconButton>
            <IconButton
              onClick={() => setSettingsOpen(true)}
              aria-label="settings"
              size="small"
              sx={{ backgroundColor: "transparent" }}
            >
              <SettingsRoundedIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Toolbar>
      </AppBar>

      <Box sx={{ position: "relative", zIndex: 1, px: 0, pb: 0 }}>
        {children}
      </Box>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </Box>
  );
};
