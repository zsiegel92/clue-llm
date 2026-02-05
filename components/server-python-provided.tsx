import * as fs from "node:fs/promises";
import path from "node:path";
import * as toml from "toml";
import { z } from "zod";
import {
  PythonProvidedStaticCodeBlock,
  PythonProvidedStaticMultiFileCodeBlock,
} from "@/components/python-provided";
import type { CodeFile } from "@/components/static-multi-file-code-block";

const pyProjectSchema = z.object({
  project: z.object({
    dependencies: z.array(z.string()),
  }),
});

function stripVersion(dependency: string): string {
  return dependency.split(">")[0]?.split("<")[0]?.split("=")[0] ?? dependency;
}

export async function ServerPythonProvidedStaticCodeBlock({
  filePath,
  maxCodeLinesHeight,
  maxOutputLinesHeight,
}: {
  filePath: string;
  maxCodeLinesHeight?: number;
  maxOutputLinesHeight?: number;
}) {
  const code = await fs.readFile(filePath, "utf8");
  const fileName = path.basename(filePath);
  const dependencies = await fs
    .readFile("pyproject.toml", "utf8")
    .then((configString) =>
      pyProjectSchema
        .parse(toml.parse(configString))
        .project.dependencies.map(stripVersion),
    );
  return (
    <PythonProvidedStaticCodeBlock
      code={code}
      fileName={fileName}
      dependencies={dependencies}
      maxCodeLinesHeight={maxCodeLinesHeight}
      maxOutputLinesHeight={maxOutputLinesHeight}
    />
  );
}

export async function ServerPythonProvidedStaticMultiFileCodeBlock({
  filePaths,
  entrypointPath,
  maxCodeLinesHeight,
  maxOutputLinesHeight,
}: {
  filePaths: string[];
  entrypointPath: string;
  maxCodeLinesHeight?: number;
  maxOutputLinesHeight?: number;
}) {
  const files: CodeFile[] = await Promise.all(
    filePaths.map(async (filePath) => {
      let content = await fs.readFile(filePath, "utf8");
      const name = filePath.replace(/^python-scripts\//, "");

      // Special handling for single_token_strings.py to work in pyodide
      if (name === "single_token_strings.py") {
        // Replace the Path(__file__).parent.parent approach with a simple relative path
        content = content.replace(
          /json_path = Path\(__file__\)\.parent\.parent \/ "lib" \/ "single-token-strings\.json"/,
          'json_path = Path("lib/single-token-strings.json")',
        );
      }

      return {
        name,
        content,
        isEntrypoint: filePath === entrypointPath,
      };
    }),
  );

  const dependencies = await fs
    .readFile("pyproject.toml", "utf8")
    .then((configString) =>
      pyProjectSchema
        .parse(toml.parse(configString))
        .project.dependencies.map(stripVersion),
    );

  return (
    <PythonProvidedStaticMultiFileCodeBlock
      files={files}
      dependencies={dependencies}
      maxCodeLinesHeight={maxCodeLinesHeight}
      maxOutputLinesHeight={maxOutputLinesHeight}
    />
  );
}
