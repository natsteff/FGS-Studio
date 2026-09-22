import {validate} from "./fgs.js";

const sizes = {letter:[612,792],a4:[595.28,841.89]};
const margin = 36;
const gap = 16;
const rowGap = 14;
// Match Forge's FGS v1 PDF geometry; taller rows falsely rejected valid sheets.
const tableTitleHeight = 22;
const tableRowHeight = 19;

function wrap(context, text, maxWidth) {
  const output = [];
  for (const paragraph of String(text).split("\n")) {
    let line = "";
    for (const word of paragraph.split(/\s+/)) {
      const candidate = line ? `${line} ${word}` : word;
      if (context.measureText(candidate).width <= maxWidth || !line) line = candidate;
      else { output.push(line); line = word; }
    }
    output.push(line);
  }
  return output;
}
function text(context, value, x, y, width, size = 10, bold = false, color = "#242424", lineHeight = 14) {
  context.font = `${bold ? "bold " : ""}${size}px Arial, sans-serif`;
  context.fillStyle = color;
  const lines = wrap(context, value, width);
  lines.forEach((line, index) => context.fillText(line, x, y + index * lineHeight));
  return lines.length * lineHeight;
}
function linesFor(context, value, width, size = 10, bold = false) {
  context.font = `${bold ? "bold " : ""}${size}px Arial, sans-serif`;
  return wrap(context, value, width).length;
}
function scoreRows(block) { return block.show_total ? [...block.score_rows, block.total_label] : block.score_rows; }
function calculated(label) { return /^(grand total|total)$/i.test(label.trim()); }
function tableLayout(context, block, width) {
  const labels = scoreRows(block);
  const labelWidth = Math.max(68, width * (width < 350 && block.players.length <= 2 ? .5 : .26));
  const columnWidth = (width - labelWidth) / block.players.length;
  const playerLines = block.players.map((player, index) => {
    context.font = "bold 8px Arial, sans-serif";
    return wrap(context, player || `Player ${index + 1}`, columnWidth - 8);
  });
  const headerHeight = Math.max(tableRowHeight, ...playerLines.map((lines) => lines.length * 10 + 8));
  const labelLines = labels.map((label) => {
    context.font = "8.5px Arial, sans-serif";
    return wrap(context, label, labelWidth - 10);
  });
  const rowHeights = labelLines.map((lines, index) => Math.max(tableRowHeight, lines.length * 10 + 6 + (calculated(labels[index]) ? 7 : 0)));
  return {labels, labelWidth, columnWidth, playerLines, labelLines, headerHeight, rowHeights,
    height:tableTitleHeight + headerHeight + rowHeights.reduce((sum, height) => sum + height, 0)};
}
function drawCell(context, lines, x, top, width, height, {size = 8.5, bold = false, center = false, marker = false} = {}) {
  context.font = `${bold ? "bold " : ""}${size}px Arial, sans-serif`;
  context.fillStyle = "#242424";
  context.textAlign = center ? "center" : "left";
  const baseline = top + Math.max(size + 2, (height - lines.length * 10 - (marker ? 7 : 0)) / 2 + size);
  lines.forEach((line, index) => context.fillText(line, x, baseline + index * 10, width));
  if (marker) {
    context.font = "bold 5px Arial, sans-serif";
    context.fillStyle = "#555";
    context.fillText("CALCULATED", x, top + height - 3, width);
  }
  context.textAlign = "left";
}
function measure(context, block, width) {
  if (block.type === "header") return block.subtitle ? 54 : 40;
  if (block.type === "score_table") return tableLayout(context, block, width).height;
  if (block.type === "notes") return 27 + block.lines * 24;
  const textWidth = Math.max(90, width - (block.type === "checklist" ? 28 : 18));
  return 27 + block.items.reduce((sum, item) => sum + Math.max(1, linesFor(context, item, textWidth, 9.5)) * 13 + 3, 0);
}
function heading(context, title, x, y, width, accent) {
  context.font = "bold 12px Georgia, serif";
  context.fillStyle = "#171717";
  context.fillText(title, x, y + 14, width);
  context.strokeStyle = accent;
  context.lineWidth = 1.2;
  context.beginPath(); context.moveTo(x, y + 21); context.lineTo(x + width, y + 21); context.stroke();
}
function drawBlock(context, block, x, y, width, accent) {
  if (block.type === "header") {
    context.textAlign = "center";
    context.font = "bold 20px Georgia, serif";
    context.fillStyle = "#171717";
    context.fillText(block.title, x + width / 2, y + 25, width - 10);
    if (block.subtitle) text(context, block.subtitle, x + width / 2, y + 43, width - 10, 10);
    context.textAlign = "left";
    return;
  }
  heading(context, block.title, x, y, width, accent);
  if (block.type === "score_table") {
    const layout = tableLayout(context, block, width);
    const top = y + tableTitleHeight;
    const boundaries = [top, top + layout.headerHeight];
    layout.rowHeights.forEach((height) => boundaries.push(boundaries.at(-1) + height));
    layout.labels.forEach((label, index) => {
      if (!calculated(label)) return;
      context.fillStyle = "#f1f0ec";
      context.fillRect(x, boundaries[index + 1], width, layout.rowHeights[index]);
    });
    drawCell(context, ["Category"], x + 5, top, layout.labelWidth - 10, layout.headerHeight, {bold:true});
    layout.playerLines.forEach((lines, index) => drawCell(context, lines, x + layout.labelWidth + (index + .5) * layout.columnWidth, top, layout.columnWidth - 8, layout.headerHeight, {size:8,bold:true,center:true}));
    layout.labelLines.forEach((lines, index) => drawCell(context, lines, x + 5, boundaries[index + 1], layout.labelWidth - 10, layout.rowHeights[index], {bold:calculated(layout.labels[index]),marker:calculated(layout.labels[index])}));
    context.strokeStyle = "#333"; context.lineWidth = .5;
    boundaries.forEach((line) => {context.beginPath();context.moveTo(x,line);context.lineTo(x+width,line);context.stroke();});
    const verticals = [x, x + layout.labelWidth, ...Array.from({length:block.players.length}, (_, index) => x + layout.labelWidth + (index + 1) * layout.columnWidth)];
    verticals.forEach((line) => {context.beginPath();context.moveTo(line,top);context.lineTo(line,boundaries.at(-1));context.stroke();});
    return;
  }
  if (block.type === "notes") {
    context.strokeStyle = "#777";context.lineWidth = .5;
    for (let index = 0; index < block.lines; index++) {
      const line = y + 29 + index * 24;
      context.beginPath();context.moveTo(x,line);context.lineTo(x+width,line);context.stroke();
    }
    return;
  }
  let cursor = y + 40;
  for (const item of block.items) {
    if (block.type === "checklist") { context.strokeStyle = "#333"; context.strokeRect(x + 3, cursor - 9, 9, 9); }
    else text(context, "•", x + 5, cursor, 10, 10);
    const count = linesFor(context, item, width - 36);
    text(context, item, x + 22, cursor, width - 36, 10);
    cursor += Math.max(17, count * 14 + 3);
  }
}

export function render(document, canvas) {
  validate(document);
  let [width, height] = sizes[document.page.size];
  if (document.page.orientation === "landscape") [width, height] = [height, width];
  canvas.width = Math.round(width * 2);
  canvas.height = Math.round(height * 2);
  const context = canvas.getContext("2d");
  context.setTransform(2, 0, 0, 2, 0, 0);
  context.fillStyle = "#fff";
  context.fillRect(0, 0, width, height);
  let y = margin;
  for (const row of document.rows) {
    const columns = row.blocks.length;
    const columnWidth = (width - margin * 2 - (columns === 2 ? gap : 0)) / columns;
    const heightNeeded = Math.max(...row.blocks.map((block) => measure(context, block, columnWidth)));
    if (y + heightNeeded > height - margin) return {fits:false,width,height,overflow:row.blocks[0].title};
    row.blocks.forEach((block, index) => drawBlock(context, block, margin + index * (columnWidth + gap), y, columnWidth, document.theme.accent));
    y += heightNeeded + rowGap;
  }
  return {fits:true,width,height};
}

export async function downloadPdf(document, canvas) {
  const layout = render(document, canvas);
  if (!layout.fits) throw new Error(`“${layout.overflow}” does not fit on one page. Shorten the sheet or change orientation.`);
  if (!globalThis.PDFLib) throw new Error("The PDF library did not load. Try refreshing the page.");
  const pdf = await PDFLib.PDFDocument.create();
  const page = pdf.addPage([layout.width, layout.height]);
  const png = await pdf.embedPng(canvas.toDataURL("image/png"));
  page.drawImage(png, {x:0,y:0,width:layout.width,height:layout.height});
  pdf.setTitle(document.title);
  pdf.setCreator("FGS Studio");
  return new Blob([await pdf.save()], {type:"application/pdf"});
}
