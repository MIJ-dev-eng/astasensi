/* FireSensi: transparent starter-profile generator.
   Values are heuristic suggestions, not scientifically validated device-specific settings. */
(() => {
  "use strict";

  const yearNode = document.getElementById("copyright-year");
  if (yearNode) yearNode.textContent = String(new Date().getFullYear());

  const form = document.getElementById("sensi-form");
  const brandInput = document.getElementById("brand");
  const modelInput = document.getElementById("model");
  const performanceInput = document.getElementById("performance");
  const styleInput = document.getElementById("style");
  const results = document.getElementById("results");
  const error = document.getElementById("form-error");
  const sensitivityGrid = document.getElementById("sensitivity-grid");
  const profileSummary = document.getElementById("profile-summary");
  const tipsList = document.getElementById("tips-list");
  const copyButton = document.getElementById("copy-button");
  const regenerateButton = document.getElementById("regenerate-button");
  const copyStatus = document.getElementById("copy-status");

  // These are starter profiles for algorithm tuning, not a list of verified best settings.
  // A real "tested" database should only be added after the values have been tested on-device.
  const deviceProfiles = [
    { match: /redmi a5/i, tier: "entry", base: [178, 174, 166, 155, 92, 140] },
    { match: /redmi note 13|redmi note 14/i, tier: "mid", base: [184, 178, 170, 160, 96, 145] },
    { match: /infinix smart 8|infinix smart 9|tecno spark go 1/i, tier: "entry", base: [178, 174, 164, 153, 90, 138] },
    { match: /infinix hot 40|infinix hot 50|tecno spark 20|tecno spark 30/i, tier: "mid", base: [184, 179, 170, 160, 95, 144] },
    { match: /samsung galaxy a05|samsung galaxy a15/i, tier: "entry", base: [180, 175, 166, 155, 92, 140] },
    { match: /iphone 11|iphone 13/i, tier: "high", base: [188, 182, 174, 164, 100, 150] }
  ];

  const labels = ["General", "Red Dot", "2x Scope", "4x Scope", "Sniper Scope", "Free Look"];
  let lastGenerated = null;

  function hashString(value) {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i++) {
      hash ^= value.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function findProfile(model) {
    return deviceProfiles.find(profile => profile.match.test(model));
  }

  function getTier(selection, model, profile) {
    if (selection !== "auto") return selection;
    if (profile) return profile.tier;
    if (/iphone|oneplus|samsung galaxy s|pixel|xiaomi 1[2345]t|redmi note pro/i.test(model)) return "high";
    if (/note|hot|spark [2-9][0-9]|galaxy a[2-9][0-9]/i.test(model)) return "mid";
    return "entry";
  }

  function clamp(value, min = 0, max = 200) {
    return Math.max(min, Math.min(max, Math.round(value)));
  }

  function generateSettings({ brand, model, performance, style, swipe }) {
    const profile = findProfile(model);
    const tier = getTier(performance, model, profile);
    const bases = profile ? [...profile.base] : (
      tier === "high" ? [187, 181, 173, 163, 99, 149] :
      tier === "mid" ? [183, 178, 169, 159, 94, 143] :
      [178, 173, 164, 153, 90, 138]
    );

    const styleOffsets = {
      drag:      [5, 4, 2, 0, -3, 0],
      rush:      [7, 5, 2, -1, -4, 1],
      balanced:  [0, 0, 0, 0, 0, 0],
      scope:     [-5, -3, -2, 3, 7, -2]
    }[style] || [0, 0, 0, 0, 0, 0];

    const swipeOffsets = {
      short:  [8, 6, 4, 2, 0, 0],
      medium: [0, 0, 0, 0, 0, 0],
      long:   [-8, -6, -4, -2, 0, 0]
    }[swipe] || [0, 0, 0, 0, 0, 0];

    // Stable device-specific nudge keeps unknown models from all receiving identical numbers.
    // The nudge is deliberately small; it is not evidence that a model has been tested.
    const seed = hashString(`${brand}|${model.toLowerCase()}`);
    const nudge = labels.map((_, i) => ((seed >>> (i * 3)) % 5) - 2);

    const tierOffset = tier === "entry" ? [-2, -2, -2, -1, 0, -2] :
                       tier === "high" ? [2, 1, 1, 1, 1, 2] : [0, 0, 0, 0, 0, 0];

    const values = bases.map((base, i) =>
      clamp(base + styleOffsets[i] + swipeOffsets[i] + tierOffset[i] + nudge[i])
    );

    const tips = [];
    if (style === "drag" || style === "rush") {
      tips.push("In Training Mode, aim at the upper chest and drag upward in one smooth motion rather than swiping wildly.");
    } else if (style === "scope") {
      tips.push("Prioritize steady tracking and small adjustments when scoped; don't raise every scope value just to chase headshots.");
    } else {
      tips.push("Test close-range and mid-range fights separately. Change one setting at a time so you can tell what helped.");
    }
    if (swipe === "short") tips.push("If your crosshair consistently stops below the head, increase General or Red Dot by 3–5 points and retest.");
    if (swipe === "long") tips.push("If your aim flies over the head, lower General or Red Dot by 3–5 points and retest.");
    if (swipe === "medium") tips.push("If you overshoot, lower General or Red Dot by 3–5 points; if you undershoot, raise one by 3–5.");
    if (tier === "entry") tips.push("If the game stutters, reduce graphics settings and stabilize frame rate before making large sensitivity changes.");
    tips.push("Sensitivity is personal and may vary with HUD button size, touch sampling, frame rate, and game updates.");

    return { values, tier, profileKnown: Boolean(profile), tips };
  }

  function renderSettings(data, setup) {
    sensitivityGrid.replaceChildren();
    data.values.forEach((value, index) => {
      const item = document.createElement("article");
      item.className = "sensi-item";
      const top = document.createElement("div");
      top.className = "sensi-item-top";
      const label = document.createElement("span");
      label.className = "sensi-label";
      label.textContent = labels[index];
      const icon = document.createElement("span");
      icon.setAttribute("aria-hidden", "true");
      icon.style.color = "var(--red)";
      icon.textContent = index < 2 ? "↗" : "⌖";
      top.append(label, icon);

      const number = document.createElement("strong");
      number.className = "sensi-value";
      number.textContent = String(value);

      const track = document.createElement("div");
      track.className = "sensi-track";
      track.setAttribute("role", "progressbar");
      track.setAttribute("aria-label", `${labels[index]} sensitivity`);
      track.setAttribute("aria-valuemin", "0");
      track.setAttribute("aria-valuemax", "200");
      track.setAttribute("aria-valuenow", String(value));
      const fill = document.createElement("div");
      fill.className = "sensi-fill";
      fill.style.width = `${value / 2}%`;
      track.append(fill);

      const range = document.createElement("div");
      range.className = "sensi-range";
      range.innerHTML = "<span>0</span><span>200</span>";
      item.append(top, number, track, range);
      sensitivityGrid.append(item);
    });

    const profileText = data.profileKnown
      ? "Matched a built-in starter profile for"
      : "Used the general recommendation algorithm for";
    profileSummary.textContent = `${profileText} ${setup.brand} ${setup.model} · ${data.tier} performance estimate · ${setup.style.replace("-", " ")} play style.`;
    tipsList.replaceChildren();
    data.tips.forEach(tip => {
      const li = document.createElement("li");
      li.textContent = tip;
      tipsList.append(li);
    });
  }

  function getSetup() {
    return {
      brand: brandInput.value.trim(),
      model: modelInput.value.trim(),
      performance: performanceInput.value,
      style: styleInput.value,
      swipe: form.querySelector('input[name="swipe"]:checked')?.value || "medium"
    };
  }

  function generate() {
    const setup = getSetup();
    if (!setup.brand || !setup.model) {
      error.textContent = "Choose a phone brand and enter your phone model first.";
      error.hidden = false;
      return;
    }
    error.hidden = true;
    lastGenerated = { setup, data: generateSettings(setup) };
    renderSettings(lastGenerated.data, setup);
    results.hidden = false;
    copyStatus.textContent = "";
    results.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  form.addEventListener("submit", event => {
    event.preventDefault();
    generate();
  });

  regenerateButton.addEventListener("click", () => {
    // Rebuild with the same inputs. The result is intentionally deterministic for consistency.
    generate();
  });

  copyButton.addEventListener("click", async () => {
    if (!lastGenerated) return;
    const { setup, data } = lastGenerated;
    const text = [
      `Free Fire sensitivity starter profile`,
      `Device: ${setup.brand} ${setup.model}`,
      `Play style: ${setup.style}`,
      ...labels.map((label, i) => `${label}: ${data.values[i]}`),
      "",
      "Suggested starting values only; test and adjust in-game."
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      copyStatus.textContent = "Settings copied to clipboard.";
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "absolute";
      textarea.style.left = "-9999px";
      document.body.append(textarea);
      textarea.select();
      const copied = document.execCommand("copy");
      textarea.remove();
      copyStatus.textContent = copied ? "Settings copied to clipboard." : "Copy was blocked by your browser. Select and copy the values manually.";
    }
  });
})();
