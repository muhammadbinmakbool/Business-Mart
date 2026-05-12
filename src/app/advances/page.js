export const dynamic = "force-dynamic";

import React from "react";
import Link from "next/link";
import { Plus, Search, Coins, User, Calendar, FileText } from "lucide-react";
import { AdvanceService } from "@/modules/intake/services/AdvanceService";
import { format } from "date-fns";

export default async function AdvancesPage() {
  const advances = await AdvanceService.listAdvances();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Supplier Advances</h1>
          <p className="text-muted-foreground">Track all payments and advances made to suppliers.</p>
        </div>
        <Link
          href="/advances/create"
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Record Advance
        </Link>
      </div>

      <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 shadow-sm">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          placeholder="Search by supplier or remarks..."
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b bg-muted/50 transition-colors">
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Supplier</th>
                <th className="px-4 py-3 font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">Linked Intake</th>
                <th className="px-4 py-3 font-semibold">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {advances.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground italic">
                    No advance payments recorded.
                  </td>
                </tr>
              ) : (
                advances.map((advance) => (
                  <tr key={advance.id} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      {format(new Date(advance.createdAt), "dd MMM yyyy, hh:mm a")}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      <div className="flex items-center gap-2">
                        <User className="h-3 w-3 text-muted-foreground" />
                        {advance.party.name}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-bold text-primary">
                      Rs. {Number(advance.amount).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      {advance.intakeTransaction ? (
                        <Link 
                          href={`/intake/${advance.intakeTransactionId}`}
                          className="text-blue-600 hover:underline font-mono text-xs"
                        >
                          {advance.intakeTransaction.intakeNumber}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground text-xs italic">Standalone</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground italic">
                      {advance.notes || "-"}
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
