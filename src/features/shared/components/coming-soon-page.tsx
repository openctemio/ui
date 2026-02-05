"use client";

import { Main } from "@/components/layout";
import { PageHeader } from "@/features/shared";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Construction, ArrowLeft, Bell } from "lucide-react";
import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";

interface ComingSoonPageProps {
  title: string;
  description: string;
  phase?: string;
  icon?: LucideIcon;
  features?: string[];
}

export function ComingSoonPage({
  title,
  description,
  phase,
  icon: Icon = Construction,
  features = [],
}: ComingSoonPageProps) {
  const router = useRouter();

  return (
    <>
      <Main>
        <PageHeader title={title} description={description}>
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
        </PageHeader>

        <div className="mt-8 flex flex-col items-center justify-center">
          <Card className="w-full max-w-2xl">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                <Icon className="h-10 w-10 text-primary" />
              </div>
              <div className="flex items-center justify-center gap-2 mb-2">
                {phase && (
                  <Badge variant="outline" className="text-xs">
                    {phase}
                  </Badge>
                )}
                <Badge className="bg-yellow-500/20 text-yellow-600 dark:text-yellow-400">
                  Coming Soon
                </Badge>
              </div>
              <CardTitle className="text-2xl">{title}</CardTitle>
              <CardDescription className="text-base">
                {description}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {features.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground">
                    Planned Features
                  </h4>
                  <ul className="space-y-2">
                    {features.map((feature, index) => (
                      <li
                        key={index}
                        className="flex items-center gap-2 text-sm"
                      >
                        <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex flex-col gap-3 pt-4">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() =>
                    alert("You will be notified when this feature is available")
                  }
                >
                  <Bell className="mr-2 h-4 w-4" />
                  Notify Me When Available
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </Main>
    </>
  );
}
