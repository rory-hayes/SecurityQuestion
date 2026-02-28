# Trust Style Guide

## Purpose
This product must read as a professional security operations system, not an AI novelty.

## Voice and tone
- Use precise, measured language.
- Prefer "analyst-in-the-loop" over automation-first claims.
- Tie performance claims to targets, metrics, or pilot evidence.
- Avoid absolute or legal claims unless backed by approvable evidence.

## Component usage
- Base components must come from `@sqc/ui-catalyst`.
- New primitives are only allowed in `packages/ui-catalyst`.
- Preserve consistent spacing rhythm and typography scale.

## Visual rules
- Neutral palette with one accent.
- Minimal motion and only functional transitions.
- No mascot/chatbot visuals in workflow surfaces.
- Show provenance and confidence where answers are drafted.

## Copy anti-patterns
- "Fully autonomous AI"
- "Zero hallucinations"
- "Guaranteed compliance"
- "No human review required"

## UX requirements
- Persistent active workspace context.
- Citation-first cards for all drafted answers.
- Explicit low-confidence warnings and approval gates.
- Immutable activity history visible per questionnaire.
