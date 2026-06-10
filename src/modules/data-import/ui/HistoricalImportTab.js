"use client";

import React, { useState, useRef, useEffect } from "react";
import { 
  UploadCloud, 
  FileSpreadsheet, 
  AlertTriangle, 
  CheckCircle, 
  Download, 
  Loader2, 
  AlertCircle, 
  FileText, 
  ChevronRight, 
  RotateCw 
} from "lucide-react";
import { validateImportAction, commitImportAction, getImportSummaryAction } from "../controllers/dataImportActions";
import { toast } from "sonner";
import * as XLSX from "xlsx";

export default function HistoricalImportTab() {
  const [importType, setImportType] = useState("PARTIES");
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [report, setReport] = useState(null);
  const [resolutions, setResolutions] = useState({});
  const [importResult, setImportResult] = useState(null);
  const [dbSummary, setDbSummary] = useState(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);
  const [showUploader, setShowUploader] = useState(false);
  const fileInputRef = useRef(null);

  const fetchSummary = async () => {
    try {
      setIsLoadingSummary(true);
      const res = await getImportSummaryAction();
      if (res.success) {
        setDbSummary(res.summary);
      }
    } catch (err) {
      console.error("Failed to load import summary:", err);
    } finally {
      setIsLoadingSummary(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  // Generates and downloads Excel template on the fly
  const handleDownloadTemplate = () => {
    let headers = [];
    let sampleData = [];
    if (importType === "PARTIES") {
      headers = [["Name", "PhoneNumber", "Address", "PartyType", "OpeningBalance", "OpeningBalanceType", "Notes"]];
      sampleData = [
        ["Ali Traders", "03001234567", "Grain Market, Rahim Yar Khan", "SUPPLIER", 250000, "PAYABLE", "Opening onboarding balance"],
        ["Asif Khan", "03217654321", "Model Town, Lahore", "BUYER", 150000, "RECEIVABLE", "Starting customer receivable"]
      ];
    } else {
      headers = [["Name", "Category", "PrimaryUnit", "UnitConversion", "InitialStock", "InitialStockUnit", "Notes"]];
      sampleData = [
        ["Wheat Quality A", "WEIGHT", "KG", 50, 1000, "BAG", "Initial stock of 1000 bags of 50kg wheat"],
        ["Cotton Seed Oil", "LIQUID", "LITER", null, 500, "LITER", "Starting oil inventory"],
        ["Plastic Packing Box", "QUANTITY", "PIECE", null, 2500, "PIECE", "Box units"]
      ];
    }

    const worksheet = XLSX.utils.aoa_to_sheet([...headers, ...sampleData]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Import Template");
    XLSX.writeFile(workbook, `${importType.toLowerCase()}_onboarding_template.xlsx`);
    toast.success(`${importType} template downloaded.`);
  };

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setFileName(selectedFile.name);
    setReport(null);
    setImportResult(null);
    setResolutions({});

    await runDryRun(selectedFile);
  };

  const runDryRun = async (selectedFile) => {
    setIsValidating(true);
    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("type", importType);

    try {
      const res = await validateImportAction(formData);
      if (res.success) {
        setReport(res.report);
        // Pre-populate resolutions default values: "Replace" if conflict exists, "Duplicate" otherwise
        const initialResolutions = {};
        res.report.rows.forEach(row => {
          if (row.isValid) {
            initialResolutions[row.rowNumber] = row.conflict ? "Replace" : "Duplicate";
          }
        });
        setResolutions(initialResolutions);
        toast.success("Validation dry-run completed successfully.");
      } else {
        toast.error(res.error || "Failed to validate spreadsheet file.");
      }
    } catch (err) {
      toast.error("An error occurred during file dry-run validation.");
    } finally {
      setIsValidating(false);
    }
  };

  const handleResolutionChange = (rowNumber, val) => {
    setResolutions(prev => ({
      ...prev,
      [rowNumber]: val
    }));
  };

  const handleCommitImport = async () => {
    if (!report || isCommitting) return;
    setIsCommitting(true);

    try {
      const validRows = report.rows.filter(r => r.isValid);
      const res = await commitImportAction(validRows, importType, resolutions);

      if (res.success) {
        setImportResult({
          stats: res.stats,
          migrationId: res.migrationId
        });
        toast.success("Onboarding data successfully imported.");
        setFile(null);
        setFileName("");
        await fetchSummary();
      } else {
        toast.error(res.error || "Failed to commit data import.");
      }
    } catch (err) {
      toast.error("An error occurred while writing import data.");
    } finally {
      setIsCommitting(false);
    }
  };

  const downloadImportLog = () => {
    if (!importResult) return;
    const logText = [
      `=== Business Mart - Import Statistics & Audit Trail ===`,
      `Migration ID: ${importResult.migrationId}`,
      `Date/Time: ${new Date().toLocaleString()}`,
      `Type: ${importType}`,
      `----------------------------------------------------`,
      `Created Records: ${importResult.stats.created}`,
      `Replaced Records: ${importResult.stats.replaced}`,
      `Skipped Records: ${importResult.stats.skipped}`,
      `----------------------------------------------------`,
      `Audit Log Events:`,
      ...importResult.stats.logs.map(log => ` - ${log}`)
    ].join("\r\n");

    const blob = new Blob([logText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `import_log_${importResult.migrationId}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const resetImport = () => {
    setFile(null);
    setFileName("");
    setReport(null);
    setImportResult(null);
    setResolutions({});
    setShowUploader(false);
  };

  // Check if there are any active conflicts scheduled for replacement
  const hasActiveReplacements = report?.rows?.some(
    row => row.isValid && row.conflict && resolutions[row.rowNumber] === "Replace"
  );

  if (isLoadingSummary) {
    return (
      <div className="rounded-2xl border bg-card p-6 shadow-sm flex flex-col items-center justify-center min-h-[350px] space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        <p className="text-xs text-muted-foreground font-semibold">Loading onboarding status...</p>
      </div>
    );
  }

  const hasImportedData = dbSummary && (dbSummary.partiesCount > 0 || dbSummary.productsCount > 0);

  return (
    <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-xl">
            <FileSpreadsheet className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-card-foreground">Historical Onboarding Import</h2>
            <p className="text-xs text-muted-foreground">Import spreadsheet starting inventories and opening ledger positions.</p>
          </div>
        </div>

        {!report && !importResult && (!hasImportedData || showUploader) && (
          <button
            onClick={handleDownloadTemplate}
            className="flex items-center gap-1.5 px-3 py-1.5 border hover:bg-accent text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            Download {importType === "PARTIES" ? "Parties" : "Products"} Template
          </button>
        )}
      </div>

      {/* Database Onboarding Summary Status (Persisted) */}
      {!report && !importResult && hasImportedData && !showUploader && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col items-center justify-center text-center space-y-3 p-6 bg-emerald-500/5 rounded-2xl border border-emerald-500/20">
            <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-full">
              <CheckCircle className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold text-card-foreground">Historical Onboarding Complete</h3>
            <p className="text-xs text-muted-foreground max-w-md">
              Onboarding data has been established in this system. All existing modules are actively incorporating initial stocks and starting balances.
            </p>
          </div>

          <div className="rounded-xl border p-4 space-y-4">
            <h4 className="font-bold text-xs text-card-foreground">Imported Database Records</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div className="rounded-lg bg-accent/20 p-3">
                <span className="text-[10px] text-muted-foreground block font-bold">ONBOARDED PARTIES</span>
                <span className="text-lg font-extrabold text-indigo-600">{dbSummary.partiesCount}</span>
              </div>
              <div className="rounded-lg bg-accent/20 p-3">
                <span className="text-[10px] text-muted-foreground block font-bold">ONBOARDED PRODUCTS</span>
                <span className="text-lg font-extrabold text-teal-600">{dbSummary.productsCount}</span>
              </div>
              <div className="rounded-lg bg-accent/20 p-3">
                <span className="text-[10px] text-muted-foreground block font-bold">ACTIVE MIGRATION RUNS</span>
                <span className="text-lg font-extrabold text-amber-600">{dbSummary.migrationCount}</span>
              </div>
            </div>

            {dbSummary.migrationIds.length > 0 && (
              <div className="space-y-2">
                <span className="text-[10px] text-muted-foreground font-bold uppercase block">Migration Runs (Audit Trail)</span>
                <div className="max-h-28 overflow-y-auto border rounded-lg p-2 bg-accent/5 divide-y text-[11px] font-mono">
                  {dbSummary.migrationIds.map((id) => (
                    <div key={id} className="py-1 flex justify-between items-center text-muted-foreground">
                      <span>{id}</span>
                      <span className="text-[9px] bg-indigo-500/10 text-indigo-500 px-1.5 py-0.5 rounded font-sans">Active</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-4 border-t">
              <button
                onClick={() => setShowUploader(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-primary hover:bg-primary/95 text-primary-foreground text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer"
              >
                <UploadCloud className="h-4 w-4" />
                Import Additional Data
              </button>
            </div>
          </div>
        </div>
      )}

      {!report && !importResult && (!hasImportedData || showUploader) && (
        <div className="space-y-6">
          {/* Toggle Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => setImportType("PARTIES")}
              className={`flex items-center gap-3 p-4 rounded-xl border transition-all text-left cursor-pointer ${
                importType === "PARTIES"
                  ? "border-indigo-500 bg-indigo-500/5 text-indigo-500"
                  : "hover:bg-accent/40 text-muted-foreground"
              }`}
            >
              <div className="p-2 rounded-lg bg-current/10">
                <ChevronRight className="h-4 w-4" />
              </div>
              <div>
                <h4 className="font-bold text-xs">Parties & Balances Import</h4>
                <p className="text-[10px] opacity-80">Import supplier/buyer details & initial balances</p>
              </div>
            </button>

            <button
              onClick={() => setImportType("PRODUCTS")}
              className={`flex items-center gap-3 p-4 rounded-xl border transition-all text-left cursor-pointer ${
                importType === "PRODUCTS"
                  ? "border-indigo-500 bg-indigo-500/5 text-indigo-500"
                  : "hover:bg-accent/40 text-muted-foreground"
              }`}
            >
              <div className="p-2 rounded-lg bg-current/10">
                <ChevronRight className="h-4 w-4" />
              </div>
              <div>
                <h4 className="font-bold text-xs">Products & Stock Import</h4>
                <p className="text-[10px] opacity-80">Import inventory items & initial stock snapshots</p>
              </div>
            </button>
          </div>

          {/* Drag & Drop File Zone */}
          <div 
            onClick={triggerFileInput}
            className="flex flex-col items-center justify-center border-2 border-dashed border-muted-foreground/30 rounded-xl p-8 hover:bg-accent/10 transition-colors relative cursor-pointer"
          >
            <input
              type="file"
              ref={fileInputRef}
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <UploadCloud className="h-10 w-10 text-muted-foreground/50 mb-3" />
            <p className="text-sm font-semibold text-card-foreground">Upload Onboarding Spreadsheet</p>
            <p className="text-xs text-muted-foreground mt-1">Supports Excel (.xlsx, .xls) and CSV files</p>
          </div>
        </div>
      )}

      {/* Loading States */}
      {isValidating && (
        <div className="flex flex-col items-center justify-center p-12 space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground">Running spreadsheet validation dry-run...</p>
        </div>
      )}

      {/* Validation Dry-Run Report Dashboard */}
      {report && !isValidating && !importResult && (
        <div className="space-y-6">
          {/* File summary stats cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-xl border p-4 bg-accent/10">
              <span className="text-[10px] text-muted-foreground font-bold uppercase">Total Rows</span>
              <p className="text-lg font-extrabold">{report.totalRows}</p>
            </div>
            <div className="rounded-xl border p-4 bg-emerald-500/5 text-emerald-600">
              <span className="text-[10px] text-muted-foreground font-bold uppercase">Valid Rows</span>
              <p className="text-lg font-extrabold">{report.validCount}</p>
            </div>
            <div className="rounded-xl border p-4 bg-rose-500/5 text-rose-600">
              <span className="text-[10px] text-muted-foreground font-bold uppercase">Invalid Rows</span>
              <p className="text-lg font-extrabold">{report.invalidCount}</p>
            </div>
            <div className="rounded-xl border p-4 bg-amber-500/5 text-amber-600">
              <span className="text-[10px] text-muted-foreground font-bold uppercase">Duplicate Matches</span>
              <p className="text-lg font-extrabold">
                {report.rows.filter(r => r.isValid && r.conflict).length}
              </p>
            </div>
          </div>

          {/* Conditional Warning Alerts */}
          {hasActiveReplacements && report.hasExistingInitialization && (
            <div className="flex gap-3 p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 text-amber-600 text-xs">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <div className="space-y-1">
                <span className="font-bold">⚠️ Data Replacement Warning</span>
                <p className="opacity-90">
                  Selecting <span className="font-bold">"Replace"</span> on conflicting items will overwrite the existing initial stocks or opening balances with the values in the spreadsheet.
                </p>
              </div>
            </div>
          )}

          {/* Conflict Resolution Table */}
          {report.hasConflicts && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-card-foreground">Conflict Resolutions</h3>
              <div className="rounded-xl border overflow-x-auto max-h-64">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-accent/40 border-b">
                      <th className="p-3 font-semibold">Row</th>
                      <th className="p-3 font-semibold">Name</th>
                      <th className="p-3 font-semibold">Conflict Reason</th>
                      <th className="p-3 font-semibold">Resolution Choice</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {report.rows.filter(r => r.isValid && r.conflict).map((row) => (
                      <tr key={row.rowNumber} className="hover:bg-accent/10">
                        <td className="p-3 font-bold text-muted-foreground">{row.rowNumber}</td>
                        <td className="p-3 font-bold">{row.data.name}</td>
                        <td className="p-3 text-muted-foreground">
                          {row.conflict.matchType === "NAME_MATCH" && "Duplicate Name found"}
                          {row.conflict.matchType === "PHONE_MATCH" && "Duplicate Phone Number found"}
                          {row.conflict.matchType === "NAME_AND_PHONE" && "Duplicate Name & Phone number"}
                        </td>
                        <td className="p-3">
                          <select
                            value={resolutions[row.rowNumber]}
                            onChange={(e) => handleResolutionChange(row.rowNumber, e.target.value)}
                            className="bg-background border rounded px-2 py-1 text-xs cursor-pointer focus:ring-1 focus:ring-primary outline-none"
                          >
                            <option value="Replace">Replace</option>
                            <option value="Duplicate">Duplicate</option>
                            <option value="Skip">Skip</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Validation Failures / Spreadsheet Errors list */}
          {report.invalidCount > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-rose-600 flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4" />
                Spreadsheet Validation Failures ({report.invalidCount})
              </h3>
              <div className="rounded-xl border border-rose-200/50 bg-rose-500/5 p-4 max-h-48 overflow-y-auto space-y-2 text-[11px] font-mono">
                {report.rows.filter(r => !r.isValid).map((row) => (
                  <p key={row.rowNumber} className="text-rose-600">
                    <span className="font-bold">Row {row.rowNumber}:</span> {row.errors}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 justify-end pt-4 border-t">
            <button
              onClick={resetImport}
              className="px-4 py-2 border rounded-xl hover:bg-accent text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleCommitImport}
              disabled={isCommitting || report.validCount === 0}
              className="flex items-center justify-center gap-1.5 px-5 py-2.5 bg-primary hover:bg-primary/95 text-primary-foreground text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              {isCommitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Importing Data...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Commit Onboarding Data
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Onboarding Success Report Screen */}
      {importResult && (
        <div className="space-y-6 animate-in zoom-in-95 duration-200">
          <div className="flex flex-col items-center justify-center text-center space-y-3 p-6 bg-emerald-500/5 rounded-2xl border border-emerald-500/20">
            <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-full">
              <CheckCircle className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold text-card-foreground">Historical Onboarding Completed</h3>
            <p className="text-xs text-muted-foreground max-w-md">
              The spreadsheet data was successfully imported and committed under Batch migration ID: <span className="font-mono font-bold text-primary">{importResult.migrationId}</span>
            </p>
          </div>

          <div className="rounded-xl border p-4 space-y-4">
            <h4 className="font-bold text-xs text-card-foreground">Import Summary Results</h4>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="rounded-lg bg-accent/20 p-3">
                <span className="text-[10px] text-muted-foreground block font-bold">CREATED</span>
                <span className="text-lg font-extrabold text-indigo-600">{importResult.stats.created}</span>
              </div>
              <div className="rounded-lg bg-accent/20 p-3">
                <span className="text-[10px] text-muted-foreground block font-bold">REPLACED</span>
                <span className="text-lg font-extrabold text-amber-600">{importResult.stats.replaced}</span>
              </div>
              <div className="rounded-lg bg-accent/20 p-3">
                <span className="text-[10px] text-muted-foreground block font-bold">SKIPPED</span>
                <span className="text-lg font-extrabold text-rose-500">{importResult.stats.skipped}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t justify-between items-center">
              <button
                onClick={downloadImportLog}
                className="flex items-center gap-1.5 px-3.5 py-2 border rounded-xl hover:bg-accent text-xs font-bold transition-all cursor-pointer"
              >
                <FileText className="h-4 w-4 text-muted-foreground" />
                Download Import Log (.txt)
              </button>

              <button
                onClick={resetImport}
                className="flex items-center gap-1.5 px-4 py-2 bg-accent hover:bg-accent/80 text-card-foreground text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                <RotateCw className="h-4 w-4" />
                Import Another File
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
