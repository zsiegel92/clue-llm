import * as fs from "node:fs/promises";
import path from "node:path";
import * as toml from "toml";
import { z } from "zod";
import { PythonProvidedStaticCodeBlock } from "@/components/python-provided";

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
