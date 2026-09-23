import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";

export function ConfigLinkCard({
  href,
  title,
  count,
}: {
  href: string;
  title: string;
  count: number;
}) {
  return (
    <Link href={href}>
      <Card className="flex items-center justify-between p-4 transition-colors hover:bg-accent/50">
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground">
            {count} {count === 1 ? "conta" : "contas"}
          </p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </Card>
    </Link>
  );
}
