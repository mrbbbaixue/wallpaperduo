import type { PropsWithChildren, ReactNode } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
    <Card className="relative overflow-hidden border-border/70 bg-card/90 shadow-[0_18px_55px_rgba(15,23,42,0.08)] backdrop-blur dark:shadow-[0_18px_55px_rgba(0,0,0,0.32)]">
      {showHeader ? (
        <CardHeader className="gap-3 p-5 pb-0 md:p-6 md:pb-0">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              {title ? (
                typeof title === "string" ? (
                  <CardTitle className="text-xl leading-tight">{title}</CardTitle>
                ) : (
                  title
                )
              ) : null}
              {subtitle ? (
                typeof subtitle === "string" ? (
                  <CardDescription className="max-w-3xl text-sm leading-6">
                    {subtitle}
                  </CardDescription>
                ) : (
                  subtitle
                )
              ) : null}
            </div>
            {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
          </div>
        </CardHeader>
      ) : null}
      <CardContent className={showHeader ? "p-5 md:p-6" : "p-5 md:p-6"}>
        <div className="space-y-4">{children}</div>
      </CardContent>
    </Card>
  );
};
