# Player Profile Page (Reference Integration)

Plain HTML, CSS, and JavaScript example for integrating a LootLocker player profile page using White Label Login.

## What This Includes

- White label sign up and sign in
- White label game session creation
- Session token stored in cookie and reused on reload
- Profile header with initials avatar
- Connected accounts list
- Friends, followers, and following totals on profile
- Dedicated social subpages for friends, followers, and following
- Dedicated blocked players subpage with unblock actions

## Files

- `index.html` redirect entry (sends users to login)
- `login.html` sign in page
- `signup.html` sign up page
- `profile.html` profile overview page with social totals
- `profile/friends.html` friends list subpage
- `profile/followers.html` followers list subpage
- `profile/following.html` following list subpage
- `profile/platforms.html` platform linking status subpage
- `profile/blocked.html` blocked players subpage
- `styles/styles.css` visual theme and layout
- `styles/custom.css` optional local overrides loaded after `styles/styles.css` (gitignored)
- `styles/templates/*.css` starter theme templates you can copy into `styles/custom.css`
- `styles/logo.svg` shared logo asset
- `scripts/pages/auth.js` shared login/signup page logic
- `scripts/pages/profile.js` profile page logic
- `scripts/pages/social-list.js` shared social subpage logic
- `scripts/pages/platforms.js` platforms page logic
- `scripts/api/client.js` LootLocker API client and endpoint wrappers
- `scripts/api/auth.js` auth flow helpers (sign up/sign in + session creation)
- `scripts/api/session.js` session token read/write helpers
- `scripts/config.js` shared runtime config for all pages
- `scripts/utils.js` shared utilities (cookies, notices, escaping, helpers)
- `scripts/custom.js` optional local behavior overrides loaded before page scripts (gitignored)

## Configure

Set runtime values in `scripts/custom.js` only:

```js
// scripts/custom.js
window.LootLockerProfileConfig = {
  apiBase: "https://api.lootlocker.com",
  gameKey: "YOUR_GAME_KEY",
  domainKey: "YOUR_DOMAIN_KEY",
  publisherName: "Your Brand",
  isDevelopment: "true",
  gameVersion: "1.0.0.0",
  rememberDays: 30,
  customStylesheets: ["styles/custom.css"],
  customScripts: ["scripts/brand-hooks.js"],
};
```

For additional white-label stylesheets, set `customStylesheets` through runtime config:

```html
<script>
  window.LootLockerProfileConfig = {
    customStylesheets: ["styles/custom.css", "styles/brand-overrides.css"],
  };
</script>
```

Each path is appended as a `<link rel="stylesheet">` at runtime by page scripts.

Additional custom scripts can be loaded with `customScripts` the same way.

## Run Locally

Host the project on any local file server (not `file://`) so browser fetch behavior is consistent.

Then open the server URL root (or `/login.html`).

## Local Customization (Upgrade-Safe)

For custom styling/behavior that should survive upstream updates, create these optional files locally:

- `styles/custom.css`
- `scripts/custom.js`

Custom icon/asset overrides should go in:

- `styles/assets/custom/`

That folder's contents are gitignored by default (except its README).

To override typeface in `styles/custom.css`, for example:

```css
body,
button,
input,
select,
textarea {
  font-family: "Your Brand Font", "Segoe UI", sans-serif;
}
```

## Branding Assets To Replace

For white-label branding, replace these files with your own assets:

- `styles/assets/favicon.ico`
- `styles/assets/logo-darkmode.svg`
- `styles/assets/logo-lightmode.svg`
- `styles/assets/logo.svg`

They are already referenced by all pages and loaded automatically when present.
Both files are listed in `.gitignore`, so teams can customize freely without accidentally pushing local overrides.

You can also start from ready-made examples in `styles/templates/`:

- `styles/templates/template-sunrise-citrus.css`
- `styles/templates/template-darcular.css`
- `styles/templates/template-carbon-electric.css`
- `styles/templates/template-terminal.css` (needs to be added along with `scripts/templates/template-terminal.js`)

Copy any template contents into `styles/custom.css` and `scripts/custom.js` respectively, then tweak colors, spacing, radii, and fonts as needed.

## Agent And LLM Guidance (Source Of Truth)

If you are using Copilot or another coding agent/LLM, treat this README as the primary instruction source for customization behavior.

Required customization behavior:

1. Put white-label style changes in `styles/custom.css`.
2. Keep `styles/styles.css` generic unless the change is intended for all consumers.
3. Put custom icons/assets in `styles/assets/custom/`.
4. Override typeface in `styles/custom.css`.
5. Use `LootLockerProfileConfig.customStylesheets` for additional stylesheet links.
6. Use `LootLockerProfileConfig.customScripts` for additional script links.

Supporting agent instruction files:

- `.github/copilot-instructions.md`
- `AGENTS.md`

These files point back to this README to avoid duplicated or conflicting instructions.

## Endpoint Flow

1. `POST /white-label-login/sign-up` (sign up mode only)
2. `POST /white-label-login/login`
3. `POST /game/v2/session/white-label`
4. `GET /game/player/hazy-hammock/v1/info`
5. `GET /game/v1/connected-accounts`
6. `POST /client/v3/remote/lease`
7. `PUT /game/v1/connected-accounts/attach`
8. `GET /game/player/friends?per_page=50&page=1`
9. `GET /game/player/{player_public_id}/followers?per_page=20`
10. `GET /game/player/{player_public_id}/following?per_page=20`

## Notes

- Avatar is initials-based by design in this version.
- The UI is intentionally plain and themeable. Update CSS variables in `styles/styles.css` to white-label quickly.
- This project currently does not include any build step or dependencies.
