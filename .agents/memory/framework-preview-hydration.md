---
name: Framework preview hydration
description: Next.js preview can serve healthy HTML and APIs while browser controls remain inert.
---

Treat server-rendered HTML and API availability separately from browser hydration
when verifying this Next.js app through the Replit preview.

**Why:** The preview served HTTP 200 and the authenticated API flow worked while
development-origin restrictions blocked initialization of the browser controls.
The visible sign-in form could accept text but never enabled its button.

**How to apply:** When controls remain inert without an API request, investigate
the framework's development-origin handling and browser initialization rather
than repeatedly changing credentials or backend authorization.
