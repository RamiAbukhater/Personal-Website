# Resume versions for different visitors

An investigation for the resume page, not built yet. The question is whether
the site can show a different version of the resume depending on who is
visiting: a recruiter, a research lab, a collaborator.

Short answer: yes, if the version comes from what the visitor clicked or
chose. It should not come from guessing who they are. The site is static
(GitHub Pages, no server), so the browser decides, and it only knows what is
in the URL, what the visitor tells it, and what it saved last time.

## What a static site can actually use

| Signal | Works on GitHub Pages? | Reliable? | Verdict |
| --- | --- | --- | --- |
| **Query parameter** (`/resume/?for=research`) | Yes, read with `URLSearchParams` | Yes, Rami controls the link | **Use.** The main mechanism. |
| **Short path** (`/resume/research/`) | Yes, as a tiny `index.html` per variant that loads the same page with the variant preset (or redirects to `?for=research`) | Yes | **Use** for links that go on paper or in email signatures, where `?for=` looks odd. |
| **UTM parameters** (`?utm_source=linkedin&utm_campaign=…`) | Yes, they are just query parameters | Only as reliable as whoever made the link | **Maybe.** Fine to map `utm_campaign=research-apps` to a variant, but `?for=` says the same thing more plainly. Don't add analytics just for this. |
| **Referrer** (`document.referrer`) | Readable, but often empty | No. LinkedIn, Gmail, most apps and many browsers strip it, and it only says which site, not who | **Avoid** as a deciding signal. At most a soft hint, and never for anything a visitor would be surprised by. |
| **Visible toggle** ("I'm a recruiter / researcher / collaborator") | Yes, plain buttons | Yes, the visitor chose it | **Use.** Everyone can see and switch versions, so nothing is hidden. |
| **Remembered choice** (`localStorage`) | Yes (the theme button already does this) | Per browser only | **Use**, but only to remember a choice the visitor made with the toggle. A link's `?for=` should win over it. |
| Server-side identification (IP, company lookup, login) | No server | n/a | **Not feasible**, and not wanted. |
| Fingerprinting, tracking pixels, third-party "who is visiting" services | Technically possible with outside scripts | n/a | **Don't.** It's invasive, it's a legal liability (GDPR/CCPA consent), and it's out of place on a personal portfolio. |

### Why not guess?

- **It's wrong a lot.** A referrer from `ucsd.edu` could be a professor, a
  classmate or a recruiter at a career fair. A wrong guess hides the most
  relevant part of the resume from the person who needed it.
- **It's off-putting.** A page that seems to know who you are reads as
  surveillance, which is the opposite of what a portfolio should feel like.
- **It's opaque.** If two people compare notes and saw different resumes with
  no visible reason, that looks like hiding things. Every variant should be
  reachable and visibly labelled.
- **Nothing should be secret.** Variants should only reorder, emphasise and
  trim. Anything that's true and on one version should be okay on all of them,
  and the full resume should always be one click away.

## Recommended approach

1. **One data file, every entry tagged.** The content already lives in
   `resume/resume-data.js` rather than in HTML markup. Add an optional
   `audiences` tag to entries and bullets:

   ```js
   {
     title: 'Undergraduate Researcher, Reinforcement Learning',
     audiences: ['research', 'industry'],   // omitted = everyone
     bullets: [
       { text: 'Reformulating the Bellman equation…', audiences: ['research'] },
       { text: 'Built the training pipeline in PyTorch…' },
     ],
   }
   ```

2. **A short list of named variants**, each one a recipe rather than a copy
   of the resume:

   ```js
   variants: {
     default:  { label: 'Full resume' },
     research: { label: 'Research', summary: '…', spread: { left: […], right: […] }, ribbon: 'teal' },
     industry: { label: 'Industry', summary: '…', spread: { … }, ribbon: 'terracotta' },
   }
   ```

   A variant can replace the summary, reorder or drop sections (`spread`), and
   keep only entries and bullets tagged for it. Untagged items show everywhere.

3. **Choosing the variant**, in this order:
   1. `?for=<variant>` in the URL (or the short path `/resume/<variant>/`).
   2. A choice the visitor made earlier with the toggle (`localStorage`).
   3. `default`, the full resume, for everyone else.

   An unknown `?for=` value falls back to `default` without an error.

4. **A visible toggle** in the toolbar above the book (next to "Close and
   reopen"), e.g. a three-way pill: *Full · Research · Industry*. Switching
   closes the book and reopens it on the new version, which reuses the
   existing replay animation. The current variant is in the URL
   (`history.replaceState`), so a visitor can share exactly what they saw.

5. **Print and PDF follow the variant.** The print stylesheet already prints
   whatever the pages hold, so a recruiter printing `?for=industry` gets the
   industry version, labelled in the header.

## How it fits the book

The book is a natural place to show "this copy was made for you" without
being creepy, because the visitor can see which copy they're holding:

- **Ribbon colour** per variant (terracotta for industry, teal for research,
  gold for collaborators). `--ribbon` is already a CSS variable.
- **Cover subtitle and volume line** come from data (`RESUME.cover`), so a
  variant can say *"Curriculum Vitae · Research Edition"* or *"Résumé ·
  Industry Edition"*. This is the clearest label and costs nothing.
- **Running head** on each page can carry the edition name.
- Optionally a different **cover emblem** per variant (e.g. the island for
  the full resume, a small lab flask for research). This is a nice-to-have.
- Switching variants = close the book, change the edition, reopen. It reads
  as "picking a different volume off the shelf".

## What Rami would need to write

Per variant (assume two to start, **Research** and **Industry**, plus the
existing full resume as `default`):

- **A summary paragraph** (3–4 sentences) in that audience's terms. This is
  the biggest win and the only part that really needs fresh writing.
- **Tags** on existing entries and bullets: which ones matter to whom. Mostly
  a pass over the existing data, maybe 20–30 minutes.
- **A few alternate bullets** where the same work should be told differently.
  For example, Selene: the Cramér–Rao and batch-MAP story for research, and
  "first shipped software stack, cut failure rate to 0" for industry.
- **Section order** for each variant (e.g. research puts Academic Writing and
  research roles first; industry leads with Experience and Skills).
- **The edition name and ribbon colour.**
- Optionally a **research-only section** (talks, reading groups, papers in
  progress) and an **industry-only section** (shipped products, team sizes).

## Effort estimate

| Piece | Effort |
| --- | --- |
| Tagging support and variant filtering in `book.js` | ~2–3 hours |
| `?for=` and short-path handling, `localStorage`, fallback | ~1 hour |
| Toolbar toggle and close/reopen on switch, URL kept in sync | ~2 hours |
| Edition label on cover, ribbon colour, running head | ~1 hour |
| Testing (each variant × light/dark × phone × print) | ~1–2 hours |
| **Engineering total** | **about one day** |
| Rami's writing (2 summaries, tagging pass, ~6–10 alternate bullets) | 2–4 hours |

Adding a third variant later is mostly writing, not code.

## Open questions for Rami

1. **Which audiences?** Research and Industry are the obvious two. Is there a
   real third (collaborators, grad school admissions, a specific company)?
2. **Visible toggle or link-only?** Recommended: both. Link-only is simpler,
   but then visitors can't see that other versions exist.
3. **Should the default be the full resume, or one of the variants?**
   Recommended: the full resume.
4. **Short paths** (`/resume/research/`) as well as `?for=research`? They're
   nicer on paper and in signatures but add one small file per variant.
5. **Should a variant ever hide an entry completely**, or only reorder and
   trim bullets? Hiding is fine for things like the Eagle Scout entry on a
   research CV. Just confirm nothing should be hidden from one audience on
   purpose.
6. **A real PDF per variant?** There's no PDF in the repo today; the page
   offers "Print / save as PDF" instead. If you want a fixed, designed PDF
   (e.g. the one you send with applications), drop it in `resume/` and we can
   link it per variant.
7. **Analytics:** do you want to know which version people open? That would
   need a privacy-friendly counter (e.g. GoatCounter, Plausible) and a line
   on the site saying so. Recommended: skip it unless you'll use it.
