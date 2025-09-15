"use client";

import React from "react";
import type { ReactNode } from "react";

import type {
  UIData,
  TabData,
  GroupboxData,
  UIElement,
  Color3,
  Vector2,
} from "./element.types";
import { UIStateProvider } from "./UIStateProvider";
import { ObsidianWindow } from "./Window";

// Root wrapper props
type ObsidianWrapperProps = {
  title: ReactNode | string;
  icon?: ReactNode | string;
  footer: ReactNode | string;
  uiData?: unknown;
  children?: ReactNode;
  width?: number | string;
  height?: number | string;
};

// DSL component prop types
export type ObsidianTabProps = {
  name: string;
  order?: number;
  icon?: string;
  children?: ReactNode;
};

export type ObsidianSideProps = { children?: ReactNode };

export type ObsidianGroupboxProps = {
  name: string;
  order?: number;
  children?: ReactNode;
};

export type OToggleProps = {
  text: string;
  defaultChecked?: boolean;
  risky?: boolean;
  visible?: boolean;
  disabled?: boolean;
};

export type OLabelProps = {
  text: string;
  doesWrap?: boolean;
  visible?: boolean;
  disabled?: boolean;
};

export type OButtonProps = {
  text: string;
  visible?: boolean;
  disabled?: boolean;
  subButtonText?: string;
};

export type ODropdownProps = {
  text: string;
  value?: string | { [key: string]: boolean };
  options: string[];
  disabledValues?: string[];
  multi?: boolean;
  visible?: boolean;
  disabled?: boolean;
};

export type OSliderProps = {
  text: string;
  value?: number;
  min?: number;
  max?: number;
  compact?: boolean;
  rounding?: number;
  prefix?: string;
  suffix?: string;
  visible?: boolean;
  disabled?: boolean;
};

export type OInputProps = {
  text: string;
  value?: string;
  placeholder?: string;
  visible?: boolean;
  disabled?: boolean;
};

export type ODividerProps = {
  visible?: boolean;
  disabled?: boolean;
};

export type OImageProps = {
  text?: string;
  image: string;
  color?: Color3;
  rectOffset?: Vector2;
  rectSize?: Vector2;
  height?: number;
  scaleType?: string;
  transparency?: number;
  visible?: boolean;
  disabled?: boolean;
};

export type TabWarningProps = {
  visible?: boolean;
  title?: string;
  text?: string;
  isNormal?: boolean;
  lockSize?: boolean;
};

// DSL marker components (return null; used only for structure parsing)
const TAGS = {
  Tab: "obsidian-tab",
  Left: "obsidian-left",
  Right: "obsidian-right",
  Groupbox: "obsidian-groupbox",
  Toggle: "obsidian-toggle",
  Label: "obsidian-label",
  Button: "obsidian-button",
  Dropdown: "obsidian-dropdown",
  Slider: "obsidian-slider",
  Input: "obsidian-input",
  Divider: "obsidian-divider",
  Image: "obsidian-image",
  TabWarning: "obsidian-tabwarning",
} as const;

export const ObsidianTab: any = TAGS.Tab;

export const ObsidianLeft: any = TAGS.Left;

export const ObsidianRight: any = TAGS.Right;

export const ObsidianGroupbox: any = TAGS.Groupbox;

export const OToggle: any = TAGS.Toggle;

export const OLabel: any = TAGS.Label;

// Long-form aliases for convenience in pages
export { OLabel as ObsidianLabel };
export { OToggle as ObsidianToggle };
export { OButton as ObsidianButton };
export { ODropdown as ObsidianDropdown };
export { OSlider as ObsidianSlider };
export { OInput as ObsidianInput };
export { ODivider as ObsidianDivider };
export { OImage as ObsidianImage };

export const OButton: any = TAGS.Button;

export const ODropdown: any = TAGS.Dropdown;

export const OSlider: any = TAGS.Slider;

export const OInput: any = TAGS.Input;

export const ODivider: any = TAGS.Divider;

export const OImage: any = TAGS.Image;

export const TabWarning: any = TAGS.TabWarning;

export { TabWarning as ObsidianTabWarning };

// Parsing helpers
const MARK = "__obsidianType";
function isTag(node: ReactNode, tag: string): node is React.ReactElement<any> {
  return !!(node && typeof node === "object" && (node as any).type === tag);
}
function getExportNameFromClientRef(ref: any): string | undefined {
  // Next.js client references often have an $$id like "path/to/file.tsx#ExportName"
  const id = ref && typeof ref.$$id === "string" ? ref.$$id : undefined;
  if (!id) return undefined;
  const hash = id.lastIndexOf("#");
  return hash >= 0 ? id.slice(hash + 1) : undefined;
}

function getTypeName(t: any): string | undefined {
  return (
    t?.displayName ||
    t?.name ||
    t?._name ||
    t?.render?.displayName ||
    t?.render?.name ||
    getExportNameFromClientRef(t)
  );
}

function isElementOfType<T>(
  node: ReactNode,
  cmp: (props: T) => React.ReactElement | null
): node is React.ReactElement<T> {
  if (!node || typeof node !== "object" || !("type" in (node as any)))
    return false;
  const t = (node as any).type as any;
  if (t === cmp) return true;

  const tName = getTypeName(t);
  const cName = getTypeName(cmp);

  if (!tName || !cName) return false;

  // Allow matching "Obsidian.Tab" to "ObsidianTab" and vice versa.
  const normalize = (s: string) => s.replace(/\./g, "");
  return normalize(tName) === normalize(cName);
}

function isMarker(
  node: ReactNode,
  type: string
): node is React.ReactElement<any> {
  return !!(
    node &&
    typeof node === "object" &&
    (node as any)?.props &&
    (node as any).props[MARK] === type
  );
}

function parseElements(
  children: ReactNode,
  startIndex = 0
): { elements: UIElement[]; lastIndex: number } {
  const elements: UIElement[] = [];
  let idx = startIndex;

  React.Children.forEach(children, (child) => {
    if (
      isElementOfType(child, OToggle) ||
      isMarker(child, "Toggle") ||
      isTag(child, TAGS.Toggle)
    ) {
      const p = child.props as OToggleProps;
      elements.push({
        index: idx++,
        visible: p.visible ?? true,
        type: "Toggle",
        text: p.text,
        disabled: p.disabled ?? false,
        value: p.defaultChecked ?? false,
        properties: { risky: p.risky ?? false },
      } as unknown as UIElement);
      return;
    }
    if (
      isElementOfType(child, OLabel) ||
      isMarker(child, "Label") ||
      isTag(child, TAGS.Label)
    ) {
      const p = child.props as OLabelProps;
      elements.push({
        index: idx++,
        visible: p.visible ?? true,
        type: "Label",
        text: p.text,
        disabled: p.disabled ?? false,
        properties: { doesWrap: p.doesWrap ?? false },
      } as unknown as UIElement);
      return;
    }
    if (
      isElementOfType(child, OButton) ||
      isMarker(child, "Button") ||
      isTag(child, TAGS.Button)
    ) {
      const p = child.props as OButtonProps;
      elements.push({
        index: idx++,
        visible: p.visible ?? true,
        type: "Button",
        text: p.text,
        disabled: p.disabled ?? false,
        subButton: p.subButtonText ? { text: p.subButtonText } : undefined,
      } as unknown as UIElement);
      return;
    }
    if (
      isElementOfType(child, ODropdown) ||
      isMarker(child, "Dropdown") ||
      isTag(child, TAGS.Dropdown)
    ) {
      const p = child.props as ODropdownProps;
      elements.push({
        index: idx++,
        visible: p.visible ?? true,
        type: "Dropdown",
        text: p.text,
        disabled: p.disabled ?? false,
        value: p.value ?? (p.multi ? {} : p.options?.[0] ?? ""),
        properties: {
          values: p.options ?? [],
          disabledValues: p.disabledValues ?? [],
          multi: p.multi ?? false,
        },
      } as unknown as UIElement);
      return;
    }
    if (
      isElementOfType(child, OSlider) ||
      isMarker(child, "Slider") ||
      isTag(child, TAGS.Slider)
    ) {
      const p = child.props as OSliderProps;
      const min = p.min ?? 0;
      const max = p.max ?? 100;
      elements.push({
        index: idx++,
        visible: p.visible ?? true,
        type: "Slider",
        text: p.text,
        disabled: p.disabled ?? false,
        value: p.value ?? min,
        properties: {
          min,
          max,
          compact: p.compact,
          rounding: p.rounding,
          prefix: p.prefix ?? "",
          suffix: p.suffix ?? "",
        },
      } as unknown as UIElement);
      return;
    }
    if (
      isElementOfType(child, OInput) ||
      isMarker(child, "Input") ||
      isTag(child, TAGS.Input)
    ) {
      const p = child.props as OInputProps;
      elements.push({
        index: idx++,
        visible: p.visible ?? true,
        type: "Input",
        text: p.text,
        disabled: p.disabled ?? false,
        value: p.value ?? "",
        properties: {
          placeholder: p.placeholder ?? "",
          finished: false,
          emptyReset: "",
          numeric: false,
          clearTextOnFocus: false,
          allowEmpty: true,
        },
      } as unknown as UIElement);
      return;
    }
    if (
      isElementOfType(child, ODivider) ||
      isMarker(child, "Divider") ||
      isTag(child, TAGS.Divider)
    ) {
      const p = child.props as ODividerProps;
      elements.push({
        index: idx++,
        visible: p.visible ?? true,
        type: "Divider",
        text: "",
        disabled: p.disabled ?? false,
        properties: {},
      } as unknown as UIElement);
      return;
    }
    if (
      isElementOfType(child, OImage) ||
      isMarker(child, "Image") ||
      isTag(child, TAGS.Image)
    ) {
      const p = child.props as OImageProps;
      elements.push({
        index: idx++,
        visible: p.visible ?? true,
        type: "Image",
        text: p.text ?? "",
        disabled: p.disabled ?? false,
        properties: {
          image: p.image,
          color: p.color ?? { r: 255, g: 255, b: 255 },
          rectOffset: p.rectOffset ?? { x: 0, y: 0 },
          rectSize: p.rectSize ?? { x: 0, y: 0 },
          height: p.height ?? 30,
          scaleType: p.scaleType ?? "Fit",
          transparency: p.transparency ?? 1,
        },
      } as unknown as UIElement);
      return;
    }
  });

  return { elements, lastIndex: idx };
}

function parseGroupboxes(children: ReactNode): {
  byName: { [key: string]: GroupboxData };
} {
  const out: { [key: string]: GroupboxData } = {};
  let globalIndex = 0;

  React.Children.forEach(children, (child) => {
    if (
      !isElementOfType(child, ObsidianGroupbox) &&
      !isMarker(child, "Groupbox") &&
      !isTag(child, TAGS.Groupbox)
    )
      return;
    const p = child.props as ObsidianGroupboxProps;

    const { elements } = parseElements(p.children, 0);
    const gb: GroupboxData = {
      name: p.name,
      order: p.order ?? 0,
      side: "Unknown",
      elements: elements.map((el) => ({
        ...el,
        index: globalIndex++,
      })) as unknown as UIElement[],
    };
    out[p.name] = gb;
  });

  return { byName: out };
}

function parseTabs(children: ReactNode): UIData {
  const tabs: { [key: string]: TabData } = {};

  React.Children.forEach(children, (child) => {
    if (
      !isElementOfType(child, ObsidianTab) &&
      !isMarker(child, "Tab") &&
      !isTag(child, TAGS.Tab)
    )
      return;
    const p = child.props as ObsidianTabProps;

    const leftNode = React.Children.toArray(p.children).find(
      (c) =>
        isElementOfType(c, ObsidianLeft) ||
        isMarker(c, "Left") ||
        isTag(c, TAGS.Left)
    ) as React.ReactElement | undefined;
    const rightNode = React.Children.toArray(p.children).find(
      (c) =>
        isElementOfType(c, ObsidianRight) ||
        isMarker(c, "Right") ||
        isTag(c, TAGS.Right)
    ) as React.ReactElement | undefined;
    const warningNode = React.Children.toArray(p.children).find(
      (c) =>
        isElementOfType(c, TabWarning) ||
        isMarker(c, "TabWarning") ||
        isTag(c, TAGS.TabWarning)
    ) as React.ReactElement | undefined;

    const left = leftNode
      ? parseGroupboxes(
          (leftNode.props as { children?: React.ReactNode }).children
        )
      : { byName: {} };
    const right = rightNode
      ? parseGroupboxes(
          (rightNode.props as { children?: React.ReactNode }).children
        )
      : { byName: {} };

    const tabData: TabData = {
      name: p.name,
      type: "Tab",
      icon: p.icon ?? "",
      order: p.order ?? 0,
      tabboxes: { Left: [], Right: [], Unknown: [] },
      groupboxes: {
        Left: left.byName,
        Right: right.byName,
        Unknown: {},
      },
      warningBox: {
        Visible: (warningNode?.props as TabWarningProps)?.visible ?? false,
        Title: (warningNode?.props as TabWarningProps)?.title ?? "",
        IsNormal: (warningNode?.props as TabWarningProps)?.isNormal ?? true,
        Text: (warningNode?.props as TabWarningProps)?.text ?? "",
        LockSize: (warningNode?.props as TabWarningProps)?.lockSize ?? false,
      },
    };

    tabs[p.name] = tabData;
  });

  return { tabs } as UIData;
}

function buildUIData(children?: ReactNode): UIData | undefined {
  if (!children) return undefined;
  return parseTabs(children);
}

// Accepts a variety of shapes and normalizes into UIData
function normalizeUIData(data: unknown): UIData | undefined {
  if (!data || typeof data !== "object") return undefined;
  const anyData = data as any;
  const tabsSrc =
    anyData.tabs && typeof anyData.tabs === "object" ? anyData.tabs : undefined;
  if (!tabsSrc) return undefined;

  const outTabs: Record<string, TabData> = {};
  for (const [name, raw] of Object.entries<any>(tabsSrc)) {
    if (!raw || typeof raw !== "object") continue;

    const normalizeGroupSide = (side: any): { [key: string]: GroupboxData } => {
      if (!side) return {};
      if (Array.isArray(side)) {
        const acc: { [key: string]: GroupboxData } = {};
        for (const gb of side) {
          if (gb && gb.name) acc[String(gb.name)] = gb as GroupboxData;
        }
        return acc;
      }
      if (typeof side === "object")
        return side as { [key: string]: GroupboxData };
      return {};
    };

    const normalizeTabSide = (side: any): any[] => {
      if (!side) return [];
      if (Array.isArray(side)) return side as any[];
      if (typeof side === "object") return Object.values(side as Record<string, any>);
      return [];
    };

    const tabboxes = raw.tabboxes ?? { Left: [], Right: [], Unknown: [] };
    const groupboxes = raw.groupboxes ?? { Left: {}, Right: {}, Unknown: {} };

    outTabs[name] = {
      name: raw.name ?? name,
      type: raw.type ?? "Tab",
      icon: raw.icon ?? "",
      order: Number(raw.order ?? 0),
      tabboxes: {
        Left: normalizeTabSide(tabboxes.Left),
        Right: normalizeTabSide(tabboxes.Right),
        Unknown: normalizeTabSide(tabboxes.Unknown),
      },
      groupboxes: {
        Left: normalizeGroupSide(groupboxes.Left),
        Right: normalizeGroupSide(groupboxes.Right),
        Unknown: normalizeGroupSide(groupboxes.Unknown),
      },
      warningBox: {
        Visible: Boolean(raw.warningBox?.Visible ?? false),
        Title: String(raw.warningBox?.Title ?? ""),
        IsNormal: Boolean(raw.warningBox?.IsNormal ?? true),
        Text: String(raw.warningBox?.Text ?? ""),
        LockSize: Boolean(raw.warningBox?.LockSize ?? false),
      },
    } as TabData;
  }

  return { tabs: outTabs } as UIData;
}

export function Obsidian({
  title,
  icon,
  footer,
  uiData,
  children,
  width,
  height,
}: ObsidianWrapperProps) {
  const data = React.useMemo(() => {
    const fromChildren = buildUIData(children);
    const fromProp = normalizeUIData(uiData);
    return fromProp ?? fromChildren;
  }, [uiData, children]);

  return (
    <UIStateProvider>
      <ObsidianWindow
        title={title}
        icon={icon}
        footer={footer}
        uiData={data}
        width={width}
        height={height}
      />
    </UIStateProvider>
  );
}
