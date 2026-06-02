"use client";

import React, { useState } from "react";
import { Import, Loader2, Info, Users, Apple } from "lucide-react";
import { importProductsAction, importPartiesAction } from "../controllers/maintenanceActions";
import { toast } from "sonner";

export default function ImportDataTab() {
  const [importType, setImportType] = useState("products");
  const [isImporting, setIsImporting] = useState(false);
  const [fileContent, setFileContent] = useState(null);
  const [fileName, setFileName] = useState("");
  const [report, setReport] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (!Array.isArray(parsed)) {
          toast.error("Import file must be a JSON array of items.");
          setFileContent(null);
          return;
        }
        setFileContent(parsed);
      } catch (err) {
        toast.error("Failed to parse JSON file. Ensure it is a valid JSON array.");
        setFileContent(null);
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!fileContent) return;
    setIsImporting(true);
    setReport(null);

    try {
      let res;
      if (importType === "products") {
        res = await importProductsAction(fileContent);
      } else {
        res = await importPartiesAction(fileContent);
      }

      if (res.success) {
        toast.success(`Successfully imported ${res.successCount} entries.`);
        setReport({
          successCount: res.successCount,
          errors: res.errors || []
        });
        setFileContent(null);
        setFileName("");
      } else {
        toast.error(res.error || "Failed to complete import");
      }
    } catch (err) {
      toast.error("An error occurred during data import");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-6">
      <div className="flex items-center gap-3 border-b pb-4">
        <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-xl">
          <Import className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-card-foreground">Import Master Data</h2>
          <p className="text-xs text-muted-foreground">Import products or parties partially without wiping the system.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => { setImportType("products"); setFileContent(null); setFileName(""); setReport(null); }}
          className={`flex items-center gap-3 p-4 rounded-xl border transition-all text-left ${
            importType === "products" 
              ? "border-primary bg-primary/5 text-primary" 
              : "hover:bg-accent/40 text-muted-foreground"
          }`}
        >
          <Apple className="h-5 w-5 shrink-0" />
          <div>
            <h4 className="font-bold text-xs">Products Import</h4>
            <p className="text-[10px] opacity-80">Import list of inventory products</p>
          </div>
        </button>

        <button
          onClick={() => { setImportType("parties"); setFileContent(null); setFileName(""); setReport(null); }}
          className={`flex items-center gap-3 p-4 rounded-xl border transition-all text-left ${
            importType === "parties" 
              ? "border-primary bg-primary/5 text-primary" 
              : "hover:bg-accent/40 text-muted-foreground"
          }`}
        >
          <Users className="h-5 w-5 shrink-0" />
          <div>
            <h4 className="font-bold text-xs">Parties Import</h4>
            <p className="text-[10px] opacity-80">Import list of buyers/suppliers</p>
          </div>
        </button>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border bg-accent/20 p-4 space-y-2 text-xs">
          <div className="flex items-center gap-2 text-primary font-bold">
            <Info className="h-4 w-4" />
            Expected JSON format:
          </div>
          {importType === "products" ? (
            <pre className="p-2 rounded bg-black/5 dark:bg-white/5 font-mono text-[10px] overflow-x-auto">
{`[
  {
    "name": "Basmati Rice Super",
    "category": "WEIGHT",
    "primaryUnit": "KG",
    "unitConversion": 1,
    "isActive": true
  }
]`}
            </pre>
          ) : (
            <pre className="p-2 rounded bg-black/5 dark:bg-white/5 font-mono text-[10px] overflow-x-auto">
{`[
  {
    "name": "Ahmad Rice Mills",
    "phoneNumber": "03001234567",
    "address": "Lahore Road",
    "notes": "Premium client",
    "partyType": "SUPPLIER",
    "isActive": true
  }
]`}
            </pre>
          )}
        </div>

        <div className="flex flex-col items-center justify-center border-2 border-dashed border-muted-foreground/30 rounded-xl p-6 hover:bg-accent/10 transition-colors relative">
          <input
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          />
          <Import className="h-8 w-8 text-muted-foreground/50 mb-2" />
          <p className="text-xs font-semibold text-card-foreground">Upload your {importType} JSON array file</p>
          {fileName && (
            <p className="text-xs text-primary font-bold mt-2">Selected: {fileName}</p>
          )}
        </div>

        {fileContent && (
          <button
            onClick={handleImport}
            disabled={isImporting}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50"
          >
            {isImporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Importing {importType}...
              </>
            ) : (
              `Start importing ${fileContent.length} items`
            )}
          </button>
        )}

        {report && (
          <div className="rounded-xl border p-4 space-y-2">
            <h4 className="font-bold text-xs text-card-foreground">Import Summary</h4>
            <div className="text-xs space-y-1 text-muted-foreground">
              <p>Successfully Imported: <span className="font-bold text-emerald-600">{report.successCount}</span></p>
              <p>Skipped/Failed: <span className="font-bold text-rose-500">{report.errors.length}</span></p>
            </div>
            {report.errors.length > 0 && (
              <div className="max-h-32 overflow-y-auto border rounded p-2 bg-rose-50/10 text-[10px] space-y-1 font-mono">
                {report.errors.map((err, i) => (
                  <p key={i} className="text-rose-600">
                    Failed item "{err.name}": {err.error}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
