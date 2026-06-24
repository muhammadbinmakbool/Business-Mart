import React from "react";
import { IntakeService } from "@/modules/intake/services/IntakeService";
import { PartyService } from "@/modules/parties/services/PartyService";
import { ProductService } from "@/modules/products/services/ProductService";
import EditIntakeForm from "./EditIntakeForm";
import { IntakeWorkflowEngine } from "@/modules/intake/workflow/IntakeWorkflowEngine";
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
  const buyers = parties.filter(p => p.isActive && (p.partyType === "BUYER" || p.partyType === "BOTH"));
  const activeProducts = products.filter(p => p.isActive || p.id === intake.productId);

  const allowedActions = await IntakeWorkflowEngine.getAllowedActions(intake);

  return (
    <EditIntakeForm intake={intake} suppliers={suppliers} products={activeProducts} buyers={buyers} allowedActions={allowedActions} />
  );
}

