"use client";

import React, { useState } from "react";
import { updatePartyAction, checkPartyDuplicateAction } from "@/modules/parties/controllers/partyActions";
import { PARTY_TYPES } from "@/lib/constants";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";
import DuplicateWarningModal from "@/components/ui/DuplicateWarningModal";

export default function EditPartyForm({ party }) {
  const router = useRouter();

  const [isWarningOpen, setIsWarningOpen] = useState(false);
  const [warningData, setWarningData] = useState(null); // formData
  const [duplicateMessage, setDuplicateMessage] = useState("");
  const [warningTitle, setWarningTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSaveTrigger(formData) {
    const name = formData.get("name");
    const phoneNumber = formData.get("phoneNumber");

    setIsSaving(true);
    try {
      const checkRes = await checkPartyDuplicateAction(name, phoneNumber, party.id);
      if (checkRes?.success && checkRes.duplicate) {
        const { matches, record: dupParty } = checkRes.duplicate;
        const nameExists = !!matches?.name;
        const phoneExists = !!matches?.phoneNumber;
        let msg = "";
        let title = "Duplicate Party Detected";
        if (nameExists && phoneExists) {
          msg = `Another party named "${dupParty.name}" with the phone number "${dupParty.phoneNumber}" already exists.`;
          title = "Duplicate Name & Phone Number";
        } else if (nameExists) {
          msg = `Another party named "${dupParty.name}" already exists.`;
          title = "Duplicate Name Detected";
        } else if (phoneExists) {
          msg = `Another party with the phone number "${dupParty.phoneNumber}" (named "${dupParty.name}") already exists.`;
          title = "Duplicate Phone Number Detected";
        }
        
        setDuplicateMessage(msg);
        setWarningTitle(title);
        setWarningData(formData);
        setIsWarningOpen(true);
      } else {
        await proceedSave(formData);
      }
    } catch (e) {
      toast.error("Failed to check for duplicate parties");
    } finally {
      setIsSaving(false);
    }
  }

  async function proceedSave(formData) {
    setIsSaving(true);
    try {
      const result = await updatePartyAction(party.id, formData);
      if (result?.error) {
        toast.error(result.error);
        setIsSaving(false);
      } else {
        toast.success("Party updated successfully");
        router.push("/parties");
      }
    } catch (e) {
      if (e.message?.includes("NEXT_REDIRECT") || e.digest?.includes("NEXT_REDIRECT")) {
        throw e;
      }
      toast.error("An unexpected error occurred while updating");
      setIsSaving(false);
    }
  }

  return (
    <form 
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        handleSaveTrigger(formData);
      }} 
      className="space-y-4"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-medium">Party Name</label>
          <input
            id="name"
            name="name"
            required
            defaultValue={party.name}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="phoneNumber" className="text-sm font-medium">Phone Number</label>
          <input
            id="phoneNumber"
            name="phoneNumber"
            required
            defaultValue={party.phoneNumber}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="partyType" className="text-sm font-medium">Party Type</label>
        <select
          id="partyType"
          name="partyType"
          required
          defaultValue={party.partyType}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value={PARTY_TYPES.BUYER}>Buyer</option>
          <option value={PARTY_TYPES.SUPPLIER}>Supplier</option>
          <option value={PARTY_TYPES.BOTH}>Both (Supplier & Buyer)</option>
        </select>
      </div>

      <div className="space-y-2">
        <label htmlFor="address" className="text-sm font-medium">Address (Optional)</label>
        <textarea
          id="address"
          name="address"
          rows={2}
          defaultValue={party.address || ""}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="notes" className="text-sm font-medium">Notes (Optional)</label>
        <textarea
          id="notes"
          name="notes"
          rows={2}
          defaultValue={party.notes || ""}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div className="space-y-4 pt-4 border-t">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isActive"
            name="isActive"
            value="true"
            defaultChecked={party.isActive}
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
          />
          <label htmlFor="isActive" className="text-sm font-medium">Account Active</label>
        </div>

        <div className="flex justify-end gap-3">
          <Link
            href="/parties"
            className="px-4 py-2 text-sm font-medium hover:bg-accent rounded-md transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSaving}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isSaving ? "Updating..." : "Update Party"}
          </button>
        </div>
      </div>

      <DuplicateWarningModal
        isOpen={isWarningOpen}
        onClose={() => setIsWarningOpen(false)}
        onConfirm={async () => {
          setIsWarningOpen(false);
          if (warningData) {
            await proceedSave(warningData);
          }
        }}
        duplicateMessage={duplicateMessage}
        title={warningTitle}
        entityName="Party"
        loading={isSaving}
      />
    </form>
  );
}
