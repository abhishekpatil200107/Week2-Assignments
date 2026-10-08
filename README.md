# NovaEdge Solutions - Responsive Company Website

Week 2 internship assignment, **Task 1**: a fully responsive, four-page company website built with plain HTML5, CSS3 and JavaScript (no frameworks or build step).

NovaEdge Solutions is a fictional company created for this assignment.

## Pages
| Page | File | Highlights |
|------|------|-----------|
| Home | `index.html` | Hero, stats, feature cards, services preview, call-to-action |
| About | `about.html` | Company story, timeline, values, team grid |
| Services | `services.html` | Six service cards, four-step process, CTA |
| Contact | `contact.html` | Contact details, map placeholder, validated form |

## Features
- Responsive navigation with a hamburger menu below 900px (keyboard accessible; closes on Esc, outside click or resize)
- Consistent footer with links, contact info and social icons on every page
- Mobile-first layouts using CSS Grid and Flexbox, breakpoints at 640px and 900px
- Contact form with live validation (name, email, optional phone, topic, message length)
- Semantic HTML, skip link, ARIA labels, visible focus states, `prefers-reduced-motion` support
- Inline SVG icons and illustrations, so there are no image downloads or external requests (fast loads)

## Run locally
No installation needed. Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000   # then visit http://localhost:8000
```

## Deploy (live demo)
**GitHub Pages:** push to GitHub, then Settings -> Pages -> Deploy from branch `main` / root.
**Netlify / Vercel:** drag and drop the folder, or import the repo (no build command, publish directory `/`).

## Project structure
```
index.html  about.html  services.html  contact.html
css/style.css     all styles, design tokens in :root
js/main.js        hamburger menu + form validation
docs/DESIGN.md    design decisions
screenshots/      all pages at mobile, tablet and desktop widths
```

## Testing
Checked at 390px (mobile), 768px (tablet) and 1440px (desktop): no horizontal scroll on any page, menu opens/closes, and form validation shows errors for empty and invalid input and a success message for valid input. Screenshots are in `screenshots/`.

## Notes
The contact form has no backend; on a valid submit it shows a confirmation message. Task 2 and Task 3 show how to connect forms to a real API.
