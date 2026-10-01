import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

test("the static editor limits active content to local assets", () => {
  const policy = html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)">/)?.[1];
  assert.ok(policy);
  for (const directive of [
    "default-src 'none'",
    "script-src 'self'",
    "style-src 'self'",
    "img-src 'self' data:",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
  ]) assert.ok(policy.includes(directive));
  assert.match(html, /<meta name="referrer" content="no-referrer">/);
  assert.doesNotMatch(html, /<script[^>]+src="https?:\/\//);
});

test("the footer links to the full FORGE GameSheets project", () => {
  assert.match(html, /<footer><span>Privacy: FGS Studio does not upload or save your sheet on a server\.<\/span><a href="https:\/\/github\.com\/natsteff\/forge-gamesheets" target="_blank" rel="noopener noreferrer">FORGE GameSheets on GitHub ↗<\/a><\/footer>/);
  assert.doesNotMatch(html, /FGS Studio · FGS 1\.0/);
});

test("saving reminder sits with the document actions, not in a page-wide banner", () => {
  assert.match(html, /<div class="topbar-actions">[\s\S]*<nav aria-label="Document actions">[\s\S]*<p class="save-reminder">Changes stay in this tab\. Download FGS to keep an editable copy\.<\/p>/);
  assert.doesNotMatch(html, /class="notice"/);
});
