import { Card, CardContent, Stack, Typography } from "@mui/material";
import type { PropsWithChildren, ReactNode } from "react";

interface SectionCardProps extends PropsWithChildren {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  hideHeader?: boolean;
}

export const SectionCard = ({
  title,
  subtitle,
  actions,
  hideHeader = false,
  children,
}: SectionCardProps) => {
  const showHeader = !hideHeader && (title || subtitle || actions);

  return (
    <Card
      sx={(theme) => ({
        borderRadius: 2,
        position: "relative",
        overflow: "hidden",
        border: "1px solid transparent",
        background:
          theme.palette.mode === "light"
            ? "linear-gradient(160deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.74) 60%, rgba(249,251,253,0.7) 100%)"
            : "linear-gradient(170deg, rgba(27,31,38,0.88) 0%, rgba(27,31,38,0.78) 58%, rgba(23,27,34,0.82) 100%)",
        boxShadow:
          theme.palette.mode === "light"
            ? "0 12px 28px rgba(15, 23, 42, 0.08)"
            : "0 16px 30px rgba(0, 0, 0, 0.35)",
        "&::before": {
          content: '""',
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          borderRadius: "inherit",
          background:
            theme.palette.mode === "light"
              ? "linear-gradient(180deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.08) 28%, rgba(255,255,255,0) 100%)"
              : "linear-gradient(180deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.03) 30%, rgba(255,255,255,0) 100%)",
        },
      })}
    >
      <CardContent
        sx={{
          p: { xs: 1.25, md: 1.75 },
          "&:last-child": { pb: { xs: 1.25, md: 1.75 } },
        }}
      >
        <Stack spacing={showHeader ? 1.4 : 0}>
          {showHeader ? (
            <Stack
              direction={{ xs: "column", sm: "row" }}
              justifyContent="space-between"
              alignItems={{ xs: "flex-start", sm: "flex-start" }}
              gap={1}
              sx={{ position: "relative", zIndex: 1 }}
            >
              <Stack spacing={0.55}>
                {title ? (
                  <Typography variant="h6" sx={{ lineHeight: 1.15 }}>
                    {title}
                  </Typography>
                ) : null}
                {subtitle ? (
                  <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 680 }}>
                    {subtitle}
                  </Typography>
                ) : null}
              </Stack>
              {actions ? <Stack direction="row" spacing={0.75}>{actions}</Stack> : null}
            </Stack>
          ) : null}
          <Stack spacing={0.9} sx={{ position: "relative", zIndex: 1 }}>
            {children}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
};
