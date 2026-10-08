# Design Decisions

## Structure and wireframes
Each page follows the same skeleton: sticky header, page hero, content sections, footer.

```
Home:     [Header] [Hero + illustration + stats] [Features 3x2] [Services 4x1] [CTA] [Footer]
About:    [Header] [Page hero] [Story + timeline] [Values] [Team 4x1] [Footer]
Services: [Header] [Page hero] [Service cards 3x2] [Process 4 steps] [CTA] [Footer]
Contact:  [Header] [Page hero] [Details + map | Form] [Footer]
```

## Visual identity
- **Colors:** deep navy `#14213d` for trust and authority, dark teal `#0b7f7e` as the action colour (white text on it is 4.8:1), amber `#f4a261` as a small accent. Body text, buttons, footer and avatar colours were checked and all reach at least 4.5:1 (WCAG AA) for normal text.
- **Typography:** system font stack for instant loading and native feel. Headings use `clamp()` so they scale smoothly between phone and desktop.
- **Spacing and shape:** 14px rounded corners, generous 64-80px section padding, soft shadows only on hover/forms.
- **Design tokens:** colours, radius and shadow live as CSS variables in `:root`, so rebranding means editing one block.

## Responsive strategy
- **Mobile-first:** base CSS is the phone layout; `min-width` media queries add columns.
- **Breakpoints:** 640px (2-column grids) and 900px (full desktop nav, 3-4 column grids, split layouts).
- **Navigation:** below 900px the menu collapses into a hamburger toggle with `aria-expanded`, animated to an X; above 900px it is an inline bar.
- **Layout tools:** CSS Grid for card layouts and page sections, Flexbox for the nav, buttons and footer bar.

## Performance
- No images or web fonts: icons and illustrations are inline SVG, favicon is a data URI.
- No framework, no build step: one CSS file and one deferred JS file per page.
- Total transfer per page is roughly 20-30 KB.

## Accessibility
Semantic landmarks (`header`, `nav`, `main`, `footer`), skip link, labelled form fields with `aria-describedby` error messages (`role="alert"`), `aria-current` on the active nav link, visible focus rings and reduced-motion support.

## Form validation
Validation runs on blur, re-validates on input once a field is invalid, and on submit focuses the first invalid field. Rules: name (letters only, 2+ chars), email (regex), phone (optional, 7-16 digits), topic (required), message (20-1000 chars). Valid fields turn green, invalid red with a specific message.
