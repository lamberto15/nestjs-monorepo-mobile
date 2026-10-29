# Claude Code instructions

@AGENTS.md

<!--
Shared project rules live in AGENTS.md; update it for changes that apply to
every agent. Keep only Claude-specific settings here.
-->

## Claude model selection

- **Models for Claude: never Fable.** Subagents and delegated tasks use the
  cheapest model that does the job well: Haiku 5.5 for simple searches and
  mechanical edits, Sonnet 5.5 for ordinary coding and exploration, Opus 5.5
  only for complex or security work (and the main session). Set `model` on
  every Agent call.
- **Delegate only what pays for itself.** Do a lookup you can make in a few
  tool calls yourself. Spawn subagents only when the owner asks or the work
  is truly independent and broad.
- **Expo plugin:** `.claude/settings.json` enables
  `expo@claude-plugins-official`; check its skills before adding a
  dependency or writing native configuration.
