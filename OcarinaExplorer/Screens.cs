using System.Drawing;
using System.Drawing.Drawing2D;
using System.Windows.Forms;

namespace OcarinaExplorer;

/// <summary>The four tablet faces, each rendered into a 960x640 texture.</summary>
public sealed partial class MainForm
{
    private static RectangleF ItemGridArea() => new(56, 104, PanelW - 112, PanelH - 190);

    /// <summary>Stone-tablet frame + engraved title plaque shared by all screens.</summary>
    private void DrawTablet(Graphics g, Color frame, string title)
    {
        var outer = new RectangleF(6, 6, PanelW - 12, PanelH - 12);
        using (var path = Sprites.RoundedRect(outer, 26))
        {
            using (var fill = new LinearGradientBrush(outer,
                ControlPaint.Light(frame, 0.15f), ControlPaint.Dark(frame, 0.12f), 65f))
                g.FillPath(fill, path);
            using (var edgeDark = new Pen(ControlPaint.Dark(frame, 0.35f), 7f)) g.DrawPath(edgeDark, path);
            using (var edgeLite = new Pen(Color.FromArgb(90, 255, 240, 200), 2f)) g.DrawPath(edgeLite, path);
        }

        var inner = new RectangleF(40, 88, PanelW - 80, PanelH - 128);
        using (var path = Sprites.RoundedRect(inner, 16))
        {
            using (var fill = new SolidBrush(Color.FromArgb(215, 12, 10, 30))) g.FillPath(fill, path);
            using (var edge = new Pen(Color.FromArgb(160, 0, 0, 0), 3f)) g.DrawPath(edge, path);
        }

        // title plaque, engraved into the stone
        var ts = g.MeasureString(title, _titleFont);
        var plaque = new RectangleF((PanelW - ts.Width - 70) / 2, 18, ts.Width + 70, 58);
        using (var path = Sprites.RoundedRect(plaque, 14))
        {
            using (var fill = new SolidBrush(Color.FromArgb(70, 0, 0, 0))) g.FillPath(fill, path);
            using (var edge = new Pen(Color.FromArgb(120, 255, 240, 200), 1.6f)) g.DrawPath(edge, path);
        }
        Sprites.Engraved(g, title, _titleFont, plaque.X + 35, plaque.Y + 2);
    }

    // ------------------------------------------------------------ SELECT ITEM

    private void RenderItemPanel(Graphics g)
    {
        DrawTablet(g, Pal.FrameItem, "SELECT ITEM");

        var grid = ItemGridArea();
        int page = _entries.Count == 0 ? 0 : _selected / PageSize;
        int pages = Math.Max(1, (_entries.Count + PageSize - 1) / PageSize);
        const int Cols = 6, Rows = 4;
        float cw = grid.Width / Cols, ch = grid.Height / Rows;

        for (int i = 0; i < Cols * Rows; i++)
        {
            int idx = page * (Cols * Rows) + i;
            var cell = new RectangleF(grid.X + (i % Cols) * cw, grid.Y + (i / Cols) * ch, cw, ch);
            var slot = RectangleF.Inflate(cell, -6, -6);

            using (var path = Sprites.RoundedRect(slot, 10))
            {
                using (var fill = new SolidBrush(Pal.SlotFill)) g.FillPath(fill, path);
                using (var edge = new Pen(Pal.SlotEdge, 1.6f)) g.DrawPath(edge, path);
            }
            if (idx >= _entries.Count) continue;

            var e = _entries[idx];
            float iconSize = Math.Min(slot.Width, slot.Height) * 0.38f;
            Sprites.DrawIconFor(g, e.IsDrive, e.IsDir, e.Ext,
                slot.X + slot.Width / 2, slot.Y + slot.Height * 0.36f, iconSize);

            // OoT-style quantity number: file size, green, bottom-left
            if (!e.IsDir && e.Size >= 0)
            {
                using var green = new SolidBrush(Pal.RupeeGreen);
                g.DrawString(Sprites.ShortBytes(e.Size), _tinyFont, green,
                    slot.X + 5, slot.Bottom - 17);
            }

            // sparkle on fresh arrivals (< 1 hour old)
            if (e.Modified is { } m && (DateTime.Now - m).TotalHours < 1)
                Sprites.DrawStar(g, slot.Right - 13, slot.Y + 12, 8, Pal.GoldLight);

            using var nameBrush = new SolidBrush(e.Hidden
                ? Color.FromArgb(150, 200, 200, 200) : Color.FromArgb(235, 240, 235, 220));
            var nameRect = new RectangleF(slot.X + 4, slot.Y + slot.Height * 0.58f,
                slot.Width - 8, slot.Height * 0.4f);
            using var fmt = new StringFormat
            {
                Alignment = StringAlignment.Center,
                Trimming = StringTrimming.EllipsisCharacter,
                FormatFlags = StringFormatFlags.LineLimit,
            };
            g.DrawString(e.Name, _tinyFont, nameBrush, nameRect, fmt);

            if (idx == _selected)
            {
                float glow = (float)(Math.Sin(_pulse) * 0.5 + 0.5);
                var r = RectangleF.Inflate(slot, 2 + glow * 3, 2 + glow * 3);
                using var path = Sprites.RoundedRect(r, 12);
                using (var outer = new Pen(Color.FromArgb((int)(90 + glow * 120), Pal.Gold), 6f))
                    g.DrawPath(outer, path);
                using var innerPen = new Pen(Color.FromArgb(240, Pal.GoldLight), 2.4f);
                g.DrawPath(innerPen, path);
            }
        }

        // footer: location + sort + paging
        using var dim = new SolidBrush(Color.FromArgb(200, 220, 210, 190));
        string loc = _currentPath ?? "World Map (drives)";
        if (loc.Length > 70) loc = "…" + loc[^69..];
        g.DrawString(loc, _smallFont, dim, grid.X, grid.Bottom + 10);
        string right = $"sort: {_sort}   page {page + 1}/{pages}";
        var rs = g.MeasureString(right, _smallFont);
        g.DrawString(right, _smallFont, dim, grid.Right - rs.Width, grid.Bottom + 10);
    }

    // ------------------------------------------------------------ CLAUDE MAP

    private void RenderClaudeMapPanel(Graphics g)
    {
        DrawTablet(g, Pal.FrameMap, "CLAUDE MAP");

        using var white = new SolidBrush(Color.FromArgb(235, 240, 235, 220));
        using var dim = new SolidBrush(Color.FromArgb(170, 215, 205, 185));
        using var cyan = new SolidBrush(Pal.NameCyan);

        if (!_claude.Found)
        {
            g.DrawString("No Claude signs found in this land.", _bodyFont, white, 120, 250);
            g.DrawString("(Looked for ~/.claude.json and ~/.claude/projects — install\n" +
                         "Claude Code and this map fills itself in.)", _smallFont, dim, 120, 285);
            return;
        }

        // ---- left: medallion ring of MCP connectors around the CLAUDE core ----
        float ringCx = 250, ringCy = 340, ringR = 150;
        var medallionColors = new[]
        {
            Color.FromArgb(90, 200, 90),  Color.FromArgb(220, 70, 60),
            Color.FromArgb(80, 130, 230), Color.FromArgb(240, 160, 60),
            Color.FromArgb(170, 90, 220), Color.FromArgb(240, 220, 80),
            Color.FromArgb(70, 200, 200), Color.FromArgb(230, 120, 180),
        };

        g.DrawString("CONNECTORS (MCP)", _smallFont, dim, ringCx - 70, 118);

        int n = _claude.Connectors.Count;
        for (int i = 0; i < n; i++)
        {
            double a = -Math.PI / 2 + i * Math.PI * 2 / Math.Max(1, n);
            float mx = ringCx + (float)Math.Cos(a) * ringR;
            float my = ringCy + (float)Math.Sin(a) * ringR;

            using (var link = new Pen(Color.FromArgb(110, Pal.GoldLight), 2f) { DashStyle = DashStyle.Dot })
                g.DrawLine(link, ringCx, ringCy, mx, my);

            var col = medallionColors[i % medallionColors.Length];
            var medal = new RectangleF(mx - 26, my - 26, 52, 52);
            using (var glow = new SolidBrush(Color.FromArgb(70, col)))
                g.FillEllipse(glow, RectangleF.Inflate(medal, 7, 7));
            using (var fill = new LinearGradientBrush(medal, ControlPaint.Light(col, 0.3f), ControlPaint.Dark(col, 0.15f), 70f))
                g.FillEllipse(fill, medal);
            using (var rim = new Pen(Pal.GoldDark, 2.6f)) g.DrawEllipse(rim, medal);

            string initial = _claude.Connectors[i].Length > 0
                ? _claude.Connectors[i][..1].ToUpperInvariant() : "?";
            var isz = g.MeasureString(initial, _headFont);
            using (var ib = new SolidBrush(Color.White))
                g.DrawString(initial, _headFont, ib, mx - isz.Width / 2, my - isz.Height / 2);

            string name = _claude.Connectors[i];
            if (name.Length > 14) name = name[..13] + "…";
            var nsz = g.MeasureString(name, _tinyFont);
            g.DrawString(name, _tinyFont, white, mx - nsz.Width / 2, my + 30);
        }
        if (n == 0)
            g.DrawString("(no MCP connectors configured)", _tinyFont, dim, ringCx - 85, ringCy + 4);

        // the CLAUDE core: a gold medallion with a starburst
        var core = new RectangleF(ringCx - 44, ringCy - 44, 88, 88);
        float corePulse = (float)(Math.Sin(_pulse * 0.7) * 0.5 + 0.5);
        using (var halo = new SolidBrush(Color.FromArgb((int)(50 + corePulse * 70), Pal.Gold)))
            g.FillEllipse(halo, RectangleF.Inflate(core, 14, 14));
        using (var fill = new LinearGradientBrush(core, Pal.GoldLight, Pal.GoldDark, 70f))
            g.FillEllipse(fill, core);
        using (var rim = new Pen(Color.FromArgb(120, 80, 20), 3f)) g.DrawEllipse(rim, core);
        Sprites.DrawStar(g, ringCx, ringCy - 6, 20, Color.FromArgb(120, 80, 20));
        using (var cb = new SolidBrush(Color.FromArgb(120, 80, 20)))
        {
            var csz = g.MeasureString("CLAUDE", _tinyFont);
            g.DrawString("CLAUDE", _tinyFont, cb, ringCx - csz.Width / 2, ringCy + 14);
        }

        // ---- right: agents + retrievals ----
        float x = 480, y = 118;
        g.DrawString("AGENTS ON QUEST (recent sessions)", _smallFont, dim, x, y);
        y += 24;
        if (_claude.Sessions.Count == 0)
        {
            g.DrawString("(no sessions yet)", _tinyFont, dim, x, y);
            y += 22;
        }
        foreach (var s in _claude.Sessions)
        {
            if (s.Active)
            {
                float blink = (float)(Math.Sin(_pulse * 1.2) * 0.5 + 0.5);
                using var dot = new SolidBrush(Color.FromArgb((int)(120 + blink * 135), Pal.MagicGreen));
                g.FillEllipse(dot, x, y + 5, 10, 10);
            }
            else
            {
                using var dot = new SolidBrush(Color.FromArgb(110, 150, 150, 150));
                g.FillEllipse(dot, x, y + 5, 10, 10);
            }
            string nm = s.Name.Length > 24 ? s.Name[..23] + "…" : s.Name;
            g.DrawString(nm, _smallFont, s.Active ? white : dim, x + 18, y);
            string when = s.Active ? "ACTIVE" : Sprites.TimeAgo(s.LastActivity);
            var wsz = g.MeasureString(when, _tinyFont);
            g.DrawString(when, _tinyFont, s.Active ? cyan : dim, 900 - wsz.Width, y + 3);
            y += 26;
        }

        y += 10;
        g.DrawString($"CLAUDE PROCESSES RUNNING: {_claude.RunningProcesses}", _smallFont, white, x, y);
        y += 34;

        g.DrawString("INCOMING TREASURES (downloads in flight)", _smallFont, dim, x, y);
        y += 24;
        if (_incoming.Count == 0)
        {
            g.DrawString("(nothing downloading right now)", _tinyFont, dim, x, y);
        }
        else
        {
            foreach (var (name, size) in _incoming.Take(4))
            {
                Sprites.DrawHourglass(g, x + 8, y + 8, 8);
                string nm = name.Length > 30 ? name[..29] + "…" : name;
                g.DrawString($"{nm}  ({Sprites.FormatBytes(size)} so far)", _tinyFont, white, x + 24, y + 2);
                y += 22;
            }
        }

        // bottom scroll: current position
        var scroll = new RectangleF(300, PanelH - 96, 380, 52);
        using (var path = Sprites.RoundedRect(scroll, 10))
        {
            using (var fill = new SolidBrush(Pal.Parchment)) g.FillPath(fill, path);
            using (var edge = new Pen(Color.FromArgb(150, 120, 70), 2f)) g.DrawPath(edge, path);
        }
        using (var ink = new SolidBrush(Color.FromArgb(70, 55, 25)))
            g.DrawString("Current Position", _tinyFont, ink, scroll.X + 14, scroll.Y + 6);
        string pos = _claude.CurrentPosition ?? "(unknown)";
        if (pos.Length > 28) pos = pos[..27] + "…";
        using (var posB = new SolidBrush(Color.FromArgb(20, 110, 160)))
            g.DrawString(pos, _bodyFont, posB, scroll.X + 14, scroll.Y + 22);
    }

    // ------------------------------------------------------------ QUEST STATUS

    private void RenderQuestPanel(Graphics g)
    {
        DrawTablet(g, Pal.FrameQuest, "QUEST STATUS");

        using var white = new SolidBrush(Color.FromArgb(235, 240, 235, 220));
        using var dim = new SolidBrush(Color.FromArgb(170, 215, 205, 185));

        float x = 76, y = 122;
        g.DrawString("REALMS (drives)", _smallFont, dim, x, y);
        y += 26;

        foreach (var d in DriveCache.Take(5))
        {
            g.DrawString(d.Label, _bodyFont, white, x, y);

            if (d.Ready && d.Total > 0)
            {
                float used = (float)((double)(d.Total - d.Free) / d.Total);
                var bar = new RectangleF(x, y + 26, 330, 13);
                using (var back = new SolidBrush(Color.FromArgb(180, 8, 10, 26)))
                    g.FillRectangle(back, bar);
                using (var fill = new SolidBrush(used > 0.9f ? Pal.HeartRed : Pal.MagicGreen))
                    g.FillRectangle(fill, bar.X + 1, bar.Y + 1, (bar.Width - 2) * used, bar.Height - 2);
                using (var edge = new Pen(Pal.GoldDark, 1.6f))
                    g.DrawRectangle(edge, bar.X, bar.Y, bar.Width, bar.Height);
                g.DrawString($"{Sprites.FormatBytes(d.Free)} free of {Sprites.FormatBytes(d.Total)}",
                    _tinyFont, dim, x + 340, y + 24);
            }
            else
            {
                g.DrawString("not ready", _tinyFont, dim, x, y + 24);
            }
            y += 58;
        }

        // right column: vitals
        float rx = 560, ry = 148;
        void Stat(string k, string v)
        {
            g.DrawString(k, _smallFont, dim, rx, ry);
            g.DrawString(v, _bodyFont, white, rx, ry + 18);
            ry += 54;
        }
        Stat("MEMORY", $"{Sprites.FormatBytes((long)(_sys.RamTotal - _sys.RamAvail))} used of {Sprites.FormatBytes((long)_sys.RamTotal)}  ({_sys.RamLoad * 100:0}%)");
        Stat("CPU", $"{_sys.CpuLoad * 100:0}%");
        var up = _sys.Uptime;
        Stat("QUEST TIME (uptime)", $"{(int)up.TotalDays}d {up.Hours}h {up.Minutes}m");
        Stat("SPIRITS ROAMING (processes)", _sys.ProcessCount.ToString());

        int hidden = _entries.Count(e => e.Hidden);
        Sprites.DrawStar(g, x + 12, PanelH - 92, 11, Pal.Gold);
        g.DrawString($"Gold Skulltulas here (hidden items): {hidden}" +
                     (_showHidden ? "" : "  — press H to reveal"),
            _smallFont, white, x + 30, PanelH - 102);
    }

    // ------------------------------------------------------------ EQUIPMENT

    private void RenderEquipmentPanel(Graphics g)
    {
        DrawTablet(g, Pal.FrameEquip, "EQUIPMENT");

        using var white = new SolidBrush(Color.FromArgb(235, 240, 235, 220));
        using var dim = new SolidBrush(Color.FromArgb(170, 215, 205, 185));

        var e = SelectedEntry;
        if (e is null)
        {
            g.DrawString("Nothing is selected on the Item screen.", _bodyFont, dim, 300, 290);
            return;
        }

        // big icon in targeting brackets, like the equipment model window
        var frame = new RectangleF(90, 150, 260, 320);
        using (var fill = new SolidBrush(Color.FromArgb(160, 4, 4, 14))) g.FillRectangle(fill, frame);
        Sprites.DrawIconFor(g, e.IsDrive, e.IsDir, e.Ext,
            frame.X + frame.Width / 2, frame.Y + frame.Height / 2, 84);
        float glow = (float)(Math.Sin(_pulse) * 0.5 + 0.5);
        Sprites.DrawBrackets(g, RectangleF.Inflate(frame, 8 + glow * 4, 8 + glow * 4),
            Color.FromArgb((int)(160 + glow * 95), 255, 255, 255), 26, 4);

        float x = 420, y = 132;
        Sprites.GoldText(g, e.Name.Length > 34 ? e.Name[..33] + "…" : e.Name, _counterFont, x, y);
        y += 46;

        void Row(string k, string v)
        {
            g.DrawString(k, _smallFont, dim, x, y);
            g.DrawString(v.Length > 52 ? "…" + v[^51..] : v, _bodyFont, white, x, y + 17);
            y += 50;
        }
        Row("KIND", e.IsDrive ? "Drive" : e.IsDir ? "Folder"
            : $"File ({(e.Ext.Length > 0 ? e.Ext : "no extension")})");
        Row("LOCATION", e.FullPath);
        if (e.Size >= 0) Row("SIZE", Sprites.FormatBytes(e.Size));
        if (e.Modified is { } m) Row("LAST WRITE", $"{m:yyyy-MM-dd  HH:mm}   ({Sprites.TimeAgo(m)})");
        if (e.Created is { } c) Row("CREATED", $"{c:yyyy-MM-dd  HH:mm}");
        Row("HIDDEN", e.Hidden ? "Yes" : "No");

        g.DrawString("ENTER equip (open) · R reveal in Explorer · P copy path · 1/2/3 to C-buttons",
            _tinyFont, dim, x, PanelH - 100);
    }
}
