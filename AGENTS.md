# FGS Studio project guidance

FGS Studio is independent of Forge GameSheets. Keep its source and releases in
this repository. Forge's published FGS document specification and Page Rendering Profile
are the interchange and appearance authorities.

- Do not copy private handoff materials here. The active preview and PDF must
  consume the pinned FGS Renderer build; do not reintroduce a Studio-only
  layout or PDF implementation. Update the renderer source and resync both
  products when changing print behavior.
- Keep document creation, validation, rendering, and downloads browser-side.
- Never add a server API, cloud storage, analytics, or document uploads without
  an explicit product decision.
- Treat imported FGS as untrusted. Reject unsupported versions and invalid
  structures; preserve supported namespaced extensions.
- Add tests for format behavior and test actual browser export paths before
  claiming publication readiness.
- The owner approved publishing this source repository under AGPL-3.0.
- Do not publish GitHub Pages or change remote settings without approval.
