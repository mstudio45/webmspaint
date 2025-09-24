import type { CSSProperties } from "react";

type FontOptions = {
  subsets?: string[];
  weight?: string[] | string;
  variable?: string;
};

type FontResult = {
  className: string;
  variable?: string;
  style: CSSProperties;
};

function createFontShim(name: string, fallbackFamily: string) {
  const fallbackClass = `font-${name}`.replace(/[^a-z0-9-_]/gi, "-");
  return function fontShim(options: FontOptions = {}): FontResult {
    const variable = options.variable;
    const className = variable ? variable.replace(/^--/, "") : fallbackClass;
    return {
      className,
      variable,
      style: { fontFamily: fallbackFamily },
    };
  };
}

export const IBM_Plex_Mono = createFontShim("ibm-plex-mono", '"IBM Plex Mono", monospace');
