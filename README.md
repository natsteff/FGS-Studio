# FGS Studio

**Version 0.1.0**

<img src="assets/fgs-studio-logo.png" alt="FGS Studio logo" width="480">

<a href="https://natsteff.github.io/FGS-Studio/"><img src="docs/images/try-fgs-studio.png" alt="Try FGS Studio Now" width="352"></a>

FGS Studio is a public, browser-only editor for creating, importing, editing,
and exporting FGS 1.0–1.4 GameSheets. It is an independent application, not a copy
of FORGE GameSheets. Use it at <https://natsteff.github.io/FGS-Studio/> without
installing an application server.

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

**Example sheets** opens editable copies of bundled FGS files in the current
tab. The chooser sits between New and Import FGS; it is not a saved-sheet
library. Download FGS before opening an example if you want to retain your
current work. Examples are public files in the static site, including the
game-specific sheets supplied with the site. They are unofficial starting
points, not affiliated with or endorsed by the named game or product makers,
and not medical or manufacturer guidance. Verify relevant details independently
before use.

The static page uses a restrictive Content Security Policy to limit active
content to same-origin files. The included Pages workflow publishes static files
without app-defined response headers, so the policy is in an HTML meta tag; it
cannot set `frame-ancestors` or replace the host's TLS and header controls.

## What FGS Studio supports

- Create and edit FGS 1.0–1.4 sheets with headers, score tables, references,
  checklists, notes, trackers, and reusable paper in full-width or paired sections.
- Add one portable header logo and an author footer. Studio converts PNG/JPEG
  input to a bounded PNG embedded in the FGS JSON; this preserves single-file
  import/export but makes image bytes opaque in text diffs.
- New Studio sheets start with an editable footer pointing to the FGS Studio
  website; imported files retain their existing footer.
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
  FGS 1.2 and later. FORGE GameSheets uses the same label in LiveSheets. Adding
  a newer capability upgrades the file to the required version; adding a
  logo or footer afterward never downgrades it.

The SVG preview and selectable-text PDF now use one point-based display list
from a pinned [FGS Renderer](vendor/fgs-renderer/manifest.json) build, also
used by FORGE GameSheets. FORGE GameSheets’ Page Rendering
Profile 1.3.1 ([specification](https://github.com/natsteff/forge-gamesheets/blob/main/docs/FGS_PAGE_RENDERING_PROFILE_1_3.md))
specifies page geometry, fonts, accent
titles, category weight, and overflow behavior. The
renderer bundles Noto fonts under the SIL Open Font License; no CDN or document
upload is used.

The preview is also a navigation aid: click rendered text to select its section
and focus the source field. For a score-row label such as “1,” Studio selects
that row's line in **Score rows**. Editing still happens in the controls, not
directly on the preview.

The renderer source for this pinned build is FORGE GameSheets’
[`packages/fgs-renderer/`](https://github.com/natsteff/forge-gamesheets/tree/main/packages/fgs-renderer).
Its manifest verifies the source and artifact hashes. Renderer updates are
explicitly synchronized from FORGE GameSheets rather than loaded dynamically.

**Current limits:** The Page Rendering Profile does not cover every Unicode
script. FGSZ, general image sections, LiveSheets, browser autosave, and
multi-page output are not part of FGS Studio. FORGE GameSheets offers LiveSheets
and a managed game library.

## Trackers, reusable paper, and print sizes

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
Bridge Card and Custom Size. For smaller formats, each size is an
intentional sheet design: headings and content wrap, then the complete composition
is uniformly fitted if needed. The preview reports the scale and approximate body
type size for the designer to judge. Preview and PDF share the finished-size layout;
**Create print sheet** places identical sheets on Letter or A4, inheriting the
sheet's Page size unless printer paper is overridden. Auto orientation uses the
fewest pages for the requested copies, preferring portrait on a tie; manual
Portrait and Landscape are available. Cut guides are optional and ordinary
printing reserves a 0.5-inch margin. The dialog states the PDF orientation,
copies per page, and total pages. Eight poker cards use two pages (six plus
two); direct Download PDF makes one card-sized page without cut guides and
requires suitable card stock or borderless printing. In the printer dialog,
choose the PDF's paper and orientation, Actual size / 100%, and disable Fit to
page. Exact two-up Half Page needs the explicit borderless choice. This print
selection is saved as last used after a successful print-sheet download in FGS
1.4; opening or canceling the dialog does not save it. Download FGS afterward
to retain those settings beyond the browser tab. Older files still open with
Full Page. Notes do not control rendering.
Starting values print as guidance; writable spaces remain blank. Studio has no
LiveSheet backend. FORGE GameSheets provides host-controlled temporary shared tracker state.
Health measurement logs, MusicXML import, musical notation and multipage output
are not included. Screenshots may show the earlier published feature set.

## Run and test locally

Build the static site, serve `dist/`, and open its root page. The build
validates and includes the example catalog. A local server is only for
development; GitHub Pages serves the same files without an application backend.
With Python, for example:

```sh
node scripts/build.mjs
cd dist
python3 -m http.server 8765
```

To add a public example, put an approved lowercase hyphenated `.fgs` file in
[`examples/`](examples/) and rebuild. The build derives its display title and
description from the document; no hand-maintained list is needed. Every file
in that folder becomes publicly downloadable after publication. Keep private
or unreviewed candidates outside it; see the [example review rules](examples/README.md).

Run the browser-app tests and build the publishable static site with Node.js:

```sh
npm test
npm run build
```

To refresh the pinned renderer after a change in FORGE GameSheets’
[`packages/fgs-renderer/`](https://github.com/natsteff/forge-gamesheets/tree/main/packages/fgs-renderer)
source package, build and test it first, then run
`node scripts/sync-renderer.mjs` here. Commit the resulting
`vendor/fgs-renderer/` files with the Studio change. Do not edit the bundle
directly. The GitHub Pages workflow uses the committed vendor copy; it does
not build the FORGE GameSheets renderer source on the runner.

## GitHub Pages

The included workflow tests and packages only the public site files, then
publishes them after a push to `main`, once
Pages is enabled with **GitHub Actions** as its source in repository settings.
The site is published at <https://natsteff.github.io/FGS-Studio/>. Do not
commit real game documents, credentials, or private materials.

## Compatibility policy

FORGE GameSheets’ [current FGS 1.4 format index and version history](https://github.com/natsteff/forge-gamesheets/blob/main/docs/FGS_FORMAT.md)
defines the interchange format and links the earlier specifications. FGS Studio
has its own release schedule. FGS 1.4 adds portable finished-size and print-sheet
defaults; the [Page Rendering Profile 1.3.1](https://github.com/natsteff/forge-gamesheets/blob/main/docs/FGS_PAGE_RENDERING_PROFILE_1_3.md)
is a separate rendering contract and remains current.
When FORGE GameSheets changes the format, explicitly update this app's parser, editor,
renderer, and shared fixtures. Update FORGE GameSheets’ FGS Renderer package, rebuild,
and run `node scripts/sync-renderer.mjs` in this repository and
`python3 scripts/sync_fgs_renderer.py` in FORGE GameSheets before claiming print parity.
Unknown format versions are rejected rather than
silently rewritten.
