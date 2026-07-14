# Ocarina Explorer 🕰️🎶

A Windows file explorer that looks and feels like pausing a certain beloved N64
adventure game. Open it and you get a pause-menu-style subscreen carousel — an
item grid of your files, hearts, a rupee counter, C-button favorites, and the
classic "You got the item!" text box.

Everything on screen is **drawn in code with GDI+**. This is a fan-made homage:
it contains no extracted game assets, fonts, sounds, or textures, and it is not
affiliated with or endorsed by Nintendo.

## The four subscreens

Rotate between them with **Q / E** (think Z / R on the controller), or click the
gold arrows at the top corners:

| Screen | What it shows |
| --- | --- |
| **SELECT FILE** | The item grid — a 6×4 page of slots for the current folder. Folders are treasure chests, executables are swords, music files are ocarinas, images are lenses, archives are pouches, documents are scrolls, everything else is a bottle. Drives are gems. |
| **FOLDER MAP** | Your current path drawn as dungeon floors, with the blinking "you are here" arrow on the current floor. |
| **QUEST STATUS** | Every drive with a magic-meter capacity bar, plus the count of hidden files here ("Gold Skulltulas"). |
| **EQUIPMENT** | Full details of the selected item: kind, location, size, timestamps, hidden flag. |

Always on screen:

- **Hearts (top-left)** — remaining free space on the current drive. Low disk
  space looks exactly as alarming as it should.
- **Rupee counter (bottom-left)** — number of items in the current folder.
- **C-buttons (top-right)** — assign the selected file to a C button with
  **1 / 2 / 3**, then click the button to launch it any time.
- **Text box (bottom)** — "You found Documents! It holds 12 treasures."

## Controls

| Input | Action |
| --- | --- |
| Arrow keys / mouse wheel | Move the cursor |
| Enter / double-click | Open folder or launch file |
| Backspace | Go up one folder (drives view is the "world map") |
| Q / E | Previous / next subscreen |
| PgUp / PgDn | Flip item-grid pages |
| 1 / 2 / 3 | Assign selected file to C-Left / C-Down / C-Right |
| H | Toggle hidden files |
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
taskbar or Start menu for one-click access. (It's a standalone app on purpose —
it doesn't replace or hook the real Windows File Explorer, so there's nothing
to break and nothing to uninstall.)

The project can also be *built* from Linux/macOS CI thanks to
`EnableWindowsTargeting`, but it only runs on Windows.
