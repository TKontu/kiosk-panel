# Sensemaking media for kiosk panel

This PR proposes todo items to develop the panel as a sensemaking surface: glanceable synthesis rather than raw feeds. Builds on existing agent canvas and overview dial work.

## Proposed todo items

### 1. Daily brief canvas
- [ ] Define ephemeral canvas spec for daily TL;DR
- [ ] Agent generates morning brief (builds, energy peaks, messages) as HTML canvas
- [ ] Test layout card vs full, staleness badge
- [ ] Document in docs/todo-sensemaking-media.md

### 2. Pattern tiles for long-term trends
- [ ] Design tiles block for weekly/monthly aggregations
- [ ] Agent generates sparkline PNGs to shell/agent/
- [ ] Publish persistent canvas updated daily
- [ ] Verify legibility at 68.8 ppi

### 3. Sensemaking dial extensions
- [ ] Evaluate extending overview dial metaphor to home occupancy / energy consumption
- [ ] Assess data source feasibility (CORS, MQTT)
- [ ] Prototype dial view with new data
- [ ] Add view to views.js

### 4. Contextual alerts / takeover
- [ ] Implement alert takeover mechanism from todo-view-mechanisms.md
- [ ] Agent can publish ephemeral canvas with short TTL for high-priority info
- [ ] Ensure schedule resumes correctly

### 5. Semantic media gallery
- [ ] Extend photo view to support captions from metadata
- [ ] Agent curates images with semantic tags
- [ ] Rotate based on time/day context

### 6. Comparative views
- [ ] Allow agent-authored HTML with CSS grid for before/after
- [ ] Use layout full, link panel.css
- [ ] Ensure no scripts, safe iframe sandbox

## Design constraints
- 68.8 ppi portrait, readable at 2-3m
- file:// origin, no fetch, CORS required
- Panel owns style, agent owns structure
- Staleness visible, no hidden old data
- No heavy animations (marginal adapter)

## Files
- docs/todo-sensemaking-media.md (new)
- Links to existing: agent-canvas-schema.md, todo-agent-html.md, architecture.md

## Next
Review options, decide which to prototype first.