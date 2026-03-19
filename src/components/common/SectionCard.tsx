import type { PropsWithChildren, ReactNode } from "react";
import { cn } from "@/lib/utils";

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
  surface?: "default" | "flat";
}

export const SectionCard = ({
  title,
  subtitle,
  actions,
  hideHeader = false,
  surface = "default",
  children,
}: SectionCardProps) => {
  const showHeader = !hideHeader && (title || subtitle || actions);

  return (
    <Card
      className={cn(
        "relative overflow-hidden",
        surface === "default" &&
          "border-border/70 bg-card/90 shadow-[0_12px_30px_rgba(15,23,42,0.07)] backdrop-blur dark:shadow-[0_14px_32px_rgba(0,0,0,0.24)]",
        surface === "flat" && "rounded-none border-x-0 border-y-0 bg-transparent shadow-none",
      )}
    >
      {showHeader ? (
        <CardHeader
          className={cn(
            "gap-3 p-5 pb-0 md:p-6 md:pb-0",
            surface === "flat" && "px-4 pb-3 pt-3 md:px-4 md:pb-3 md:pt-3",
          )}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              {title ? (
                typeof title === "string" ? (
                  <CardTitle className={cn("leading-tight", surface === "flat" ? "text-lg" : "text-xl")}>
                    {title}
                  </CardTitle>
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
      <CardContent
        className={cn(
          "p-5 md:p-6",
          surface === "flat" && (showHeader ? "px-0 pb-0 pt-0" : "px-0 py-0"),
        )}
      >
        <div className={cn(surface === "flat" ? "space-y-0" : "space-y-4")}>{children}</div>
      </CardContent>
    </Card>
  );
};
