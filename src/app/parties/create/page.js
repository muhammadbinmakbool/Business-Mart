"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createPartyAction, checkPartyDuplicateAction } from "@/modules/parties/controllers/partyActions";
import { PARTY_TYPES } from "@/lib/constants";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import DuplicateWarningModal from "@/components/ui/DuplicateWarningModal";

export default function CreatePartyPage() {
  const router = useRouter();
  const formRef = useRef(null);
  const nameInputRef = useRef(null);

  const [isWarningOpen, setIsWarningOpen] = useState(false);
  const [warningData, setWarningData] = useState(null); // { formData, shouldRedirect }
  const [duplicateMessage, setDuplicateMessage] = useState("");
  const [warningTitle, setWarningTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSaveTrigger(formData, shouldRedirect) {
    const name = formData.get("name");
    const phoneNumber = formData.get("phoneNumber");

    setIsSaving(true);
    try {
      const checkRes = await checkPartyDuplicateAction(name, phoneNumber);
      if (checkRes?.success && checkRes.duplicate) {
        const { matches, record } = checkRes.duplicate;
        const nameExists = !!matches?.name;
        const phoneExists = !!matches?.phoneNumber;
        let msg = "";
        let title = "Duplicate Party Detected";
        if (nameExists && phoneExists) {
          msg = `A party named "${record.name}" with the phone number "${record.phoneNumber}" already exists.`;
          title = "Duplicate Name & Phone Number";
        } else if (nameExists) {
          msg = `A party named "${record.name}" already exists.`;
          title = "Duplicate Name Detected";
        } else if (phoneExists) {
          msg = `A party with the phone number "${record.phoneNumber}" (named "${record.name}") already exists.`;
          title = "Duplicate Phone Number Detected";
        }
        
        setDuplicateMessage(msg);
        setWarningTitle(title);
        setWarningData({ formData, shouldRedirect });
        setIsWarningOpen(true);
      } else {
        await proceedSave(formData, shouldRedirect);
      }
    } catch (e) {
      toast.error("Failed to check for duplicate parties");
    } finally {
      setIsSaving(false);
    }
  }

  async function proceedSave(formData, shouldRedirect) {
    setIsSaving(true);
    try {
      const result = await createPartyAction(formData);
      
      if (result?.error) {
        toast.error(result.error);
        setIsSaving(false);
        return;
      }

      toast.success("Party created successfully");
      
      if (shouldRedirect) {
        router.push("/parties");
      } else {
        formRef.current?.reset();
        nameInputRef.current?.focus();
        setIsSaving(false);
      }
    } catch (e) {
      if (e.message?.includes("NEXT_REDIRECT") || e.digest?.includes("NEXT_REDIRECT")) {
        throw e;
      }
      toast.error("An unexpected error occurred while saving");
      setIsSaving(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/parties"
          className="rounded-full p-2 hover:bg-accent transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Add New Party</h1>
          <p className="text-sm text-muted-foreground">Create a new supplier or buyer in the system.</p>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <form 
          ref={formRef}
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            handleSaveTrigger(formData, true);
          }}
          className="space-y-4"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">Party Name</label>
              <input
                ref={nameInputRef}
                id="name"
                name="name"
                required
                autoFocus
                placeholder="Enter full name"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="phoneNumber" className="text-sm font-medium">Phone Number</label>
              <input
                id="phoneNumber"
                name="phoneNumber"
                required
                placeholder="e.g. 0300-1234567"
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
              placeholder="Full physical address"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="notes" className="text-sm font-medium">Notes (Optional)</label>
            <textarea
              id="notes"
              name="notes"
              rows={2}
              placeholder="Any additional details"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t">
            <Link
              href="/parties"
              className="px-4 py-2 text-sm text-center font-medium hover:bg-accent rounded-md transition-colors"
            >
              Cancel
            </Link>
            <button
              type="button"
              disabled={isSaving}
              onClick={() => {
                if (!formRef.current.reportValidity()) return;
                const formData = new FormData(formRef.current);
                handleSaveTrigger(formData, false);
              }}
              className="border border-input bg-background hover:bg-accent hover:text-accent-foreground px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
            >
              Save & Add Another
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save & Close"}
            </button>
          </div>
        </form>
      </div>

      <DuplicateWarningModal
        isOpen={isWarningOpen}
        onClose={() => setIsWarningOpen(false)}
        onConfirm={async () => {
          setIsWarningOpen(false);
          if (warningData) {
            await proceedSave(warningData.formData, warningData.shouldRedirect);
          }
        }}
        duplicateMessage={duplicateMessage}
        title={warningTitle}
        entityName="Party"
        loading={isSaving}
      />
    </div>
  );
}
