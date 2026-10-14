# AzuMC

AzuMC is a clean, easy place to discover Minecraft Bedrock content. Browse featured mods, add-ons, resource packs, maps and skins, search by name, creator or version, and save your favorites to come back to later.

Made by **VATHANA**.

## Features

- **Home page** for discovery: featured carousel, recommended content, resource packs, popular categories and latest additions.
- **Search page** for finding specific content: search by name, description, creator, category or version, with category filters and sorting.
- **Favorites** saved in your browser (localStorage).
- **Mod pages** with details, screenshots and related mods.
- **Dark mode and light mode.**
- **Mobile-first layout** with a bottom navigation bar that hides while scrolling down.
- **No build step and no dependencies.** Plain HTML, CSS and JavaScript.

## Project structure

```
azumc/
├── index.html          # Page layout and views
├── style.css           # All styling
├── script.js           # App logic (routing, search, favorites, details)
├── data/
│   └── mods.js         # The list of all mods (edit this to add mods)
├── assets/
│   ├── mods/           # Mod thumbnails and screenshots
│   ├── favicon.svg
│   └── logo-lockup.png
├── downloads/          # Mod files (.mcpack, .mcaddon, .mcworld, .mctemplate, .zip)
└── HOW-TO-ADD-A-MOD.md
```

## Run it

Open `index.html` in a browser, or use any simple static server. It also works in SPCK Editor's preview.

## Deploy on GitHub Pages

1. Push the project to a GitHub repository.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, select `main` and the `/ (root)` folder, then save.
4. After a minute, your site is live at `https://<your-username>.github.io/<repo-name>/`.

## Add a mod

1. Put the thumbnail in `assets/mods/` (for example `my-mod.jpg`).
2. Put the mod file in `downloads/` (for example `my-mod.mcaddon`).
3. Open `data/mods.js`, copy one mod block, paste it before the final `];`, and change the details.

```js
{
  id: "my-mod",                    // unique, lowercase, no spaces
  name: "My Mod",
  category: "Mods",                // Mods, Add-ons, Horror, Resource Packs, Behavior Packs, Maps, Skins
  version: "1.0",
  minecraft: "1.26+",
  author: "Your Name",
  summary: "One short line.",
  description: "A few sentences about the mod.",
  image: "assets/mods/my-mod.jpg",
  alt: "Short description of the image.",
  shots: [ { src: "assets/mods/my-mod.jpg", alt: "Screenshot description." } ],
  fileSize: "12 MB",
  released: "2026-10-14",         // YYYY-MM-DD, newest shows first
  status: "Released",
  featured: false,                 // true = shows in the Featured carousel
  file: { url: "downloads/my-mod.mcaddon", ext: ".mcaddon" }
},
```

Use `file: null` if there is no file yet. The mod then shows "Download coming soon".

Allowed file types: `.mcaddon`, `.mcpack`, `.mcworld`, `.mctemplate` and `.zip`. The link must end with the same extension as `ext`.

See [HOW-TO-ADD-A-MOD.md](HOW-TO-ADD-A-MOD.md) for more help.

## Content and credits

Only add files that you made, or that the creator allows you to share. Credit the original creators in each mod's `author` field.

## Disclaimer

AzuMC is not affiliated with Mojang or Microsoft. Minecraft is a trademark of Mojang Synergies AB.

## Links

- TikTok, YouTube and Telegram: @vathana

&copy; 2026 VATHANA
