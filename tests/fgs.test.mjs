import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {addRow, newDocument, parse, validate} from "../src/fgs.js";
import {render} from "../src/render.js";
import {previewHtml} from "../src/forge-preview.js";
import {createPrintEngine, PROFILE} from "../vendor/fgs-renderer/browser.mjs";

test("accent picker sits with page controls", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  assert.ok(html.indexOf('id="orientation"') < html.indexOf('id="accent"'));
  assert.ok(html.indexOf('id="accent"') < html.indexOf('id="undo"'));
});
test("editor and its format module use the current cache key", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const editor = readFileSync(new URL("../src/editor.js", import.meta.url), "utf8");
  const styles = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
  const version = html.match(/src\/editor\.js\?v=(\d+)/)?.[1];
  assert.ok(version, "the HTML must version the editor entry point");
  assert.match(editor, new RegExp(`\\./fgs\\.js\\?v=${version}\\b`));
  assert.match(html, /<h2>Footer<\/h2>/);
  assert.match(editor, /button\("Choose logo"/);
  assert.match(editor, /upload\.hidden=true/);
  assert.match(styles, /#footer\{display:block;width:100%/);
});

test("a new FGS 1.0 document validates and survives JSON export/import", () => {
  const sheet = newDocument();
  assert.equal(validate(sheet), sheet);
  assert.deepEqual(parse(JSON.stringify(sheet)), sheet);
});
test("each supported section type can be created", () => {
  const sheet = newDocument();
  for (const type of ["reference", "checklist", "notes", "header", "score_table"]) addRow(sheet, type);
  assert.equal(validate(sheet).rows.length, 7);
});
test("namespaced extensions survive round trip", () => {
  const sheet = newDocument();
  sheet.extensions = {"org.example.demo": {enabled:true}};
  sheet.rows[0].blocks[0].extensions = {"org.example.meta": [1,"two"]};
  assert.deepEqual(parse(JSON.stringify(sheet)), sheet);
});
test("FGS 1.1 footer and one bounded header logo survive import", () => {
  const sheet = newDocument();
  sheet.format_version="1.1";
  sheet.footer = "Created by Example\n2026";
  sheet.rows[0].blocks[0].logo = {
    media_type:"image/png",
    data:"iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAYAAAD0In+KAAAAEUlEQVR4nGP8z8Dwn4GBgQEADQUCAOAHawIAAAAASUVORK5CYII=",
    alt:"Example logo",decorative:false,
  };
  assert.deepEqual(parse(JSON.stringify(sheet)),sheet);
  const animated=structuredClone(sheet);
  const bytes=Buffer.from(animated.rows[0].blocks[0].logo.data,"base64");
  animated.rows[0].blocks[0].logo.data=Buffer.concat([bytes.subarray(0,33),Buffer.from([0,0,0,0,97,99,84,76,0,0,0,0]),bytes.subarray(33)]).toString("base64");
  assert.throws(()=>validate(animated),/animated PNG/);
  const old=structuredClone(sheet);old.format_version="1.0";
  assert.throws(()=>validate(old),/unknown property footer/);
  sheet.footer="one\ntwo\nthree";
  assert.throws(()=>validate(sheet),/one or two/);
});
test("unknown versions, properties and block types are rejected", () => {
  const sheet = newDocument();
  sheet.format_version = "1.2";
  assert.throws(() => validate(sheet), /only FGS 1.0 and 1.1/);
  sheet.format_version = "1.1";
  sheet.unknown = true;
  assert.throws(() => validate(sheet), /unknown property/);
  delete sheet.unknown;
  sheet.rows[0].blocks[0].type = "script";
  assert.throws(() => validate(sheet), /unsupported block type/);
});
test("duplicate IDs and invalid dimensions are rejected", () => {
  const sheet = newDocument();
  sheet.rows[1].id = sheet.rows[0].id;
  assert.throws(() => validate(sheet), /duplicate ID/);
  sheet.rows[1].id = "another-row";
  sheet.rows[1].blocks[0].players = [];
  assert.throws(() => validate(sheet), /1–12 items/);
});
test("oversized and BOM-prefixed imports are rejected", () => {
  assert.throws(() => parse(" ".repeat(256 * 1024 + 1)), /256 KiB/);
  assert.throws(() => parse("\ufeff" + JSON.stringify(newDocument())), /byte-order mark/);
});
test("duplicate JSON keys are rejected before import", () => {
  const source = JSON.stringify(newDocument()).replace('"format_version":"1.0"','"format_version":"1.0","format_version":"1.0"');
  assert.throws(() => parse(source), /duplicate key: format_version/);
});
test("the portable example fixture imports", () => {
  const source = readFileSync(new URL("./fixtures/example.fgs", import.meta.url), "utf8");
  assert.equal(parse(source).title, "Example GameSheet");
});
test("a dense five-section score sheet fits the same Letter page as Forge", () => {
  const sheet = parse(readFileSync(new URL("./fixtures/dense-score-sheet.fgs", import.meta.url), "utf8"));
  const painted = [];
  const context = {
    setTransform(){}, fillRect(){}, fillText(value){painted.push(value);}, beginPath(){}, moveTo(){}, lineTo(){}, stroke(){}, strokeRect(){},
    measureText(value) { return {width:value.length * 5}; },
  };
  const canvas = {getContext() {return context;}};
  assert.equal(render(sheet, canvas).fits, true);
  assert.equal(canvas.width, 1224);
  assert.ok(painted.includes("Game"), "paired six-player headings wrap instead of shrinking to illegibility");
  assert.ok(painted.includes("Column 1 Total x 1"), "paired two-player table has room for its labels");
  sheet.rows.at(-1).blocks[0].score_rows.push(...Array.from({length:14}, (_, i) => `Extra ${i + 1}`));
  assert.equal(render(sheet, canvas).fits, false);
});
test("Forge-derived preview uses bold category cells and paired sections", () => {
  const sheet = parse(readFileSync(new URL("./fixtures/dense-score-sheet.fgs", import.meta.url), "utf8"));
  const html = previewHtml(sheet);
  assert.match(html, /<tr class="score"><th>Ones, Count\/Add Ones<\/th>/);
  assert.match(html, /<tr class="total"><th>Total<small class="preview-calculated">Calculated<\/small><\/th>/);
  assert.match(html, /<div class="preview-row columns-2">/);
  sheet.rows[0].blocks[0].title = "<script>bad</script>";
  assert.match(previewHtml(sheet), /&lt;script&gt;bad&lt;\/script&gt;/);
});

test("active Studio preview and PDF share one layout with bold category labels", async () => {
  const root = new URL("../vendor/fgs-renderer/fonts/", import.meta.url);
  const fonts = {
    sans: new Uint8Array(readFileSync(new URL("NotoSans-Regular.ttf", root))),
    bold: new Uint8Array(readFileSync(new URL("NotoSans-Bold.ttf", root))),
    serif: new Uint8Array(readFileSync(new URL("NotoSerif-Bold.ttf", root))),
  };
  const engine = createPrintEngine(fonts);
  const sheet = parse(readFileSync(new URL("./fixtures/dense-score-sheet.fgs", import.meta.url), "utf8"));
  const layout = engine.layout(sheet);
  assert.equal(layout.profile, PROFILE.id);
  assert.equal(layout.profile, "fgs-page-1.1");
  assert.equal(layout.fits, true);
  assert.equal(layout.commands.find((command) => command.value === "Triple Yahtzee").color, sheet.theme.accent);
  assert.equal(layout.commands.find((command) => command.value === "Upper Section").color, sheet.theme.accent);
  assert.equal(layout.commands.find((command) => command.value === "Ones, Count/Add Ones").font, "bold");
  assert.match(engine.toSvg(layout), /font-family="FGS bold"[^>]*>Ones, Count\/Add Ones<\/text>/);
  const pdf = await engine.toPdf(layout, sheet.title);
  assert.equal(new TextDecoder("latin1").decode(pdf.slice(0, 8)), "%PDF-1.7");

  sheet.page.orientation = "landscape";
  const landscape = engine.layout(sheet);
  assert.equal(landscape.fits, false);
  assert.equal(landscape.overflow, "Section Totals");
  await assert.rejects(engine.toPdf(landscape, sheet.title), /does not fit/);
});
