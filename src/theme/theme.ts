import { alpha, createTheme } from "@mui/material/styles";

const serifFamily = '"Source Serif 4", "Noto Serif SC", Georgia, serif';
const displayFamily = '"Cormorant Garamond", "Noto Serif SC", serif';
const monoFamily = '"JetBrains Mono", "SFMono-Regular", Consolas, monospace';

export const buildTheme = (mode: "light" | "dark") => {
  const isLight = mode === "light";

  const palette = {
    primary: {
      main: isLight ? "#2a5c68" : "#9dcdd6",
    },
    secondary: {
      main: isLight ? "#96683d" : "#deb685",
    },
    background: {
      default: isLight ? "#f6f0e7" : "#121417",
      paper: isLight ? alpha("#ffffff", 0.6) : alpha("#1a1d22", 0.72),
    },
    text: {
      primary: isLight ? "#1d2127" : "#f0ede7",
      secondary: isLight ? "#4f5762" : "#b7bec8",
    },
    divider: isLight ? alpha("#2b3340", 0.16) : alpha("#d5d9df", 0.18),
  };

  return createTheme({
    palette: {
      mode,
      ...palette,
    },
    shape: {
      borderRadius: 18,
    },
    shadows: [
      "none",
      "0 4px 14px rgba(0,0,0,0.08)",
      "0 8px 22px rgba(0,0,0,0.1)",
      "0 14px 30px rgba(0,0,0,0.12)",
      "0 18px 40px rgba(0,0,0,0.13)",
      "0 22px 48px rgba(0,0,0,0.14)",
      "0 26px 56px rgba(0,0,0,0.15)",
      "0 30px 64px rgba(0,0,0,0.16)",
      "0 34px 72px rgba(0,0,0,0.17)",
      "0 38px 80px rgba(0,0,0,0.18)",
      "0 42px 88px rgba(0,0,0,0.19)",
      "0 46px 96px rgba(0,0,0,0.2)",
      "0 50px 104px rgba(0,0,0,0.21)",
      "0 54px 112px rgba(0,0,0,0.22)",
      "0 58px 120px rgba(0,0,0,0.23)",
      "0 62px 128px rgba(0,0,0,0.24)",
      "0 66px 136px rgba(0,0,0,0.25)",
      "0 70px 144px rgba(0,0,0,0.26)",
      "0 74px 152px rgba(0,0,0,0.27)",
      "0 78px 160px rgba(0,0,0,0.28)",
      "0 82px 168px rgba(0,0,0,0.29)",
      "0 86px 176px rgba(0,0,0,0.3)",
      "0 90px 184px rgba(0,0,0,0.31)",
      "0 94px 192px rgba(0,0,0,0.32)",
      "0 98px 200px rgba(0,0,0,0.33)",
    ],
    typography: {
      fontFamily: serifFamily,
      h1: {
        fontFamily: displayFamily,
        fontWeight: 700,
        letterSpacing: "0.02em",
        lineHeight: 1.1,
      },
      h2: {
        fontFamily: displayFamily,
        fontWeight: 700,
        letterSpacing: "0.01em",
      },
      h3: {
        fontFamily: displayFamily,
        fontWeight: 600,
      },
      h4: {
        fontFamily: displayFamily,
        fontWeight: 600,
      },
      h5: {
        fontFamily: displayFamily,
        fontWeight: 600,
      },
      h6: {
        fontFamily: displayFamily,
        fontWeight: 600,
        letterSpacing: "0.01em",
      },
      subtitle1: {
        fontWeight: 500,
      },
      subtitle2: {
        fontWeight: 600,
      },
      body1: {
        lineHeight: 1.68,
      },
      body2: {
        lineHeight: 1.62,
      },
      button: {
        textTransform: "none",
        fontWeight: 600,
        letterSpacing: "0.01em",
      },
      overline: {
        fontWeight: 600,
        letterSpacing: "0.08em",
      },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            color: palette.text.primary,
            backgroundColor: palette.background.default,
            backgroundImage: isLight
              ? "radial-gradient(circle at 10% -10%, rgba(183,137,91,0.24), transparent 42%), radial-gradient(circle at 84% -16%, rgba(62,112,129,0.2), transparent 46%), linear-gradient(160deg, #f6f0e7 0%, #ece5db 45%, #e3e9ef 100%)"
              : "radial-gradient(circle at 14% -14%, rgba(177,140,95,0.18), transparent 40%), radial-gradient(circle at 80% -20%, rgba(80,124,142,0.2), transparent 42%), linear-gradient(165deg, #121417 0%, #181c22 52%, #1b2029 100%)",
            backgroundAttachment: "fixed",
          },
          "body::before": {
            content: '""',
            position: "fixed",
            inset: 0,
            zIndex: -1,
            pointerEvents: "none",
            opacity: isLight ? 0.22 : 0.12,
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(34,40,48,0.18) 1px, transparent 0)",
            backgroundSize: "3px 3px",
          },
          "code, pre, .mono": {
            fontFamily: monoFamily,
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
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 18,
            border: `1px solid ${palette.divider}`,
            backgroundColor: palette.background.paper,
            backdropFilter: "blur(16px)",
            boxShadow: isLight
              ? "0 14px 42px rgba(34, 44, 62, 0.14)"
              : "0 16px 48px rgba(0, 0, 0, 0.45)",
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            minHeight: 38,
            paddingInline: 16,
          },
          contained: {
            boxShadow: isLight
              ? "0 10px 24px rgba(42, 92, 104, 0.26)"
              : "0 12px 26px rgba(157, 205, 214, 0.15)",
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            border: `1px solid ${alpha(palette.text.primary, isLight ? 0.12 : 0.2)}`,
            backgroundColor: alpha(palette.background.paper, isLight ? 0.7 : 0.5),
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            border: `1px solid ${palette.divider}`,
            backgroundColor: alpha(palette.background.paper, 0.8),
          },
          label: {
            fontWeight: 500,
            letterSpacing: "0.01em",
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            borderBottom: `1px solid ${palette.divider}`,
            backgroundColor: alpha(palette.background.default, isLight ? 0.45 : 0.6),
            backdropFilter: "blur(16px)",
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 20,
            border: `1px solid ${palette.divider}`,
            backgroundColor: alpha(palette.background.default, isLight ? 0.82 : 0.9),
            backdropFilter: "blur(18px)",
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            backgroundColor: alpha(palette.background.paper, 0.85),
            "& .MuiOutlinedInput-notchedOutline": {
              borderColor: alpha(palette.text.primary, isLight ? 0.18 : 0.24),
            },
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: alpha(palette.primary.main, 0.6),
            },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderWidth: 1,
              borderColor: palette.primary.main,
            },
          },
          input: {
            paddingTop: 10,
            paddingBottom: 10,
          },
        },
      },
      MuiDivider: {
        styleOverrides: {
          root: {
            borderColor: palette.divider,
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            fontWeight: 600,
            minHeight: 38,
          },
        },
      },
      MuiToolbar: {
        styleOverrides: {
          root: {
            minHeight: 68,
          },
        },
      },
    },
  });
};
