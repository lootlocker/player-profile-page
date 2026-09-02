// scripts/templates/nav.js
import { html } from "../template.js";

const SOCIAL_SUBPAGES = [
  { id: "friends", label: "Friends" },
  { id: "followers", label: "Followers" },
  { id: "following", label: "Following" },
  { id: "blocked", label: "Blocked" },
];

function socialActiveClass(activePage) {
  return SOCIAL_SUBPAGES.some((s) => s.id === activePage) ? " is-active" : "";
}

function subLinkClass(activePage, id) {
  return activePage === id ? ' class="is-active"' : "";
}

function subLinkAria(activePage, id) {
  return activePage === id ? ' aria-current="page"' : "";
}

export function navTemplate({ activePage, modules }) {
  const enabled = new Set(
    Array.isArray(modules)
      ? modules
      : ["social", "platforms", "game-keys", "subscriptions"],
  );

  const profileActive =
    activePage === "profile"
      ? ' class="page-tab-link is-active" aria-current="page"'
      : ' class="page-tab-link"';
  const socialSummaryActive = SOCIAL_SUBPAGES.some((s) => s.id === activePage)
    ? ' class="page-tab-link social-menu__summary is-active" aria-current="page"'
    : ' class="page-tab-link social-menu__summary"';
  const socialDataAttr = enabled.has("social") ? "" : ' style="display:none"';
  const platformsDataAttr =
    activePage === "platforms"
      ? ' class="page-tab-link is-active" aria-current="page" data-module="platforms"'
      : ' class="page-tab-link" data-module="platforms"';
  const platformsHide = enabled.has("platforms") ? "" : ' style="display:none"';
  const keysActive =
    activePage === "keys"
      ? ' class="page-tab-link is-active" aria-current="page"'
      : ' class="page-tab-link"';
  const keysDataAttr = ' data-module="game-keys"';
  const keysHide = enabled.has("game-keys") ? "" : ' style="display:none"';
  const subsActive =
    activePage === "subscriptions"
      ? ' class="page-tab-link is-active" aria-current="page"'
      : ' class="page-tab-link"';
  const subsDataAttr = ' data-module="subscriptions"';
  const subsHide = enabled.has("subscriptions") ? "" : ' style="display:none"';

  return `
    <nav class="page-tabs" aria-label="Profile navigation">
      <a href="profile.html"${profileActive}>Profile</a>
      <div class="social-menu" data-module="social"${socialDataAttr}>
        <details class="social-menu__details">
          <summary${socialSummaryActive}>
            <span>Social</span>
            <span class="social-menu__arrow" aria-hidden="true"></span>
          </summary>
          <div class="social-menu__card" role="menu" aria-label="Social navigation">
            ${SOCIAL_SUBPAGES.map(
              (s) =>
                `<a href="profile/${s.id}.html"${subLinkClass(activePage, s.id)}${subLinkAria(activePage, s.id)} role="menuitem">${s.label}</a>`,
            ).join("")}
          </div>
        </details>
      </div>
      <a href="profile/platforms.html"${platformsDataAttr}${platformsHide}>Platforms</a>
      <a href="profile/game-keys.html"${keysActive}${keysDataAttr}${keysHide}>Game Keys</a>
      <a href="profile/subscriptions.html"${subsActive}${subsDataAttr}${subsHide}>Subscriptions</a>
    </nav>
    <div class="page-tabs-divider" aria-hidden="true"></div>
  `.trim();
}

export function subnavTemplate({ activePage, modules }) {
  const enabled = new Set(
    Array.isArray(modules)
      ? modules
      : ["social", "platforms", "game-keys", "subscriptions"],
  );

  const profileClass =
    activePage === "profile"
      ? ' class="page-tab-link is-active" aria-current="page"'
      : ' class="page-tab-link"';
  const socialSummaryActive = SOCIAL_SUBPAGES.some((s) => s.id === activePage)
    ? ' class="page-tab-link social-menu__summary is-active" aria-current="page"'
    : ' class="page-tab-link social-menu__summary"';
  const socialDataAttr = enabled.has("social") ? "" : ' style="display:none"';
  const platformsAttr =
    activePage === "platforms"
      ? ' class="page-tab-link is-active" aria-current="page" data-module="platforms"'
      : ' class="page-tab-link" data-module="platforms"';
  const platformsHide = enabled.has("platforms") ? "" : ' style="display:none"';
  const keysActive =
    activePage === "keys"
      ? ' class="page-tab-link is-active" aria-current="page"'
      : ' class="page-tab-link"';
  const keysDataAttr = ' data-module="game-keys"';
  const keysHide = enabled.has("game-keys") ? "" : ' style="display:none"';
  const subsActive =
    activePage === "subscriptions"
      ? ' class="page-tab-link is-active" aria-current="page"'
      : ' class="page-tab-link"';
  const subsDataAttr = ' data-module="subscriptions"';
  const subsHide = enabled.has("subscriptions") ? "" : ' style="display:none"';

  return `
    <nav class="page-tabs" aria-label="Profile navigation">
      <a href="../profile.html"${profileClass}>Profile</a>
      <div class="social-menu" data-module="social"${socialDataAttr}>
        <details class="social-menu__details">
          <summary${socialSummaryActive}>
            <span>Social</span>
            <span class="social-menu__arrow" aria-hidden="true"></span>
          </summary>
          <div class="social-menu__card" role="menu" aria-label="Social navigation">
            ${SOCIAL_SUBPAGES.map(
              (s) =>
                `<a href="${s.id}.html"${subLinkClass(activePage, s.id)}${subLinkAria(activePage, s.id)} role="menuitem">${s.label}</a>`,
            ).join("")}
          </div>
        </details>
      </div>
      <a href="../profile/platforms.html"${platformsAttr}${platformsHide}>Platforms</a>
      <a href="../profile/game-keys.html"${keysActive}${keysDataAttr}${keysHide}>Game Keys</a>
      <a href="../profile/subscriptions.html"${subsActive}${subsDataAttr}${subsHide}>Subscriptions</a>
    </nav>
    <div class="page-tabs-divider" aria-hidden="true"></div>
  `.trim();
}
