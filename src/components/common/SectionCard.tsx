import { Card, CardContent, Stack, Typography } from "@mui/material";
import type { PropsWithChildren, ReactNode } from "react";

interface SectionCardProps extends PropsWithChildren {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}

export const SectionCard = ({ title, subtitle, actions, children }: SectionCardProps) => (
  <Card
    sx={{
      borderRadius: 2.25,
      position: "relative",
      overflow: "hidden",
      "&::before": {
        content: '""',
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        borderRadius: "inherit",
        background:
          "linear-gradient(132deg, rgba(255,255,255,0.18), transparent 42%, rgba(255,255,255,0.05))",
      },
    }}
  >
    <CardContent
      sx={{
        p: { xs: 1.5, md: 2 },
        "&:last-child": { pb: { xs: 1.5, md: 2 } },
      }}
    >
      <Stack spacing={1.75}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "flex-start" }}
          gap={1.5}
          sx={{ position: "relative", zIndex: 1 }}
        >
          <Stack spacing={0.75}>
            <Typography variant="h6" sx={{ lineHeight: 1.15 }}>
              {title}
            </Typography>
            {subtitle ? (
              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 680 }}>
                {subtitle}
              </Typography>
            ) : null}
          </Stack>
          {actions ? <Stack direction="row" spacing={1}>{actions}</Stack> : null}
        </Stack>
        <Stack spacing={1} sx={{ position: "relative", zIndex: 1 }}>
          {children}
        </Stack>
      </Stack>
    </CardContent>
  </Card>
);
