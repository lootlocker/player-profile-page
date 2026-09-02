// scripts/templates/skeleton.js
import { raw } from "../template.js";

export function pageSkeleton() {
  return raw`
    <div class="card">
      <div class="section-title-row">
        <h3 style="opacity:0.3; background:currentColor; border-radius:4px; width:120px; height:20px;">&nbsp;</h3>
      </div>
      <div class="settings-rows">
        <div class="settings-row">
          <span class="stat__label" style="opacity:0.2; background:currentColor; border-radius:4px; width:80px; height:14px; display:inline-block;">&nbsp;</span>
          <strong style="opacity:0.2; background:currentColor; border-radius:4px; width:160px; height:14px; display:inline-block;">&nbsp;</strong>
        </div>
        <div class="settings-row">
          <span class="stat__label" style="opacity:0.2; background:currentColor; border-radius:4px; width:80px; height:14px; display:inline-block;">&nbsp;</span>
          <strong style="opacity:0.2; background:currentColor; border-radius:4px; width:160px; height:14px; display:inline-block;">&nbsp;</strong>
        </div>
        <div class="settings-row">
          <span class="stat__label" style="opacity:0.2; background:currentColor; border-radius:4px; width:80px; height:14px; display:inline-block;">&nbsp;</span>
          <strong style="opacity:0.2; background:currentColor; border-radius:4px; width:160px; height:14px; display:inline-block;">&nbsp;</strong>
        </div>
      </div>
    </div>
  `;
}

export function listSkeleton() {
  return raw`
    <div class="platform-row">
      <div class="platform-cell muted table-empty" style="opacity:0.3;">Loading...</div>
    </div>
  `;
}
