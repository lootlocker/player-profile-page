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

## Files

- `index.html` redirect entry (sends users to login)
- `login.html` sign in page
- `signup.html` sign up page
- `profile.html` profile overview page with social totals
- `profile/friends.html` friends list subpage
- `profile/followers.html` followers list subpage
- `profile/following.html` following list subpage
- `profile/platforms.html` platform linking status subpage
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
- `scripts/core/config.js` shared runtime config for all pages
- `scripts/core/utils.js` shared utilities (cookies, notices, escaping, helpers)
- `scripts/custom.js` optional local behavior overrides loaded before page scripts (gitignored)

## Configure

Update values in `scripts/core/config.js`:

```js
export const CONFIG = {
  apiBase: "https://api.lootlocker.com",
  gameKey: "YOUR_GAME_KEY",
  domainKey: "YOUR_DOMAIN_KEY",
  publisherName: "LootLocker",
  isDevelopment: "true",
  gameVersion: "1.0.0.0",
  sessionCookieName: "ll_profile_session",
  rememberDays: 30,
};
```

## Run Locally

Host the project on any local file server (not `file://`) so browser fetch behavior is consistent.

Then open the server URL root (or `/login.html`).

## Local Customization (Upgrade-Safe)

For custom styling/behavior that should survive upstream updates, create these optional files locally:

- `styles/custom.css`
- `scripts/custom.js`

They are already referenced by all pages and loaded automatically when present.
Both files are listed in `.gitignore`, so teams can customize freely without accidentally pushing local overrides.

You can also start from ready-made examples in `styles/templates/`:

- `styles/templates/template-sunrise-citrus.css`
- `styles/templates/template-darcular.css`
- `styles/templates/template-carbon-electric.css`
- `styles/templates/template-bubble-gum.css`
- `styles/templates/template-ncsa-mosaic-1993.css`

Copy any template contents into `styles/custom.css`, then tweak colors, spacing, radii, and fonts as needed.

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
