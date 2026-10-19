using Microsoft.Extensions.Configuration.EnvironmentVariables;
using Microsoft.Extensions.Configuration.Memory;

namespace Learner.Api.Configuration;

/// <summary>
/// Development only: reads the gitignored repo-root <c>.env</c>, the one place local secrets shared with the agents
/// service live. Unlike dotnet user-secrets (stored under %APPDATA%), it is visible to every process that starts the
/// API, whichever terminal or tool launched it.
/// </summary>
public static class DotEnvConfiguration
{
    // Names as the agents service reads them, mapped to this API's configuration keys.
    private static readonly Dictionary<string, string> SharedKeys = new(StringComparer.OrdinalIgnoreCase)
    {
        ["AGENT_SERVICE_TOKEN"] = "AgentService:Token",
    };

    public static void AddRepoDotEnv(this ConfigurationManager configuration, IHostEnvironment environment)
    {
        if (!environment.IsDevelopment() || FindUp(environment.ContentRootPath, ".env") is not { } file)
        {
            return;
        }

        var values = new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase);
        foreach (var raw in File.ReadLines(file))
        {
            var line = raw.Trim();
            var equals = line.IndexOf('=');
            if (line.StartsWith('#') || equals <= 0)
            {
                continue;
            }
            var key = line[..equals].Trim();
            var value = line[(equals + 1)..].Trim().Trim('"', '\'');
            if (value.Length > 0)
            {
                values[SharedKeys.GetValueOrDefault(key, key.Replace("__", ":"))] = value;
            }
        }

        // Before environment variables, so a real env var or command-line value still wins over the file.
        var source = new MemoryConfigurationSource { InitialData = values };
        var sources = ((IConfigurationBuilder)configuration).Sources;
        var firstEnvironment = sources.ToList().FindIndex(s => s is EnvironmentVariablesConfigurationSource);
        sources.Insert(firstEnvironment < 0 ? sources.Count : firstEnvironment, source);
    }

    private static string? FindUp(string start, string fileName)
    {
        for (var dir = new DirectoryInfo(start); dir is not null; dir = dir.Parent)
        {
            var candidate = Path.Combine(dir.FullName, fileName);
            if (File.Exists(candidate))
            {
                return candidate;
            }
        }
        return null;
    }
}
