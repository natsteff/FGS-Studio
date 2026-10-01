import assert from "node:assert/strict";
import {readFileSync, readdirSync} from "node:fs";
import test from "node:test";
import {parse} from "../src/fgs.js";
import {createPrintEngine} from "../vendor/fgs-renderer/browser.mjs";

const root = new URL("../", import.meta.url);
const examples = new URL("../examples/", import.meta.url);
const fontsRoot = new URL("../vendor/fgs-renderer/fonts/", import.meta.url);
const fonts = Object.fromEntries([
  ["sans", "NotoSans-Regular.ttf"],
  ["bold", "NotoSans-Bold.ttf"],
  ["serif", "NotoSerif-Bold.ttf"],
].map(([key, filename]) => [key, new Uint8Array(readFileSync(new URL(filename, fontsRoot)))]));

test("public example sheets validate and fit their full page", () => {
  const names = readdirSync(examples).filter(name => name.endsWith(".fgs"));
  for (const expected of [
    "blood-pressure-log.fgs", "carcassonne-records.fgs", "game-night-score-sheet.fgs",
    "polaris-rzr-service-log.fgs", "zombie-dice-records.fgs", "zombie-dice-score-sheet.fgs",
  ]) assert.ok(names.includes(expected));
  const engine = createPrintEngine(fonts);
  for (const name of names) {
    assert.match(name, /^[a-z0-9][a-z0-9-]*\.fgs$/);
    const document = parse(readFileSync(new URL(name, examples), "utf8"));
    const layout = engine.layout(document);
    assert.equal(layout.fits, true, `${name}: ${layout.reason || layout.overflow}`);
  }
});

test("Studio presents a local-only example chooser and project branding", () => {
  const html = readFileSync(new URL("index.html", root), "utf8");
  const editor = readFileSync(new URL("src/editor.js", root), "utf8");
  const build = readFileSync(new URL("scripts/build.mjs", root), "utf8");
  const newIndex = html.indexOf('id="new"');
  const exampleIndex = html.indexOf('id="example-sheets"');
  const importIndex = html.indexOf('id="import"');
  assert.ok(newIndex < exampleIndex && exampleIndex < importIndex);
  assert.match(html, /assets\/fgs-studio-logo\.png/);
  assert.match(html, /assets\/favicon\.png/);
  assert.match(html, /id="examples-dialog"/);
  assert.match(editor, /parse\(await sheetResponse\.text\(\)\)/);
  assert.match(editor, /verifyLogoImages\(imported\)/);
  assert.match(editor, /history\.clear\(\);resetPrintSize\(\);refresh\(\);dialog\.close\(\)/);
  assert.match(build, /writeFile\(join\(examplesDestination, "catalog\.json"\)/);
  for (const asset of ["assets/fgs-studio-logo.png", "assets/favicon.png"]) {
    assert.equal(readFileSync(new URL(asset, root)).subarray(1, 4).toString(), "PNG");
  }
});
