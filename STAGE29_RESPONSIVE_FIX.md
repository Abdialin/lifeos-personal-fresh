# Stage 29 — Today responsive correction
- The Today view now uses one full-width column on desktop and mobile.
- The duplicate legacy Today overview is kept in the DOM for calculations, but its sidebar is not displayed on Today. It remains accessible on Insights as before.
- Four summary cards become two columns on narrow screens, avoiding broken words.
- The six-tab navigation stays fixed at the bottom in mobile view.
- Existing timers, plans, goals, analytics, forms, data storage and calendar integrations are unchanged.
- Corrects initial overview visibility before navigation JavaScript sets the active view.
- Browser cache can still affect the first refresh; this release does not change backend caching headers.
