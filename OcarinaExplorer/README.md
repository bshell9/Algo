# Ocarina Explorer 🕰️🎶

A Windows file explorer that recreates the *feel* of pausing a certain beloved
N64 adventure game: you stand at the center of a room while **four stone
tablets float in a ring around you** — one faces you, its neighbors lean in
from the screen edges in perspective, and **Q / E spins the whole room** with a
smooth rotation, N64-style.

Everything on screen is **drawn in code with GDI+** (including the fake-3D
perspective, done with per-strip texture warping). This is a fan-made homage:
it contains no extracted game assets, fonts, sounds, or textures, and it is not
affiliated with or endorsed by Nintendo.

It's tuned for **power users who live in their Downloads folder and run
Claude**: it opens in Downloads sorted newest-first, watches the folder live,
and flashes a gold *"You got the item!"* banner the instant a download lands.

## The four tablets

| Screen | What it shows |
| --- | --- |
| **SELECT ITEM** | A 6×4 item grid of the current folder, newest first. Folders are treasure chests, executables are swords, music is an ocarina, images are lenses, archives are pouches, documents are scrolls, in-flight downloads are hourglasses, drives are gems. Files show their size as an item-quantity number; anything under an hour old gets a gold sparkle. |
| **CLAUDE MAP** | Your real local Claude setup, read live from `~/.claude.json` and `~/.claude/projects`: MCP **connectors as a medallion ring** around a glowing CLAUDE core, **agents on quest** (recent sessions, pulsing green when active in the last 5 min), running `claude` processes, and **incoming treasures** (`.crdownload`/`.part` files mid-download). A parchment scroll shows your current position (most recent project). |
| **QUEST STATUS** | Drives with magic-meter capacity bars (red past 90%), RAM/CPU, uptime as quest time, process count, and hidden files here counted as Gold Skulltulas. |
| **EQUIPMENT** | The selected file in pulsing targeting brackets with full metadata and the quick-action cheat sheet. |

Always on screen: **hearts** = free disk space on the current drive, the
**magic meter** = RAM in use, the **rupee counter** = items in this folder,
**C-buttons** = quick-launch favorites, and the classic bottom **text box**.

## Controls

| Input | Action |
| --- | --- |
| Q / E (or click a leaning side tablet) | Spin the room to the previous / next screen |
| Arrow keys / mouse wheel | Move the cursor on the item grid |
| Enter / double-click | Open folder or launch file |
| Backspace | Go up one folder (top level is the drive "world map") |
| **D** | Jump straight to Downloads |
| **S** | Cycle sort: Newest → Name → Size |
| **P** | Copy the selected item's full path to the clipboard |
| **R** | Reveal the selected item in real Windows Explorer |
| 1 / 2 / 3 | Assign selected file to C-Left / C-Down / C-Right |
| H | Toggle hidden files |
| PgUp / PgDn / Home / End | Fly around big folders |
| F5 | Refresh |
| Esc | Unpause (quit) |

## Build & run (Windows)

Requires the [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0).

```powershell
# run it
dotnet run --project OcarinaExplorer

# or publish a single self-contained OcarinaExplorer.exe
dotnet publish OcarinaExplorer -c Release -r win-x64 --self-contained `
    /p:PublishSingleFile=true
```

The published exe lands in
`OcarinaExplorer/bin/Release/net8.0-windows/win-x64/publish/`. Pin it to your
taskbar for one-click access. It's a standalone app on purpose — it doesn't
replace or hook the real Windows File Explorer.

The project can also be *built* from Linux/macOS CI thanks to
`EnableWindowsTargeting`, but it only runs on Windows.
