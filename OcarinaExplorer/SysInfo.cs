using System.Runtime.InteropServices;

namespace OcarinaExplorer;

/// <summary>Lightweight system stats (RAM / CPU / uptime) via Win32.</summary>
internal sealed class SysInfo
{
    [StructLayout(LayoutKind.Sequential)]
    private struct MEMORYSTATUSEX
    {
        public uint dwLength;
        public uint dwMemoryLoad;
        public ulong ullTotalPhys;
        public ulong ullAvailPhys;
        public ulong ullTotalPageFile;
        public ulong ullAvailPageFile;
        public ulong ullTotalVirtual;
        public ulong ullAvailVirtual;
        public ulong ullAvailExtendedVirtual;
    }

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool GlobalMemoryStatusEx(ref MEMORYSTATUSEX lpBuffer);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool GetSystemTimes(out ulong idle, out ulong kernel, out ulong user);

    private ulong _prevIdle, _prevKernel, _prevUser;
    private bool _hasPrev;

    public float CpuLoad { get; private set; }          // 0..1
    public float RamLoad { get; private set; }          // 0..1
    public ulong RamTotal { get; private set; }
    public ulong RamAvail { get; private set; }
    public TimeSpan Uptime => TimeSpan.FromMilliseconds(Environment.TickCount64);
    public int ProcessCount { get; private set; }

    public void Sample()
    {
        try
        {
            var mem = new MEMORYSTATUSEX { dwLength = (uint)Marshal.SizeOf<MEMORYSTATUSEX>() };
            if (GlobalMemoryStatusEx(ref mem))
            {
                RamLoad = mem.dwMemoryLoad / 100f;
                RamTotal = mem.ullTotalPhys;
                RamAvail = mem.ullAvailPhys;
            }

            if (GetSystemTimes(out ulong idle, out ulong kernel, out ulong user))
            {
                if (_hasPrev)
                {
                    ulong idleD = idle - _prevIdle;
                    ulong busyD = (kernel - _prevKernel) + (user - _prevUser); // kernel includes idle
                    if (busyD > 0)
                        CpuLoad = Math.Clamp(1f - (float)idleD / busyD, 0f, 1f);
                }
                _prevIdle = idle; _prevKernel = kernel; _prevUser = user;
                _hasPrev = true;
            }

            ProcessCount = System.Diagnostics.Process.GetProcesses().Length;
        }
        catch (Exception)
        {
            // stats are decoration; never let them take the app down
        }
    }
}
