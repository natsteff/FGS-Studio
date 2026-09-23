export const VERSION = "1.1";
export const MAX_BYTES = 256 * 1024;
const idPattern = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;
const extensionPattern = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/;
const kinds = new Set(["header", "score_table", "reference", "checklist", "notes"]);

function fail(path, message) { throw new Error(`${path}: ${message}`); }
function object(value, path) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(path, "must be an object");
  return value;
}
function keys(value, allowed, required, path) {
  object(value, path);
  for (const key of Object.keys(value)) if (!allowed.includes(key)) fail(path, `unknown property ${key}`);
  for (const key of required) if (!(key in value)) fail(path, `missing property ${key}`);
}
function string(value, path, min, max) {
  if (typeof value !== "string" || value.length < min || value.length > max || /[\u0000-\u001f\u007f]/.test(value)) fail(path, `must be text of ${min}–${max} characters without control characters`);
}
function list(value, path, min, max) {
  if (!Array.isArray(value) || value.length < min || value.length > max) fail(path, `must contain ${min}–${max} items`);
}
function extensions(value, path) {
  if (value === undefined) return;
  object(value, path);
  if (Object.keys(value).length > 32) fail(path, "too many extensions");
  for (const key of Object.keys(value)) if (!extensionPattern.test(key)) fail(path, `invalid namespace ${key}`);
}
function uniqueId(value, path, seen) {
  if (typeof value !== "string" || !idPattern.test(value)) fail(path, "invalid ID");
  if (seen.has(value)) fail(path, "duplicate ID");
  seen.add(value);
}
function logo(value, path) {
  keys(value, ["media_type","data","alt","decorative"], ["media_type","data","alt","decorative"], path);
  if (value.media_type !== "image/png" || typeof value.decorative !== "boolean") fail(path, "must be a PNG with a decorative flag");
  string(value.alt, `${path}.alt`, 0, 120);
  if (value.decorative ? value.alt !== "" : !value.alt.trim()) fail(path, "describe the logo or mark it decorative");
  if (typeof value.data !== "string" || value.data.length > 174_768 || !/^[A-Za-z0-9+/]*={0,2}$/.test(value.data)) fail(path, "invalid or oversized PNG data");
  let bytes;
  try {bytes = atob(value.data);} catch {fail(path, "invalid PNG base64");}
  if (btoa(bytes) !== value.data || bytes.length > 128*1024 || bytes.length < 24 || bytes.slice(0,8) !== "\x89PNG\r\n\x1a\n" || bytes.slice(12,16) !== "IHDR") fail(path, "invalid PNG content");
  const dimension = (offset) => (((bytes.charCodeAt(offset)*256+bytes.charCodeAt(offset+1))*256+bytes.charCodeAt(offset+2))*256+bytes.charCodeAt(offset+3));
  const width = dimension(16), height = dimension(20);
  if (!width || !height || width > 1024 || height > 1024 || width*height > 1_000_000) fail(path, "PNG dimensions exceed the limit");
  let offset = 8;
  while (offset + 12 <= bytes.length) {
    const length = dimension(offset);
    if (length > bytes.length - offset - 12) fail(path, "invalid PNG chunks");
    if (bytes.slice(offset+4, offset+8) === "acTL") fail(path, "animated PNG logos are unsupported");
    offset += 12 + length;
    if (bytes.slice(offset-length-8, offset-length-4) === "IEND") break;
  }
}
function block(value, path, seen, version) {
  object(value, path);
  if (!kinds.has(value.type)) fail(path, "unsupported block type");
  const common = ["id", "type", "title", "extensions"];
  const fields = {header:["subtitle",...(version === "1.1" ? ["logo"] : [])],score_table:["players","score_rows","show_total","total_label"],reference:["items"],checklist:["items"],notes:["lines"]}[value.type];
  keys(value, [...common, ...fields], ["id", "type", "title", ...fields.filter((field) => field !== "logo")], path);
  uniqueId(value.id, `${path}.id`, seen);
  string(value.title, `${path}.title`, value.type === "header" ? 0 : 1, 160);
  extensions(value.extensions, `${path}.extensions`);
  if (value.type === "header") {
    string(value.subtitle, `${path}.subtitle`, 0, 240);
    if (value.logo !== undefined) logo(value.logo, `${path}.logo`);
  }
  if (value.type === "score_table") {
    list(value.players, `${path}.players`, 1, 12);
    value.players.forEach((item, index) => string(item, `${path}.players[${index}]`, 0, 40));
    list(value.score_rows, `${path}.score_rows`, 1, 30);
    value.score_rows.forEach((item, index) => string(item, `${path}.score_rows[${index}]`, 1, 80));
    if (typeof value.show_total !== "boolean") fail(path, "show_total must be true or false");
    string(value.total_label, `${path}.total_label`, 1, 80);
  }
  if (value.type === "reference" || value.type === "checklist") {
    list(value.items, `${path}.items`, 1, 30);
    value.items.forEach((item, index) => string(item, `${path}.items[${index}]`, 1, 300));
  }
  if (value.type === "notes" && (!Number.isInteger(value.lines) || value.lines < 1 || value.lines > 20)) fail(path, "lines must be 1–20");
}

export function validate(document) {
  const isCurrent = document?.format_version === VERSION;
  keys(document, ["format", "format_version", "id", "title", "page", "theme", "rows", "extensions", ...(isCurrent ? ["footer"] : [])], ["format", "format_version", "id", "title", "page", "theme", "rows"], "FGS");
  if (document.format !== "forge-gamesheets") fail("FGS", "unknown format");
  if (!["1.0", VERSION].includes(document.format_version)) fail("FGS", `only FGS 1.0 and ${VERSION} are supported`);
  if (document.footer !== undefined && (typeof document.footer !== "string" || document.footer.length < 1 || document.footer.length > 160 || document.footer.split("\n").length > 2 || document.footer.split("\n").some((line) => !line.trim()) || /[\u0000-\u0009\u000b-\u001f\u007f]/.test(document.footer))) fail("FGS.footer", "must be one or two nonempty lines of at most 160 characters");
  const seen = new Set();
  uniqueId(document.id, "FGS.id", seen);
  string(document.title, "FGS.title", 1, 160);
  keys(document.page, ["size", "orientation", "extensions"], ["size", "orientation"], "FGS.page");
  if (!["letter", "a4"].includes(document.page.size)) fail("FGS.page", "unsupported page size");
  if (!["portrait", "landscape"].includes(document.page.orientation)) fail("FGS.page", "unsupported orientation");
  extensions(document.page.extensions, "FGS.page.extensions");
  keys(document.theme, ["accent", "extensions"], ["accent"], "FGS.theme");
  if (typeof document.theme.accent !== "string" || !/^#[0-9a-f]{6}$/.test(document.theme.accent)) fail("FGS.theme", "accent must be lowercase #rrggbb");
  extensions(document.theme.extensions, "FGS.theme.extensions");
  extensions(document.extensions, "FGS.extensions");
  list(document.rows, "FGS.rows", 1, 30);
  let blocks = 0;
  let logos = 0;
  document.rows.forEach((row, index) => {
    const path = `FGS.rows[${index}]`;
    keys(row, ["id", "blocks", "extensions"], ["id", "blocks"], path);
    uniqueId(row.id, `${path}.id`, seen);
    extensions(row.extensions, `${path}.extensions`);
    list(row.blocks, `${path}.blocks`, 1, 2);
    row.blocks.forEach((item, number) => {block(item, `${path}.blocks[${number}]`, seen, document.format_version);if (item.logo) logos++;});
    blocks += row.blocks.length;
  });
  if (blocks > 40) fail("FGS", "too many blocks");
  if (logos > 1) fail("FGS", "only one header logo is allowed");
  if (new TextEncoder().encode(JSON.stringify(document)).length > MAX_BYTES) fail("FGS", "exceeds 256 KiB");
  return document;
}

function rejectDuplicateKeys(source) {
  let position = 0;
  const whitespace = () => { while (/\s/.test(source[position] ?? "") && position < source.length) position++; };
  const readString = () => {
    const start = position++;
    while (position < source.length) {
      if (source[position] === "\\") { position += 2; continue; }
      if (source[position++] === '"') break;
    }
    return JSON.parse(source.slice(start, position));
  };
  function value(depth) {
    if (depth > 64) throw new Error("FGS JSON is nested too deeply");
    whitespace();
    if (source[position] === '"') {readString(); return;}
    if (source[position] === "{") {
      position++;whitespace();
      const seen = new Set();
      while (source[position] !== "}") {
        const key = readString();
        if (seen.has(key)) throw new Error(`FGS JSON contains duplicate key: ${key}`);
        seen.add(key);whitespace();position++;value(depth + 1);whitespace();
        if (source[position] !== ",") break;
        position++;whitespace();
      }
      position++;return;
    }
    if (source[position] === "[") {
      position++;whitespace();
      while (source[position] !== "]") {
        value(depth + 1);whitespace();
        if (source[position] !== ",") break;
        position++;whitespace();
      }
      position++;return;
    }
    while (position < source.length && !/[\s,}\]]/.test(source[position])) position++;
  }
  value(0);
}

export function parse(text) {
  if (new TextEncoder().encode(text).length > MAX_BYTES) throw new Error("FGS exceeds 256 KiB");
  if (text.charCodeAt(0) === 0xfeff) throw new Error("FGS must not have a byte-order mark");
  let document;
  try { document = JSON.parse(text); } catch { throw new Error("FGS is not valid JSON"); }
  rejectDuplicateKeys(text);
  return validate(document);
}

export async function verifyLogoImages(document) {
  for (const row of document.rows) for (const block of row.blocks) if (block.logo) {
    const bytes=Uint8Array.from(atob(block.logo.data),ch=>ch.charCodeAt(0));
    let image;
    try {image=await createImageBitmap(new Blob([bytes],{type:"image/png"}));}
    catch {throw new Error("The header logo is not a decodable PNG.");}
    try {
      if (image.width>1024 || image.height>1024 || image.width*image.height>1_000_000) throw new Error("The header logo exceeds the pixel limit.");
    } finally {image.close();}
  }
}

const newId = (prefix) => `${prefix}-${crypto.randomUUID()}`;
export function newBlock(type) {
  const id = newId("block");
  if (type === "header") return {id,type,title:"New sheet",subtitle:""};
  if (type === "score_table") return {id,type,title:"Score table",players:["Player 1","Player 2"],score_rows:["Round 1","Round 2","Total"],show_total:false,total_label:"Total"};
  if (type === "reference") return {id,type,title:"Reference",items:["First reminder"]};
  if (type === "checklist") return {id,type,title:"Checklist",items:["First item"]};
  if (type === "notes") return {id,type,title:"Notes",lines:5};
  throw new Error("Unknown block type");
}
export function newDocument() {
  return {format:"forge-gamesheets",format_version:"1.0",id:newId("sheet"),title:"Untitled GameSheet",page:{size:"letter",orientation:"portrait"},theme:{accent:"#c84b24"},rows:[{id:newId("row"),blocks:[newBlock("header")]},{id:newId("row"),blocks:[newBlock("score_table")]}]};
}
export function addRow(document, type) {
  document.rows.push({id:newId("row"),blocks:[newBlock(type)]});
}
export function fileStem(title) { return title.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"") || "game-sheet"; }
