import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { canViewSales, canViewSettlements, canViewLedger } from "@/lib/permissions";
import { ExportService } from "@/modules/export/services/ExportService";
import { exportSchemas } from "@/modules/export/schemas/exportSchemas";
import { mapRecordToSchema } from "@/modules/export/mappers/exportMappers";
import { generateExcelBuffer } from "@/modules/export/generators/excelGenerator";
import { generateCSVString } from "@/modules/export/generators/csvGenerator";
import { format } from "date-fns";

export async function GET(request, { params }) {
  try {
    // 1. Authenticate user session
    const session = await getSession();
    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // 2. Resolve dynamic resource parameter
    const { resource } = await params;
    
    // 3. Authorization check based on resource type
    let isAuthorized = false;
    if (resource === "sales") {
      isAuthorized = canViewSales(session.role);
    } else if (resource === "settlements") {
      isAuthorized = canViewSettlements(session.role);
    } else if (resource === "ledger") {
      isAuthorized = canViewLedger(session.role);
    }

    if (!isAuthorized) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    // 4. Parse query parameters
    const { searchParams } = new URL(request.url);
    const exportFormat = searchParams.get("format") || "xlsx";
    const searchQuery = searchParams.get("searchQuery") || "";
    const status = searchParams.get("status") || "ALL";
    const preset = searchParams.get("preset") || "all";
    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";
    const month = searchParams.get("month") || "";

    const filters = {
      searchQuery,
      status,
      dateFilter: {
        preset,
        startDate,
        endDate,
        month
      }
    };

    // 5. Retrieve schema definition
    const schema = exportSchemas[resource];
    if (!schema) {
      return new NextResponse(`Resource "${resource}" not found`, { status: 404 });
    }

    // 6. Fetch and filter raw dataset
    const dataset = await ExportService.getExportDataset(resource, filters);

    // 7. Map database records to flat export schemas
    const mappedData = dataset.map(record => mapRecordToSchema(record, schema));

    // 8. Generate standardized filename: e.g. Sales_2026-06-10_18-45.xlsx
    const now = new Date();
    const timestamp = format(now, "yyyy-MM-dd_HH-mm");
    
    let resourceLabel = "Export";
    if (resource === "sales") resourceLabel = "Sales";
    else if (resource === "settlements") resourceLabel = "SupplierSettlements";
    else if (resource === "ledger") resourceLabel = "Ledger";

    const filename = `${resourceLabel}_${timestamp}.${exportFormat}`;

    // 9. Generate file payload and respond
    if (exportFormat === "xlsx") {
      const buffer = generateExcelBuffer(mappedData, resourceLabel);
      
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${filename}"`
        }
      });
    } else if (exportFormat === "csv") {
      const csvContent = generateCSVString(mappedData);
      
      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`
        }
      });
    } else {
      return new NextResponse(`Format "${exportFormat}" not supported`, { status: 400 });
    }
  } catch (error) {
    console.error("Export endpoint error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
