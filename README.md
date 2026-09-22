# FGS Studio

FGS Studio is a browser-only proof of concept for creating, importing, editing,
and exporting FGS 1.0 GameSheets. It is an independent application, not a copy
of Forge GameSheets. Its source and GitHub Pages site are public.

FGS Studio is licensed under the [GNU Affero General Public License v3.0](LICENSE).
Its pinned renderer bundle includes MIT-licensed pdf-lib and fontkit and
SIL Open Font License Noto fonts. The legacy pdf-lib license copy remains at
[`vendor/pdf-lib.LICENSE.md`](vendor/pdf-lib.LICENSE.md); the active font
license is at [`vendor/fgs-renderer/fonts/OFL.txt`](vendor/fgs-renderer/fonts/OFL.txt).
See the active [third-party notices](vendor/fgs-renderer/THIRD_PARTY_NOTICES.md)
for the renderer's bundled dependencies.

No account or application server is needed. Sheets are held only in the open
tab. Download the `.fgs` file to keep an editable copy; download PDF for
printing. Closing or reloading the tab loses unsaved edits. FGS documents are
not transmitted to the host or any API.

## First proof-of-concept scope

- Create and edit FGS 1.0 headers, score tables, references, checklists, and
  lined notes in one- or two-block rows.
- Import a `.fgs` JSON file, validate its structure, and preserve namespaced
  extensions during editing and export.
- Show a single-page preview with overflow refusal.
- Set the sheet's accent color and undo or redo up to 50 editing steps in the
  current tab. A focused typing session counts as one step; opening another
  sheet clears the history.
- Download `.fgs` and a single-page PDF locally in the browser.

The SVG preview and selectable-text PDF now use one point-based display list
from a pinned [FGS Renderer](vendor/fgs-renderer/manifest.json) build, also
used by Forge GameSheets. Forge's local release candidate Page Rendering
Profile ([in Forge](https://github.com/natsteff/forge-gamesheets/blob/18961cfe2485cb1b00d1d965e8a6a396f943a337/docs/FGS_PAGE_RENDERING_PROFILE_1_0.md))
specifies page geometry, fonts, accent
titles, category weight, and overflow behavior. The
renderer bundles Noto fonts under the SIL Open Font License; no CDN or document
upload is used.

The renderer source for this pinned build is Forge commit
[`18961cf`](https://github.com/natsteff/forge-gamesheets/tree/18961cfe2485cb1b00d1d965e8a6a396f943a337/packages/fgs-renderer).

**Known prototype limits:** The first Page Rendering Profile does not yet cover every
Unicode script. FGSZ, images,
LiveSheets, browser autosave, and multi-page output are not implemented.
These gaps should be closed or explicitly accepted before a general release.

## Run and test locally

Serve the repository directory with any static-file server and open its root
page. A local server is only for development; GitHub Pages serves the same
files without an application backend. With Python, for example:

```sh
python3 -m http.server 8765
```

Run the browser-app tests and production packaging with Node.js:

```sh
npm test
npm run build
```

To refresh the pinned renderer after a change in Forge's
[`packages/fgs-renderer/`](https://github.com/natsteff/forge-gamesheets/tree/main/packages/fgs-renderer)
source package, build and test it first, then run
`node scripts/sync-renderer.mjs` here. Commit the resulting
`vendor/fgs-renderer/` files with the Studio change. Do not edit the bundle
directly. The GitHub Pages workflow uses the committed vendor copy; it does
not build the Forge renderer source on the runner.

## GitHub Pages

The included workflow tests and packages only the public site files, then
publishes them after a push to `main`, once
Pages is enabled with **GitHub Actions** as its source in repository settings.
The site is published at <https://natsteff.github.io/FGS-Studio/>. Do not
commit real game documents, credentials, or private materials.

## Compatibility policy

Forge's [FGS v1 specification](https://github.com/natsteff/forge-gamesheets/blob/main/docs/FGS_V1_SPECIFICATION.md)
defines the interchange format. FGS Studio has its own release schedule.
When Forge changes the format, explicitly update this app's parser, editor,
renderer, and shared fixtures. Update Forge's FGS Renderer package, rebuild,
and run `node scripts/sync-renderer.mjs` in this repository and
`python3 scripts/sync_fgs_renderer.py` in Forge before claiming print parity.
Unknown format versions are rejected rather than
silently rewritten.
