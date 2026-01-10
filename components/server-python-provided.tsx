import * as toml from "toml";
import * as fs from "fs/promises";
import path from "path";
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
}: {
  filePath: string;
}) {
  const code = await fs.readFile(filePath, "utf8");
  const fileName = path.basename(filePath);
  const dependencies = await fs
    .readFile("pyproject.toml", "utf8")
    .then((configString) =>
      pyProjectSchema
        .parse(toml.parse(configString))
        .project.dependencies.map(stripVersion)
    );
  return (
    <PythonProvidedStaticCodeBlock
      code={code}
      fileName={fileName}
      dependencies={dependencies}
    />
  );
}
