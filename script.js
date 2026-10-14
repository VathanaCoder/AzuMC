/* AzuMC catalog. Made by VATHANA © 2026
   Standalone file — no build step. Mods live in data/mods.js.
   A mod shows a download only when it has a real file (see data/mods.js). */
(function () {
  if (window.__AZUMC_BOOTED__) return;
  window.__AZUMC_BOOTED__ = true;

  /**
   * Reserved task links for a future timed download flow.
   * Not rendered while downloads are disabled.
   * The countdown is only a wait. It must never claim to check likes, follows, or subscriptions.
   */
  var TIKTOK_TASK_LINKS = [
    "https://vt.tiktok.com/ZSbomQ4y6/",
    "https://vt.tiktok.com/ZSbomaSnd/",
    "https://vt.tiktok.com/ZSbom4xys/",
    "https://vt.tiktok.com/ZSbom6tdW/",
    "https://vt.tiktok.com/ZSbomHdrB/",
    "https://vt.tiktok.com/ZSbomVSsq/",
    "https://vt.tiktok.com/ZSbomuRtd/",
    "https://vt.tiktok.com/ZSbomrjut/",
    "https://vt.tiktok.com/ZSbomCvU4/"
  ];

  var DOWNLOAD_SYSTEM = {
    enabled: true,
    countdownSeconds: 10,
    taskLinks: TIKTOK_TASK_LINKS,
    extensions: [".mcaddon", ".mcpack", ".mcworld", ".mctemplate", ".zip"]
  };

  var MODS = Array.isArray(window.AZUMC_MODS) ? window.AZUMC_MODS : [];

  var FAV_KEY = "azumc-favorites";
  var THEME_KEY = "azumc-theme";
  var state = { query: "", category: "All", sort: "newest" };
  var CATEGORIES = ["Mods", "Add-ons", "Horror", "Resource Packs", "Behavior Packs", "Maps", "Skins"];
  var favs = loadFavs();
  var toastTimer = 0;
  var lightTrigger = null;
  var downloadTimers = [];

  function loadFavs() {
    try {
      var raw = JSON.parse(localStorage.getItem(FAV_KEY) || "[]");
      return new Set(Array.isArray(raw) ? raw.filter(function (id) { return typeof id === "string"; }) : []);
    } catch (e) {
      return new Set();
    }
  }

  function saveFavs() {
    localStorage.setItem(FAV_KEY, JSON.stringify(Array.from(favs)));
  }

  function vLabel(v) { v = String(v == null ? "" : v); return /^\d/.test(v) ? "v" + esc(v) : esc(v); }

  function esc(value) {
    return String(value)
      .replace(/&/g, "\u0026amp;")
      .replace(/</g, "\u0026lt;")
      .replace(/>/g, "\u0026gt;")
      .replace(/"/g, "\u0026quot;")
      .replace(/'/g, "\u0026#39;");
  }

  function motion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
  }

  function formatDate(iso) {
    var parts = iso.split("-");
    var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    return Number(parts[2]) + " " + months[Number(parts[1]) - 1] + " " + parts[0];
  }

  function byDate(a, b) {
    return a.released < b.released ? 1 : a.released > b.released ? -1 : 0;
  }

  function getMod(id) {
    for (var i = 0; i < MODS.length; i++) if (MODS[i].id === id) return MODS[i];
    return null;
  }

  function heart(on) {
    return on
      ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 20.2s-7-4.4-7-9.1A4 4 0 0 1 12 8.2a4 4 0 0 1 7 2.9c0 4.7-7 9.1-7 9.1Z"/></svg>'
      : '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" d="M12 19.2s-6.4-3.9-6.4-8.2A3.7 3.7 0 0 1 12 8a3.7 3.7 0 0 1 6.4 3c0 4.3-6.4 8.2-6.4 8.2Z"/></svg>';
  }

  function isDownloadAvailable(mod) {
    if (!DOWNLOAD_SYSTEM.enabled || !mod || !mod.file) return false;
    var ext = String(mod.file.ext || "").toLowerCase();
    var url = String(mod.file.url || "");
    if (DOWNLOAD_SYSTEM.extensions.indexOf(ext) === -1) return false;
    if (!url || url.indexOf("..") !== -1) return false;
    var clean = url.split("?")[0].toLowerCase();
    return clean.slice(-ext.length) === ext;
  }

  function tasksFor(mod) {
    if (mod.tasks && mod.tasks.length) {
      return mod.tasks.map(function (task, i) {
        return { n: i + 1, url: task.url, label: task.label || ("Task " + (i + 1)) };
      });
    }
    var count = Math.max(0, Math.min(DOWNLOAD_SYSTEM.taskLinks.length, mod.taskCount || DOWNLOAD_SYSTEM.taskLinks.length));
    return DOWNLOAD_SYSTEM.taskLinks.slice(0, count).map(function (url, i) {
      return { n: i + 1, url: url, label: "Task " + (i + 1) };
    });
  }

  function planDownload(mod) {
    if (!isDownloadAvailable(mod)) {
      return { ok: false, message: "Download coming soon — this file isn’t available yet." };
    }
    return {
      ok: true,
      countdownSeconds: DOWNLOAD_SYSTEM.countdownSeconds,
      tasks: tasksFor(mod),
      file: mod.file
    };
  }

  function cardHTML(mod, variant) {
    var on = favs.has(mod.id);
    var loading = variant === "feature" ? "eager" : "lazy";
    return (
      '<article class="card card-' + variant + '">' +
        '<div class="card-media">' +
          '<img src="' + esc(mod.image) + '" alt="' + esc(mod.alt) + '" loading="' + loading + '" decoding="async" data-fallback="' + esc(mod.name) + '">' +
                    '<button type="button" class="fav" data-fav="' + esc(mod.id) + '" data-name="' + esc(mod.name) + '" aria-pressed="' + (on ? "true" : "false") + '" aria-label="' + (on ? "Remove from favorites" : "Save to favorites") + ": " + esc(mod.name) + '">' + heart(on) + "</button>" +
        "</div>" +
        '<div class="card-body">' +
          '<p class="kicker">' + esc(mod.category) + "</p>" +
          '<h3><a href="#/mod/' + esc(mod.id) + '">' + esc(mod.name) + "</a></h3>" +
          '<p class="meta">' + vLabel(mod.version) + " · " + esc(mod.minecraft) + "</p>" +
          (variant !== "compact" ? '<p class="excerpt">' + esc(mod.summary) + "</p>" : "") +
          '<a class="btn btn-ghost" href="#/mod/' + esc(mod.id) + '">Details</a>' +
        "</div>" +
      "</article>"
    );
  }

  function bindImages(scope) {
    scope.querySelectorAll("img[data-fallback]").forEach(function (img) {
      img.addEventListener("error", function () {
        var fb = document.createElement("div");
        fb.className = "thumb-fallback";
        fb.setAttribute("role", "img");
        fb.setAttribute("aria-label", img.alt || "Preview unavailable");
        fb.textContent = (img.getAttribute("data-fallback") || "?").slice(0, 1);
        img.replaceWith(fb);
      }, { once: true });
    });
  }

  function sortList(list) {
    var out = list.slice();
    if (state.sort === "oldest") out.sort(function (a, b) { return byDate(b, a); });
    else if (state.sort === "name") out.sort(function (a, b) { return a.name.localeCompare(b.name); });
    else out.sort(byDate);
    return out;
  }

  function filtered() {
    var q = state.query.trim().toLowerCase();
    var list = MODS.filter(function (mod) {
      if (state.category !== "All" && mod.category !== state.category) return false;
      if (!q) return true;
      var hay = [mod.name, mod.description, mod.summary, mod.category, mod.author, mod.version, mod.minecraft].join(" ").toLowerCase();
      return hay.indexOf(q) !== -1;
    });
    return sortList(list);
  }

  function isIdle() {
    return state.query.trim() === "" && state.category === "All";
  }

  function emptyHTML(kind) {
    if (kind === "favorites") {
      return (
        '<div class="empty">' +
          '<div class="empty-mark" aria-hidden="true"><svg viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="1.8" d="M12 19.2s-6.4-3.9-6.4-8.2A3.7 3.7 0 0 1 12 8a3.7 3.7 0 0 1 6.4 3c0 4.3-6.4 8.2-6.4 8.2Z"/></svg></div>' +
          "<h2>No favorites yet</h2>" +
          "<p>Save a mod with the heart. It will stay on this device.</p>" +
          '<a class="btn" href="#/">Discover mods</a>' +
        "</div>"
      );
    }
    return (
      '<div class="empty">' +
        '<div class="empty-mark" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.25" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M16 16.5 20 20.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></div>' +
        "<h3>" + (state.query.trim() ? "No results for “" + esc(state.query.trim()) + "”" : "Nothing in " + esc(state.category) + " yet") + "</h3>" +
        "<p>" + (state.query.trim() ? "Check the spelling, or try a creator, a version number, or a broader category." : "This category has nothing yet. Try another one.") + "</p>" +
        '<button type="button" class="btn" data-reset>Clear search and filters</button>' +
      "</div>"
    );
  }

  function renderHero() {
    var mod = null;
    for (var i = 0; i < MODS.length; i++) if (MODS[i].hero) mod = MODS[i];
    var slot = document.getElementById("hero-feature");
    if (!slot || !mod) return;
    var on = favs.has(mod.id);
    slot.innerHTML =
      '<article class="hero-card">' +
        '<img src="' + esc(mod.image) + '" alt="' + esc(mod.alt) + '" width="132" height="132" data-fallback="' + esc(mod.name) + '">' +
        "<div>" +
          '<p class="kicker">' + esc(mod.category) + " · " + vLabel(mod.version) + "</p>" +
          '<h3><a href="#/mod/' + esc(mod.id) + '">' + esc(mod.name) + "</a></h3>" +
          '<p class="meta">' + esc(mod.summary) + "</p>" +
          '<a class="text-link" href="#/mod/' + esc(mod.id) + '">Details</a>' +
        "</div>" +
        '<button type="button" class="fav" data-fav="' + esc(mod.id) + '" data-name="' + esc(mod.name) + '" aria-pressed="' + (on ? "true" : "false") + '" aria-label="' + (on ? "Remove from favorites" : "Save to favorites") + ": " + esc(mod.name) + '">' + heart(on) + "</button>" +
      "</article>";
    bindImages(slot);
  }

  function latestRowHTML(mod) {
    var on = favs.has(mod.id);
    return (
      '<article class="row">' +
        '<img src="' + esc(mod.image) + '" alt="' + esc(mod.alt) + '" width="72" height="72" loading="lazy" decoding="async" data-fallback="' + esc(mod.name) + '">' +
        '<div class="row-body">' +
          '<p class="kicker">' + esc(mod.category) + "</p>" +
          '<h3><a href="#/mod/' + esc(mod.id) + '">' + esc(mod.name) + "</a></h3>" +
          '<p class="meta">Added ' + esc(formatDate(mod.released)) + " · " + vLabel(mod.version) + "</p>" +
        "</div>" +
        '<button type="button" class="fav" data-fav="' + esc(mod.id) + '" data-name="' + esc(mod.name) + '" aria-pressed="' + (on ? "true" : "false") + '" aria-label="' + (on ? "Remove from favorites" : "Save to favorites") + ": " + esc(mod.name) + '">' + heart(on) + "</button>" +
      "</article>"
    );
  }

  /* Fill a shelf from the shared MODS list; hide its whole section when empty. */
  function fillShelf(id, list, variant) {
    var el = document.getElementById(id);
    if (!el) return;
    var section = el.closest("section");
    if (!list.length) { if (section) section.hidden = true; return; }
    if (section) section.hidden = false;
    el.classList.toggle("is-single", list.length === 1);
    el.innerHTML = list.map(function (mod) { return variant === "row" ? latestRowHTML(mod) : cardHTML(mod, variant); }).join("");
    bindImages(el);
  }

  function renderHome() {
    var byCat = function (cat) { return MODS.filter(function (m) { return m.category === cat; }).sort(byDate); };
    var featured = MODS.filter(function (mod) { return mod.featured; }).sort(byDate);
    var horror = byCat("Horror");
    var packs = byCat("Resource Packs");
    var recommended = MODS.filter(function (m) { return !m.featured; }).sort(byDate).slice(0, 4);
    var latest = MODS.slice().sort(byDate).slice(0, 5);

    fillShelf("featured-track", featured, "feature");
    updateCarousel();
    fillShelf("home-recommended", recommended, "catalog");
    fillShelf("home-horror", horror, horror.length === 1 ? "wide" : "catalog");
    fillShelf("home-packs", packs, "catalog");
    fillShelf("home-latest", latest, "row");

    CATEGORIES.forEach(function (cat) {
      var n = byCat(cat).length;
      var el = document.querySelector('[data-count-for="' + cat + '"]');
      if (el) {
        el.textContent = n === 1 ? "1 item" : n + " items";
        var tile = el.closest("li");
        if (tile) tile.hidden = n === 0;
      }
    });
  }

  function renderSearch() {
    var grid = document.getElementById("search-results");
    var count = document.getElementById("result-count");
    var live = document.getElementById("results-live");
    var resetBtn = document.getElementById("reset-btn");
    if (!grid) return;
    if (resetBtn) resetBtn.hidden = isIdle();
    if (isIdle()) {
      if (count) count.textContent = MODS.length + " items in the catalog";
      if (live) live.textContent = "";
      grid.classList.add("is-idle");
      grid.innerHTML =
        '<div class="empty search-hint">' +
          '<div class="empty-mark" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.25" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M16 16.5 20 20.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></div>' +
          "<h2>What are you looking for?</h2>" +
          "<p>Type a mod name, creator, version, or keyword. Or pick a category above to browse it.</p>" +
          '<div class="suggest" role="group" aria-label="Try a search">' +
            ["Horror", "Northline", "1.21", "cape"].map(function (term) {
              return '<button type="button" class="chip" data-suggest="' + esc(term) + '">' + esc(term) + "</button>";
            }).join("") +
          "</div>" +
        "</div>";
      return;
    }
    grid.classList.remove("is-idle");
    var list = filtered();
    var noun = list.length === 1 ? "result" : "results";
    var where = state.category === "All" ? "" : " in " + state.category;
    if (count) count.textContent = list.length + " " + noun + where;
    if (live) live.textContent = "Showing " + list.length + " " + noun + where;
    grid.innerHTML = list.length ? list.map(function (mod) { return cardHTML(mod, "catalog"); }).join("") : emptyHTML("search");
    bindImages(grid);
  }

  function renderFavorites() {
    var slot = document.getElementById("favorites-list");
    if (!slot) return;
    var list = MODS.filter(function (mod) { return favs.has(mod.id); }).sort(byDate);
    slot.innerHTML = list.length
      ? '<div class="mod-grid">' + list.map(function (mod) { return cardHTML(mod, "catalog"); }).join("") + "</div>"
      : emptyHTML("favorites");
    bindImages(slot);
  }

  function related(mod) {
    var same = MODS.filter(function (item) { return item.id !== mod.id && item.category === mod.category; });
    var rest = MODS.filter(function (item) { return item.id !== mod.id && item.category !== mod.category; });
    return same.concat(rest).slice(0, 3);
  }

  function detailText(mod) {
    return [
      mod.name,
      "Category: " + mod.category,
      "Mod version: " + mod.version,
      "Minecraft: " + mod.minecraft,
      "Made by: " + mod.author,
      "File size: " + mod.fileSize,
      "Released: " + formatDate(mod.released),
      "Status: " + mod.status,
      "",
      mod.description,
      "",
      "Download coming soon — this file isn’t available yet."
    ].join("\n");
  }

  function renderDownloadSlot(el, mod) {
    downloadTimers.forEach(clearInterval);
    downloadTimers = [];
    var plan = planDownload(mod);
    if (!plan.ok) {
      el.innerHTML =
        '<div class="demo-note" role="note">' +
          '<p class="demo-kicker">' + esc(mod.status) + "</p>" +
          '<p class="demo-lead">Download coming soon — this file isn’t available yet.</p>' +
        "</div>";
      return;
    }
    el.innerHTML =
      '<section class="task-panel">' +
        "<h3>File tasks</h3>" +
        "<p>Open any of the links if you want, then start the timer. The countdown is only a wait — it does not check likes, follows, or subscriptions.</p>" +
        '<ol class="task-list">' +
          plan.tasks.map(function (task) {
            return '<li><a class="btn btn-ghost" href="' + esc(task.url) + '" target="_blank" rel="noopener noreferrer">Open task ' + task.n + "</a></li>";
          }).join("") +
        "</ol>" +
        '<button type="button" class="btn" data-start-timer>Start ' + plan.countdownSeconds + "s timer</button>" +
        '<div class="progress" hidden><span></span></div>' +
        '<p class="timer-status" role="status"></p>' +
        '<p data-file-ready hidden><a class="btn" href="' + esc(plan.file.url) + '">Save ' + esc(plan.file.name || "file") + "</a></p>" +
      "</section>";
    var start = el.querySelector("[data-start-timer]");
    var bar = el.querySelector(".progress");
    var barSpan = bar.querySelector("span");
    var status = el.querySelector(".timer-status");
    var ready = el.querySelector("[data-file-ready]");
    start.addEventListener("click", function () {
      if (start.dataset.running === "1") return;
      start.dataset.running = "1";
      start.disabled = true;
      bar.hidden = false;
      var total = plan.countdownSeconds;
      var left = total;
      status.textContent = "Waiting " + left + "s. This does not verify any social action.";
      barSpan.style.width = "0%";
      var timer = setInterval(function () {
        left -= 1;
        barSpan.style.width = Math.min(100, ((total - Math.max(left, 0)) / total) * 100) + "%";
        if (left <= 0) {
          clearInterval(timer);
          status.textContent = "Timer finished. Your file link is ready.";
          ready.hidden = false;
          start.hidden = true;
          return;
        }
        status.textContent = "Waiting " + left + "s. This does not verify any social action.";
      }, 1000);
      downloadTimers.push(timer);
    });
  }

  function renderDetail(id) {
    var root = document.getElementById("detail-root");
    if (!root) return;
    var mod = getMod(id);
    if (!mod) {
      root.innerHTML =
        '<div class="empty"><h1>Mod not found</h1><p>That mod is not in the catalog.</p><a class="btn" href="#/">Back to home</a></div>';
      document.title = "Not found — AzuMC";
      return;
    }
    var on = favs.has(mod.id);
    var paragraphs = mod.description.split(/\n\n/).map(function (p) { return "<p>" + esc(p) + "</p>"; }).join("");
    var shots = mod.shots.map(function (shot) {
      return '<button type="button" class="shot" data-shot-src="' + esc(shot.src) + '" data-shot-alt="' + esc(shot.alt) + '"><img src="' + esc(shot.src) + '" alt="' + esc(shot.alt) + '" loading="lazy" decoding="async" data-fallback="' + esc(mod.name) + '"></button>';
    }).join("");
    var more = related(mod);
    root.innerHTML =
      '<a class="back" href="#/" data-back>Back</a>' +
      '<div class="detail-hero">' +
        '<button type="button" class="detail-shot" data-shot-src="' + esc(mod.image) + '" data-shot-alt="' + esc(mod.alt) + '">' +
          '<img src="' + esc(mod.image) + '" alt="' + esc(mod.alt) + '" data-fallback="' + esc(mod.name) + '">' +
        "</button>" +
        "<div>" +
          '<div class="detail-title"><h1>' + esc(mod.name) + '</h1></div>' +
          '<p class="kicker" style="margin-top:8px">' + esc(mod.category) + "</p>" +
          '<p class="lede tight">' + esc(mod.summary) + "</p>" +
          '<div class="action-row">' +
            '<button type="button" class="btn btn-ghost btn-save" data-fav="' + esc(mod.id) + '" data-name="' + esc(mod.name) + '" aria-pressed="' + (on ? "true" : "false") + '">' + heart(on) + "<span>" + (on ? "Saved" : "Save") + "</span></button>" +
              '<button type="button" class="btn btn-ghost" data-share="' + esc(mod.id) + '">Share</button>' +
          "</div>" +
          '<dl class="meta-grid">' +
            "<div><dt>Category</dt><dd>" + esc(mod.category) + "</dd></div>" +
            "<div><dt>Mod version</dt><dd>" + esc(mod.version) + "</dd></div>" +
            "<div><dt>Minecraft</dt><dd>" + esc(mod.minecraft) + "</dd></div>" +
            "<div><dt>Made by</dt><dd>" + esc(mod.author) + "</dd></div>" +
            "<div><dt>File size</dt><dd>" + esc(mod.fileSize) + "</dd></div>" +
            "<div><dt>Released</dt><dd>" + esc(formatDate(mod.released)) + "</dd></div>" +
          "</dl>" +
        "</div>" +
      "</div>" +
      '<div class="prose">' + paragraphs + "</div>" +
      '<div id="download-slot"></div>' +
      '<div class="gallery-head"><h2>Screenshots</h2><p class="gallery-note">Preview art.</p></div>' +
      '<div class="gallery-track">' + shots + "</div>" +
      '<div class="related"><h2>Related mods</h2><div class="mod-grid">' + more.map(function (item) { return cardHTML(item, "catalog"); }).join("") + "</div></div>";
    bindImages(root);
    renderDownloadSlot(root.querySelector("#download-slot"), mod);
    document.title = mod.name + " — AzuMC";
  }

  function paintHearts() {
    document.querySelectorAll("[data-fav]").forEach(function (btn) {
      var on = favs.has(btn.getAttribute("data-fav"));
      var name = btn.getAttribute("data-name") || "mod";
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      if (btn.classList.contains("fav")) {
        btn.innerHTML = heart(on);
        btn.setAttribute("aria-label", (on ? "Remove from favorites: " : "Save to favorites: ") + name);
      } else {
        btn.innerHTML = heart(on) + "<span>" + (on ? "Saved" : "Save") + "</span>";
      }
    });
    var n = String(favs.size);
    document.querySelectorAll(".js-fav-count").forEach(function (el) {
      el.textContent = n;
      el.hidden = favs.size === 0;
    });
  }

  function syncSearch(source) {
    var input = document.getElementById("search-input");
    if (input && input !== source) input.value = state.query;
    var clear = document.querySelector("#view-search [data-clear-search]");
    if (clear) clear.hidden = state.query.length === 0;
  }

  function setCategory(cat) {
    state.category = cat;
    document.querySelectorAll("[data-filter]").forEach(function (btn) {
      btn.setAttribute("aria-pressed", btn.getAttribute("data-filter") === cat ? "true" : "false");
    });
    renderSearch();
  }

  function resetFilters() {
    state.query = "";
    syncSearch(null);
    setCategory("All");
    var input = document.getElementById("search-input");
    if (input) input.focus({ preventScroll: true });
  }

  function parseRoute() {
    var hash = (location.hash || "").replace(/^#/, "");
    var qIndex = hash.indexOf("?");
    var rawPath = qIndex === -1 ? hash : hash.slice(0, qIndex);
    var params = {};
    if (qIndex !== -1) {
      hash.slice(qIndex + 1).split("&").forEach(function (pair) {
        if (!pair) return;
        var kv = pair.split("=");
        try { params[decodeURIComponent(kv[0])] = decodeURIComponent((kv[1] || "").replace(/\+/g, " ")); }
        catch (e) { params[kv[0]] = kv[1] || ""; }
      });
    }
    var path = rawPath;
    try { path = decodeURIComponent(rawPath); } catch (e) {}
    path = path || "/";
    if (path === "/") return { name: "home" };
    if (path === "/search" || path === "search") return { name: "search", params: params };
    if (path === "featured") return { name: "home", scroll: "featured" };
    if (path === "/favorites") return { name: "favorites" };
    if (path === "/settings") return { name: "settings" };
    if (path === "/about" || path === "/help" || path === "/privacy" || path === "/terms") {
      return { name: "page", page: path.slice(1), nav: "settings" };
    }
    var mod = path.match(/^\/mod\/([a-z0-9-]+)$/);
    if (mod) return { name: "detail", id: mod[1] };
    return { name: "home" };
  }

  function showViews(route) {
    var map = {
      home: "view-home",
      search: "view-search",
      favorites: "view-favorites",
      settings: "view-settings",
      detail: "view-detail",
      page: "view-page"
    };
    Object.keys(map).forEach(function (key) {
      var el = document.getElementById(map[key]);
      if (!el) return;
      var show = key === route.name;
      var wasHidden = el.hidden;
      el.hidden = !show;
      if (show && wasHidden) {
        el.classList.remove("view-in");
        void el.offsetWidth;
        el.classList.add("view-in");
      }
    });
    document.querySelectorAll("[data-page]").forEach(function (article) {
      article.hidden = route.name !== "page" || article.getAttribute("data-page") !== route.page;
    });
  }

  function updateNav(route) {
    var key = route.nav || (route.name === "home" ? "home" : route.name);
    document.querySelectorAll("[data-nav]").forEach(function (el) {
      if (el.getAttribute("data-nav") === key) el.setAttribute("aria-current", "page");
      else el.removeAttribute("aria-current");
    });
  }

  function titles(route) {
    if (route.name === "favorites") return "Favorites — AzuMC";
    if (route.name === "settings") return "Settings — AzuMC";
    if (route.name === "search") return "Search — AzuMC";
    if (route.name === "page") {
      var names = { about: "About", help: "Help", privacy: "Privacy Policy", terms: "Terms of Use" };
      return (names[route.page] || "AzuMC") + " — AzuMC";
    }
    if (route.name === "detail") return document.title;
    return "AzuMC — Minecraft Mods & Add-ons";
  }

  function applyRoute(route) {
    closeLight(true);
    if (tabbar) tabbar.classList.remove("is-hidden");
    showViews(route);
    updateNav(route);
    if (route.name === "favorites") renderFavorites();
    if (route.name === "detail") renderDetail(route.id);
    else document.title = titles(route);
    if (route.name === "settings") syncThemeButtons();
    if (route.name === "search") {
      var p = route.params || {};
      var hasCat = p.cat && (p.cat === "All" || CATEGORIES.indexOf(p.cat) !== -1);
      if (hasCat) state.category = p.cat;
      if (typeof p.q === "string") state.query = p.q;
      else if (hasCat) state.query = "";
      var input = document.getElementById("search-input");
      if (input) input.value = state.query;
      syncSearch(null);
      setCategory(state.category);
      var sort = document.getElementById("sort-select");
      if (sort) sort.value = state.sort;
    }
    var reduce = motion() === "auto";
    if (route.scroll) {
      var target = document.getElementById(route.scroll);
      if (target) target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    } else {
      window.scrollTo({ top: 0, behavior: "auto" });
    }
    if (route.name === "search") {
      var field = document.getElementById("search-input");
      var coarse = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
      var arrivedWithFilter = route.params && route.params.cat;
      if (field && !arrivedWithFilter && (!coarse || isIdle())) field.focus({ preventScroll: true });
    }
    var back = document.querySelector("#detail-root .back, #view-page .back, #view-favorites h1");
    if (route.name === "detail" && back) back.focus();
  }

  function currentTheme() {
    return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    try { localStorage.setItem(THEME_KEY, theme); } catch (e) {}
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "light" ? "#e4ebf5" : "#0f1a2b");
    syncThemeButtons();
    var toggle = document.querySelector("[data-theme-toggle]");
    if (toggle) toggle.setAttribute("aria-label", theme === "dark" ? "Switch to light mode" : "Switch to dark mode");
  }

  function syncThemeButtons() {
    var theme = currentTheme();
    document.querySelectorAll("[data-theme-set]").forEach(function (btn) {
      btn.setAttribute("aria-pressed", btn.getAttribute("data-theme-set") === theme ? "true" : "false");
    });
  }

  function toast(message) {
    var el = document.getElementById("toast");
    if (!el) return;
    el.textContent = message;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.hidden = true; }, 2200);
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).catch(function () { return fallbackCopy(text); });
    }
    fallbackCopy(text);
    return Promise.resolve();
  }

  function fallbackCopy(text) {
    var area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.left = "-9999px";
    document.body.appendChild(area);
    area.select();
    try { document.execCommand("copy"); } catch (e) {}
    area.remove();
  }

  function shareMod(mod) {
    var url = new URL(location.href);
    url.hash = "#/mod/" + mod.id;
    var payload = { title: mod.name + " — AzuMC", text: mod.summary, url: url.toString() };
    if (navigator.share) {
      navigator.share(payload).catch(function (err) {
        if (err && err.name === "AbortError") return;
        copyText(url.toString()).then(function () { toast("Link copied"); });
      });
      return;
    }
    copyText(url.toString()).then(function () { toast("Link copied"); });
  }

  function openLight(src, alt, trigger) {
    var box = document.getElementById("lightbox");
    var img = document.getElementById("lightbox-img");
    var cap = document.getElementById("lightbox-cap");
    if (!box || !img) return;
    lightTrigger = trigger || null;
    img.src = src;
    img.alt = alt || "";
    if (cap) cap.textContent = alt || "";
    box.hidden = false;
    document.body.classList.add("no-scroll");
    var close = box.querySelector("[data-close-light].btn");
    if (close) close.focus();
  }

  function closeLight(silent) {
    var box = document.getElementById("lightbox");
    if (!box || box.hidden) return;
    box.hidden = true;
    document.body.classList.remove("no-scroll");
    if (!silent && lightTrigger) lightTrigger.focus();
    lightTrigger = null;
  }

  function updateCarousel() {
    var track = document.getElementById("featured-track");
    if (!track) return;
    var max = track.scrollWidth - track.clientWidth;
    var prev = document.querySelector("[data-carousel='-1']");
    var next = document.querySelector("[data-carousel='1']");
    if (prev) prev.disabled = track.scrollLeft <= 4;
    if (next) next.disabled = track.scrollLeft >= max - 4;
  }

  function scrollCarousel(dir) {
    var track = document.getElementById("featured-track");
    if (!track) return;
    var card = track.querySelector(".card");
    var delta = (card ? card.getBoundingClientRect().width + 14 : 280) * dir;
    track.scrollBy({ left: delta, behavior: motion() });
  }

  function toggleFav(id) {
    if (favs.has(id)) favs.delete(id);
    else favs.add(id);
    saveFavs();
    paintHearts();
    var route = parseRoute();
    if (route.name === "favorites") renderFavorites();
  }

  var root = document.getElementById("azumc");
  if (!root) return;

  var navDepth = 0;
  var goingBack = false;
  function goBack() {
    goingBack = true;
    history.back();
  }

  root.addEventListener("click", function (event) {
    var back = event.target.closest("[data-back]");
    if (back && navDepth > 0) {
      event.preventDefault();
      goBack();
      return;
    }

    var same = event.target.closest("a[href^='#']");
    if (same && same.getAttribute("href") === location.hash) {
      applyRoute(parseRoute());
    }

    var suggest = event.target.closest("[data-suggest]");
    if (suggest) {
      state.query = suggest.getAttribute("data-suggest");
      syncSearch(null);
      var si = document.getElementById("search-input");
      if (si) si.value = state.query;
      renderSearch();
      return;
    }

    var reset = event.target.closest("[data-reset]");
    if (reset) { resetFilters(); return; }

    var clear = event.target.closest("[data-clear-search]");
    if (clear) {
      state.query = "";
      syncSearch(null);
      var field = clear.parentElement && clear.parentElement.querySelector("input");
      if (field) { field.value = ""; field.focus(); }
      renderSearch();
      return;
    }

    var fav = event.target.closest("[data-fav]");
    if (fav) {
      event.preventDefault();
      event.stopPropagation();
      toggleFav(fav.getAttribute("data-fav"));
      return;
    }

    var filter = event.target.closest("[data-filter]");
    if (filter) {
      setCategory(filter.getAttribute("data-filter"));
      return;
    }

    var carousel = event.target.closest("[data-carousel]");
    if (carousel) {
      scrollCarousel(Number(carousel.getAttribute("data-carousel")));
      return;
    }

    var themeSet = event.target.closest("[data-theme-set]");
    if (themeSet) {
      applyTheme(themeSet.getAttribute("data-theme-set"));
      return;
    }

    var themeToggle = event.target.closest("[data-theme-toggle]");
    if (themeToggle) {
      applyTheme(currentTheme() === "dark" ? "light" : "dark");
      return;
    }

    var copyBtn = event.target.closest("[data-copy]");
    if (copyBtn) {
      var copied = getMod(copyBtn.getAttribute("data-copy"));
      if (!copied) return;
      copyText(detailText(copied)).then(function () { toast("Details copied"); });
      return;
    }

    var shareBtn = event.target.closest("[data-share]");
    if (shareBtn) {
      var shared = getMod(shareBtn.getAttribute("data-share"));
      if (shared) shareMod(shared);
      return;
    }

    var shot = event.target.closest("[data-shot-src]");
    if (shot) {
      openLight(shot.getAttribute("data-shot-src"), shot.getAttribute("data-shot-alt"), shot);
      return;
    }

    if (event.target.closest("[data-close-light]")) closeLight(false);
  });

  root.addEventListener("submit", function (event) {
    var form = event.target.closest("[data-search-form]");
    if (!form) return;
    event.preventDefault();
    var input = document.getElementById("search-input");
    if (input) { state.query = input.value; syncSearch(input); input.blur(); }
    renderSearch();
  });

  root.addEventListener("input", function (event) {
    if (event.target.id === "sort-select") {
      state.sort = event.target.value;
      renderSearch();
      return;
    }
    if (event.target.id !== "search-input") return;
    state.query = event.target.value;
    syncSearch(event.target);
    renderSearch();
  });

  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") return;
    var box = document.getElementById("lightbox");
    if (box && !box.hidden) { closeLight(false); return; }
    var route = parseRoute();
    if (route.name === "detail" || route.name === "page") {
      if (navDepth > 0) goBack();
      else location.hash = "#/";
    }
  });

  var track = document.getElementById("featured-track");
  if (track) {
    track.addEventListener("scroll", updateCarousel, { passive: true });
    track.addEventListener("keydown", function (event) {
      if (event.key === "ArrowRight") { event.preventDefault(); scrollCarousel(1); }
      if (event.key === "ArrowLeft") { event.preventDefault(); scrollCarousel(-1); }
    });
  }
  window.addEventListener("resize", updateCarousel);

  var tabbar = document.querySelector(".tabbar");
  var lastY = window.scrollY;
  var acc = 0;
  var mobileNav = window.matchMedia("(max-width: 899px)");
  function setNavHidden(hidden) {
    if (!tabbar) return;
    tabbar.classList.toggle("is-hidden", hidden);
  }
  window.addEventListener("scroll", function () {
    if (!mobileNav.matches) { setNavHidden(false); return; }
    var y = window.scrollY;
    var dy = y - lastY;
    lastY = y;
    if (y < 72) { setNavHidden(false); acc = 0; return; }
    if ((acc > 0 && dy < 0) || (acc < 0 && dy > 0)) acc = 0;
    acc += dy;
    if (acc > 28) { setNavHidden(true); acc = 0; }
    else if (acc < -20) { setNavHidden(false); acc = 0; }
  }, { passive: true });
  if (mobileNav.addEventListener) {
    mobileNav.addEventListener("change", function () { if (!mobileNav.matches) setNavHidden(false); });
  }

  window.addEventListener("hashchange", function () {
    if (goingBack) { navDepth = Math.max(0, navDepth - 1); goingBack = false; }
    else navDepth += 1;
    applyRoute(parseRoute());
  });

  renderHero();
  renderHome();
  renderSearch();
  paintHearts();
  applyTheme(currentTheme());
  applyRoute(parseRoute());

  window.AzuMC = {
    mods: MODS,
    download: DOWNLOAD_SYSTEM,
    planDownload: planDownload,
    isDownloadAvailable: isDownloadAvailable
  };
})();
