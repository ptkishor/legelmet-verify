/**
 * Government Verification Certificate (Form VII) PDF Generator
 * Built for LegalMet Verify — Smart India Hackathon 2026
 *
 * Implements Form VII under Rule 14 of the Legal Metrology (General) Rules, 2011.
 * Uses pdf-lib for client-side vector PDF generation with embedded QR codes and
 * 256-bit HMAC tamper-evident digital verification seals.
 *
 * NOTE: Standard Helvetica fonts in PDF use WinAnsi encoding (0x20 to 0x7E).
 * All text is strictly filtered through cleanAscii() to prevent encoding errors.
 */

import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import QRCode from "qrcode";

export interface CertificatePdfData {
  certificateNo: string;
  digitalId: string;
  issuedAt: string;
  validTill: string;
  signatureHash: string;
  // Instrument details
  make: string;
  model: string;
  serialNo: string;
  category: string;
  capacity?: string;
  accuracyClass?: string;
  // Shop & Jurisdiction
  shopName: string;
  address?: string;
  district: string;
  state: string;
  // Officer details
  officerName: string;
  officerDesignation?: string;
  verificationSealNo?: string;
  remarks?: string;
}

/**
 * Strips or replaces non-ASCII / Unicode characters to prevent WinAnsi encoding crashes.
 */
function cleanAscii(text?: string | null): string {
  if (!text) return "";
  return text
    .replace(/[•●]/g, "-")
    .replace(/[—–]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Generates an official Form VII Verification Certificate PDF as Uint8Array bytes.
 */
export async function generateCertificatePdfBytes(
  data: CertificatePdfData
): Promise<Uint8Array> {
  // 1. Create a new A4 PDF document (595.28 x 841.89 points)
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();

  // 2. Embed standard fonts
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontMono = await pdfDoc.embedFont(StandardFonts.CourierBold);
  const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  // 3. Generate QR code as PNG data URL
  const verifyUrl = `${window.location.origin}/verify/${cleanAscii(data.digitalId)}`;
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
    margin: 1,
    width: 250,
    color: {
      dark: "#0F172A",
      light: "#FFFFFF",
    },
  });
  const qrImageBytes = await fetch(qrDataUrl).then((res) => res.arrayBuffer());
  const qrImage = await pdfDoc.embedPng(qrImageBytes);

  // Colors
  const navy = rgb(0.04, 0.23, 0.55); // #0B3C8D
  const darkSlate = rgb(0.09, 0.13, 0.24);
  const mutedText = rgb(0.4, 0.45, 0.55);
  const saffron = rgb(0.95, 0.55, 0.15); // Indian Saffron
  const green = rgb(0.07, 0.53, 0.03); // Indian Green
  const gold = rgb(0.85, 0.65, 0.13);

  // 4. Background Security Border
  // Outer margin border
  page.drawRectangle({
    x: 20,
    y: 20,
    width: width - 40,
    height: height - 40,
    borderColor: navy,
    borderWidth: 2,
  });

  // Inner thin border
  page.drawRectangle({
    x: 24,
    y: 24,
    width: width - 48,
    height: height - 48,
    borderColor: gold,
    borderWidth: 0.8,
  });

  // Top Tricolor Accent Bar
  const barWidth = (width - 48) / 3;
  page.drawRectangle({
    x: 24,
    y: height - 28,
    width: barWidth,
    height: 4,
    color: saffron,
  });
  page.drawRectangle({
    x: 24 + barWidth,
    y: height - 28,
    width: barWidth,
    height: 4,
    color: rgb(0.9, 0.9, 0.9),
  });
  page.drawRectangle({
    x: 24 + barWidth * 2,
    y: height - 28,
    width: barWidth,
    height: 4,
    color: green,
  });

  // 5. Official Header
  let currentY = height - 55;

  page.drawText("GOVERNMENT OF INDIA", {
    x: width / 2 - fontBold.widthOfTextAtSize("GOVERNMENT OF INDIA", 13) / 2,
    y: currentY,
    size: 13,
    font: fontBold,
    color: navy,
  });

  currentY -= 16;
  const stateHeader = `DEPARTMENT OF LEGAL METROLOGY - ${cleanAscii(data.state).toUpperCase()}`;
  page.drawText(stateHeader, {
    x: width / 2 - fontBold.widthOfTextAtSize(stateHeader, 10.5) / 2,
    y: currentY,
    size: 10.5,
    font: fontBold,
    color: darkSlate,
  });

  currentY -= 14;
  page.drawText("OFFICE OF THE ASSISTANT CONTROLLER / INSPECTOR OF LEGAL METROLOGY", {
    x:
      width / 2 -
      fontRegular.widthOfTextAtSize(
        "OFFICE OF THE ASSISTANT CONTROLLER / INSPECTOR OF LEGAL METROLOGY",
        8.5
      ) / 2,
    y: currentY,
    size: 8.5,
    font: fontRegular,
    color: mutedText,
  });

  currentY -= 22;
  // Form VII Statutory Banner
  page.drawRectangle({
    x: 60,
    y: currentY - 6,
    width: width - 120,
    height: 24,
    color: rgb(0.95, 0.97, 1.0),
    borderColor: navy,
    borderWidth: 1,
  });

  page.drawText("FORM VII [See Rule 14] - CERTIFICATE OF VERIFICATION", {
    x:
      width / 2 -
      fontBold.widthOfTextAtSize(
        "FORM VII [See Rule 14] - CERTIFICATE OF VERIFICATION",
        10
      ) / 2,
    y: currentY + 1,
    size: 10,
    font: fontBold,
    color: navy,
  });

  // 6. Certificate & Digital ID Reference Strip
  currentY -= 32;

  page.drawText("Certificate No:", {
    x: 45,
    y: currentY,
    size: 9,
    font: fontRegular,
    color: mutedText,
  });
  page.drawText(cleanAscii(data.certificateNo), {
    x: 120,
    y: currentY,
    size: 9.5,
    font: fontBold,
    color: darkSlate,
  });

  page.drawText("National Digital ID:", {
    x: 320,
    y: currentY,
    size: 9,
    font: fontRegular,
    color: mutedText,
  });
  page.drawText(cleanAscii(data.digitalId), {
    x: 420,
    y: currentY,
    size: 9.5,
    font: fontMono,
    color: navy,
  });

  currentY -= 16;
  const issuedDateStr = new Date(data.issuedAt).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const validDateStr = new Date(data.validTill).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  page.drawText("Date of Verification:", {
    x: 45,
    y: currentY,
    size: 9,
    font: fontRegular,
    color: mutedText,
  });
  page.drawText(cleanAscii(issuedDateStr), {
    x: 145,
    y: currentY,
    size: 9,
    font: fontBold,
    color: darkSlate,
  });

  page.drawText("Statutory Validity Till:", {
    x: 320,
    y: currentY,
    size: 9,
    font: fontRegular,
    color: mutedText,
  });
  page.drawText(cleanAscii(validDateStr), {
    x: 430,
    y: currentY,
    size: 9,
    font: fontBold,
    color: green,
  });

  // Horizontal separator line
  currentY -= 14;
  page.drawLine({
    start: { x: 45, y: currentY },
    end: { x: width - 45, y: currentY },
    thickness: 0.8,
    color: rgb(0.85, 0.88, 0.92),
  });

  // 7. Commercial Establishment Section
  currentY -= 20;
  page.drawText("1. ESTABLISHMENT & PREMISES DETAILS", {
    x: 45,
    y: currentY,
    size: 9.5,
    font: fontBold,
    color: navy,
  });

  currentY -= 16;
  page.drawText("Name of Trader / Establishment:", {
    x: 55,
    y: currentY,
    size: 8.5,
    font: fontRegular,
    color: mutedText,
  });
  page.drawText(cleanAscii(data.shopName), {
    x: 210,
    y: currentY,
    size: 9,
    font: fontBold,
    color: darkSlate,
  });

  currentY -= 14;
  page.drawText("Premises Location / Jurisdiction:", {
    x: 55,
    y: currentY,
    size: 8.5,
    font: fontRegular,
    color: mutedText,
  });
  const premisesStr = `${cleanAscii(data.address) || "Sadar Bazar"}, ${cleanAscii(data.district)}, ${cleanAscii(data.state)}`;
  page.drawText(premisesStr, {
    x: 210,
    y: currentY,
    size: 8.5,
    font: fontRegular,
    color: darkSlate,
  });

  // 8. Instrument Specifications Table
  currentY -= 24;
  page.drawText("2. VERIFIED WEIGHING / MEASURING INSTRUMENT SPECIFICATIONS", {
    x: 45,
    y: currentY,
    size: 9.5,
    font: fontBold,
    color: navy,
  });

  currentY -= 14;
  // Table Box
  const tableHeight = 70;
  page.drawRectangle({
    x: 45,
    y: currentY - tableHeight,
    width: width - 90,
    height: tableHeight,
    color: rgb(0.98, 0.99, 1.0),
    borderColor: rgb(0.8, 0.85, 0.9),
    borderWidth: 0.8,
  });

  // Table row 1
  let tableY = currentY - 16;
  page.drawText("Manufacturer / Make:", { x: 55, y: tableY, size: 8, font: fontRegular, color: mutedText });
  page.drawText(cleanAscii(data.make), { x: 155, y: tableY, size: 8.5, font: fontBold, color: darkSlate });

  page.drawText("Model / Trade Name:", { x: 310, y: tableY, size: 8, font: fontRegular, color: mutedText });
  page.drawText(cleanAscii(data.model), { x: 415, y: tableY, size: 8.5, font: fontBold, color: darkSlate });

  // Table row 2
  tableY -= 18;
  page.drawText("Serial Number:", { x: 55, y: tableY, size: 8, font: fontRegular, color: mutedText });
  page.drawText(cleanAscii(data.serialNo), { x: 155, y: tableY, size: 8.5, font: fontMono, color: navy });

  page.drawText("Equipment Category:", { x: 310, y: tableY, size: 8, font: fontRegular, color: mutedText });
  page.drawText(cleanAscii(data.category), { x: 415, y: tableY, size: 8, font: fontRegular, color: darkSlate });

  // Table row 3
  tableY -= 18;
  page.drawText("Rated Capacity:", { x: 55, y: tableY, size: 8, font: fontRegular, color: mutedText });
  page.drawText(cleanAscii(data.capacity) || "Commercial Specification", { x: 155, y: tableY, size: 8.5, font: fontBold, color: darkSlate });

  page.drawText("Accuracy Class:", { x: 310, y: tableY, size: 8, font: fontRegular, color: mutedText });
  page.drawText(cleanAscii(data.accuracyClass) || "Class III", { x: 415, y: tableY, size: 8.5, font: fontBold, color: green });

  currentY = currentY - tableHeight - 16;

  // 9. Statutory Verification Declaration
  page.drawText("3. STATUTORY VERIFICATION & STAMPING DECLARATION", {
    x: 45,
    y: currentY,
    size: 9.5,
    font: fontBold,
    color: navy,
  });

  currentY -= 14;
  const legalDeclaration1 =
    "I hereby certify that I have this day examined, tested and calibrated the weighing/measuring instrument";
  const legalDeclaration2 =
    "described above with standard working weights/measures in accordance with the Legal Metrology Act, 2009";
  const legalDeclaration3 =
    "and Legal Metrology (General) Rules, 2011, and found it to conform with statutory tolerance limits.";

  page.drawText(legalDeclaration1, { x: 55, y: currentY, size: 8, font: fontItalic, color: darkSlate });
  currentY -= 11;
  page.drawText(legalDeclaration2, { x: 55, y: currentY, size: 8, font: fontItalic, color: darkSlate });
  currentY -= 11;
  page.drawText(legalDeclaration3, { x: 55, y: currentY, size: 8, font: fontItalic, color: darkSlate });

  // 10. Security Block (QR Code + HMAC Cryptographic Seal)
  currentY -= 20;
  const secBoxHeight = 105;
  page.drawRectangle({
    x: 45,
    y: currentY - secBoxHeight,
    width: width - 90,
    height: secBoxHeight,
    color: rgb(0.96, 0.98, 0.96),
    borderColor: rgb(0.7, 0.85, 0.7),
    borderWidth: 1,
  });

  // Draw QR Code
  page.drawImage(qrImage, {
    x: 55,
    y: currentY - secBoxHeight + 12,
    width: 80,
    height: 80,
  });

  // Security Block Text
  let secTextY = currentY - 18;
  page.drawText("TAMPER-EVIDENT CRYPTOGRAPHIC VERIFICATION SEAL", {
    x: 148,
    y: secTextY,
    size: 8.5,
    font: fontBold,
    color: green,
  });

  secTextY -= 12;
  page.drawText("Scan QR code using any smartphone or visit official LegalMet Verify portal to validate authenticity.", {
    x: 148,
    y: secTextY,
    size: 7.2,
    font: fontRegular,
    color: mutedText,
  });

  secTextY -= 16;
  page.drawText("SHA-256 HMAC Signature Hash (256-Bit):", {
    x: 148,
    y: secTextY,
    size: 7.5,
    font: fontBold,
    color: darkSlate,
  });

  secTextY -= 12;
  // Break HMAC into 2 lines for clean formatting
  const hashPart1 = cleanAscii(data.signatureHash).slice(0, 32);
  const hashPart2 = cleanAscii(data.signatureHash).slice(32);
  page.drawText(hashPart1, {
    x: 148,
    y: secTextY,
    size: 7.5,
    font: fontMono,
    color: navy,
  });
  secTextY -= 10;
  page.drawText(hashPart2, {
    x: 148,
    y: secTextY,
    size: 7.5,
    font: fontMono,
    color: navy,
  });

  secTextY -= 14;
  page.drawText(`Verification Lead-Wire Seal No: ${cleanAscii(data.verificationSealNo) || "HR-GGN-98442"}`, {
    x: 148,
    y: secTextY,
    size: 7.5,
    font: fontBold,
    color: saffron,
  });

  currentY = currentY - secBoxHeight - 24;

  // 11. Signatures & Official Endorsement
  page.drawText("Inspected & Stamped By:", {
    x: 360,
    y: currentY,
    size: 8.5,
    font: fontRegular,
    color: mutedText,
  });

  currentY -= 14;
  page.drawText(cleanAscii(data.officerName), {
    x: 360,
    y: currentY,
    size: 10,
    font: fontBold,
    color: navy,
  });

  currentY -= 12;
  page.drawText(cleanAscii(data.officerDesignation) || "Legal Metrology Officer", {
    x: 360,
    y: currentY,
    size: 8,
    font: fontRegular,
    color: darkSlate,
  });

  currentY -= 10;
  page.drawText(`District Legal Metrology Office, ${cleanAscii(data.district)}`, {
    x: 360,
    y: currentY,
    size: 7.5,
    font: fontRegular,
    color: mutedText,
  });

  // Footer / National Motto (Safe ASCII format)
  const footerMotto = "SATYAMEVA JAYATE  |  SMART INDIA HACKATHON 2026  |  PROBLEM STATEMENT 25036";
  page.drawText(footerMotto, {
    x: width / 2 - fontBold.widthOfTextAtSize(footerMotto, 7.5) / 2,
    y: 30,
    size: 7.5,
    font: fontBold,
    color: mutedText,
  });

  // 12. Save PDF
  return await pdfDoc.save();
}

/**
 * Triggers a browser download of the generated Form VII Verification Certificate.
 */
export async function downloadCertificatePdf(
  data: CertificatePdfData,
  filename?: string
): Promise<void> {
  const pdfBytes = await generateCertificatePdfBytes(data);
  const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename || `LegalMet_Certificate_${cleanAscii(data.certificateNo)}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
