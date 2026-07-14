using System.Drawing;
using System.Drawing.Drawing2D;

namespace OcarinaExplorer;

/// <summary>Shared palette for the pause-menu look.</summary>
internal static class Pal
{
    public static readonly Color BgTop = Color.FromArgb(52, 30, 18);      // wood wall
    public static readonly Color BgBottom = Color.FromArgb(14, 8, 5);
    public static readonly Color GoldLight = Color.FromArgb(255, 230, 170);
    public static readonly Color Gold = Color.FromArgb(232, 190, 78);
    public static readonly Color GoldDark = Color.FromArgb(150, 110, 30);
    public static readonly Color TextBoxFill = Color.FromArgb(200, 8, 12, 58);
    public static readonly Color CButtonYellow = Color.FromArgb(250, 208, 56);
    public static readonly Color HeartRed = Color.FromArgb(228, 32, 40);
    public static readonly Color RupeeGreen = Color.FromArgb(60, 190, 90);
    public static readonly Color MagicGreen = Color.FromArgb(80, 210, 100);
    public static readonly Color NameCyan = Color.FromArgb(120, 220, 250);
    public static readonly Color SlotFill = Color.FromArgb(170, 16, 14, 44);
    public static readonly Color SlotEdge = Color.FromArgb(210, 96, 84, 160);
    public static readonly Color Parchment = Color.FromArgb(235, 224, 190);

    // tablet frame colors per screen, echoing the four pause screens
    public static readonly Color FrameItem = Color.FromArgb(30, 40, 84);      // deep blue
    public static readonly Color FrameMap = Color.FromArgb(122, 34, 30);      // crimson
    public static readonly Color FrameQuest = Color.FromArgb(86, 92, 48);     // olive stone
    public static readonly Color FrameEquip = Color.FromArgb(92, 58, 30);     // brown
}

/// <summary>All original vector "sprites" — nothing here comes from a game.</summary>
internal static class Sprites
{
    public static GraphicsPath RoundedRect(RectangleF r, float radius)
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

    public static string FormatBytes(long bytes)
    {
        string[] units = { "B", "KB", "MB", "GB", "TB" };
        double v = bytes;
        int u = 0;
        while (v >= 1024 && u < units.Length - 1) { v /= 1024; u++; }
        return u == 0 ? $"{v:0} {units[u]}" : $"{v:0.#} {units[u]}";
    }

    public static string ShortBytes(long bytes)
    {
        if (bytes < 1024) return $"{bytes}B";
        if (bytes < 1024 * 1024) return $"{bytes / 1024.0:0}K";
        if (bytes < 1024L * 1024 * 1024) return $"{bytes / 1048576.0:0.#}M";
        return $"{bytes / 1073741824.0:0.#}G";
    }

    public static string TimeAgo(DateTime t)
    {
        var d = DateTime.Now - t;
        if (d.TotalSeconds < 60) return "just now";
        if (d.TotalMinutes < 60) return $"{(int)d.TotalMinutes}m ago";
        if (d.TotalHours < 24) return $"{(int)d.TotalHours}h ago";
        return $"{(int)d.TotalDays}d ago";
    }

    /// <summary>Engraved-in-stone text like the pause screen titles.</summary>
    public static void Engraved(Graphics g, string text, Font font, float x, float y, Color? face = null)
    {
        using (var lite = new SolidBrush(Color.FromArgb(120, 255, 250, 220)))
            g.DrawString(text, font, lite, x + 1.6f, y + 1.6f);
        using var dark = new SolidBrush(face ?? Color.FromArgb(46, 36, 18));
        g.DrawString(text, font, dark, x, y);
    }

    public static void GoldText(Graphics g, string text, Font font, float x, float y)
    {
        using (var shadow = new SolidBrush(Color.FromArgb(200, 0, 0, 0)))
            g.DrawString(text, font, shadow, x + 2.5f, y + 2.5f);
        var size = g.MeasureString(text, font);
        using var gold = new LinearGradientBrush(
            new RectangleF(x, y, Math.Max(1, size.Width), Math.Max(1, size.Height)),
            Pal.GoldLight, Pal.GoldDark, 90f);
        g.DrawString(text, font, gold, x, y);
    }

    public static void DrawIconFor(Graphics g, bool isDrive, bool isDir, string ext, float cx, float cy, float s)
    {
        if (isDrive) { DrawGem(g, cx, cy, s); return; }
        if (isDir) { DrawChest(g, cx, cy, s); return; }
        switch (ext)
        {
            case ".png" or ".jpg" or ".jpeg" or ".gif" or ".bmp" or ".webp" or ".ico" or ".svg":
                DrawLens(g, cx, cy, s); break;
            case ".mp3" or ".wav" or ".flac" or ".ogg" or ".m4a" or ".mid":
                DrawOcarina(g, cx, cy, s); break;
            case ".exe" or ".bat" or ".cmd" or ".msi" or ".com" or ".ps1":
                DrawSword(g, cx, cy, s); break;
            case ".zip" or ".rar" or ".7z" or ".tar" or ".gz":
                DrawPouch(g, cx, cy, s); break;
            case ".txt" or ".md" or ".doc" or ".docx" or ".pdf" or ".rtf" or ".log" or ".csv":
                DrawScroll(g, cx, cy, s); break;
            case ".crdownload" or ".part" or ".download" or ".tmp":
                DrawHourglass(g, cx, cy, s); break;
            default:
                DrawBottle(g, cx, cy, s); break;
        }
    }

    public static void DrawChest(Graphics g, float cx, float cy, float s)
    {
        var body = new RectangleF(cx - s * 0.9f, cy - s * 0.2f, s * 1.8f, s * 0.9f);
        var lid = new RectangleF(cx - s * 0.9f, cy - s * 0.75f, s * 1.8f, s * 0.85f);
        using (var wood = new SolidBrush(Color.FromArgb(146, 84, 40))) g.FillRectangle(wood, body);
        using (var dark = new SolidBrush(Color.FromArgb(112, 60, 26)))
            g.FillPie(dark, lid.X, lid.Y, lid.Width, lid.Height, 180, 180);
        using (var band = new Pen(Pal.Gold, s * 0.14f))
        {
            g.DrawLine(band, cx, cy - s * 0.72f, cx, cy + s * 0.68f);
            g.DrawRectangle(band, body.X, body.Y, body.Width, body.Height);
        }
        using var keyhole = new SolidBrush(Color.FromArgb(60, 34, 10));
        g.FillEllipse(keyhole, cx - s * 0.12f, cy + s * 0.02f, s * 0.24f, s * 0.24f);
    }

    public static void DrawGem(Graphics g, float cx, float cy, float s)
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

    public static void DrawLens(Graphics g, float cx, float cy, float s)
    {
        using (var glass = new SolidBrush(Color.FromArgb(200, 120, 60, 160)))
            g.FillEllipse(glass, cx - s * 0.7f, cy - s * 0.7f, s * 1.4f, s * 1.4f);
        using (var rim = new Pen(Pal.HeartRed, s * 0.14f))
            g.DrawEllipse(rim, cx - s * 0.7f, cy - s * 0.7f, s * 1.4f, s * 1.4f);
        using (var pupil = new SolidBrush(Color.FromArgb(240, 240, 240, 255)))
            g.FillEllipse(pupil, cx - s * 0.22f, cy - s * 0.22f, s * 0.44f, s * 0.44f);
        using var handle = new Pen(Pal.HeartRed, s * 0.16f);
        g.DrawLine(handle, cx + s * 0.5f, cy + s * 0.5f, cx + s * 0.95f, cy + s * 0.95f);
    }

    public static void DrawOcarina(Graphics g, float cx, float cy, float s)
    {
        using (var clay = new SolidBrush(Color.FromArgb(90, 140, 210)))
            g.FillEllipse(clay, cx - s * 0.95f, cy - s * 0.45f, s * 1.9f, s * 1.05f);
        using (var mouth = new SolidBrush(Color.FromArgb(70, 110, 175)))
            g.FillRectangle(mouth, cx - s * 0.2f, cy - s * 0.85f, s * 0.4f, s * 0.5f);
        using var hole = new SolidBrush(Color.FromArgb(25, 40, 70));
        for (int i = 0; i < 3; i++)
            g.FillEllipse(hole, cx - s * 0.5f + i * s * 0.42f, cy - s * 0.12f, s * 0.2f, s * 0.2f);
    }

    public static void DrawSword(Graphics g, float cx, float cy, float s)
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

    public static void DrawPouch(Graphics g, float cx, float cy, float s)
    {
        using (var leather = new SolidBrush(Color.FromArgb(120, 82, 45)))
            g.FillEllipse(leather, cx - s * 0.75f, cy - s * 0.45f, s * 1.5f, s * 1.4f);
        using (var tie = new Pen(Pal.Gold, s * 0.12f))
            g.DrawArc(tie, cx - s * 0.4f, cy - s * 0.75f, s * 0.8f, s * 0.5f, 200, 140);
        using var neck = new SolidBrush(Color.FromArgb(96, 62, 30));
        g.FillRectangle(neck, cx - s * 0.28f, cy - s * 0.68f, s * 0.56f, s * 0.3f);
    }

    public static void DrawScroll(Graphics g, float cx, float cy, float s)
    {
        var paper = new RectangleF(cx - s * 0.6f, cy - s * 0.8f, s * 1.2f, s * 1.6f);
        using (var fill = new SolidBrush(Pal.Parchment)) g.FillRectangle(fill, paper);
        using (var edge = new Pen(Color.FromArgb(150, 120, 70), 2f))
            g.DrawRectangle(edge, paper.X, paper.Y, paper.Width, paper.Height);
        using var line = new Pen(Color.FromArgb(120, 100, 70), Math.Max(1f, s * 0.06f));
        for (int i = 1; i <= 4; i++)
            g.DrawLine(line, paper.X + s * 0.15f, paper.Y + i * paper.Height / 5,
                paper.Right - s * 0.15f, paper.Y + i * paper.Height / 5);
    }

    public static void DrawBottle(Graphics g, float cx, float cy, float s)
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

    public static void DrawHourglass(Graphics g, float cx, float cy, float s)
    {
        var pts = new[]
        {
            new PointF(cx - s * 0.6f, cy - s * 0.8f), new PointF(cx + s * 0.6f, cy - s * 0.8f),
            new PointF(cx - s * 0.6f, cy + s * 0.8f), new PointF(cx + s * 0.6f, cy + s * 0.8f),
        };
        using (var sand = new SolidBrush(Pal.Gold))
        {
            g.FillPolygon(sand, new[] { pts[0], pts[1], new PointF(cx, cy) });
            g.FillPolygon(sand, new[] { pts[2], pts[3], new PointF(cx, cy) });
        }
        using var frame = new Pen(Color.FromArgb(120, 80, 40), s * 0.12f);
        g.DrawLine(frame, pts[0], pts[1]);
        g.DrawLine(frame, pts[2], pts[3]);
        g.DrawLine(frame, pts[0], pts[3]);
        g.DrawLine(frame, pts[1], pts[2]);
    }

    public static void DrawHeart(Graphics g, float cx, float cy, float s, float fill)
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
            using (var red = new SolidBrush(Pal.HeartRed)) g.FillPath(red, path);
            g.Clip = old;
        }
        using var edge = new Pen(Color.FromArgb(200, 255, 190, 190), 1.4f);
        g.DrawPath(edge, path);
    }

    public static void DrawRupee(Graphics g, float cx, float cy, float s)
    {
        var pts = new[]
        {
            new PointF(cx, cy - s), new PointF(cx + s * 0.62f, cy - s * 0.45f),
            new PointF(cx + s * 0.62f, cy + s * 0.45f), new PointF(cx, cy + s),
            new PointF(cx - s * 0.62f, cy + s * 0.45f), new PointF(cx - s * 0.62f, cy - s * 0.45f),
        };
        using (var green = new SolidBrush(Pal.RupeeGreen)) g.FillPolygon(green, pts);
        using var edge = new Pen(Color.FromArgb(230, 250, 230), 1.6f);
        g.DrawPolygon(edge, pts);
        g.DrawLine(edge, pts[1], pts[4]);
        g.DrawLine(edge, pts[2], pts[5]);
    }

    public static void DrawStar(Graphics g, float cx, float cy, float s, Color color)
    {
        var pts = new PointF[10];
        for (int i = 0; i < 10; i++)
        {
            double a = -Math.PI / 2 + i * Math.PI / 5;
            float r = i % 2 == 0 ? s : s * 0.45f;
            pts[i] = new PointF(cx + (float)(Math.Cos(a) * r), cy + (float)(Math.Sin(a) * r));
        }
        using var b = new SolidBrush(color);
        g.FillPolygon(b, pts);
    }

    /// <summary>Selection bracket corners, like the white targeting brackets.</summary>
    public static void DrawBrackets(Graphics g, RectangleF r, Color color, float len, float width)
    {
        using var p = new Pen(color, width);
        g.DrawLines(p, new[] { new PointF(r.X, r.Y + len), new PointF(r.X, r.Y), new PointF(r.X + len, r.Y) });
        g.DrawLines(p, new[] { new PointF(r.Right - len, r.Y), new PointF(r.Right, r.Y), new PointF(r.Right, r.Y + len) });
        g.DrawLines(p, new[] { new PointF(r.X, r.Bottom - len), new PointF(r.X, r.Bottom), new PointF(r.X + len, r.Bottom) });
        g.DrawLines(p, new[] { new PointF(r.Right - len, r.Bottom), new PointF(r.Right, r.Bottom), new PointF(r.Right, r.Bottom - len) });
    }
}
