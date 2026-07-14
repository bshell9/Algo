using System.Diagnostics;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Drawing.Text;
using System.Windows.Forms;

namespace OcarinaExplorer;

/// <summary>
/// A file explorer styled as the OoT pause menu: four stone tablets float in a
/// ring around the camera; one faces you, its neighbors lean in from the screen
/// edges, and Q/E spins the whole room. All visuals are drawn in code.
/// </summary>
public sealed partial class MainForm : Form
{
    // ---- panel textures ----
    internal const int PanelW = 960;
    internal const int PanelH = 640;
    private const int Cols = 6;
    private const int Rows = 4;
    private const int PageSize = Cols * Rows;

    // ---- carousel geometry (camera at origin looking +Z) ----
    private const float Radius = 1.0f;       // ring radius
    private const float CamBack = 0.9f;      // ring pushed away from camera
    private const float PanelW3D = 1.6f;     // panel width in world units
    private const float PanelH3D = PanelW3D * PanelH / PanelW;
    private const float NearZ = 0.14f;
    private const float HalfPi = (float)(Math.PI / 2);

    private static readonly string[] ScreenTitles =
        { "SELECT ITEM", "CLAUDE MAP", "QUEST STATUS", "EQUIPMENT" };

    private readonly System.Windows.Forms.Timer _animTimer;
    private float _pulse;
    private int _tick;

    private int _screenIx;                   // unbounded; mod 4 = visible screen
    private float _rotation;                 // radians, animated toward _screenIx * HalfPi

    private readonly Bitmap[] _panels = new Bitmap[4];
    private readonly bool[] _dirty = { true, true, true, true };

    private string? _currentPath;            // null => drive select
    private List<Entry> _entries = new();
    private int _selected;
    private bool _showHidden;
    private SortMode _sort = SortMode.Newest;
    private string _statusOverride = "";
    private readonly Entry?[] _cFavorites = new Entry?[3];

    private ClaudeSnapshot _claude = new();
    private readonly SysInfo _sys = new();
    private List<(string Name, long Size)> _incoming = new();  // in-flight downloads

    private FileSystemWatcher? _watcher;
    private volatile bool _pendingRefresh;
    private readonly System.Collections.Concurrent.ConcurrentQueue<string> _bannerQueue = new();
    private readonly List<(string Text, DateTime Until)> _banners = new();

    // drive stats sampled every ~2s so slow/sleeping drives can't stall painting
    internal readonly record struct DriveStat(string Label, bool Ready, long Total, long Free);
    internal List<DriveStat> DriveCache = new();
    private float _heartFrac = 1f;

    private string _msgCache = "";
    private int _msgKeyScreen = -1;
    private string? _msgKeySel;
    private int _msgKeyCount = -1;

    private readonly Font _titleFont;
    private readonly Font _headFont;
    private readonly Font _bodyFont;
    private readonly Font _smallFont;
    private readonly Font _tinyFont;
    private readonly Font _counterFont;

    private RectangleF _frontRect;           // where the front panel lands on screen
    private readonly RectangleF[] _cButtonRects = new RectangleF[3];

    private enum SortMode { Newest, Name, Size }

    internal sealed class Entry
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

    public MainForm()
    {
        Text = "Ocarina Explorer";
        DoubleBuffered = true;
        BackColor = Color.Black;
        ClientSize = new Size(1280, 860);
        MinimumSize = new Size(980, 700);
        StartPosition = FormStartPosition.CenterScreen;
        KeyPreview = true;

        _titleFont = new Font("Georgia", 30f, FontStyle.Bold);
        _headFont = new Font("Georgia", 15f, FontStyle.Bold);
        _bodyFont = new Font("Trebuchet MS", 13f, FontStyle.Bold);
        _smallFont = new Font("Trebuchet MS", 10f, FontStyle.Bold);
        _tinyFont = new Font("Trebuchet MS", 8f, FontStyle.Bold);
        _counterFont = new Font("Georgia", 17f, FontStyle.Bold);

        for (int i = 0; i < 4; i++)
            _panels[i] = new Bitmap(PanelW, PanelH, PixelFormat.Format32bppPArgb);

        _animTimer = new System.Windows.Forms.Timer { Interval = 33 };
        _animTimer.Tick += OnTick;
        _animTimer.Start();

        _sys.Sample();
        _claude = ClaudeSnapshot.Collect();
        RefreshDriveCache();

        LoadLocation(DownloadsPath());
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing)
        {
            _animTimer.Dispose();
            _watcher?.Dispose();
            foreach (var b in _panels) b.Dispose();
            _titleFont.Dispose(); _headFont.Dispose(); _bodyFont.Dispose();
            _smallFont.Dispose(); _tinyFont.Dispose(); _counterFont.Dispose();
        }
        base.Dispose(disposing);
    }

    private static string DownloadsPath()
    {
        string dl = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), "Downloads");
        return Directory.Exists(dl)
            ? dl : Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
    }

    // =====================================================================
    //  Animation / periodic refresh
    // =====================================================================

    private void OnTick(object? sender, EventArgs e)
    {
        _pulse += 0.16f;
        _tick++;

        float target = _screenIx * HalfPi;
        float diff = target - _rotation;
        if (Math.Abs(diff) > 0.0015f) _rotation += diff * 0.22f;
        else _rotation = target;

        if (_tick % 60 == 0) // every ~2s: refresh live dashboards
        {
            _sys.Sample();
            _claude = ClaudeSnapshot.Collect();
            ScanIncoming();
            RefreshDriveCache();
            _dirty[1] = _dirty[2] = true;
        }

        // debounced: an active download fires Changed events many times a second
        if (_pendingRefresh && _tick % 15 == 0)
        {
            _pendingRefresh = false;
            ReloadKeepingSelection();
        }

        while (_bannerQueue.TryDequeue(out var text))
            _banners.Add((text, DateTime.Now.AddSeconds(4.5)));
        _banners.RemoveAll(b => b.Until < DateTime.Now);

        _dirty[Mod4(_screenIx)] = true; // front panel animates (cursor pulse, dots)
        Invalidate();
    }

    private static int Mod4(int v) => ((v % 4) + 4) % 4;

    private void RefreshDriveCache()
    {
        var list = new List<DriveStat>();
        try
        {
            foreach (var d in DriveInfo.GetDrives())
            {
                string label = d.Name.TrimEnd('\\', '/');
                bool ready = false;
                long total = 0, free = 0;
                try
                {
                    ready = d.IsReady;
                    if (ready)
                    {
                        if (!string.IsNullOrEmpty(d.VolumeLabel)) label += "  " + d.VolumeLabel;
                        total = d.TotalSize;
                        free = d.TotalFreeSpace;
                    }
                }
                catch (Exception) { ready = false; }
                list.Add(new DriveStat(label, ready, total, free));
            }
        }
        catch (Exception) { /* keep previous cache */ return; }
        DriveCache = list;

        try
        {
            var root = _currentPath is null ? null : Path.GetPathRoot(_currentPath);
            var cur = root is null ? default
                : list.FirstOrDefault(s => s.Ready &&
                    s.Label.StartsWith(root.TrimEnd('\\', '/'), StringComparison.OrdinalIgnoreCase));
            _heartFrac = cur.Total > 0 ? (float)((double)cur.Free / cur.Total) : 1f;
        }
        catch (Exception) { /* keep previous fraction */ }
    }

    private void ScanIncoming()
    {
        var list = new List<(string, long)>();
        try
        {
            foreach (var f in new DirectoryInfo(DownloadsPath()).GetFiles())
            {
                string ext = f.Extension.ToLowerInvariant();
                if (ext is ".crdownload" or ".part" or ".download" or ".tmp")
                    list.Add((f.Name, f.Length));
            }
        }
        catch (Exception) { /* Downloads unreadable — leave list empty */ }
        _incoming = list;
    }

    // =====================================================================
    //  File-system model
    // =====================================================================

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
                    IsDir = true, IsDrive = true,
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
        _entries = Sorted(list);
        _selected = 0;
        SetupWatcher(path);
        RefreshDriveCache();
        _dirty[0] = _dirty[3] = true;
        Invalidate();
    }

    private List<Entry> Sorted(List<Entry> list)
    {
        var dirs = list.Where(e => e.IsDir);
        var files = list.Where(e => !e.IsDir);
        dirs = _sort switch
        {
            SortMode.Newest => dirs.OrderByDescending(e => e.Modified ?? DateTime.MinValue),
            _ => dirs.OrderBy(e => e.Name, StringComparer.OrdinalIgnoreCase),
        };
        files = _sort switch
        {
            SortMode.Newest => files.OrderByDescending(e => e.Modified ?? DateTime.MinValue),
            SortMode.Size => files.OrderByDescending(e => e.Size),
            _ => files.OrderBy(e => e.Name, StringComparer.OrdinalIgnoreCase),
        };
        // newest-first puts fresh downloads in slot one, where your cursor starts
        return (_sort == SortMode.Newest ? files.Concat(dirs) : dirs.Concat(files)).ToList();
    }

    private void ReloadKeepingSelection()
    {
        string? keep = SelectedEntry?.FullPath;
        string? path = _currentPath;
        int oldIndex = _selected;
        LoadLocation(path);
        if (keep is not null)
        {
            int ix = _entries.FindIndex(e => e.FullPath == keep);
            _selected = ix >= 0 ? ix : Math.Min(oldIndex, Math.Max(0, _entries.Count - 1));
        }
    }

    private void SetupWatcher(string? path)
    {
        _watcher?.Dispose();
        _watcher = null;
        if (path is null) return;
        try
        {
            _watcher = new FileSystemWatcher(path)
            {
                NotifyFilter = NotifyFilters.FileName | NotifyFilters.DirectoryName
                             | NotifyFilters.LastWrite | NotifyFilters.Size,
                SynchronizingObject = this,
                EnableRaisingEvents = true,
            };
            _watcher.Created += (_, fe) =>
            {
                string ext = Path.GetExtension(fe.Name ?? "").ToLowerInvariant();
                if (ext is not (".crdownload" or ".part" or ".download" or ".tmp"))
                    _bannerQueue.Enqueue($"You got the {fe.Name}!");
                _pendingRefresh = true;
            };
            _watcher.Deleted += (_, _) => _pendingRefresh = true;
            _watcher.Renamed += (_, re) =>
            {
                // a finishing download renames .crdownload/.part -> real name
                string oldExt = Path.GetExtension(re.OldName ?? "").ToLowerInvariant();
                if (oldExt is ".crdownload" or ".part" or ".download" or ".tmp")
                    _bannerQueue.Enqueue($"You got the {re.Name}!");
                _pendingRefresh = true;
            };
            _watcher.Changed += (_, _) => _pendingRefresh = true;
        }
        catch (Exception) { /* e.g. network share without change notify */ }
    }

    private void NavigateUp()
    {
        if (_currentPath is null) return;
        var parent = Directory.GetParent(_currentPath);
        var child = _currentPath;
        LoadLocation(parent?.FullName);
        int idx = _entries.FindIndex(e =>
            string.Equals(e.FullPath.TrimEnd('\\', '/'), child.TrimEnd('\\', '/'),
                StringComparison.OrdinalIgnoreCase));
        if (idx >= 0) _selected = idx;
    }

    private void ActivateEntry(Entry e)
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
            catch (Exception) { _statusOverride = "You can't use that here!"; }
            _dirty[0] = true;
            Invalidate();
        }
    }

    private void RevealInExplorer()
    {
        try
        {
            if (SelectedEntry is { } e)
                Process.Start("explorer.exe", $"/select,\"{e.FullPath}\"");
            else if (_currentPath is not null)
                Process.Start("explorer.exe", $"\"{_currentPath}\"");
            _statusOverride = "Revealed in the other world (Explorer).";
        }
        catch (Exception) { _statusOverride = "Explorer would not answer the call..."; }
        _dirty[0] = true;
    }

    private void CopyPath()
    {
        string? p = SelectedEntry?.FullPath ?? _currentPath;
        if (p is null) return;
        try
        {
            Clipboard.SetText(p);
            _statusOverride = "Path copied to clipboard!";
        }
        catch (Exception) { _statusOverride = "The clipboard resisted. Try again."; }
        _dirty[0] = true;
    }

    private Entry? SelectedEntry =>
        _selected >= 0 && _selected < _entries.Count ? _entries[_selected] : null;

    // =====================================================================
    //  Input
    // =====================================================================

    protected override bool ProcessCmdKey(ref Message msg, Keys keyData)
    {
        bool onItems = Mod4(_screenIx) == 0;
        switch (keyData)
        {
            case Keys.Left:
                if (onItems) MoveSelection(-1); else Rotate(-1);
                return true;
            case Keys.Right:
                if (onItems) MoveSelection(+1); else Rotate(+1);
                return true;
            case Keys.Up: if (onItems) MoveSelection(-Cols); return true;
            case Keys.Down: if (onItems) MoveSelection(+Cols); return true;
            case Keys.PageUp: MoveSelection(-PageSize); return true;
            case Keys.PageDown: MoveSelection(+PageSize); return true;
            case Keys.Home: MoveSelection(int.MinValue / 2); return true;
            case Keys.End: MoveSelection(int.MaxValue / 2); return true;
            case Keys.Enter:
                if (SelectedEntry is { } e) ActivateEntry(e);
                return true;
            case Keys.Back: NavigateUp(); return true;
            case Keys.Q: Rotate(-1); return true;
            case Keys.E: Rotate(+1); return true;
            case Keys.D: LoadLocation(DownloadsPath()); return true;
            case Keys.R: RevealInExplorer(); return true;
            case Keys.P: CopyPath(); return true;
            case Keys.S:
                _sort = (SortMode)(((int)_sort + 1) % 3);
                _statusOverride = $"Sorting by: {_sort}";
                ReloadKeepingSelection();
                return true;
            case Keys.H:
                _showHidden = !_showHidden;
                ReloadKeepingSelection();
                return true;
            case Keys.F5: ReloadKeepingSelection(); return true;
            case Keys.D1: AssignFavorite(0); return true;
            case Keys.D2: AssignFavorite(1); return true;
            case Keys.D3: AssignFavorite(2); return true;
            case Keys.Escape: Close(); return true;
        }
        return base.ProcessCmdKey(ref msg, keyData);
    }

    private void Rotate(int dir) { _screenIx += dir; _statusOverride = ""; }

    private void MoveSelection(int delta)
    {
        if (_entries.Count == 0) return;
        long target = (long)_selected + delta;
        _selected = (int)Math.Clamp(target, 0, _entries.Count - 1);
        _statusOverride = "";
        _dirty[0] = _dirty[3] = true;
        Invalidate();
    }

    private void AssignFavorite(int slot)
    {
        if (SelectedEntry is { IsDir: false } e)
        {
            _cFavorites[slot] = e;
            _statusOverride =
                $"{e.Name} is now on {new[] { "C-Left", "C-Down", "C-Right" }[slot]}!";
            Invalidate();
        }
    }

    protected override void OnMouseDown(MouseEventArgs me)
    {
        base.OnMouseDown(me);
        for (int i = 0; i < 3; i++)
        {
            if (_cButtonRects[i].Contains(me.Location))
            {
                if (_cFavorites[i] is { } fav) ActivateEntry(fav);
                return;
            }
        }
        if (_frontRect.Contains(me.Location))
        {
            if (Mod4(_screenIx) == 0 && SlotIndexAt(me.Location) is { } idx)
            {
                _selected = idx;
                _statusOverride = "";
                _dirty[0] = _dirty[3] = true;
                Invalidate();
            }
        }
        else if (!_frontRect.IsEmpty && me.X < _frontRect.Left) Rotate(-1); // click a leaning tablet
        else if (!_frontRect.IsEmpty && me.X > _frontRect.Right) Rotate(+1);
    }

    protected override void OnMouseDoubleClick(MouseEventArgs me)
    {
        base.OnMouseDoubleClick(me);
        if (Mod4(_screenIx) == 0 && SlotIndexAt(me.Location) is { } idx)
        {
            _selected = idx;
            ActivateEntry(_entries[idx]);
        }
    }

    protected override void OnMouseWheel(MouseEventArgs me)
    {
        base.OnMouseWheel(me);
        if (Mod4(_screenIx) == 0) MoveSelection(me.Delta > 0 ? -Cols : +Cols);
    }

    private int? SlotIndexAt(Point p)
    {
        if (_frontRect.Width <= 0 || !_frontRect.Contains(p)) return null;
        // map screen point into 960x640 panel-texture coordinates
        float u = (p.X - _frontRect.X) / _frontRect.Width * PanelW;
        float v = (p.Y - _frontRect.Y) / _frontRect.Height * PanelH;
        var grid = ItemGridArea();
        if (u < grid.X || v < grid.Y || u >= grid.Right || v >= grid.Bottom) return null;
        int col = (int)((u - grid.X) / (grid.Width / Cols));
        int row = (int)((v - grid.Y) / (grid.Height / Rows));
        int page = _entries.Count == 0 ? 0 : _selected / PageSize;
        int idx = page * PageSize + row * Cols + col;
        return idx < _entries.Count ? idx : null;
    }

    // =====================================================================
    //  Painting — room, carousel, HUD
    // =====================================================================

    protected override void OnPaint(PaintEventArgs pe)
    {
        var g = pe.Graphics;
        g.SmoothingMode = SmoothingMode.AntiAlias;
        g.TextRenderingHint = TextRenderingHint.AntiAliasGridFit;

        DrawRoom(g);

        for (int i = 0; i < 4; i++)
            if (_dirty[i]) { RenderPanel(i); _dirty[i] = false; }

        DrawCarousel(g);
        DrawHud(g);
        DrawTextBox(g);
        DrawBanners(g);
    }

    private void DrawRoom(Graphics g)
    {
        var r = ClientRectangle;
        if (r.Width <= 0 || r.Height <= 0) return;
        using (var lg = new LinearGradientBrush(r, Pal.BgTop, Pal.BgBottom, 90f))
            g.FillRectangle(lg, r);

        // procedural wood grain — deterministic so it doesn't shimmer
        var rnd = new Random(42);
        using var grain = new Pen(Color.FromArgb(26, 0, 0, 0), 3f);
        for (int i = 0; i < 40; i++)
        {
            float x = (float)(rnd.NextDouble() * r.Width);
            float wob = 6 + (float)rnd.NextDouble() * 18;
            using var path = new GraphicsPath();
            var pts = new PointF[8];
            for (int k = 0; k < 8; k++)
                pts[k] = new PointF(
                    x + (float)Math.Sin(k * 0.9 + i) * wob, r.Height * k / 7f);
            path.AddCurve(pts);
            g.DrawPath(grain, path);
        }

        using var vig = new GraphicsPath();
        vig.AddEllipse(-r.Width * 0.25f, -r.Height * 0.25f, r.Width * 1.5f, r.Height * 1.5f);
        using var vignette = new PathGradientBrush(vig)
        {
            CenterColor = Color.FromArgb(0, 0, 0, 0),
            SurroundColors = new[] { Color.FromArgb(170, 0, 0, 0) },
        };
        g.FillRectangle(vignette, r);
    }

    private void RenderPanel(int ix)
    {
        using var g = Graphics.FromImage(_panels[ix]);
        g.SmoothingMode = SmoothingMode.AntiAlias;
        g.TextRenderingHint = TextRenderingHint.AntiAliasGridFit;
        g.Clear(Color.Transparent);
        switch (ix)
        {
            case 0: RenderItemPanel(g); break;
            case 1: RenderClaudeMapPanel(g); break;
            case 2: RenderQuestPanel(g); break;
            case 3: RenderEquipmentPanel(g); break;
        }
    }

    private void DrawCarousel(Graphics g)
    {
        float w = ClientSize.Width, h = ClientSize.Height;
        float f = w * 0.74f;               // focal length tuned so side tablets peek in
        float cx = w / 2f, cy = h * 0.44f;

        _frontRect = RectangleF.Empty;

        // painter's algorithm: farthest tablets first
        var order = Enumerable.Range(0, 4)
            .Select(i => (i, z: Radius * (float)Math.Cos(i * HalfPi - _rotation) + CamBack))
            .OrderByDescending(t => t.z);

        foreach (var (i, _) in order)
            DrawPanel3D(g, i, i * HalfPi - _rotation, f, cx, cy);
    }

    private void DrawPanel3D(Graphics g, int ix, float theta, float f, float cx, float cy)
    {
        // world-space panel: center on ring, tangent = "right" direction
        float dx = (float)Math.Sin(theta), dz = (float)Math.Cos(theta);
        float centerX = Radius * dx, centerZ = Radius * dz + CamBack;
        float rightX = dz, rightZ = -dx;

        float brightness = Math.Clamp(0.42f + 0.58f * dz, 0f, 1f);
        using var attrs = new ImageAttributes();
        attrs.SetColorMatrix(new ColorMatrix
        {
            Matrix00 = brightness, Matrix11 = brightness, Matrix22 = brightness, Matrix33 = 1f,
        });

        bool facing = dz > 0.9995f;
        if (facing)
        {
            // flat-on: single high-quality blit, and this is the click target
            float z = centerZ;
            float halfW = f * (PanelW3D / 2) / z, halfH = f * (PanelH3D / 2) / z;
            _frontRect = new RectangleF(cx - halfW, cy - halfH, halfW * 2, halfH * 2);
            g.InterpolationMode = InterpolationMode.HighQualityBilinear;
            g.DrawImage(_panels[ix],
                new[]
                {
                    new PointF(_frontRect.X, _frontRect.Y),
                    new PointF(_frontRect.Right, _frontRect.Y),
                    new PointF(_frontRect.X, _frontRect.Bottom),
                },
                new RectangleF(0, 0, PanelW, PanelH), GraphicsUnit.Pixel, attrs);
            return;
        }

        // angled: render in vertical strips with per-strip depth (fake perspective)
        g.InterpolationMode = InterpolationMode.Bilinear;
        const int Strips = 96;
        float clientW = ClientSize.Width;
        for (int s = 0; s < Strips; s++)
        {
            float t0 = (float)s / Strips, t1 = (float)(s + 1) / Strips;
            float x0 = centerX + rightX * (t0 - 0.5f) * PanelW3D;
            float z0 = centerZ + rightZ * (t0 - 0.5f) * PanelW3D;
            float x1 = centerX + rightX * (t1 - 0.5f) * PanelW3D;
            float z1 = centerZ + rightZ * (t1 - 0.5f) * PanelW3D;
            if (z0 < NearZ || z1 < NearZ) continue;

            float sx0 = cx + f * x0 / z0, sx1 = cx + f * x1 / z1;
            if (sx1 <= sx0) continue;                        // back-facing
            if (sx1 < -40 || sx0 > clientW + 40) continue;   // off screen

            float h0 = f * (PanelH3D / 2) / z0, h1 = f * (PanelH3D / 2) / z1;
            g.DrawImage(_panels[ix],
                new[]
                {
                    new PointF(sx0, cy - h0),
                    new PointF(sx1, cy - h1),
                    new PointF(sx0, cy + h0),
                },
                new RectangleF(t0 * PanelW, 0, (t1 - t0) * PanelW, PanelH),
                GraphicsUnit.Pixel, attrs);
        }
    }

    // =====================================================================
    //  HUD (fixed overlay, like the always-on-screen game HUD)
    // =====================================================================

    private void DrawHud(Graphics g)
    {
        // hearts: free space on the current drive (sampled, never queried mid-paint)
        double frac = _heartFrac;
        for (int i = 0; i < 10; i++)
            Sprites.DrawHeart(g, 28 + i * 26, 26, 11f,
                (float)Math.Clamp(frac * 10 - i, 0, 1));

        // magic meter: RAM in use
        var bar = new RectangleF(22, 44, 190, 11);
        using (var back = new SolidBrush(Color.FromArgb(180, 8, 10, 26)))
            g.FillRectangle(back, bar);
        using (var green = new SolidBrush(Pal.MagicGreen))
            g.FillRectangle(green, bar.X + 1, bar.Y + 1,
                (bar.Width - 2) * Math.Clamp(_sys.RamLoad, 0f, 1f), bar.Height - 2);
        using (var edge = new Pen(Pal.GoldDark, 1.6f))
            g.DrawRectangle(edge, bar.X, bar.Y, bar.Width, bar.Height);
        using (var wt = new SolidBrush(Color.FromArgb(210, 240, 230, 210)))
            g.DrawString(
                $"disk free {frac * 100:0}%   ram {_sys.RamLoad * 100:0}%   cpu {_sys.CpuLoad * 100:0}%",
                _tinyFont, wt, 22, 58);

        // rupee counter: items here
        Sprites.DrawRupee(g, 30, ClientSize.Height - 46, 11f);
        using (var wt = new SolidBrush(Color.White))
            g.DrawString(_entries.Count.ToString("000"), _counterFont, wt, 46, ClientSize.Height - 60);

        DrawCButtons(g);

        // screen name + rotate hints under the top edge
        string title = ScreenTitles[Mod4(_screenIx)];
        var ts = g.MeasureString(title, _headFont);
        Sprites.GoldText(g, title, _headFont, (ClientSize.Width - ts.Width) / 2, 8);
        using (var dim = new SolidBrush(Color.FromArgb(170, 230, 220, 200)))
        {
            string prev = ScreenTitles[Mod4(_screenIx - 1)], next = ScreenTitles[Mod4(_screenIx + 1)];
            g.DrawString($"◀ Q  {prev}", _tinyFont, dim, 14, ClientSize.Height / 2f - 8);
            var ns = g.MeasureString($"{next}  E ▶", _tinyFont);
            g.DrawString($"{next}  E ▶", _tinyFont, dim,
                ClientSize.Width - ns.Width - 14, ClientSize.Height / 2f - 8);
        }
    }

    private void DrawCButtons(Graphics g)
    {
        float bx = ClientSize.Width - 168, by = 30, r = 21f;
        var centers = new[]
        {
            new PointF(bx, by + 26), new PointF(bx + 52, by + 52), new PointF(bx + 104, by + 26),
        };
        string[] glyphs = { "◀", "▼", "▶" };

        for (int i = 0; i < 3; i++)
        {
            var c = centers[i];
            var rect = new RectangleF(c.X - r, c.Y - r, r * 2, r * 2);
            _cButtonRects[i] = rect;

            using (var fill = new SolidBrush(Pal.CButtonYellow)) g.FillEllipse(fill, rect);
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
        using (var wt = new SolidBrush(Color.FromArgb(190, 240, 230, 210)))
            g.DrawString("quick-launch · 1/2/3 assigns", _tinyFont, wt, bx - 26, by + 78);
    }

    private void DrawTextBox(Graphics g)
    {
        float w = ClientSize.Width, h = ClientSize.Height;
        var box = new RectangleF(w * 0.16f, h - 122, w * 0.68f, 74);

        using (var path = Sprites.RoundedRect(box, 20))
        {
            using (var fill = new SolidBrush(Pal.TextBoxFill)) g.FillPath(fill, path);
            using (var edge = new Pen(Color.FromArgb(220, 150, 150, 190), 2f)) g.DrawPath(edge, path);
        }

        string msg = _statusOverride.Length > 0 ? _statusOverride : ComposeMessage();
        using var fmt = new StringFormat
        {
            Alignment = StringAlignment.Center,
            LineAlignment = StringAlignment.Center,
            Trimming = StringTrimming.EllipsisCharacter,
        };
        using (var white = new SolidBrush(Color.White))
            g.DrawString(msg, _bodyFont, white, RectangleF.Inflate(box, -18, -10), fmt);

        if (Math.Sin(_pulse * 0.8) > 0)
        {
            var tip = new PointF(box.Right - 24, box.Bottom - 10);
            using var b = new SolidBrush(Pal.NameCyan);
            g.FillPolygon(b, new[] { tip, new(tip.X - 9, tip.Y - 11), new(tip.X + 9, tip.Y - 11) });
        }

        using var dim = new SolidBrush(Color.FromArgb(150, 220, 210, 190));
        string hints = "ENTER open · BKSP up · Q/E rotate · D downloads · S sort · P copy path · R reveal · H hidden · 1/2/3 C-buttons";
        var hs = g.MeasureString(hints, _tinyFont);
        g.DrawString(hints, _tinyFont, dim, (w - hs.Width) / 2, h - 30);
    }

    private void DrawBanners(Graphics g)
    {
        float y = 86;
        foreach (var (text, _) in _banners.TakeLast(3))
        {
            var size = g.MeasureString(text, _headFont);
            float x = (ClientSize.Width - size.Width) / 2;
            float glow = (float)(Math.Sin(_pulse * 1.4) * 0.5 + 0.5);
            using (var halo = new SolidBrush(Color.FromArgb((int)(70 + glow * 90), Pal.Gold)))
                g.FillEllipse(halo, x - 40, y - 8, size.Width + 80, size.Height + 16);
            Sprites.DrawStar(g, x - 16, y + size.Height / 2, 9, Pal.GoldLight);
            Sprites.DrawStar(g, x + size.Width + 16, y + size.Height / 2, 9, Pal.GoldLight);
            Sprites.GoldText(g, text, _headFont, x, y);
            y += size.Height + 14;
        }
    }

    private string ComposeMessage()
    {
        // memoized: folder-content counts must not run on every paint
        int front = Mod4(_screenIx);
        string? selPath = SelectedEntry?.FullPath;
        if (front == _msgKeyScreen && selPath == _msgKeySel && _entries.Count == _msgKeyCount
            && front != 1) // the Claude map line refreshes with its snapshot
            return _msgCache;
        _msgKeyScreen = front; _msgKeySel = selPath; _msgKeyCount = _entries.Count;
        return _msgCache = BuildMessage(front);
    }

    private string BuildMessage(int front)
    {
        if (front == 1)
            return _claude.Found
                ? $"Claude is mapped: {_claude.Connectors.Count} connectors, " +
                  $"{_claude.Sessions.Count(s => s.Active)} agents active, " +
                  $"{_claude.RunningProcesses} claude processes running."
                : "No Claude signs found in this land (~/.claude not found).";
        if (front == 2) return "The state of your quest: drives, memory, and hidden treasures.";
        if (front == 3) return SelectedEntry is { } sel
            ? $"Inspecting the {sel.Name}."
            : "Nothing is selected on the Item screen.";

        var e = SelectedEntry;
        if (e is null) return "This place is empty... not even a single rupee.";
        if (e.IsDrive) return $"The realm of {e.Name}. Press ENTER to travel there!";
        if (e.IsDir)
        {
            int n = -1;
            try { n = Directory.EnumerateFileSystemEntries(e.FullPath).Count(); }
            catch (Exception) { /* sealed folder */ }
            return n >= 0
                ? $"You found {e.Name}! It holds {n} treasure{(n == 1 ? "" : "s")}."
                : $"You found {e.Name}! Its contents are sealed away.";
        }
        string age = e.Modified is { } m ? $" Obtained {Sprites.TimeAgo(m)}." : "";
        return $"You got the {e.Name}!" +
               (e.Size >= 0 ? $" It weighs {Sprites.FormatBytes(e.Size)}." : "") + age;
    }
}
