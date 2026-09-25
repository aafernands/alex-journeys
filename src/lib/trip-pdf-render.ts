/**
 * Lazy-loaded PDF painter. Imported only after a traveler picks a section.
 */
import { jsPDF } from "jspdf";
import type { PdfBlock, PdfRow, TripPdfDocument } from "@/lib/trip-pdf";

export type TripPdfFontBytes = {
  outfit: Uint8Array;
  inter: Uint8Array;
  interMedium: Uint8Array;
};

type FontSet = {
  display: "Outfit" | "helvetica";
  body: "Inter" | "helvetica";
};

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 46;
const BOTTOM = 52;
const CONTENT_W = PAGE_W - MARGIN * 2;
const LOGO_H = 11;

const PAPER: Rgb = [246, 240, 230];
const INK: Rgb = [31, 26, 20];
const TEXT: Rgb = [63, 56, 46];
const MUTED: Rgb = [138, 125, 107];
const ACCENT: Rgb = [217, 119, 6];
const WHITE: Rgb = [255, 252, 247];
const BORDER: Rgb = [224, 212, 194];

type Rgb = readonly [number, number, number];

const PDF_CHAR =
  /[^\n\u0020-\u024F\u02B0-\u02FF\u2000-\u206F\u20A0-\u20CF\u2116\u2122\u2190-\u21FF\u2212]/g;

function pdfText(value: string): string {
  return value.replace(/\r\n/g, "\n").replace(PDF_CHAR, "").trim();
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  }
  return btoa(binary);
}

function registerFonts(doc: jsPDF, fonts: TripPdfFontBytes | undefined): FontSet {
  if (!fonts) return { display: "helvetica", body: "helvetica" };
  try {
    doc.addFileToVFS("Outfit-SemiBold.ttf", bytesToBase64(fonts.outfit));
    doc.addFont("Outfit-SemiBold.ttf", "Outfit", "normal");
    doc.addFileToVFS("Inter-Regular.ttf", bytesToBase64(fonts.inter));
    doc.addFont("Inter-Regular.ttf", "Inter", "normal");
    doc.addFileToVFS("Inter-Medium.ttf", bytesToBase64(fonts.interMedium));
    doc.addFont("Inter-Medium.ttf", "Inter", "bold");
    doc.setFont("Inter", "normal");
    doc.getTextWidth("Alex");
    return { display: "Outfit", body: "Inter" };
  } catch {
    return { display: "helvetica", body: "helvetica" };
  }
}

class Painter {
  readonly doc: jsPDF;
  readonly fonts: FontSet;
  readonly document: TripPdfDocument;
  readonly logo: Uint8Array | undefined;
  page = 1;
  y = 0;

  constructor(
    document: TripPdfDocument,
    fonts: TripPdfFontBytes | undefined,
    logo: Uint8Array | undefined,
  ) {
    this.document = document;
    this.logo = logo;
    this.doc = new jsPDF({
      unit: "pt",
      format: "a4",
      compress: true,
      putOnlyUsedFonts: true,
    });
    this.fonts = registerFonts(this.doc, fonts);
    this.doc.setProperties({
      title: `${document.title} — ${document.sectionLabel}`,
      author: document.brand,
      creator: document.brand,
      subject: document.dates || document.destination || document.sectionLabel,
    });
    this.paintPaper();
    this.y = this.drawMasthead();
  }

  private setFill(color: Rgb) {
    this.doc.setFillColor(color[0], color[1], color[2]);
  }

  private setDraw(color: Rgb) {
    this.doc.setDrawColor(color[0], color[1], color[2]);
  }

  private setInk(color: Rgb) {
    this.doc.setTextColor(color[0], color[1], color[2]);
  }

  private useDisplay() {
    if (this.fonts.display === "Outfit") this.doc.setFont("Outfit", "normal");
    else this.doc.setFont("helvetica", "bold");
  }

  private useBody(weight: "normal" | "bold") {
    if (this.fonts.body === "Inter") this.doc.setFont("Inter", weight);
    else this.doc.setFont("helvetica", weight === "bold" ? "bold" : "normal");
  }

  private paintPaper() {
    this.setFill(PAPER);
    this.doc.rect(0, 0, PAGE_W, PAGE_H, "F");
    this.setFill(ACCENT);
    this.doc.rect(0, 0, PAGE_W, 7, "F");
  }

  private wrap(
    text: string,
    width: number,
    options: { weight?: "normal" | "bold"; size?: number; display?: boolean } = {},
  ): string[] {
    const clean = pdfText(text).replace(/\n+/g, " ");
    if (!clean) return [];
    if (options.display) this.useDisplay();
    else this.useBody(options.weight ?? "normal");
    if (options.size) this.doc.setFontSize(options.size);
    const wrapped = this.doc.splitTextToSize(clean, width) as string | string[];
    return (Array.isArray(wrapped) ? wrapped : [wrapped]).filter(Boolean);
  }

  private wrapParagraphs(text: string, width: number, size = 10.5): string[] {
    const clean = pdfText(text);
    if (!clean) return [];
    const lines: string[] = [];
    for (const part of clean.split(/\n+/)) {
      const wrapped = this.wrap(part, width, { size });
      if (wrapped.length === 0) continue;
      if (lines.length > 0) lines.push("");
      lines.push(...wrapped);
    }
    return lines.slice(0, 48);
  }

  private ensure(height: number) {
    if (this.y + height <= PAGE_H - BOTTOM) return;
    this.doc.addPage();
    this.page += 1;
    this.paintPaper();
    this.y = this.drawRunningHeader();
  }

  private drawMasthead(): number {
    let y = 36;
    this.useDisplay();
    this.doc.setFontSize(11);
    this.setInk(INK);
    this.doc.text(this.document.brand.toUpperCase(), MARGIN, y);
    this.useBody("bold");
    this.doc.setFontSize(11);
    this.setInk(ACCENT);
    this.doc.text(this.document.sectionLabel, PAGE_W - MARGIN, y, { align: "right" });

    y += 16;
    this.setDraw(BORDER);
    this.doc.setLineWidth(0.6);
    this.doc.line(MARGIN, y, PAGE_W - MARGIN, y);

    y += 28;
    const titleLines = this.wrap(this.document.title, CONTENT_W, { display: true, size: 24 });
    this.useDisplay();
    this.doc.setFontSize(24);
    this.setInk(INK);
    for (const line of titleLines.slice(0, 3)) {
      this.doc.text(line, MARGIN, y);
      y += 28;
    }

    if (this.document.travelerName) {
      const prepared = this.wrap(`Prepared for ${this.document.travelerName}`, CONTENT_W, {
        size: 11,
      });
      this.useBody("normal");
      this.doc.setFontSize(11);
      this.setInk(TEXT);
      for (const row of prepared.slice(0, 2)) {
        this.doc.text(row, MARGIN, y);
        y += 15;
      }
    }

    const meta = [this.document.dates, this.document.destination].filter(Boolean);
    for (const line of meta) {
      const wrapped = this.wrap(line, CONTENT_W, { weight: "bold", size: 11 });
      this.useBody("bold");
      this.doc.setFontSize(11);
      this.setInk(TEXT);
      for (const row of wrapped) {
        this.doc.text(row, MARGIN, y);
        y += 15;
      }
    }
    return y + 8;
  }

  private drawRunningHeader(): number {
    this.useDisplay();
    this.doc.setFontSize(10);
    this.setInk(INK);
    this.doc.text(this.document.brand, MARGIN, 32);
    const brandWidth = this.doc.getTextWidth(this.document.brand);
    const right = pdfText(`${this.document.title} · ${this.document.sectionLabel}`);
    const rightLines = this.wrap(right, PAGE_W - MARGIN * 2 - brandWidth - 18, {
      size: 10,
    });
    this.useBody("normal");
    this.doc.setFontSize(10);
    this.setInk(MUTED);
    this.doc.text(rightLines[0] ?? "", PAGE_W - MARGIN, 32, { align: "right" });
    this.setDraw(BORDER);
    this.doc.setLineWidth(0.6);
    this.doc.line(MARGIN, 40, PAGE_W - MARGIN, 40);
    return 58;
  }

  private logoSize(): { width: number; height: number } | null {
    if (!this.logo) return null;
    try {
      const props = this.doc.getImageProperties(this.logo);
      if (!props.width || !props.height) return null;
      const height = LOGO_H;
      const width = Math.min(height * (props.width / props.height), 120);
      return { width, height };
    } catch {
      return null;
    }
  }

  private stampFooters() {
    const count = this.doc.getNumberOfPages();
    const logo = this.logoSize();
    const ruleY = PAGE_H - 40;
    const logoY = ruleY + 8;
    for (let index = 1; index <= count; index += 1) {
      this.doc.setPage(index);
      this.setDraw(BORDER);
      this.doc.setLineWidth(0.6);
      this.doc.line(MARGIN, ruleY, PAGE_W - MARGIN, ruleY);
      let textX = MARGIN;
      if (logo && this.logo) {
        try {
          this.doc.addImage(
            this.logo,
            "PNG",
            MARGIN,
            logoY,
            logo.width,
            logo.height,
            "trip-pdf-logo",
          );
          textX = MARGIN + logo.width + 8;
        } catch {
          textX = MARGIN;
        }
      }
      this.useBody("normal");
      this.doc.setFontSize(8);
      this.setInk(MUTED);
      const textY = logo ? logoY + logo.height - 1.5 : PAGE_H - 22;
      this.doc.text(this.document.site, textX, textY);
      this.doc.text(`${index} / ${count}`, PAGE_W - MARGIN, textY, { align: "right" });
    }
  }

  private section(title: string) {
    this.ensure(46);
    this.y += 8;
    this.setFill(ACCENT);
    this.doc.rect(MARGIN, this.y, 22, 3, "F");
    this.y += 18;
    this.useDisplay();
    this.doc.setFontSize(16);
    this.setInk(INK);
    this.doc.text(pdfText(title), MARGIN, this.y);
    this.y += 16;
  }

  private day(label: string, detail: string) {
    this.ensure(36);
    this.y += 8;
    this.useDisplay();
    this.doc.setFontSize(13);
    this.setInk(ACCENT);
    const labelText = pdfText(label);
    this.doc.text(labelText, MARGIN, this.y);
    if (detail) {
      const width = this.doc.getTextWidth(labelText);
      this.useBody("normal");
      this.doc.setFontSize(11);
      this.setInk(MUTED);
      this.doc.text(pdfText(detail), MARGIN + width + 10, this.y);
    }
    this.y += 8;
    this.setDraw(BORDER);
    this.doc.setLineWidth(0.4);
    this.doc.line(MARGIN, this.y, PAGE_W - MARGIN, this.y);
    this.y += 14;
  }

  private message(text: string) {
    const lines = this.wrap(text, CONTENT_W - 24, { size: 11 });
    const height = Math.max(36, lines.length * 15 + 18);
    this.ensure(height + 6);
    this.setFill(WHITE);
    this.setDraw(BORDER);
    this.doc.setLineWidth(0.8);
    this.doc.roundedRect(MARGIN, this.y, CONTENT_W, height, 8, 8, "FD");
    this.setInk(TEXT);
    this.useBody("normal");
    this.doc.setFontSize(11);
    let lineY = this.y + 20;
    for (const line of lines) {
      this.doc.text(line, MARGIN + 12, lineY);
      lineY += 15;
    }
    this.y += height + 10;
  }

  private plan(block: Extract<PdfBlock, { type: "plan" }>) {
    const timeW = 58;
    const textW = CONTENT_W - timeW;
    const meta = block.lines.flatMap((line) => this.wrap(line, textW, { size: 10 }));
    const notes = this.wrapParagraphs(block.notes, textW);
    const title = this.wrap(block.title, textW, { weight: "bold", size: 12 });
    const height = 4 + title.length * 15 + meta.length * 13 + (notes.length ? notes.length * 14 + 4 : 0) + 10;
    this.ensure(height);
    const top = this.y;
    if (block.time) {
      this.useBody("bold");
      this.doc.setFontSize(11);
      this.setInk(ACCENT);
      this.doc.text(pdfText(block.time), MARGIN, top + 12);
    }
    let lineY = top + 12;
    this.useBody("bold");
    this.doc.setFontSize(12);
    this.setInk(INK);
    for (const line of title) {
      this.doc.text(line, MARGIN + timeW, lineY);
      lineY += 15;
    }
    this.useBody("normal");
    this.doc.setFontSize(10);
    this.setInk(MUTED);
    for (const line of meta) {
      this.doc.text(line, MARGIN + timeW, lineY);
      lineY += 13;
    }
    if (notes.length) {
      lineY += 2;
      this.useBody("normal");
      this.doc.setFontSize(10.5);
      this.setInk(TEXT);
      for (const line of notes) {
        if (!line) {
          lineY += 6;
          continue;
        }
        this.doc.text(line, MARGIN + timeW, lineY);
        lineY += 14;
      }
    }
    this.y = top + height;
  }

  private category(title: string) {
    this.ensure(28);
    this.y += 6;
    this.useDisplay();
    this.doc.setFontSize(13);
    this.setInk(INK);
    this.doc.text(pdfText(title), MARGIN, this.y + 12);
    this.y += 22;
  }

  private check(label: string, checked: boolean) {
    const textW = CONTENT_W - 24;
    const lines = this.wrap(label, textW, { size: 11 });
    const height = Math.max(22, lines.length * 14 + 8);
    this.ensure(height);
    const box = 12;
    const boxY = this.y + 2;
    this.doc.setLineWidth(1);
    this.doc.setLineCap("round");
    this.doc.setLineJoin("round");
    if (checked) {
      this.setFill(ACCENT);
      this.setDraw(ACCENT);
      this.doc.roundedRect(MARGIN, boxY, box, box, 2, 2, "FD");
      this.setDraw(WHITE);
      this.doc.setLineWidth(1.6);
      this.doc.line(MARGIN + 2.4, boxY + 6.2, MARGIN + 5, boxY + 9.1);
      this.doc.line(MARGIN + 5, boxY + 9.1, MARGIN + 9.7, boxY + 3.1);
    } else {
      this.setDraw(INK);
      this.doc.roundedRect(MARGIN, boxY, box, box, 2, 2, "S");
    }
    this.useBody("normal");
    this.doc.setFontSize(11);
    this.setInk(TEXT);
    let lineY = this.y + 12;
    for (const line of lines) {
      this.doc.text(line, MARGIN + 20, lineY);
      lineY += 14;
    }
    this.y += height;
  }

  private booking(block: Extract<PdfBlock, { type: "booking" }>) {
    const inner = CONTENT_W - 28;
    const title = this.wrap(block.title, inner, { display: true, size: 14 });
    const noteLines = this.wrapParagraphs(block.notes, inner, 10);
    const rowHeight = (row: PdfRow) => {
      const value = this.wrap(row.value, inner - 108, { size: 11 });
      return Math.max(16, value.length * 13);
    };
    const rowsHeight = block.rows.reduce((sum, row) => sum + rowHeight(row), 0);
    const notesHeight = noteLines.length ? noteLines.length * 13 + 8 : 0;
    const height = 18 + 16 + title.length * 16 + 8 + rowsHeight + notesHeight + 16;
    this.ensure(height + 8);
    const top = this.y;
    this.setFill(WHITE);
    this.setDraw(BORDER);
    this.doc.setLineWidth(0.9);
    this.doc.roundedRect(MARGIN, top, CONTENT_W, height, 8, 8, "FD");

    let lineY = top + 18;
    this.useBody("bold");
    this.doc.setFontSize(9);
    this.setInk(ACCENT);
    this.doc.setCharSpace(0.6);
    this.doc.text(pdfText(block.kind).toUpperCase(), MARGIN + 16, lineY);
    this.doc.setCharSpace(0);
    this.useBody("normal");
    this.setInk(MUTED);
    this.doc.text(pdfText(block.status), PAGE_W - MARGIN - 14, lineY, { align: "right" });
    lineY += 18;
    this.useDisplay();
    this.doc.setFontSize(14);
    this.setInk(INK);
    for (const line of title) {
      this.doc.text(line, MARGIN + 16, lineY);
      lineY += 16;
    }
    lineY += 2;
    for (const row of block.rows) {
      const values = this.wrap(row.value, inner - 108, { size: 11 });
      this.useBody("bold");
      this.doc.setFontSize(9);
      this.setInk(MUTED);
      this.doc.text(pdfText(row.label).toUpperCase(), MARGIN + 16, lineY);
      this.useBody("normal");
      this.doc.setFontSize(11);
      this.setInk(TEXT);
      let valueY = lineY;
      for (const line of values) {
        this.doc.text(line, MARGIN + 124, valueY);
        valueY += 13;
      }
      lineY += Math.max(16, values.length * 13);
    }
    if (noteLines.length) {
      lineY += 4;
      this.useBody("normal");
      this.doc.setFontSize(10);
      this.setInk(TEXT);
      for (const line of noteLines) {
        if (!line) {
          lineY += 6;
          continue;
        }
        this.doc.text(line, MARGIN + 16, lineY);
        lineY += 13;
      }
    }
    this.y = top + height + 10;
  }

  draw(blocks: PdfBlock[]) {
    for (const block of blocks) {
      if (block.type === "section") this.section(block.title);
      else if (block.type === "day") this.day(block.label, block.detail);
      else if (block.type === "message") this.message(block.text);
      else if (block.type === "plan") this.plan(block);
      else if (block.type === "category") this.category(block.title);
      else if (block.type === "check") this.check(block.label, block.checked);
      else this.booking(block);
    }
    this.stampFooters();
    return new Uint8Array(this.doc.output("arraybuffer"));
  }
}

export async function renderTripPdf(
  document: TripPdfDocument,
  fonts?: TripPdfFontBytes,
  logo?: Uint8Array,
): Promise<Uint8Array> {
  return new Painter(document, fonts, logo).draw(document.blocks);
}
