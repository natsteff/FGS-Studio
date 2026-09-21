import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {addRow, newDocument, parse, validate} from "../src/fgs.js";

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
test("unknown versions, properties and block types are rejected", () => {
  const sheet = newDocument();
  sheet.format_version = "1.1";
  assert.throws(() => validate(sheet), /only FGS 1.0/);
  sheet.format_version = "1.0";
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
