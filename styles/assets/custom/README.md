# Custom Assets Folder

Put your white-label assets here, for example:

- custom icon SVGs
- custom logos
- alternate background art

This folder contents are intentionally gitignored by default so local/project-specific branding does not get committed accidentally.

Recommended usage pattern:

1. Add icon files under this folder, such as `styles/assets/custom/icons/my-icon.svg`.
2. Reference them from `styles/custom.css` using relative paths.
3. Override base selectors in `styles/custom.css` to use your files.
