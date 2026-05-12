export const dynamic = "force-dynamic";

import React from "react";
import Link from "next/link";
import { Plus, Search, Calendar, FileText, User, Package as PackageIcon, Eye } from "lucide-react";
import { IntakeService } from "@/modules/intake/services/IntakeService";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

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

      <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 shadow-sm">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          placeholder="Search by intake #, supplier or product..."
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b bg-muted/50 transition-colors">
                <th className="px-4 py-3 font-semibold">Intake #</th>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Supplier</th>
                <th className="px-4 py-3 font-semibold">Product</th>
                <th className="px-4 py-3 font-semibold text-right">Bags</th>
                <th className="px-4 py-3 font-semibold text-right">Weight</th>
                <th className="px-4 py-3 font-semibold text-center">Status</th>
                <th className="px-4 py-3 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {intakes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground italic">
                    No intake transactions found.
                  </td>
                </tr>
              ) : (
                intakes.map((intake) => (
                  <tr key={intake.id} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono font-medium text-primary">{intake.intakeNumber}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {format(new Date(intake.entryDate), "dd MMM yyyy")}
                    </td>
                    <td className="px-4 py-3 font-medium">{intake.party.name}</td>
                    <td className="px-4 py-3">{intake.product.name}</td>
                    <td className="px-4 py-3 text-right">{intake.bagCount || "-"}</td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {Number(intake.grossWeight).toLocaleString()} <span className="text-[10px] text-muted-foreground uppercase">{intake.product.unitType}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase border",
                        intake.status === "PENDING" ? "bg-amber-100 text-amber-700 border-amber-200" :
                        intake.status === "COMPLETED" ? "bg-emerald-100 text-emerald-700 border-emerald-200" :
                        "bg-rose-100 text-rose-700 border-rose-200"
                      )}>
                        {intake.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Link 
                        href={`/intake/${intake.id}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-accent hover:text-accent-foreground"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
