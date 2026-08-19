using System;
using System.Diagnostics;
using System.IO;
using System.Linq;

class Program {
    static int Main(string[] args) {
        string dir = AppDomain.CurrentDomain.BaseDirectory;
        string real7z = Path.Combine(dir, "7za_orig.exe");
        var argList = args.ToList();
        if (argList.Contains("x")) {
            argList.Add("-xr!*darwin*");
            argList.Add("-y");
        }
        string cmdArgs = string.Join(" ", argList.Select(a => "\"" + a.Replace("\"", "\\\"") + "\""));
        ProcessStartInfo psi = new ProcessStartInfo(real7z, cmdArgs) {
            UseShellExecute = false
        };
        var proc = Process.Start(psi);
        proc.WaitForExit();
        return proc.ExitCode;
    }
}
