import { useMemo } from "react";
import { Obsidian } from "@/components/obsidian/obsidian";
import UIData from "./ObsidianExtracted.json";

export default function DemoObsidian() {
  const memoizedObsidian = useMemo(
    () => (
      <Obsidian
        title="mspaint"
        icon="/mspaint.png"
        footer="version: example"
        uiData={UIData}
      />
    ),
    []
  );

  return (
    <div className="w-screen h-screen flex justify-center items-center">
      <div className="max-w-[720px] max-h-[600px] scale-[0.8] max-sm:scale-[0.5] md:scale-90 lg:scale-100">
        {memoizedObsidian}
      </div>
    </div>
  );
}
