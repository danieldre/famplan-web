# getfamplan.app

The public website: invite and referral pages, privacy, terms, imprint.
Static files, no build step.

**Hosting:** GitHub Pages from the public repo `danieldre/famplan-web`
(this repo is private, so the site lives there). DNS is at GoDaddy: four
`A @` records for GitHub Pages (185.199.108–111.153) and `www` as a CNAME
to `danieldre.github.io`. The Resend records (`send`, `rsend`,
`resend._domainkey`) are separate and stay as they are.

**Publishing a change:** edit here, then copy this folder over the
`famplan-web` checkout (leaving its `.git`), commit and push. Pages
rebuilds within a minute.

The legal pages are drafts pending legal review; fill every `[PLACEHOLDER: …]`
before inviting families.
