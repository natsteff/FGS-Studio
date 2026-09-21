import {validate} from "./fgs.js";

const sizes = {letter:[612,792],a4:[595.28,841.89]};
const margin = 36;
const gap = 16;
const rowGap = 14;

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
function measure(context, block, width) {
  if (block.type === "header") return block.subtitle ? 59 : 41;
  if (block.type === "score_table") return 25 + (scoreRows(block).length + 1) * 24;
  if (block.type === "notes") return 28 + block.lines * 23;
  return 29 + block.items.reduce((sum, item) => sum + Math.max(17, linesFor(context, item, width - 36) * 14 + 3), 0);
}
function heading(context, title, x, y, width, accent) {
  text(context, title, x, y + 14, width, 12, true);
  context.strokeStyle = accent;
  context.lineWidth = 1.2;
  context.beginPath(); context.moveTo(x, y + 21); context.lineTo(x + width, y + 21); context.stroke();
}
function drawBlock(context, block, x, y, width, accent) {
  if (block.type === "header") {
    context.textAlign = "center";
    text(context, block.title, x + width / 2, y + 25, width - 10, 21, true);
    if (block.subtitle) text(context, block.subtitle, x + width / 2, y + 47, width - 10, 10);
    context.textAlign = "left";
    return;
  }
  heading(context, block.title, x, y, width, accent);
  if (block.type === "score_table") {
    const labels = scoreRows(block);
    const top = y + 25;
    const labelWidth = Math.max(90, width * .28);
    const colWidth = (width - labelWidth) / block.players.length;
    context.strokeStyle = "#333"; context.lineWidth = .5;
    for (let row = 0; row <= labels.length + 1; row++) {
      context.beginPath(); context.moveTo(x, top + row * 24); context.lineTo(x + width, top + row * 24); context.stroke();
    }
    const verticals = [x, x + labelWidth, ...Array.from({length:block.players.length}, (_, index) => x + labelWidth + (index + 1) * colWidth)];
    verticals.forEach((line) => {context.beginPath();context.moveTo(line,top);context.lineTo(line,top+(labels.length+1)*24);context.stroke();});
    text(context, "Category", x + 5, top + 15, labelWidth - 10, 9, true);
    block.players.forEach((player, index) => text(context, player || `Player ${index + 1}`, x + labelWidth + index * colWidth + 4, top + 15, colWidth - 8, 8, true));
    labels.forEach((label, index) => text(context, label, x + 5, top + (index + 1) * 24 + 15, labelWidth - 10, 9, true));
    return;
  }
  if (block.type === "notes") {
    context.strokeStyle = "#777";context.lineWidth = .5;
    for (let index = 0; index < block.lines; index++) {
      const line = y + 29 + index * 23;
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
