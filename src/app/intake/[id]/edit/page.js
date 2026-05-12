import React from "react";
import { IntakeService } from "@/modules/intake/services/IntakeService";
import { PartyService } from "@/modules/parties/services/PartyService";
import { ProductService } from "@/modules/products/services/ProductService";
import EditIntakeForm from "./EditIntakeForm";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default async function EditIntakePage({ params: paramsPromise }) {
  const params = await paramsPromise;
  const [intake, parties, products] = await Promise.all([
    IntakeService.getIntake(params.id),
    PartyService.listParties(),
    ProductService.listProducts()
  ]);

  if (!intake) {
    return <div className="p-8 text-center">Intake transaction not found.</div>;
  }

  const suppliers = parties.filter(p => p.isActive || p.id === intake.partyId);
  const activeProducts = products.filter(p => p.isActive || p.id === intake.productId);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href={`/intake/${intake.id}`}
          className="rounded-full p-2 hover:bg-accent transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Edit Intake {intake.intakeNumber}</h1>
          <p className="text-sm text-muted-foreground">Adjust arrival details if recorded incorrectly.</p>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <EditIntakeForm intake={intake} suppliers={suppliers} products={activeProducts} />
      </div>
    </div>
  );
}
