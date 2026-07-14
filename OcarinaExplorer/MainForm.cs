using System.Diagnostics;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Text;
using System.Windows.Forms;

namespace OcarinaExplorer;

/// <summary>
/// A file explorer styled after the Ocarina of Time pause menu.
/// Every visual is drawn in code with GDI+ — no game assets are used.
/// </summary>
public sealed class MainForm : Form
{
    // ---- palette (original recreation of the pause-menu mood) ----
    private static readonly Color BgTop = Color.FromArgb(58, 14, 26);
    private static readonly Color BgBottom = Color.FromArgb(12, 4, 10);
    private static readonly Color SlotFill = Color.FromArgb(150, 28, 24, 66);
    private static readonly Color SlotEdge = Color.FromArgb(200, 96, 84, 160);
    private static readonly Color GoldLight = Color.FromArgb(255, 230, 170);
    private static readonly Color Gold = Color.FromArgb(232, 190, 78);
    private static readonly Color GoldDark = Color.FromArgb(150, 110, 30);
    private static readonly Color TextBoxFill = Color.FromArgb(185, 6, 10, 60);
    private static readonly Color CButtonYellow = Color.FromArgb(250, 208, 56);
    private static readonly Color HeartRed = Color.FromArgb(228, 32, 40);
    private static readonly Color RupeeGreen = Color.FromArgb(60, 190, 90);
    private static readonly Color NameCyan = Color.FromArgb(120, 220, 250);
    private static readonly Color NameRed = Color.FromArgb(255, 120, 110);

    private const int Cols = 6;
    private const int Rows = 4;
    private const int PageSize = Cols * Rows;

    private static readonly string[] ScreenTitles =
        { "SELECT FILE", "FOLDER MAP", "QUEST STATUS", "EQUIPMENT" };

    private readonly System.Windows.Forms.Timer _animTimer;
    private float _pulse;                 // 0..2pi, drives the cursor glow
    private int _screen;                  // 0..3, current subscreen
    private string? _currentPath;         // null => drive select ("world map")
    private List<Entry> _entries = new();
    private int _selected;
    private bool _showHidden;
    private string _statusOverride = "";  // e.g. access-denied message
    private readonly Entry?[] _cFavorites = new Entry?[3]; // C-Left, C-Down, C-Right

    private readonly Font _titleFont;
    private readonly Font _bodyFont;
    private readonly Font _smallFont;
    private readonly Font _tinyFont;
    private readonly Font _counterFont;

    // hit regions rebuilt every paint
    private RectangleF _leftArrow, _rightArrow;
    private readonly RectangleF[] _cButtonRects = new RectangleF[3];
    private RectangleF _gridArea;

    public MainForm()
    {
        Text = "Ocarina Explorer";
        DoubleBuffered = true;
        BackColor = Color.Black;
        ClientSize = new Size(1120, 800);
        MinimumSize = new Size(860, 640);
        StartPosition = FormStartPosition.CenterScreen;
        KeyPreview = true;

        _titleFont = new Font("Georgia", 34f, FontStyle.Bold);
        _bodyFont = new Font("Trebuchet MS", 13f, FontStyle.Bold);
        _smallFont = new Font("Trebuchet MS", 9.5f, FontStyle.Bold);
        _tinyFont = new Font("Trebuchet MS", 8f, FontStyle.Bold);
        _counterFont = new Font("Georgia", 16f, FontStyle.Bold);

        _animTimer = new System.Windows.Forms.Timer { Interval = 33 };
        _animTimer.Tick += (_, _) => { _pulse += 0.16f; Invalidate(); };
        _animTimer.Start();

        LoadLocation(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile));
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing)
        {
            _animTimer.Dispose();
            _titleFont.Dispose();
            _bodyFont.Dispose();
            _smallFont.Dispose();
            _tinyFont.Dispose();
            _counterFont.Dispose();
        }
        base.Dispose(disposing);
    }

    // =====================================================================
    //  File-system model
    // =====================================================================

    private sealed class Entry
    {
        public required string Name;
        public required string FullPath;
        public bool IsDir;
        public bool IsDrive;
        public long Size = -1;
        public DateTime? Modified;
        public DateTime? Created;
        public bool Hidden;
        public string Ext = "";
    }

    private void LoadLocation(string? path)
    {
        _statusOverride = "";
        var list = new List<Entry>();

        if (path is null)
        {
            foreach (var d in DriveInfo.GetDrives())
            {
                var e = new Entry
                {
                    Name = string.IsNullOrEmpty(d.VolumeLabel) || !d.IsReady
                        ? d.Name.TrimEnd('\\', '/')
                        : $"{d.Name.TrimEnd('\\', '/')} {d.VolumeLabel}",
                    FullPath = d.RootDirectory.FullName,
                    IsDir = true,
                    IsDrive = true,
                };
                if (d.IsReady) e.Size = d.TotalSize - d.TotalFreeSpace;
                list.Add(e);
            }
        }
        else
        {
            try
            {
                var dir = new DirectoryInfo(path);
                foreach (var d in dir.GetDirectories())
                {
                    bool hidden = (d.Attributes & FileAttributes.Hidden) != 0;
                    if (hidden && !_showHidden) continue;
                    list.Add(new Entry
                    {
                        Name = d.Name, FullPath = d.FullName, IsDir = true,
                        Modified = d.LastWriteTime, Created = d.CreationTime, Hidden = hidden,
                    });
                }
                foreach (var f in dir.GetFiles())
                {
                    bool hidden = (f.Attributes & FileAttributes.Hidden) != 0;
                    if (hidden && !_showHidden) continue;
                    list.Add(new Entry
                    {
                        Name = f.Name, FullPath = f.FullName, Size = f.Length,
                        Modified = f.LastWriteTime, Created = f.CreationTime, Hidden = hidden,
                        Ext = f.Extension.ToLowerInvariant(),
                    });
                }
            }
            catch (Exception ex) when (ex is UnauthorizedAccessException or IOException)
            {
                _statusOverride = "A mysterious force blocks the way... (access denied)";
                Invalidate();
                return;
            }
        }

        _currentPath = path;
        _entries = list;
        _selected = 0;
        Invalidate();
    }

    private void NavigateUp()
    {
        if (_currentPath is null) return;
        var parent = Directory.GetParent(_currentPath);
        var child = _currentPath;
        LoadLocation(parent?.FullName);
        // put the cursor back on the folder we came from
        int idx = _entries.FindIndex(e =>
            string.Equals(e.FullPath.TrimEnd('\\', '/'), child.TrimEnd('\\', '/'),
                StringComparison.OrdinalIgnoreCase));
        if (idx >= 0) _selected = idx;
    }

    private void Activate(Entry e)
    {
        if (e.IsDir)
        {
            LoadLocation(e.FullPath);
        }
        else
        {
            try
            {
                Process.Start(new ProcessStartInfo(e.FullPath) { UseShellExecute = true });
                _statusOverride = $"You used the {e.Name}!";
            }
            catch (Exception)
            {
                _statusOverride = "You can't use that here!";
            }
            Invalidate();
        }
    }

    private Entry? SelectedEntry =>
        _selected >= 0 && _selected < _entries.Count ? _entries[_selected] : null;

    // =====================================================================
    //  Input
    // =====================================================================

    protected override bool ProcessCmdKey(ref Message msg, Keys keyData)
    {
        switch (keyData)
        {
            case Keys.Left:  MoveSelection(-1); return true;
            case Keys.Right: MoveSelection(+1); return true;
            case Keys.Up:    MoveSelection(-Cols); return true;
            case Keys.Down:  MoveSelection(+Cols); return true;
            case Keys.PageUp:   MoveSelection(-PageSize); return true;
            case Keys.PageDown: MoveSelection(+PageSize); return true;
            case Keys.Enter:
                if (SelectedEntry is { } e) Activate(e);
                return true;
            case Keys.Back: NavigateUp(); return true;
            case Keys.Q: SwitchScreen(-1); return true;
            case Keys.E: SwitchScreen(+1); return true;
            case Keys.H:
                _showHidden = !_showHidden;
                LoadLocation(_currentPath);
                return true;
            case Keys.F5: LoadLocation(_currentPath); return true;
            case Keys.D1: AssignFavorite(0); return true;
            case Keys.D2: AssignFavorite(1); return true;
            case Keys.D3: AssignFavorite(2); return true;
            case Keys.Escape: Close(); return true;
        }
        return base.ProcessCmdKey(ref msg, keyData);
    }

    private void MoveSelection(int delta)
    {
        if (_entries.Count == 0) return;
        _selected = Math.Clamp(_selected + delta, 0, _entries.Count - 1);
        _statusOverride = "";
        Invalidate();
    }

    private void SwitchScreen(int dir)
    {
        _screen = (_screen + dir + ScreenTitles.Length) % ScreenTitles.Length;
        Invalidate();
    }

    private void AssignFavorite(int slot)
    {
        if (SelectedEntry is { IsDir: false } e)
        {
            _cFavorites[slot] = e;
            _statusOverride = $"{e.Name} is now on {new[] { "C-Left", "C-Down", "C-Right" }[slot]}!";
            Invalidate();
        }
    }

    protected override void OnMouseDown(MouseEventArgs me)
    {
        base.OnMouseDown(me);
        if (_leftArrow.Contains(me.Location)) { SwitchScreen(-1); return; }
        if (_rightArrow.Contains(me.Location)) { SwitchScreen(+1); return; }
        for (int i = 0; i < 3; i++)
        {
            if (_cButtonRects[i].Contains(me.Location))
            {
                if (_cFavorites[i] is { } fav) Activate(fav);
                return;
            }
        }
        if (_screen == 0 && SlotIndexAt(me.Location) is { } idx)
        {
            _selected = idx;
            _statusOverride = "";
            Invalidate();
        }
    }

    protected override void OnMouseDoubleClick(MouseEventArgs me)
    {
        base.OnMouseDoubleClick(me);
        if (_screen == 0 && SlotIndexAt(me.Location) is { } idx)
        {
            _selected = idx;
            Activate(_entries[idx]);
        }
    }

    protected override void OnMouseWheel(MouseEventArgs me)
    {
        base.OnMouseWheel(me);
        MoveSelection(me.Delta > 0 ? -Cols : +Cols);
    }

    private int? SlotIndexAt(Point p)
    {
        if (!_gridArea.Contains(p)) return null;
        float cw = _gridArea.Width / Cols, ch = _gridArea.Height / Rows;
        int col = (int)((p.X - _gridArea.X) / cw);
        int row = (int)((p.Y - _gridArea.Y) / ch);
        int page = _selected / PageSize;
        int idx = page * PageSize + row * Cols + col;
        return idx < _entries.Count ? idx : null;
    }

    // =====================================================================
    //  Painting
    // =====================================================================

    protected override void OnPaint(PaintEventArgs pe)
    {
        var g = pe.Graphics;
        g.SmoothingMode = SmoothingMode.AntiAlias;
        g.TextRenderingHint = TextRenderingHint.AntiAliasGridFit;

        DrawBackground(g);
        DrawHeader(g);
        DrawHud(g);

        switch (_screen)
        {
            case 0: DrawItemScreen(g); break;
            case 1: DrawMapScreen(g); break;
            case 2: DrawQuestScreen(g); break;
            case 3: DrawEquipmentScreen(g); break;
        }

        DrawTextBox(g);
    }

    private void DrawBackground(Graphics g)
    {
        var r = ClientRectangle;
        if (r.Width <= 0 || r.Height <= 0) return;
        using (var lg = new LinearGradientBrush(r, BgTop, BgBottom, 90f))
            g.FillRectangle(lg, r);

        // vignette so the middle glows like the paused game behind the menu
        using var path = new GraphicsPath();
        path.AddEllipse(-r.Width * 0.25f, -r.Height * 0.25f, r.Width * 1.5f, r.Height * 1.5f);
        using var vignette = new PathGradientBrush(path)
        {
            CenterColor = Color.FromArgb(0, 0, 0, 0),
            SurroundColors = new[] { Color.FromArgb(160, 0, 0, 0) },
        };
        g.FillRectangle(vignette, r);
    }

    private void DrawHeader(Graphics g)
    {
        float w = ClientSize.Width;
        string title = ScreenTitles[_screen];

        var size = g.MeasureString(title, _titleFont);
        float x = (w - size.Width) / 2f, y = 18f;

        using (var shadow = new SolidBrush(Color.FromArgb(200, 0, 0, 0)))
            g.DrawString(title, _titleFont, shadow, x + 3, y + 3);
        var tr = new RectangleF(x, y, size.Width, size.Height);
        using (var gold = new LinearGradientBrush(tr, GoldLight, GoldDark, 90f))
            g.DrawString(title, _titleFont, gold, x, y);

        // Z / R shoulder arrows to rotate between subscreens
        float ay = y + size.Height / 2f;
        _leftArrow = DrawShoulderArrow(g, 40, ay, true,
            ScreenTitles[(_screen + ScreenTitles.Length - 1) % ScreenTitles.Length], "Q");
        _rightArrow = DrawShoulderArrow(g, w - 40, ay, false,
            ScreenTitles[(_screen + 1) % ScreenTitles.Length], "E");
    }

    private RectangleF DrawShoulderArrow(Graphics g, float cx, float cy, bool left, string label, string key)
    {
        float s = 16f;
        var pts = left
            ? new[] { new PointF(cx - s, cy), new PointF(cx + s, cy - s), new PointF(cx + s, cy + s) }
            : new[] { new PointF(cx + s, cy), new PointF(cx - s, cy - s), new PointF(cx - s, cy + s) };
        using (var b = new SolidBrush(Gold)) g.FillPolygon(b, pts);
        using (var p = new Pen(GoldDark, 2f)) g.DrawPolygon(p, pts);

        using var white = new SolidBrush(Color.FromArgb(220, 240, 230, 210));
        var lblSize = g.MeasureString(label, _tinyFont);
        float lx = left ? cx - s : cx + s - lblSize.Width;
        g.DrawString($"[{key}]", _tinyFont, white, left ? cx - s : cx + s - 24, cy + s + 2);
        g.DrawString(label, _tinyFont, white, lx, cy + s + 15);

        return new RectangleF(cx - s - 8, cy - s - 8, s * 2 + 16, s * 2 + 40);
    }

    private void DrawHud(Graphics g)
    {
        // hearts: remaining free space on the current drive
        double frac = 1.0;
        try
        {
            var root = _currentPath is null ? null : Path.GetPathRoot(_currentPath);
            if (root is not null)
            {
                var d = new DriveInfo(root);
                if (d.IsReady) frac = (double)d.TotalFreeSpace / d.TotalSize;
            }
        }
        catch (Exception) { /* drive vanished mid-paint; keep full hearts */ }

        for (int i = 0; i < 10; i++)
        {
            double heartFill = Math.Clamp(frac * 10 - i, 0, 1);
            DrawHeart(g, 28 + i * 26, 26, 11f, (float)heartFill);
        }
        using (var w = new SolidBrush(Color.FromArgb(200, 240, 230, 210)))
            g.DrawString("LIFE (free space)", _tinyFont, w, 26, 44);

        // rupee counter: how many treasures in this folder
        DrawRupee(g, 30, ClientSize.Height - 46, 11f);
        using (var w = new SolidBrush(Color.White))
            g.DrawString(_entries.Count.ToString("000"), _counterFont, w, 46, ClientSize.Height - 58);

        DrawCButtons(g);
    }

    private void DrawCButtons(Graphics g)
    {
        float bx = ClientSize.Width - 150, by = 30, r = 21f;
        var centers = new[]
        {
            new PointF(bx, by + 26),          // C-Left
            new PointF(bx + 52, by + 52),     // C-Down
            new PointF(bx + 104, by + 26),    // C-Right
        };
        string[] glyphs = { "◀", "▼", "▶" };

        for (int i = 0; i < 3; i++)
        {
            var c = centers[i];
            var rect = new RectangleF(c.X - r, c.Y - r, r * 2, r * 2);
            _cButtonRects[i] = rect;

            using (var fill = new SolidBrush(CButtonYellow)) g.FillEllipse(fill, rect);
            using (var edge = new Pen(Color.FromArgb(140, 90, 20), 2.5f)) g.DrawEllipse(edge, rect);
            using (var glyph = new SolidBrush(Color.FromArgb(150, 96, 20)))
            {
                var gs = g.MeasureString(glyphs[i], _smallFont);
                g.DrawString(glyphs[i], _smallFont, glyph, c.X - gs.Width / 2, c.Y - gs.Height / 2 - 6);
            }
            string name = _cFavorites[i]?.Name ?? "";
            if (name.Length > 8) name = name[..7] + "…";
            using var txt = new SolidBrush(Color.FromArgb(120, 70, 10));
            var ns = g.MeasureString(name, _tinyFont);
            g.DrawString(name, _tinyFont, txt, c.X - ns.Width / 2, c.Y + 2);
        }
        using (var w = new SolidBrush(Color.FromArgb(200, 240, 230, 210)))
            g.DrawString("favorites: press 1/2/3 to assign", _tinyFont, w, bx - 26, by + 78);
    }

    // ---------------------------------------------------------------- item screen

    private void DrawItemScreen(Graphics g)
    {
        float w = ClientSize.Width, h = ClientSize.Height;
        float gridW = Math.Min(w - 200, 900);
        float gridH = h - 320;
        _gridArea = new RectangleF((w - gridW) / 2, 130, gridW, gridH);

        int page = _entries.Count == 0 ? 0 : _selected / PageSize;
        int pages = Math.Max(1, (_entries.Count + PageSize - 1) / PageSize);

        float cw = _gridArea.Width / Cols, ch = _gridArea.Height / Rows;

        for (int i = 0; i < PageSize; i++)
        {
            int idx = page * PageSize + i;
            int row = i / Cols, col = i % Cols;
            var cell = new RectangleF(_gridArea.X + col * cw, _gridArea.Y + row * ch, cw, ch);
            var slot = RectangleF.Inflate(cell, -6, -6);

            using (var path = RoundedRect(slot, 10))
            {
                using (var fill = new SolidBrush(SlotFill)) g.FillPath(fill, path);
                using (var edge = new Pen(SlotEdge, 1.6f)) g.DrawPath(edge, path);
            }

            if (idx >= _entries.Count) continue;
            var e = _entries[idx];

            float iconSize = Math.Min(slot.Width, slot.Height) * 0.42f;
            DrawEntryIcon(g, e, slot.X + slot.Width / 2, slot.Y + slot.Height * 0.38f, iconSize);

            string name = e.Name;
            using var nameBrush = new SolidBrush(e.Hidden
                ? Color.FromArgb(150, 200, 200, 200) : Color.FromArgb(235, 240, 235, 220));
            var nameRect = new RectangleF(slot.X + 4, slot.Y + slot.Height * 0.62f,
                slot.Width - 8, slot.Height * 0.36f);
            using var fmt = new StringFormat
            {
                Alignment = StringAlignment.Center,
                Trimming = StringTrimming.EllipsisCharacter,
                FormatFlags = StringFormatFlags.LineLimit,
            };
            g.DrawString(name, _tinyFont, nameBrush, nameRect, fmt);

            if (idx == _selected) DrawCursor(g, slot);
        }

        if (pages > 1)
        {
            using var w2 = new SolidBrush(Color.FromArgb(220, 240, 230, 210));
            string label = $"page {page + 1} / {pages}   (PgUp / PgDn)";
            var ls = g.MeasureString(label, _smallFont);
            g.DrawString(label, _smallFont, w2,
                _gridArea.Right - ls.Width, _gridArea.Bottom + 6);
        }
    }

    private void DrawCursor(Graphics g, RectangleF slot)
    {
        float glow = (float)(Math.Sin(_pulse) * 0.5 + 0.5); // 0..1
        var r = RectangleF.Inflate(slot, 3 + glow * 3, 3 + glow * 3);
        using var path = RoundedRect(r, 12);
        using (var outer = new Pen(Color.FromArgb((int)(90 + glow * 120), Gold), 6f))
            g.DrawPath(outer, path);
        using (var inner = new Pen(Color.FromArgb(240, GoldLight), 2.4f))
            g.DrawPath(inner, path);
    }

    // ---------------------------------------------------------------- map screen

    private void DrawMapScreen(Graphics g)
    {
        float w = ClientSize.Width;
        float x = w * 0.28f, y = 150;

        using var whiteB = new SolidBrush(Color.FromArgb(235, 240, 235, 220));
        using var dimB = new SolidBrush(Color.FromArgb(160, 200, 195, 180));

        g.DrawString("DUNGEON FLOORS (this path)", _smallFont, dimB, x, y);
        y += 28;

        var components = new List<(string label, string? path)> { ("WORLD MAP (drives)", null) };
        if (_currentPath is not null)
        {
            string acc = "";
            foreach (var part in _currentPath.Split(
                new[] { Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar },
                StringSplitOptions.RemoveEmptyEntries))
            {
                acc = acc.Length == 0 ? part + Path.DirectorySeparatorChar : Path.Combine(acc, part);
                components.Add((part, acc));
            }
        }

        for (int i = 0; i < components.Count; i++)
        {
            bool current = i == components.Count - 1;
            string floor = i == 0 ? "✦" : $"{components.Count - 1 - i}F";
            var rect = new RectangleF(x, y, w * 0.44f, 34);
            using (var path = RoundedRect(rect, 8))
            {
                using var fill = new SolidBrush(current
                    ? Color.FromArgb(200, 60, 44, 110) : SlotFill);
                g.FillPath(fill, path);
                using var edge = new Pen(current ? Gold : SlotEdge, current ? 2.4f : 1.4f);
                g.DrawPath(edge, path);
            }
            g.DrawString(floor, _smallFont, dimB, x + 10, y + 8);
            g.DrawString(components[i].label, _bodyFont,
                current ? new SolidBrush(GoldLight) : whiteB, x + 52, y + 5);
            if (current)
            {
                // the blinking "you are here" arrow from the dungeon map
                float bob = (float)Math.Sin(_pulse) * 4f;
                var tip = new PointF(x - 16 + bob, y + 17);
                var pts = new[] { tip, new(tip.X - 14, tip.Y - 9), new(tip.X - 14, tip.Y + 9) };
                using var b = new SolidBrush(HeartRed);
                g.FillPolygon(b, pts);
            }
            y += 40;
        }

        g.DrawString("BACKSPACE — go up one floor        ENTER on the Item screen — descend",
            _smallFont, dimB, x, y + 14);
    }

    // ---------------------------------------------------------------- quest screen

    private void DrawQuestScreen(Graphics g)
    {
        float w = ClientSize.Width;
        float x = w * 0.18f, y = 150;

        using var whiteB = new SolidBrush(Color.FromArgb(235, 240, 235, 220));
        using var dimB = new SolidBrush(Color.FromArgb(160, 200, 195, 180));

        foreach (var d in DriveInfo.GetDrives())
        {
            var rect = new RectangleF(x, y, w * 0.64f, 58);
            using (var path = RoundedRect(rect, 10))
            {
                using var fill = new SolidBrush(SlotFill);
                g.FillPath(fill, path);
                using var edge = new Pen(SlotEdge, 1.6f);
                g.DrawPath(edge, path);
            }

            string label = d.Name.TrimEnd('\\', '/');
            if (d.IsReady && !string.IsNullOrEmpty(d.VolumeLabel)) label += "  " + d.VolumeLabel;
            g.DrawString(label, _bodyFont, whiteB, x + 16, y + 8);

            if (d.IsReady)
            {
                // magic-meter style capacity bar
                float used = (float)((double)(d.TotalSize - d.TotalFreeSpace) / d.TotalSize);
                var bar = new RectangleF(x + 16, y + 36, rect.Width - 220, 12);
                using (var back = new SolidBrush(Color.FromArgb(160, 10, 14, 30)))
                    g.FillRectangle(back, bar);
                using (var green = new SolidBrush(RupeeGreen))
                    g.FillRectangle(green, bar.X, bar.Y, bar.Width * used, bar.Height);
                using (var edge = new Pen(GoldDark, 1.4f))
                    g.DrawRectangle(edge, bar.X, bar.Y, bar.Width, bar.Height);

                string txt = $"{FormatBytes(d.TotalFreeSpace)} free of {FormatBytes(d.TotalSize)}";
                var ts = g.MeasureString(txt, _smallFont);
                g.DrawString(txt, _smallFont, dimB, rect.Right - ts.Width - 14, y + 32);
            }
            else
            {
                g.DrawString("not ready", _smallFont, dimB, x + 16, y + 34);
            }
            y += 70;
        }

        int hidden = _entries.Count(e => e.Hidden);
        g.DrawString($"Gold Skulltulas found here (hidden items): {hidden}" +
                     (_showHidden ? "" : "   — press H to reveal them"),
            _smallFont, whiteB, x, y + 10);
    }

    // ---------------------------------------------------------------- equipment screen

    private void DrawEquipmentScreen(Graphics g)
    {
        float w = ClientSize.Width;
        using var whiteB = new SolidBrush(Color.FromArgb(235, 240, 235, 220));
        using var dimB = new SolidBrush(Color.FromArgb(160, 200, 195, 180));
        using var goldB = new SolidBrush(GoldLight);

        var e = SelectedEntry;
        if (e is null)
        {
            g.DrawString("Nothing is selected on the Item screen.", _bodyFont, dimB, w * 0.3f, 200);
            return;
        }

        DrawEntryIcon(g, e, w * 0.28f, 260, 110);

        float x = w * 0.42f, y = 170;
        void Row(string k, string v)
        {
            g.DrawString(k, _smallFont, dimB, x, y);
            g.DrawString(v, _bodyFont, whiteB, x, y + 16);
            y += 52;
        }

        g.DrawString(e.Name, _counterFont, goldB, x, y);
        y += 44;
        Row("KIND", e.IsDrive ? "Drive" : e.IsDir ? "Folder" : $"File ({(e.Ext.Length > 0 ? e.Ext : "no extension")})");
        Row("LOCATION", e.FullPath);
        if (e.Size >= 0) Row("SIZE", FormatBytes(e.Size));
        if (e.Modified is { } m) Row("LAST WRITE", m.ToString("yyyy-MM-dd  HH:mm"));
        if (e.Created is { } c) Row("CREATED", c.ToString("yyyy-MM-dd  HH:mm"));
        Row("HIDDEN", e.Hidden ? "Yes" : "No");
    }

    // ---------------------------------------------------------------- text box

    private void DrawTextBox(Graphics g)
    {
        float w = ClientSize.Width, h = ClientSize.Height;
        var box = new RectangleF(w * 0.14f, h - 130, w * 0.72f, 86);

        using (var path = RoundedRect(box, 22))
        {
            using (var fill = new SolidBrush(TextBoxFill)) g.FillPath(fill, path);
            using (var edge = new Pen(Color.FromArgb(220, 150, 150, 190), 2f)) g.DrawPath(edge, path);
        }

        string msg = _statusOverride.Length > 0 ? _statusOverride : ComposeMessage();
        var inner = RectangleF.Inflate(box, -20, -14);
        using var fmt = new StringFormat
        {
            Alignment = StringAlignment.Center,
            LineAlignment = StringAlignment.Center,
            Trimming = StringTrimming.EllipsisCharacter,
        };
        using var white = new SolidBrush(Color.White);
        g.DrawString(msg, _bodyFont, white, inner, fmt);

        // the blinking "continue" triangle at the bottom-right of OoT text boxes
        if (Math.Sin(_pulse * 0.8) > 0)
        {
            var tip = new PointF(box.Right - 26, box.Bottom - 12);
            var pts = new[] { tip, new(tip.X - 10, tip.Y - 12), new(tip.X + 10, tip.Y - 12) };
            using var b = new SolidBrush(NameCyan);
            g.FillPolygon(b, pts);
        }
    }

    private string ComposeMessage()
    {
        if (_screen != 0)
            return _currentPath ?? "The World Map — choose a realm to explore.";

        var e = SelectedEntry;
        if (e is null)
            return "This place is empty... not even a single rupee.";
        if (e.IsDrive)
            return $"The realm of {e.Name}. Press ENTER to travel there!";
        if (e.IsDir)
        {
            int n = -1;
            try { n = Directory.EnumerateFileSystemEntries(e.FullPath).Count(); }
            catch (Exception) { /* locked folder — leave the count a mystery */ }
            return n >= 0
                ? $"You found {e.Name}! It holds {n} treasure{(n == 1 ? "" : "s")}."
                : $"You found {e.Name}! Its contents are sealed away.";
        }
        return $"You got the {e.Name}! " +
               (e.Size >= 0 ? $"It weighs {FormatBytes(e.Size)}. " : "") +
               "Press ENTER to use it.";
    }

    // =====================================================================
    //  Drawn "sprites" — all original vector art
    // =====================================================================

    private void DrawEntryIcon(Graphics g, Entry e, float cx, float cy, float s)
    {
        if (e.IsDrive) { DrawGem(g, cx, cy, s); return; }
        if (e.IsDir) { DrawChest(g, cx, cy, s); return; }
        switch (e.Ext)
        {
            case ".png" or ".jpg" or ".jpeg" or ".gif" or ".bmp" or ".webp" or ".ico":
                DrawLens(g, cx, cy, s); break;
            case ".mp3" or ".wav" or ".flac" or ".ogg" or ".m4a" or ".mid":
                DrawOcarina(g, cx, cy, s); break;
            case ".exe" or ".bat" or ".cmd" or ".msi" or ".com":
                DrawSword(g, cx, cy, s); break;
            case ".zip" or ".rar" or ".7z" or ".tar" or ".gz":
                DrawPouch(g, cx, cy, s); break;
            case ".txt" or ".md" or ".doc" or ".docx" or ".pdf" or ".rtf" or ".log":
                DrawScroll(g, cx, cy, s); break;
            default:
                DrawBottle(g, cx, cy, s); break;
        }
    }

    private static void DrawChest(Graphics g, float cx, float cy, float s)
    {
        var body = new RectangleF(cx - s * 0.9f, cy - s * 0.2f, s * 1.8f, s * 0.9f);
        var lid = new RectangleF(cx - s * 0.9f, cy - s * 0.75f, s * 1.8f, s * 0.85f);
        using (var wood = new SolidBrush(Color.FromArgb(146, 84, 40))) g.FillRectangle(wood, body);
        using (var woodDark = new SolidBrush(Color.FromArgb(112, 60, 26))) g.FillPie(woodDark, lid.X, lid.Y, lid.Width, lid.Height, 180, 180);
        using (var band = new Pen(Gold, s * 0.14f))
        {
            g.DrawLine(band, cx, cy - s * 0.72f, cx, cy + s * 0.68f);
            g.DrawRectangle(band, body.X, body.Y, body.Width, body.Height);
        }
        using var keyhole = new SolidBrush(Color.FromArgb(60, 34, 10));
        g.FillEllipse(keyhole, cx - s * 0.12f, cy + s * 0.02f, s * 0.24f, s * 0.24f);
    }

    private static void DrawGem(Graphics g, float cx, float cy, float s)
    {
        var pts = new[]
        {
            new PointF(cx, cy - s), new PointF(cx + s * 0.7f, cy - s * 0.3f),
            new PointF(cx + s * 0.5f, cy + s * 0.9f), new PointF(cx - s * 0.5f, cy + s * 0.9f),
            new PointF(cx - s * 0.7f, cy - s * 0.3f),
        };
        using (var fill = new LinearGradientBrush(
            new RectangleF(cx - s, cy - s, s * 2, s * 2),
            Color.FromArgb(150, 210, 255), Color.FromArgb(30, 90, 180), 60f))
            g.FillPolygon(fill, pts);
        using var edge = new Pen(Color.FromArgb(220, 240, 250, 255), 2f);
        g.DrawPolygon(edge, pts);
        g.DrawLine(edge, pts[0], pts[3]);
        g.DrawLine(edge, pts[0], pts[2]);
    }

    private static void DrawLens(Graphics g, float cx, float cy, float s)
    {
        using (var glass = new SolidBrush(Color.FromArgb(200, 120, 60, 160)))
            g.FillEllipse(glass, cx - s * 0.7f, cy - s * 0.7f, s * 1.4f, s * 1.4f);
        using (var rim = new Pen(HeartRed, s * 0.14f))
            g.DrawEllipse(rim, cx - s * 0.7f, cy - s * 0.7f, s * 1.4f, s * 1.4f);
        using (var pupil = new SolidBrush(Color.FromArgb(240, 240, 240, 255)))
            g.FillEllipse(pupil, cx - s * 0.22f, cy - s * 0.22f, s * 0.44f, s * 0.44f);
        using var handle = new Pen(HeartRed, s * 0.16f);
        g.DrawLine(handle, cx + s * 0.5f, cy + s * 0.5f, cx + s * 0.95f, cy + s * 0.95f);
    }

    private static void DrawOcarina(Graphics g, float cx, float cy, float s)
    {
        using (var clay = new SolidBrush(Color.FromArgb(90, 140, 210)))
            g.FillEllipse(clay, cx - s * 0.95f, cy - s * 0.45f, s * 1.9f, s * 1.05f);
        using (var mouth = new SolidBrush(Color.FromArgb(70, 110, 175)))
            g.FillRectangle(mouth, cx - s * 0.2f, cy - s * 0.85f, s * 0.4f, s * 0.5f);
        using var hole = new SolidBrush(Color.FromArgb(25, 40, 70));
        for (int i = 0; i < 3; i++)
            g.FillEllipse(hole, cx - s * 0.5f + i * s * 0.42f, cy - s * 0.12f, s * 0.2f, s * 0.2f);
    }

    private static void DrawSword(Graphics g, float cx, float cy, float s)
    {
        var blade = new[]
        {
            new PointF(cx, cy - s), new PointF(cx + s * 0.16f, cy - s * 0.7f),
            new PointF(cx + s * 0.16f, cy + s * 0.35f), new PointF(cx - s * 0.16f, cy + s * 0.35f),
            new PointF(cx - s * 0.16f, cy - s * 0.7f),
        };
        using (var steel = new LinearGradientBrush(
            new RectangleF(cx - s, cy - s, s * 2, s * 2), Color.White, Color.FromArgb(140, 150, 170), 0f))
            g.FillPolygon(steel, blade);
        using (var guard = new SolidBrush(Color.FromArgb(40, 60, 160)))
            g.FillRectangle(guard, cx - s * 0.5f, cy + s * 0.32f, s, s * 0.18f);
        using var hilt = new Pen(Color.FromArgb(40, 60, 160), s * 0.22f);
        g.DrawLine(hilt, cx, cy + s * 0.5f, cx, cy + s * 0.95f);
    }

    private static void DrawPouch(Graphics g, float cx, float cy, float s)
    {
        using (var leather = new SolidBrush(Color.FromArgb(120, 82, 45)))
            g.FillEllipse(leather, cx - s * 0.75f, cy - s * 0.45f, s * 1.5f, s * 1.4f);
        using (var tie = new Pen(Gold, s * 0.12f))
            g.DrawArc(tie, cx - s * 0.4f, cy - s * 0.75f, s * 0.8f, s * 0.5f, 200, 140);
        using var neck = new SolidBrush(Color.FromArgb(96, 62, 30));
        g.FillRectangle(neck, cx - s * 0.28f, cy - s * 0.68f, s * 0.56f, s * 0.3f);
    }

    private static void DrawScroll(Graphics g, float cx, float cy, float s)
    {
        var paper = new RectangleF(cx - s * 0.6f, cy - s * 0.8f, s * 1.2f, s * 1.6f);
        using (var fill = new SolidBrush(Color.FromArgb(235, 224, 190))) g.FillRectangle(fill, paper);
        using (var edge = new Pen(Color.FromArgb(150, 120, 70), 2f)) g.DrawRectangle(edge, paper.X, paper.Y, paper.Width, paper.Height);
        using var line = new Pen(Color.FromArgb(120, 100, 70), Math.Max(1f, s * 0.06f));
        for (int i = 1; i <= 4; i++)
            g.DrawLine(line, paper.X + s * 0.15f, paper.Y + i * paper.Height / 5,
                paper.Right - s * 0.15f, paper.Y + i * paper.Height / 5);
    }

    private static void DrawBottle(Graphics g, float cx, float cy, float s)
    {
        using (var glass = new SolidBrush(Color.FromArgb(170, 170, 220, 235)))
        {
            g.FillEllipse(glass, cx - s * 0.5f, cy - s * 0.35f, s, s * 1.2f);
            g.FillRectangle(glass, cx - s * 0.18f, cy - s * 0.8f, s * 0.36f, s * 0.5f);
        }
        using (var cork = new SolidBrush(Color.FromArgb(150, 105, 60)))
            g.FillRectangle(cork, cx - s * 0.2f, cy - s * 0.95f, s * 0.4f, s * 0.22f);
        using var edge = new Pen(Color.FromArgb(210, 220, 245, 255), 1.8f);
        g.DrawEllipse(edge, cx - s * 0.5f, cy - s * 0.35f, s, s * 1.2f);
    }

    private static void DrawHeart(Graphics g, float cx, float cy, float s, float fill)
    {
        using var path = new GraphicsPath();
        path.AddBezier(cx, cy + s, cx - s * 1.4f, cy - s * 0.1f, cx - s * 0.7f, cy - s, cx, cy - s * 0.35f);
        path.AddBezier(cx, cy - s * 0.35f, cx + s * 0.7f, cy - s, cx + s * 1.4f, cy - s * 0.1f, cx, cy + s);
        using (var back = new SolidBrush(Color.FromArgb(120, 40, 8, 12))) g.FillPath(back, path);
        if (fill > 0)
        {
            var old = g.Clip;
            var bounds = path.GetBounds();
            g.SetClip(new RectangleF(bounds.X, bounds.Bottom - bounds.Height * fill,
                bounds.Width, bounds.Height * fill), CombineMode.Intersect);
            using (var red = new SolidBrush(HeartRed)) g.FillPath(red, path);
            g.Clip = old;
        }
        using var edge = new Pen(Color.FromArgb(200, 255, 190, 190), 1.4f);
        g.DrawPath(edge, path);
    }

    private static void DrawRupee(Graphics g, float cx, float cy, float s)
    {
        var pts = new[]
        {
            new PointF(cx, cy - s), new PointF(cx + s * 0.62f, cy - s * 0.45f),
            new PointF(cx + s * 0.62f, cy + s * 0.45f), new PointF(cx, cy + s),
            new PointF(cx - s * 0.62f, cy + s * 0.45f), new PointF(cx - s * 0.62f, cy - s * 0.45f),
        };
        using (var green = new SolidBrush(RupeeGreen)) g.FillPolygon(green, pts);
        using var edge = new Pen(Color.FromArgb(230, 250, 230), 1.6f);
        g.DrawPolygon(edge, pts);
        g.DrawLine(edge, pts[1], pts[4]);
        g.DrawLine(edge, pts[2], pts[5]);
    }

    // =====================================================================
    //  Helpers
    // =====================================================================

    private static GraphicsPath RoundedRect(RectangleF r, float radius)
    {
        float d = radius * 2;
        var path = new GraphicsPath();
        path.AddArc(r.X, r.Y, d, d, 180, 90);
        path.AddArc(r.Right - d, r.Y, d, d, 270, 90);
        path.AddArc(r.Right - d, r.Bottom - d, d, d, 0, 90);
        path.AddArc(r.X, r.Bottom - d, d, d, 90, 90);
        path.CloseFigure();
        return path;
    }

    private static string FormatBytes(long bytes)
    {
        string[] units = { "B", "KB", "MB", "GB", "TB" };
        double v = bytes;
        int u = 0;
        while (v >= 1024 && u < units.Length - 1) { v /= 1024; u++; }
        return u == 0 ? $"{v:0} {units[u]}" : $"{v:0.#} {units[u]}";
    }
}
