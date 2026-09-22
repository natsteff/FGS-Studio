import {cp,mkdir,readFile,rm} from "node:fs/promises";
import {createHash} from "node:crypto";
import {fileURLToPath} from "node:url";
import {dirname,join,resolve} from "node:path";

const root=dirname(dirname(fileURLToPath(import.meta.url)));
const source=resolve(root,"../Forge-GameSheets/packages/fgs-renderer/dist");
const manifest=JSON.parse(await readFile(join(source,"manifest.json"),"utf8"));
if(manifest.profile!=="fgs-page-1.0") throw new Error("Unexpected FGS Page Rendering Profile");
for(const [file,expected] of Object.entries(manifest.sourceFiles)) {
  const actual=createHash("sha256").update(await readFile(join(source,"..",file))).digest("hex");
  if(actual!==expected) throw new Error(`Renderer source changed since the build: ${file}`);
}
for(const [file,expected] of Object.entries(manifest.files)) {
  const actual=createHash("sha256").update(await readFile(join(source,file))).digest("hex");
  if(actual!==expected) throw new Error(`Renderer artifact changed: ${file}`);
}
const destination=join(root,"vendor/fgs-renderer");
await rm(destination,{recursive:true,force:true});
await mkdir(destination,{recursive:true});
await cp(join(source,"browser.mjs"),join(destination,"browser.mjs"));
await cp(join(source,"fonts"),join(destination,"fonts"),{recursive:true});
await cp(join(source,"licenses"),join(destination,"licenses"),{recursive:true});
await cp(join(source,"THIRD_PARTY_NOTICES.md"),join(destination,"THIRD_PARTY_NOTICES.md"));
await cp(join(source,"manifest.json"),join(destination,"manifest.json"));
