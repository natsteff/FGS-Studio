import test from "node:test";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {readFile} from "node:fs/promises";

const base=new URL("../vendor/fgs-renderer/",import.meta.url);

test("pinned renderer bundle and notices match the manifest",async()=>{
  const manifest=JSON.parse(await readFile(new URL("manifest.json",base),"utf8"));
  assert.equal(manifest.profile,"fgs-page-1.0");
  assert.ok(manifest.files["browser.mjs"]);
  assert.ok(manifest.files["THIRD_PARTY_NOTICES.md"]);
  for(const [file,expected] of Object.entries(manifest.files)) {
    if(file==="cli.mjs") continue; // Forge uses the Node bundle; Studio ships only the browser bundle.
    const actual=createHash("sha256").update(await readFile(new URL(file,base))).digest("hex");
    assert.equal(actual,expected,file);
  }
});
