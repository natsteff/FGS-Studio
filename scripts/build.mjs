import {cp, lstat, mkdir, readdir, readFile, rm, writeFile} from "node:fs/promises";
import {join} from "node:path";
import {parse} from "../src/fgs.js";
import {createPrintEngine} from "../vendor/fgs-renderer/browser.mjs";

const root = new URL("../", import.meta.url).pathname;
const destination = join(root, "dist");
await rm(destination, {recursive:true, force:true});
await mkdir(destination, {recursive:true});
for (const file of ["index.html", "styles.css"]) await cp(join(root,file),join(destination,file));
for (const folder of ["src", "vendor", "assets"]) await cp(join(root,folder),join(destination,folder),{recursive:true});

const examples = [];
const examplesSource = join(root, "examples");
const examplesDestination = join(destination, "examples");
const fonts = Object.fromEntries(await Promise.all([
  ["sans", "NotoSans-Regular.ttf"],
  ["bold", "NotoSans-Bold.ttf"],
  ["serif", "NotoSerif-Bold.ttf"],
].map(async ([key, name]) => [key, new Uint8Array(await readFile(join(root, "vendor", "fgs-renderer", "fonts", name)))])));
const engine = createPrintEngine(fonts);
await mkdir(examplesDestination, {recursive:true});
for (const name of (await readdir(examplesSource)).sort()) {
  if (!name.endsWith(".fgs")) continue;
  if (!/^[a-z0-9][a-z0-9-]*\.fgs$/.test(name)) throw new Error(`Invalid example filename: ${name}`);
  const source = join(examplesSource, name);
  if (!(await lstat(source)).isFile()) throw new Error(`Example must be a regular file: ${name}`);
  const document = parse(await readFile(source, "utf8"));
  const layout = engine.layout(document);
  if (!layout.fits) throw new Error(`Example does not fit a full page: ${name}: ${layout.reason || layout.overflow}`);
  const header = document.rows.flatMap(row => row.blocks).find(block => block.type === "header");
  examples.push({file:name,title:document.title,description:header?.subtitle || "Editable GameSheet example"});
  await cp(source, join(examplesDestination, name));
}
await writeFile(join(examplesDestination, "catalog.json"), JSON.stringify(examples, null, 2) + "\n");
