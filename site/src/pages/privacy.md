---
layout: ../layouts/Prose.astro
title: Privacy Policy
description: DnD Anywhere collects no personal data and makes no network requests. Here is exactly what it accesses, stores and why.
updated: October 4, 2026
---

> **In short:** DnD Anywhere does not collect, store, transmit or sell any personal data. The extension makes no network requests. Files you drop go only to the upload field you drop them on.

This policy covers the DnD Anywhere browser extension ("the extension") for Chrome, Edge, Firefox and other compatible browsers, and this website ("the site").

## Who we are

DnD Anywhere is an open-source project maintained by Rojan Acharya. The source code is public at [github.com/rjach/dnd-anywhere](https://github.com/rjach/dnd-anywhere). Contact: [hello@rojanacharya.com](mailto:hello@rojanacharya.com).

## What the extension accesses, and why

**Web page structure.** When you drag files into a browser window, the extension looks at the page's structure to find file upload fields and upload buttons, so it can show drop zones on them. This happens only while you are dragging files, and only on your device. The extension does not read, record or transmit the text, forms or other content of the pages you visit.

**Files you drop.** When you drop files on a drop zone, the extension passes them directly to that page's upload field, exactly as if you had picked them in your browser's file dialog. The extension does not open, read, copy, store or send the contents of your files. It reads only the file names and types the browser provides, to check them against what the upload field accepts and to show a confirmation such as "Added resume.pdf". These never leave the page.

## What the extension stores

The extension stores only your settings, such as whether it is turned on, the sites where you turned it off, and your preferred drop zone color. The only web addresses it stores are the site origins (for example `https://example.com`) that you choose to turn it off for.

Settings are saved with your browser's extension storage (`storage.sync`). If you are signed in to your browser with sync turned on, your browser vendor (for example Google for Chrome) syncs these settings across your devices under its own privacy policy. We never receive them.

The extension stores no browsing history, page content, file contents or identifiers.

## What happens after you drop a file

Once a file is in a website's upload field, that website handles it, just as when you choose a file the normal way. The website's own privacy policy applies to anything it does with your files.

## Network requests, analytics and tracking

The extension makes **no network requests** of any kind. It has no analytics, telemetry, crash reporting, advertising, remote configuration or remotely hosted code. Every build is checked automatically for network calls; a build that contains one fails.

## Sharing and sale of data

We do not collect personal data, so we do not sell, share, rent or transfer it to anyone, and we do not use it for advertising, credit decisions or any other purpose.

The use of information received from browser extension APIs adheres to the [Chrome Web Store User Data Policy](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq), including the Limited Use requirements.

## Permissions

| Permission          | Why it's needed                                                                                                                                                                        |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Storage             | Saves your settings.                                                                                                                                                                   |
| Run on all websites | Upload fields can appear on any site, so the extension's script must be present on every page to find them when you drag files. It stays idle until files are dragged into the window. |

## This website

This site is hosted on GitHub Pages. It uses no cookies, analytics, tracking pixels or third-party scripts and fonts. GitHub, as the host, may log technical information such as IP addresses for security and operations; see the [GitHub Privacy Statement](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement).

## Bug reports and support

If you open an issue on GitHub, it is public and covered by GitHub's terms and privacy statement. Please don't include private URLs, personal information or file contents. The extension's "Report this site" link pre-fills only the site's origin, and only after you confirm. The optional diagnostic report contains version numbers, the site's origin and counts of detected upload fields. You decide whether to share it.

If you email us, we use your message and address only to reply.

## Children

The extension is a general-purpose tool and is not directed at children under 13. We do not knowingly collect information from anyone, including children.

## Your rights

Because we hold no personal data about you, there is nothing for us to access, correct, export or delete. Your settings live in your browser; uninstalling the extension removes them. These statements apply wherever you live, including under the GDPR and the CCPA.

## Changes to this policy

If this policy changes, we will update this page and the date above, and describe material changes in the [changelog](../changelog/) and release notes. The history of this page is public in the project's repository.

## Contact

Questions about privacy: [hello@rojanacharya.com](mailto:hello@rojanacharya.com).
