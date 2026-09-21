# FGS Studio

FGS Studio is a browser-only proof of concept for creating, importing, editing,
and exporting FGS 1.0 GameSheets. It is an independent application, not a copy
of Forge GameSheets. Its source and GitHub Pages site are public.

FGS Studio is licensed under the [GNU Affero General Public License v3.0](LICENSE).
The vendored pdf-lib library retains its own MIT license in
[`vendor/pdf-lib.LICENSE.md`](vendor/pdf-lib.LICENSE.md).

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
- Download `.fgs` and a single-page PDF locally in the browser.

The PDF is currently a page-sized raster image inside a PDF. It preserves the
preview appearance and Unicode text supplied by the browser's fonts, but its
text is not selectable or searchable. It is not expected to be pixel-identical
to Forge's Python PDF renderer. PDF creation uses a vendored copy of pdf-lib
1.17.1 (MIT license in `vendor/pdf-lib.LICENSE.md`); no CDN or document upload
is used.

**Known prototype limits:** Very long unbroken text may overflow horizontally
in the preview. FGSZ, images,
LiveSheets, browser autosave, and multi-page output are not implemented.
These gaps should be closed or explicitly accepted before a general release.

## Run and test locally

Serve the repository directory with any static-file server and open its root
page. A local server is only for development; GitHub Pages serves the same
files without an application backend. With Python, for example:

```sh
python3 -m http.server 8765
```

Run the format tests with Node.js:

```sh
npm test
```

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
renderer, and shared fixtures; do not periodically copy Forge's application
code into this repository. Unknown format versions are rejected rather than
silently rewritten.
