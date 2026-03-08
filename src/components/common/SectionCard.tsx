import { Card, CardContent, Stack, Typography } from "@mui/material";
import type { PropsWithChildren, ReactNode } from "react";

interface SectionCardProps extends PropsWithChildren {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}

export const SectionCard = ({ title, subtitle, actions, children }: SectionCardProps) => (
  <Card sx={{ borderRadius: 1.5 }}>
    <CardContent sx={{ p: { xs: 1, md: 1.25 }, "&:last-child": { pb: { xs: 1, md: 1.25 } } }}>
      <Stack spacing={1.25}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2}>
          <Stack spacing={0.5}>
            <Typography variant="h6">{title}</Typography>
            {subtitle ? (
              <Typography variant="body2" color="text.secondary">
                {subtitle}
              </Typography>
            ) : null}
          </Stack>
          {actions}
        </Stack>
        {children}
      </Stack>
    </CardContent>
  </Card>
);
