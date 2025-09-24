"use client";

import { CheckIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useUIValue } from "../UIStateProvider";

export default function Toggle({
  text,
  checked,
  risky,
  stateKey,
}: {
  text: string;
  checked: boolean;
  risky: boolean;
  stateKey?: string;
}) {
  const [externalChecked, setExternalChecked] = useUIValue<boolean | undefined>(
    stateKey,
    undefined
  );
  const [isChecked, setChecked] = useState<boolean>(
    (externalChecked as boolean | undefined) ?? checked
  );

  useEffect(() => {
    if (!stateKey) return;
    const v = externalChecked;
    if (typeof v === "boolean") setChecked(v);
  }, [externalChecked, stateKey]);

  return (
    <div
      className="relative gap-2"
      onClick={(e) => {
        e.preventDefault();
        const next = !isChecked;
        setChecked(next);
        if (stateKey) setExternalChecked(next);
      }}
    >
      <button
        type="button"
        className="absolute left-0 w-[22px] h-[22px] rounded-[3px] bg-[rgb(25,25,25)] hover:bg-[rgb(35,35,35)] border-[rgb(40,40,40)] border"
      >
        <CheckIcon
          className={`w-[16px] h-[16px] m-[2px] transition-opacity stroke-white`}
          style={{ opacity: isChecked == true ? 1 : 0 }}
        />
      </button>

      <span
        className={`ml-[28px] text-left block text-sm select-none transition-opacity`}
        style={{
          opacity: isChecked == true ? 0.8 : 0.6,
          color: risky ? "var(--color-red-500)" : "var(--color-white)",
        }}
      >
        {text}
      </span>
    </div>
  );
}
