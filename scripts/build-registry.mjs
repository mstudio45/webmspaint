let BaseRegistryOption = {
  "$schema": "https://ui.shadcn.com/schema/registry.json",
  "name": "Obsidian",
  "homepage": "https://www.mspaint.cc/",
  "items": [
    {
      "name": "obsidian",
      "type": "registry:ui",
      "title": "Obsidian",
      "description": "A fully interactive clone of the popular UI Library Obsidian for Next.js, React and TailwindCSS.",
      "registryDependencies": ["tabs"],
      "dependencies": [
        "dompurify"
      ],
      "css": {
        "@utility scrollbar-none": {
          "scrollbar-none": {
            "-ms-overflow-style": "none",
            "scrollbar-width": "none",
            "&::-webkit-scrollbar": {
              "width": "0px",
              "height": "0px",
              "display": "none"
            }
          }
        }
      },
      "files": []
    },
    {
      "name": "obsidian-demo",
      "type": "registry:page",
      "title": "Obsidian Demo",
      "description": "A fully responsive demo of obsidian",
      "registryDependencies": ["https://www.mspaint.cc/r/obsidian"],
      "dependencies": [],
      "files": [
        {
          "path": "registry/obsidian-demo/page.tsx",
          "type": "registry:page",
          "target": "app/obsidian-demo/page.tsx"
        },
        {
          "path": "registry/obsidian-demo/ObsidianExtracted.json",
          "type": "registry:file",
          "target": "app/obsidian-demo/ObsidianExtracted.json"
        }
      ]
    }
  ]
}

import fs from "fs";
import path from "path";

const registryPath = path.join(process.cwd(), "registry.json");

// Obsidian Component
const componentsPath = path.join(process.cwd(), "src", "components", "obsidian");
const componentFiles = fs.readdirSync(componentsPath, {
    recursive: true
});

let DetectedFiles = 0;
componentFiles.forEach((file) => {
    const filePath = path.join(componentsPath, file);
    const relativePath = path.relative(path.join(process.cwd(), "src"), filePath).replace(/\\/g, "/");

    // check if the file is a directory
    if (fs.lstatSync(filePath).isDirectory()) {
        return;
    }

    // Add the file to the registry.json
    BaseRegistryOption.items[0].files.push({
        "path": `src/components/obsidian/${file}`,
        "type": "registry:ui",
        "target": relativePath
    });
    DetectedFiles++;
});

// Write the registry.json file
fs.writeFileSync(registryPath, JSON.stringify(BaseRegistryOption, null, 2));
console.log(`Registry written to ${registryPath} with ${DetectedFiles} files.`);
