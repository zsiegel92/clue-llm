"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface PyodideInterface {
  loadPackagesFromImports: (code: string) => Promise<void>;
  loadPackage: (packages: string | string[]) => Promise<void>;
  runPythonAsync: (code: string) => Promise<unknown>;
  FS: {
    writeFile: (path: string, data: string) => void;
    mkdir: (path: string) => void;
  };
  // biome-ignore lint/suspicious/noExplicitAny: pyodide globals type
  globals: any;
}

interface UsePyodideOptions {
  packages?: {
    official?: string[];
    micropip?: string[];
  };
}

interface UsePyodideReturn {
  runPython: (code: string) => Promise<void>;
  stdout: string;
  stderr: string;
  isLoading: boolean;
  isRunning: boolean;
  isReady: boolean;
}

export function usePyodide(options?: UsePyodideOptions): UsePyodideReturn {
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [stdout, setStdout] = useState("");
  const [stderr, setStderr] = useState("");

  const pyodideRef = useRef<PyodideInterface | null>(null);
  const stdoutRef = useRef<string[]>([]);
  const stderrRef = useRef<string[]>([]);

  // Initialize Pyodide
  // biome-ignore lint/correctness/useExhaustiveDependencies: Only load once on mount, ignore options changes
  useEffect(() => {
    let cancelled = false;

    async function loadPyodide() {
      try {
        setIsLoading(true);

        // Load pyodide from CDN
        const loadPyodide = (
          window as unknown as {
            loadPyodide: (config: {
              indexURL: string;
            }) => Promise<PyodideInterface>;
          }
        ).loadPyodide;

        const pyodide = await loadPyodide({
          indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/",
        });

        if (cancelled) return;

        // Setup stdout/stderr capture and filter warnings
        pyodide.runPythonAsync(`
import sys
import warnings
from io import StringIO

# Filter out SyntaxWarnings from third-party libraries
warnings.filterwarnings('ignore', category=SyntaxWarning)

class OutputCapture:
    def __init__(self, target):
        self.target = target

    def write(self, text):
        self.target.append(text)

    def flush(self):
        pass

stdout_capture = []
stderr_capture = []

sys.stdout = OutputCapture(stdout_capture)
sys.stderr = OutputCapture(stderr_capture)
`);

        // Load official packages if specified
        if (options?.packages?.official?.length) {
          await pyodide.loadPackage(options.packages.official);
        }

        // Install micropip packages if specified
        if (options?.packages?.micropip?.length) {
          await pyodide.loadPackage("micropip");
          const micropipCode = `
import micropip
await micropip.install(${JSON.stringify(options.packages.micropip)})
`;
          await pyodide.runPythonAsync(micropipCode);
        }

        if (cancelled) return;

        pyodideRef.current = pyodide;
        setIsReady(true);
        setIsLoading(false);
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load Pyodide:", error);
          setStderr(
            `Failed to load Pyodide: ${error instanceof Error ? error.message : String(error)}`,
          );
          setIsLoading(false);
        }
      }
    }

    loadPyodide();

    return () => {
      cancelled = true;
    };
  }, []); // Only load once, ignore options changes after initial load

  const runPython = useCallback(
    async (code: string) => {
      if (!pyodideRef.current || !isReady) {
        console.warn("Pyodide not ready");
        return;
      }

      setIsRunning(true);
      setStdout("");
      setStderr("");
      stdoutRef.current = [];
      stderrRef.current = [];

      try {
        const pyodide = pyodideRef.current;

        // Clear previous output captures
        await pyodide.runPythonAsync(`
stdout_capture.clear()
stderr_capture.clear()
`);

        // Run the user code
        await pyodide.runPythonAsync(code);

        // Get captured output
        const stdoutResult = await pyodide.runPythonAsync(
          "''.join(stdout_capture)",
        );
        const stderrResult = await pyodide.runPythonAsync(
          "''.join(stderr_capture)",
        );

        setStdout(String(stdoutResult || ""));
        setStderr(String(stderrResult || ""));
      } catch (error) {
        // Capture the error in stderr
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        setStderr(errorMessage);
      } finally {
        setIsRunning(false);
      }
    },
    [isReady],
  );

  return {
    runPython,
    stdout,
    stderr,
    isLoading,
    isRunning,
    isReady,
  };
}
