---
name: Artifact command directories
description: Working-directory constraint when an artifact serves recovered source outside its own directory.
---

Treat managed artifact development commands as relative to the artifact's
directory, not the workspace root.

**Why:** A valid command pointing at recovered source failed because the managed
workflow resolved its relative path underneath the artifact directory. Root-level
package-filter commands can hide this distinction.

**How to apply:** When configuring a service that runs source elsewhere in the
workspace, make its development path artifact-relative. Production commands
should account explicitly for their build/run working directory rather than
assuming it matches an interactive root shell.
