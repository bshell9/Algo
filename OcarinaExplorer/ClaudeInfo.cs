using System.Text.Json;

namespace OcarinaExplorer;

/// <summary>
/// Best-effort snapshot of the user's local Claude Code setup, read from
/// ~/.claude.json and ~/.claude/projects. Everything degrades gracefully
/// when the files aren't there.
/// </summary>
internal sealed class ClaudeSnapshot
{
    public sealed record Session(string Name, DateTime LastActivity, bool Active);

    public bool Found;
    public List<string> Connectors = new();
    public List<Session> Sessions = new();
    public int RunningProcesses;
    public string? CurrentPosition;

    public static ClaudeSnapshot Collect()
    {
        var snap = new ClaudeSnapshot();
        string home = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);

        // MCP connectors from ~/.claude.json (global + per-project)
        try
        {
            string cfg = Path.Combine(home, ".claude.json");
            if (File.Exists(cfg))
            {
                snap.Found = true;
                using var doc = JsonDocument.Parse(File.ReadAllText(cfg));
                var names = new List<string>();
                if (doc.RootElement.TryGetProperty("mcpServers", out var global) &&
                    global.ValueKind == JsonValueKind.Object)
                {
                    foreach (var s in global.EnumerateObject()) names.Add(s.Name);
                }
                if (doc.RootElement.TryGetProperty("projects", out var projects) &&
                    projects.ValueKind == JsonValueKind.Object)
                {
                    foreach (var proj in projects.EnumerateObject())
                    {
                        if (proj.Value.TryGetProperty("mcpServers", out var local) &&
                            local.ValueKind == JsonValueKind.Object)
                        {
                            foreach (var s in local.EnumerateObject()) names.Add(s.Name);
                        }
                    }
                }
                snap.Connectors = names.Distinct(StringComparer.OrdinalIgnoreCase).Take(8).ToList();
            }
        }
        catch (Exception) { /* unreadable config — show what we have */ }

        // Recent sessions from ~/.claude/projects/<encoded-path>/*.jsonl
        try
        {
            string projDir = Path.Combine(home, ".claude", "projects");
            if (Directory.Exists(projDir))
            {
                snap.Found = true;
                foreach (var dir in Directory.EnumerateDirectories(projDir))
                {
                    DateTime last = DateTime.MinValue;
                    foreach (var f in Directory.EnumerateFiles(dir, "*.jsonl"))
                    {
                        var t = File.GetLastWriteTime(f);
                        if (t > last) last = t;
                    }
                    if (last == DateTime.MinValue) continue;

                    // folder names encode the project path with dashes; keep the tail
                    string name = Path.GetFileName(dir).TrimEnd('-');
                    int cut = name.LastIndexOf('-');
                    if (cut >= 0 && cut < name.Length - 1) name = name[(cut + 1)..];
                    if (name.Length == 0) name = "(root)";

                    snap.Sessions.Add(new Session(name, last,
                        (DateTime.Now - last).TotalMinutes < 5));
                }
                snap.Sessions = snap.Sessions
                    .OrderByDescending(s => s.LastActivity).Take(7).ToList();
                snap.CurrentPosition = snap.Sessions.FirstOrDefault()?.Name;
            }
        }
        catch (Exception) { /* no projects dir — fine */ }

        try
        {
            snap.RunningProcesses =
                System.Diagnostics.Process.GetProcessesByName("claude").Length;
        }
        catch (Exception) { /* process query denied — leave zero */ }

        return snap;
    }
}
