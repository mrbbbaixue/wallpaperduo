import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useMemo } from "react";
import type { PropsWithChildren } from "react";

import { useSettingsStore } from "@/store/useSettingsStore";
import { buildTheme } from "@/theme/theme";

const queryClient = new QueryClient();

export const AppProviders = ({ children }: PropsWithChildren) => {
  const themeMode = useSettingsStore((state) => state.themeMode);
  const theme = useMemo(() => buildTheme(themeMode), [themeMode]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  );
};
