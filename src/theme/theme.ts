import { createTheme } from "@mui/material/styles";

declare module "@mui/material/styles" {
  interface Palette {
    brass: Palette["primary"];
  }
  interface PaletteOptions {
    brass?: PaletteOptions["primary"];
  }
}

export const buildTheme = (mode: "light" | "dark") =>
  createTheme({
    palette: {
      mode,
      primary: {
        main: mode === "light" ? "#0f6b7d" : "#58bdd0",
      },
      secondary: {
        main: mode === "light" ? "#b56a2c" : "#df9f67",
      },
      brass: {
        main: mode === "light" ? "#7f4f24" : "#cfae7a",
      },
      background: {
        default: mode === "light" ? "#f6f0e8" : "#101315",
        paper: mode === "light" ? "rgba(255,255,255,0.7)" : "rgba(21,27,30,0.8)",
      },
      text: {
        primary: mode === "light" ? "#1a2429" : "#e6f0f4",
        secondary: mode === "light" ? "#3e4f57" : "#9eb4bf",
      },
    },
    shape: {
      borderRadius: 18,
    },
    typography: {
      fontFamily: '"IBM Plex Sans", "Noto Sans SC", sans-serif',
      h1: {
        fontFamily: '"Syne", "Noto Sans SC", sans-serif',
        fontWeight: 800,
        letterSpacing: "-0.03em",
      },
      h2: {
        fontFamily: '"Syne", "Noto Sans SC", sans-serif',
        fontWeight: 700,
        letterSpacing: "-0.02em",
      },
      h3: {
        fontFamily: '"Syne", "Noto Sans SC", sans-serif',
        fontWeight: 700,
      },
      button: {
        textTransform: "none",
        fontWeight: 700,
      },
    },
    components: {
      MuiCard: {
        styleOverrides: {
          root: {
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(128, 153, 165, 0.25)",
            boxShadow: "0 20px 50px rgba(0,0,0,0.12)",
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 999,
          },
        },
      },
    },
  });
