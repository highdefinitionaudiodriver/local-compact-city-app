import React from "react";
import ReactPDF from "@react-pdf/renderer";
import { BrochureReport } from "../src/lib/pdf/brochure-report";
import path from "node:path";
import fs from "node:fs";

const outputDir = path.join(process.cwd(), "docs", "brochure");
const outputPath = path.join(outputDir, "brochure_ja.pdf");

// Ensure directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

console.log("Generating PDF: " + outputPath);

ReactPDF.renderToFile(<BrochureReport />, outputPath)
  .then(() => {
    console.log("PDF generation success!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("PDF generation failed:", err);
    process.exit(1);
  });
