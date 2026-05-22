import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const filePath = path.join(
      process.cwd(),
      "node_modules",
      "html2pdf.js",
      "dist",
      "html2pdf.bundle.min.js"
    );
    const fileContent = fs.readFileSync(filePath, "utf8");
    return new NextResponse(fileContent, {
      headers: {
        "Content-Type": "application/javascript",
        "Cache-Control": "public, max-age=31536000, immutable"
      }
    });
  } catch (error) {
    console.error("Failed to read html2pdf.bundle.min.js:", error);
    return new NextResponse("console.error('html2pdf library could not be loaded');", {
      status: 500,
      headers: { "Content-Type": "application/javascript" }
    });
  }
}
