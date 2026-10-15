/* AzuMC catalog. Made by VATHANA © 2026
   Standalone file — no build step. Mods live in data/mods.js.
   A mod shows a download only when it has a real file (see data/mods.js). */
(function () {
  if (window.__AZUMC_BOOTED__) return;
  window.__AZUMC_BOOTED__ = true;

  var DOWNLOAD_SYSTEM = {
    enabled: true,
    extensions: [".mcaddon", ".mcpack", ".mcworld", ".mctemplate", ".zip"]
  };

  var MODS = Array.isArray(window.AZUMC_MODS) ? window.AZUMC_MODS : [];

  var FAV_KEY = "azumc-favorites";
  var THEME_KEY = "azumc-theme";
  var state = { query: "", category: "All", sort: "relevance" };
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

  function planDownload(mod) {
    if (!isDownloadAvailable(mod)) {
      return { ok: false, message: "Download coming soon — this file isn’t available yet." };
    }
    return {
      ok: true,
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
        "</div>" +
        '<div class="card-body">' +
          '<p class="kicker">' + esc(mod.category) + "</p>" +
          '<h3><a href="#/mod/' + esc(mod.id) + '">' + esc(mod.name) + "</a></h3>" +
          '<p class="meta">' + vLabel(mod.version) + " · " + esc(mod.minecraft) + "</p>" +
          (variant !== "compact" ? '<p class="excerpt">' + esc(mod.summary) + "</p>" : "") +
          '<a class="btn btn-ghost" href="#/mod/' + esc(mod.id) + '">Details</a>' +
        "</div>" +
        '<button type="button" class="fav" data-fav="' + esc(mod.id) + '" data-name="' + esc(mod.name) + '" aria-pressed="' + (on ? "true" : "false") + '" aria-label="' + (on ? "Remove from favorites" : "Save to favorites") + ": " + esc(mod.name) + '">' + heart(on) + "</button>" +
      "</article>"
    );
  }

  /* If a thumbnail 404s, try the same name with other common extensions
     (so photo.png works even when the list says photo.jpg), then show a letter. */
  function bindImages(scope) {
    var exts = ["jpg", "jpeg", "png", "webp"];
    scope.querySelectorAll("img[data-fallback]").forEach(function (img) {
      var tried = {};
      img.addEventListener("error", function onErr() {
        var src = img.getAttribute("src") || "";
        var m = src.match(/^(.*)\.([a-zA-Z0-9]+)(\?.*)?$/);
        if (m) {
          tried[m[2].toLowerCase()] = true;
          for (var i = 0; i < exts.length; i++) {
            if (!tried[exts[i]]) { tried[exts[i]] = true; img.setAttribute("src", m[1] + "." + exts[i]); return; }
          }
        }
        img.removeEventListener("error", onErr);
        var fb = document.createElement("div");
        fb.className = "thumb-fallback";
        fb.setAttribute("role", "img");
        fb.setAttribute("aria-label", img.alt || "Preview unavailable");
        fb.textContent = (img.getAttribute("data-fallback") || "?").slice(0, 1);
        img.replaceWith(fb);
      });
    });
  }

  function termScore(mod, t) {
    var name = String(mod.name).toLowerCase();
    var words = name.split(/[\s&\-]+/);
    var startsWord = function (list) { return list.some(function (w) { return w.indexOf(t) === 0; }); };
    if (name.indexOf(t) === 0) return 100;
    if (startsWord(words)) return 80;
    if (t.length >= 3 && name.indexOf(t) !== -1) return 60;
    var meta = [mod.author, mod.category, mod.version, mod.minecraft].join(" ").toLowerCase();
    if (startsWord(meta.split(/[\s&\-]+/))) return 50;
    if (t.length >= 3 && meta.indexOf(t) !== -1) return 40;
    if (t.length >= 3) {
      var text = (String(mod.summary) + " " + String(mod.description)).toLowerCase().split(/[^a-z0-9.+]+/);
      if (startsWord(text)) return 20;
    }
    return 0;
  }

  /* Lowest term score decides the mod's rank (every typed word must match). */
  function scoreMod(mod, q) {
    if (String(mod.name).toLowerCase().indexOf(q) === 0) return 100;
    var terms = q.split(/\s+/).filter(Boolean);
    var min = Infinity;
    for (var i = 0; i < terms.length; i++) {
      var sc = termScore(mod, terms[i]);
      if (!sc) return 0;
      if (sc < min) min = sc;
    }
    return min === Infinity ? 0 : min;
  }

  function filtered() {
    var q = state.query.trim().toLowerCase();
    var scored = {};
    var list = MODS.filter(function (mod) {
      if (state.category !== "All" && mod.category !== state.category) return false;
      if (!q) return true;
      scored[mod.id] = scoreMod(mod, q);
      return scored[mod.id] > 0;
    });
    /* Names that START with what you typed come first and hide everything else.
       If none start with it, names with a word that starts with it are shown.
       Creator, category, version and description are used only when no name matches. */
    if (q) {
      var starts = list.filter(function (mod) { return scored[mod.id] >= 100; });
      var words = list.filter(function (mod) { return scored[mod.id] >= 80; });
      if (starts.length) list = starts;
      else if (words.length) list = words;
    }
    if (state.sort === "oldest") list.sort(function (a, b) { return byDate(b, a); });
    else if (state.sort === "name") list.sort(function (a, b) { return a.name.localeCompare(b.name); });
    else if (state.sort === "relevance" && q) list.sort(function (a, b) { return (scored[b.id] - scored[a.id]) || byDate(a, b); });
    else list.sort(byDate);
    return list;
  }

  function updateChips() {
    document.querySelectorAll("[data-filter]").forEach(function (chip) {
      var cat = chip.getAttribute("data-filter");
      if (cat === "All") return;
      var has = MODS.some(function (m) { return m.category === cat; });
      chip.hidden = !has;
    });
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
    var featured = shuffle(MODS.slice()).slice(0, 8);
    var featuredIds = {};
    featured.forEach(function (m) { featuredIds[m.id] = true; });
    var horror = byCat("Horror");
    var packs = byCat("Resource Packs");
    var recommended = MODS.filter(function (m) { return !featuredIds[m.id]; }).sort(byDate).slice(0, 4);
    if (!recommended.length) recommended = MODS.slice().sort(byDate).slice(0, 4);
    var latest = MODS.slice().sort(byDate).slice(0, 5);

    renderFeaturedLoop(featured);
    fillShelf("home-recommended", recommended, "catalog");
    fillShelf("home-horror", horror, horror.length === 1 ? "wide" : "catalog");
    fillShelf("home-packs", packs.slice(0, 4), "catalog");
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
    downloadTimers.forEach(function (t) { if (t && t.cancel) t.cancel(); else clearInterval(t); });
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
    var fileName = String(plan.file.url).split("?")[0].split("/").pop();
    el.innerHTML =
      '<section class="task-panel download-panel">' +
        "<h3>Download</h3>" +
        '<p class="file-name">' + esc(fileName) + "</p>" +
        '<a class="btn" data-download href="' + esc(plan.file.url) + '" download="' + esc(fileName) + '">Download</a>' +
        '<p class="timer-status" role="status"></p>' +
      "</section>";
    var btn = el.querySelector("[data-download]");
    var status = el.querySelector(".timer-status");
    /* Tapping the button downloads the file immediately: no loading, no waiting.
       We only check afterwards that the file exists, and show a message if it does not. */
    btn.addEventListener("click", function () {
      if (location.protocol.indexOf("http") !== 0 || !window.fetch) return;
      fetch(plan.file.url, { method: "HEAD", cache: "no-store" }).then(function (res) {
        if (!res.ok) status.textContent = "File not found: " + plan.file.url + ". Check the file name in the downloads folder.";
      }).catch(function () {});
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
    if (route.name === "home") featuredFix();
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

  function shuffle(list) {
    for (var i = list.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = list[i]; list[i] = list[j]; list[j] = t;
    }
    return list;
  }

  /* ---- Featured: endless loop carousel, random order on every visit ---- */
  var FEATURED_AUTO_MS = 15000;
  var floop = { n: 0, k: 0, positioned: false, touching: false, idle: 0, last: 0 };

  function renderFeaturedLoop(list) {
    var track = document.getElementById("featured-track");
    if (!track) return;
    var section = track.closest("section");
    if (!list.length) { if (section) section.hidden = true; return; }
    if (section) section.hidden = false;
    var n = list.length;
    var k = n > 1 ? Math.min(n, 5) : 0;
    var clone = function (mod) {
      return cardHTML(mod, "feature")
        .replace("<article", '<article aria-hidden="true"')
        .replace(/<a /g, '<a tabindex="-1" ')
        .replace(/<button /g, '<button tabindex="-1" ');
    };
    var html = "", i;
    for (i = n - k; i < n; i++) html += clone(list[i]);
    list.forEach(function (mod) { html += cardHTML(mod, "feature"); });
    for (i = 0; i < k; i++) html += clone(list[i]);
    track.innerHTML = html;
    floop.n = n; floop.k = k; floop.positioned = false;
    bindImages(track);
    featuredFix();
  }

  function featuredMetrics() {
    var track = document.getElementById("featured-track");
    if (!track || track.offsetParent === null || !floop.k) return null;
    var items = track.children;
    var first = items[floop.k];
    var after = items[floop.k + floop.n];
    if (!first || !after) return null;
    return {
      track: track,
      base: first.offsetLeft - items[0].offsetLeft,
      loop: after.offsetLeft - first.offsetLeft
    };
  }

  function featuredJump(track, left) {
    track.style.scrollSnapType = "none";
    track.scrollLeft = left;
    void track.offsetWidth;
    requestAnimationFrame(function () { track.style.scrollSnapType = ""; });
  }

  /* Keep the scroll position inside the real cards; clones on either side are only for looking endless. */
  function featuredFix() {
    var m = featuredMetrics();
    if (!m || m.loop <= 0) return;
    if (!floop.positioned) { floop.positioned = true; featuredJump(m.track, m.base); return; }
    var sl = m.track.scrollLeft;
    if (sl < m.base - 2) featuredJump(m.track, sl + m.loop);
    else if (sl >= m.base + m.loop - 2) featuredJump(m.track, sl - m.loop);
  }

  function updateCarousel() {
    var prev = document.querySelector("[data-carousel='-1']");
    var next = document.querySelector("[data-carousel='1']");
    if (prev) prev.disabled = false;
    if (next) next.disabled = false;
  }

  function scrollCarousel(dir) {
    var track = document.getElementById("featured-track");
    if (!track) return;
    var card = track.querySelector(".card");
    var delta = (card ? card.getBoundingClientRect().width + 14 : 280) * dir;
    floop.last = Date.now();
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
    track.addEventListener("scroll", function () {
      clearTimeout(floop.idle);
      floop.idle = setTimeout(function () { if (!floop.touching) featuredFix(); }, 140);
    }, { passive: true });
    track.addEventListener("touchstart", function () { floop.touching = true; floop.last = Date.now(); }, { passive: true });
    track.addEventListener("touchend", function () {
      floop.touching = false;
      clearTimeout(floop.idle);
      floop.idle = setTimeout(featuredFix, 200);
    }, { passive: true });
    track.addEventListener("pointerdown", function () { floop.last = Date.now(); });
    track.addEventListener("wheel", function () { floop.last = Date.now(); }, { passive: true });
    track.addEventListener("keydown", function (event) {
      if (event.key === "ArrowRight") { event.preventDefault(); scrollCarousel(1); }
      if (event.key === "ArrowLeft") { event.preventDefault(); scrollCarousel(-1); }
    });
    setInterval(function () {
      if (document.hidden || floop.touching || Date.now() - floop.last < 8000) return;
      if (track.offsetParent === null) return;
      var r = track.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) return;
      var card = track.querySelector(".card");
      track.scrollBy({ left: (card ? card.getBoundingClientRect().width + 14 : 280), behavior: motion() });
    }, FEATURED_AUTO_MS);
  }
  window.addEventListener("resize", featuredFix);

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

  /* Block pinch-zoom and double-tap zoom (Safari ignores user-scalable=no). */
  ["gesturestart", "gesturechange", "gestureend"].forEach(function (name) {
    document.addEventListener(name, function (e) { e.preventDefault(); });
  });
  var lastTouchEnd = 0;
  document.addEventListener("touchend", function (e) {
    var now = Date.now();
    if (now - lastTouchEnd <= 300) e.preventDefault();
    lastTouchEnd = now;
  }, { passive: false });
  var verEl = document.getElementById("app-version");
  if (verEl) verEl.textContent = window.AZUMC_VERSION ? String(window.AZUMC_VERSION) : "1.0.0";
  var countEl = document.getElementById("app-mod-count");
  if (countEl) countEl.textContent = String(MODS.length);
  renderHome();
  updateChips();
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
