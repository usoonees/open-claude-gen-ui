# Design

Use this document to capture product-wide design principles that should stay stable across features.

## Visual Principles

- Prefer restrained, legible UI over decorative effects.
- Use solid fills for primary product surfaces. Do not use gradients on model-selection, provider, or management interfaces.
- Keep these controls flat. Avoid bevels, stacked shadow tricks, inset highlights, or other 3D treatments.

## Surface Language

- Model-selection surfaces should read as compact flat controls attached to the composer.
- Provider and model-management dialogs should feel distinct through scale, spacing, and copy hierarchy, not through fake physical depth.
- In-app confirmation dialogs, including delete-chat confirmations, should use the same plain white surface family as setup and management dialogs instead of warm or tinted cards.
- Separation between surfaces should come from clean borders, solid backgrounds, and restrained ambient shadows only.

## State Contrast

- Visible or active states should feel warmer and brighter.
- Hidden or secondary states should feel cooler and quieter.
- State differences must remain obvious even before reading helper text such as `Shown` or `Hidden`.

## Interaction And Accessibility

- Distinct tasks should use distinct surfaces. Inline popovers are for quick selection; larger dialogs are for setup and management.
- Compact layouts should not reduce hit targets below comfortable pointer sizes.
- Color is supportive, not exclusive. Borders, copy, and structure should all reinforce the current state without depending on depth effects.
