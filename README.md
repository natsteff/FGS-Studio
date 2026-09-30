# FGS Studio

FGS Studio is a browser-only proof of concept for creating, importing, editing,
and exporting FGS 1.0/1.1/1.2/1.3 GameSheets. It is an independent application, not a copy
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

The static page uses a restrictive Content Security Policy to limit active
content to same-origin files. The included Pages workflow publishes static files
without app-defined response headers, so the policy is in an HTML meta tag; it
cannot set `frame-ancestors` or replace the host's TLS and header controls.

## First proof-of-concept scope

- Create and edit FGS 1.0/1.1/1.2 headers, score tables, references, checklists, and
  lined notes in one- or two-block rows.
- Add one portable header logo and an author footer. Studio converts PNG/JPEG
  input to a bounded PNG embedded in the FGS JSON; this preserves single-file
  import/export but makes image bytes opaque in text diffs.
- Import a `.fgs` JSON file, validate its structure, and preserve namespaced
  extensions during editing and export.
- Show a single-page preview with overflow refusal.
- Click a heading, table label, or list item in the preview to jump to its editor
  field; clicking a score-row label selects the matching line.
- Set the sheet's accent color and undo or redo up to 50 editing steps in the
  current tab. A focused typing session counts as one step; opening another
  sheet clears the history.
- Download `.fgs` and a single-page PDF locally in the browser.
- FGS 1.2 Designer Notes are document-level editorial text (up to 4,000
  characters), preserved in the exported FGS but never on the sheet or PDF.
  They are readable by anyone with that file; do not include secrets.
- Score tables expose **Score table title** and **First column heading**.
  The latter defaults to **Category** for older files and can be customized in
  1.2. Forge uses the same label in LiveSheets. Adding a 1.2 capability upgrades
  the file version; adding a logo/footer afterward never downgrades it.

The SVG preview and selectable-text PDF now use one point-based display list
from a pinned [FGS Renderer](vendor/fgs-renderer/manifest.json) build, also
used by Forge GameSheets. Forge's Page Rendering
Profile 1.3.1 ([specification](https://github.com/natsteff/forge-gamesheets/blob/main/docs/FGS_PAGE_RENDERING_PROFILE_1_3.md))
specifies page geometry, fonts, accent
titles, category weight, and overflow behavior. The
renderer bundles Noto fonts under the SIL Open Font License; no CDN or document
upload is used.

The preview is also a navigation aid: click rendered text to select its section
and focus the source field. For a score-row label such as “1,” Studio selects
that row's line in **Score rows**. Editing still happens in the controls, not
directly on the preview.

The renderer source for this pinned build is Forge's
[`packages/fgs-renderer/`](https://github.com/natsteff/forge-gamesheets/tree/main/packages/fgs-renderer).
The last published Studio baseline was synced against Forge source revision
[`d29ac8e`](https://github.com/natsteff/forge-gamesheets/commit/d29ac8e). This
unpublished local trial pins the renderer from Forge commit `b6a10e1`. It must
not be described as a published revision until both repositories are pushed.

**Known prototype limits:** The Page Rendering Profile does not yet cover every
Unicode script. FGSZ, general image sections,
LiveSheets, browser autosave, and multi-page output are not implemented.
These gaps should be closed or explicitly accepted before a general release.

## Trackers and reusable paper (FGS 1.3)

Both editors share controls, defaults and rendering for checkbox/numbered-box/
segmented-bar/current-maximum trackers and ruled/square/dot/hex/music/tablature
patterns, plus coordinate grids with axes and blank tic-tac-toe, Dots and Boxes
and Sudoku boards. Boards can be single or repeated, retain their geometry and
contain no generated puzzles or interactive gameplay. **New** defaults to Score
sheet and offers full-page starters, including paired piano staves.
One section generates all repeated marks. Use fixed height/count to combine
patterns with other sections; **Fill remaining page** must be last and full width.
Spacing is editable in millimeters/inches and saved in quarter-point increments.
Print at **actual size (100%)**. Overflow is refused rather than clipped or shrunk.
The Finished size control also offers Full Page (unchanged), Half Page, Poker Card,
Bridge Card and Custom Size. In the local small-format trial, each size is an
intentional sheet design: headings and content wrap, then the complete composition
is uniformly fitted if needed. The preview reports the scale and approximate body
type size for the designer to judge. Preview and PDF share the finished-size layout;
**Create print sheet** places identical sheets on Letter or A4, with optional cut
guides and a 0.5-inch printable margin. The dialog states the PDF orientation,
copies per page, and total pages. Eight poker cards use two pages (six plus
two); direct Download PDF makes one card-sized page without cut guides and
requires suitable card stock or borderless printing. In the printer dialog,
choose the PDF's paper and orientation, Actual size / 100%, and disable Fit to
page. Exact two-up Half Page needs the explicit borderless choice. This print
selection is not in `.fgs` yet: record a recommendation in Designer Notes and
reselect the size when reopening the file. Notes do not control rendering.
Starting values print as guidance; writable spaces remain blank. Studio has no
LiveSheet backend. Forge provides host-controlled temporary shared tracker state.
Health measurement logs, MusicXML import, musical notation and multipage output
are not included. Screenshots may show the earlier published feature set.

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

Forge's [FGS 1.0 specification](https://github.com/natsteff/forge-gamesheets/blob/main/docs/FGS_V1_SPECIFICATION.md)
and [FGS 1.1 additions](https://github.com/natsteff/forge-gamesheets/blob/main/docs/FGS_V1_1_SPECIFICATION.md)
plus [FGS 1.2 additions](https://github.com/natsteff/forge-gamesheets/blob/main/docs/FGS_V1_2_SPECIFICATION.md)
define the interchange format. FGS Studio has its own release schedule.
The 1.3 contract is `docs/FGS_V1_3_SPECIFICATION.md` in Forge, with
`docs/FGS_PAGE_RENDERING_PROFILE_1_3.md` and `docs/schemas/fgs-v1.3.schema.json`.
When Forge changes the format, explicitly update this app's parser, editor,
renderer, and shared fixtures. Update Forge's FGS Renderer package, rebuild,
and run `node scripts/sync-renderer.mjs` in this repository and
`python3 scripts/sync_fgs_renderer.py` in Forge before claiming print parity.
Unknown format versions are rejected rather than
silently rewritten.
