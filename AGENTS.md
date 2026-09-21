# FGS Studio project guidance

FGS Studio is independent of Forge GameSheets. Keep its source and releases in
this repository. Forge's published FGS specification is the interchange
authority, not a source-code synchronization mechanism.

- Do not copy Forge application code or private handoff materials here.
- Keep document creation, validation, rendering, and downloads browser-side.
- Never add a server API, cloud storage, analytics, or document uploads without
  an explicit product decision.
- Treat imported FGS as untrusted. Reject unsupported versions and invalid
  structures; preserve supported namespaced extensions.
- Add tests for format behavior and test actual browser export paths before
  claiming publication readiness.
- The owner approved publishing this source repository under AGPL-3.0.
- Do not publish GitHub Pages or change remote settings without approval.
