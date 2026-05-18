export const dynamic = "force-dynamic";

import React from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { IntakeService } from "@/modules/intake/services/IntakeService";
import IntakeListClient from "./IntakeListClient";

export default async function IntakePage() {
  const intakes = await IntakeService.listIntakes();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Goods Intake</h1>
          <p className="text-muted-foreground">Record and track product arrivals from suppliers.</p>
        </div>
        <Link
          href="/intake/create"
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Record Intake
        </Link>
      </div>

      <IntakeListClient intakes={intakes} />
    </div>
  );
}
