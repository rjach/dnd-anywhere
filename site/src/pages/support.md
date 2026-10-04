---
layout: ../layouts/Prose.astro
title: Support
description: Help with DnD Anywhere, how to report a site that doesn't work, and how to get in touch.
---

## Getting started

1. Install DnD Anywhere and pin it to your toolbar if you like.
2. Drag one or more files from your computer into any browser window.
3. Drop zones appear on the page's upload fields and upload buttons. Drop your files on one.

A confirmation appears in the bottom-right corner, such as "Added 2 files to Attachments".

## Troubleshooting

**No drop zones appear.**

- The extension can't run on browser pages (`chrome://`, the extension stores, the new tab page) or in PDF viewers. Browsers block all extensions there.
- Check that it's on for the site: click the toolbar button. A gray "off" badge means it's turned off for this site.
- The page may have no upload field until you click something, for example an "Attach" menu. Open it first, then drag.
- After installing or updating, reload tabs that were already open.

**The site shows its own drop area instead.**
That's on purpose: when a site already supports drag and drop, DnD Anywhere stays out of the way. Hold **Alt** (**Option** on Mac) while dragging to use DnD Anywhere's drop zones anyway. You can change the key in Options.

**A zone says "Not accepted here".**
The field only accepts certain file types (for example images only). You can turn off "Only accept file types the site asks for" in Options, but the site may still reject the file.

**"This button didn't take the drop."**
Some upload buttons open a menu instead of a file picker, or only respond to real mouse clicks. Choose **Click it for me** to open the site's normal picker.

**"The site didn't seem to react."**
The file was put into the field, but the page showed no change. Some sites only react to real file picks. Use **Open file picker** to finish the normal way, and please report the site.

## Report a site that doesn't work

Click the toolbar button on that site, then **Not working here? Report this site**. It opens a GitHub issue form with only the site's address (for example `https://example.com`) filled in. You can also [open the form directly](https://github.com/rjach/dnd-anywhere/issues/new?template=site_not_working.yml).

Helpful details: what kind of upload control it is, whether the normal file picker works, and the **diagnostic report** (toolbar button → Copy diagnostic report). It contains versions and upload-field counts, never page content or file names. Please don't include private links or personal information: issues are public.

## Questions and ideas

- Questions and ideas: [GitHub Discussions](https://github.com/rjach/dnd-anywhere/discussions)
- Bugs: [GitHub Issues](https://github.com/rjach/dnd-anywhere/issues)
- Security problems: please report privately, as described in the [security policy](https://github.com/rjach/dnd-anywhere/security/policy)
- Anything else: [hello@rojanacharya.com](mailto:hello@rojanacharya.com)

DnD Anywhere is a volunteer open-source project. There is no paid support, but every report is read.
