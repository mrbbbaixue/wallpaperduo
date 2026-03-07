import DarkModeRoundedIcon from "@mui/icons-material/DarkModeRounded";
import LanguageRoundedIcon from "@mui/icons-material/LanguageRounded";
import LightModeRoundedIcon from "@mui/icons-material/LightModeRounded";
import {
  AppBar,
  Box,
  Button,
  Chip,
  Container,
  IconButton,
  Stack,
  Toolbar,
  Typography,
} from "@mui/material";
import type { PropsWithChildren } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { useSettingsStore } from "@/store/useSettingsStore";

const navPathMap = [
  { key: "workspace", path: "/" },
  { key: "prompts", path: "/prompts" },
  { key: "results", path: "/results" },
  { key: "export", path: "/export" },
  { key: "settings", path: "/settings" },
];

export const AppShell = ({ children }: PropsWithChildren) => {
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const language = useSettingsStore((state) => state.language);
  const setLanguage = useSettingsStore((state) => state.setLanguage);
  const themeMode = useSettingsStore((state) => state.themeMode);
  const setThemeMode = useSettingsStore((state) => state.setThemeMode);

  const toggleLanguage = () => {
    const next = language === "zh" ? "en" : "zh";
    setLanguage(next);
    void i18n.changeLanguage(next);
  };

  return (
    <Box sx={{ minHeight: "100vh", pb: 8 }}>
      <AppBar
        position="sticky"
        color="transparent"
        elevation={0}
        sx={{ backdropFilter: "blur(14px)" }}
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
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ mt: 4 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1} sx={{ mb: 2 }}>
          {navPathMap.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Button
                key={item.path}
                component={NavLink}
                to={item.path}
                variant={active ? "contained" : "outlined"}
                size="small"
              >
                {t(`nav.${item.key}`)}
              </Button>
            );
          })}
        </Stack>

        {children}
      </Container>
    </Box>
  );
};
