# Manual test checklist

Run before every minor or major release, in the latest stable Chrome with the release build loaded unpacked (`extension/.output/chrome-mv3`). Record results in the release PR. Use test accounts and dummy files only.

## Smoke

- [ ] Fresh install opens the welcome page; its demo accepts a dropped file
- [ ] Popup shows the site, the field count, and the per-site switch works (badge shows "off")
- [ ] Options: every toggle persists across reload; export/import/reset work
- [ ] Dragging over a page without upload fields shows nothing and doesn't block normal browser behavior

## Sites

For each, drop a file and confirm the site shows it. Note: works / works with Alt / fails (file an issue).

| Site                                  | Control                                                   | Result |
| ------------------------------------- | --------------------------------------------------------- | ------ |
| Gmail                                 | Compose → attach (site has native DnD: should step aside) |        |
| Google Drive                          | New → File upload                                         |        |
| Google Forms                          | File upload question                                      |        |
| GitHub                                | Issue comment, release assets, profile picture            |        |
| GitLab                                | Issue attachment                                          |        |
| Jira / Confluence                     | Attachment                                                |        |
| Notion                                | File block                                                |        |
| Slack (web)                           | Message attachment                                        |        |
| LinkedIn                              | Post image, resume upload                                 |        |
| Indeed / Greenhouse / Lever / Workday | Resume upload                                             |        |
| Outlook web                           | Attach                                                    |        |
| Dropbox / OneDrive / Box              | Upload button                                             |        |
| WordPress admin                       | Media library                                             |        |
| Shopify admin                         | Product images                                            |        |
| Canva / Figma                         | Upload                                                    |        |
| Discord (web)                         | Attachment                                                |        |
| WhatsApp Web                          | Attach document                                           |        |
| Reddit                                | Image post                                                |        |
| X                                     | Post image                                                |        |
| YouTube Studio                        | Upload video (picker opens via menu)                      |        |
| Imgur                                 | Upload                                                    |        |
| A government form (any)               | Document upload                                           |        |
| Typeform / Jotform                    | File question                                             |        |
| Zendesk / Intercom widget             | Attachment in iframe                                      |        |
| Trello                                | Card attachment                                           |        |
| Airtable                              | Attachment field                                          |        |
| Stack Overflow                        | Image upload dialog                                       |        |
| Upwork / Fiverr                       | Message attachment                                        |        |
| Coursera / Canvas LMS                 | Assignment upload                                         |        |
| Any site's avatar upload              | Profile picture                                           |        |

## Firefox (once supported)

- [ ] Repeat Smoke in Firefox 128+
- [ ] Trigger capture works (MAIN-world shim present)
