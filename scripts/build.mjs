import {cp, mkdir, rm} from "node:fs/promises";
import {join} from "node:path";

const root = new URL("../", import.meta.url).pathname;
const destination = join(root, "dist");
await rm(destination, {recursive:true, force:true});
await mkdir(destination, {recursive:true});
for (const file of ["index.html", "styles.css"]) await cp(join(root,file),join(destination,file));
for (const folder of ["src", "vendor"]) await cp(join(root,folder),join(destination,folder),{recursive:true});
