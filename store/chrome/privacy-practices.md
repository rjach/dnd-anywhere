# Chrome Web Store: Privacy practices tab

## Single purpose

Lets users drag and drop files onto file upload fields and upload buttons on websites, including sites that only provide a file-picker button.

## Permission justifications

**storage**
Saves the user's settings: whether the extension is on, the sites where the user turned it off, drop zone color and similar preferences. Nothing else is stored.

**Host permissions (content scripts on all URLs)**
File upload fields can appear on any website, so the content script must run on every page to find them when the user drags files into the browser window. It stays idle until files are dragged in, reads only the page structure needed to locate upload fields, and passes dropped files only to the field the user drops them on. It sends no data anywhere.

## Remote code

No, I am not using remote code. All code is included in the package; there are no remote scripts, `eval`, or remote configuration.

## Data usage

What user data do you plan to collect from users now or in the future?

- [ ] Personally identifiable information
- [ ] Health information
- [ ] Financial and payment information
- [ ] Authentication information
- [ ] Personal communications
- [ ] Location
- [ ] Web history
- [ ] User activity
- [x] **Website content**: the extension reads page structure, on the user's device, to find upload fields while the user drags files. Nothing is stored or transmitted.

Certifications (all checked):

- [x] I do not sell or transfer user data to third parties, outside of the approved use cases
- [x] I do not use or transfer user data for purposes that are unrelated to my item's single purpose
- [x] I do not use or transfer user data to determine creditworthiness or for lending purposes

## Privacy policy URL

https://rjach.github.io/dnd-anywhere/privacy/
