import React from "react";
import { createRoot, type Root } from "react-dom/client";

import { Obsidian } from "@/components/obsidian/obsidian";

type ObsidianElementProps = {
  title?: string;
  icon?: string;
  footer?: string;
  width?: number | string;
  height?: number | string;
  uiData?: unknown;
};

// Convert attribute values like "640" or "640px" into component-friendly props.
function parseDimension(value: string | null): number | string | undefined {
  if (value == null) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const maybeNumber = Number(trimmed);
  return Number.isNaN(maybeNumber) ? trimmed : maybeNumber;
}

function isScriptNode(node: Node): node is HTMLScriptElement {
  return node.nodeType === Node.ELEMENT_NODE &&
    (node as Element).tagName.toLowerCase() === "script";
}

const CUSTOM_ELEMENT_TAG = "obsidian-widget";
const LEGACY_ELEMENT_TAG = "obsidian";

class ObsidianElement extends HTMLElement {
  private root: Root | null = null;
  private container: HTMLDivElement | null = null;
  private observer?: MutationObserver;
  private inlineAttrCache?: { source: string; hasValue: true; value: unknown } | { source: string; hasValue: false };
  private inlineScriptCache?: { fingerprint: string; hasValue: true; value: unknown } | { fingerprint: string; hasValue: false };
  private fetchedUiData?: unknown;
  private fetchedReady = false;
  private fetchErrorLogged = false;
  private fetchController?: AbortController;

  static get observedAttributes(): string[] {
    return [
      "title",
      "icon",
      "footer",
      "width",
      "height",
      "ui-data",
      "ui-data-src",
    ];
  }

  connectedCallback(): void {
    this.ensureContainer();
    this.observeLightDom();
    const src = this.getAttribute("ui-data-src");
    if (src) {
      void this.fetchUiData(src);
    }
    this.renderObsidian();
  }

  disconnectedCallback(): void {
    this.observer?.disconnect();
    this.observer = undefined;
    this.fetchController?.abort();
    this.fetchController = undefined;
    if (this.root) {
      this.root.unmount();
      this.root = null;
    }
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (oldValue === newValue) return;

    if (name === "ui-data") {
      this.inlineAttrCache = undefined;
      this.renderObsidian();
      return;
    }

    if (name === "ui-data-src") {
      this.fetchController?.abort();
      this.fetchController = undefined;
      this.fetchedUiData = undefined;
      this.fetchedReady = false;
      this.fetchErrorLogged = false;
      if (newValue) {
        void this.fetchUiData(newValue);
      } else {
        this.renderObsidian();
      }
      return;
    }

    this.renderObsidian();
  }

  private ensureContainer(): void {
    if (this.container) return;
    this.container = document.createElement("div");
    this.container.className = "obsidian-widget-host";
    this.appendChild(this.container);
    this.root = createRoot(this.container);
  }

  private observeLightDom(): void {
    if (this.observer) return;
    this.observer = new MutationObserver((mutations) => {
      if (!this.container) return;
      const shouldUpdate = mutations.some((mutation) => {
        if (mutation.target === this.container || this.container.contains(mutation.target as Node)) {
          return false;
        }
        if (mutation.type === "attributes") {
          return true;
        }
        if (mutation.type === "characterData") {
          return true;
        }
        if (mutation.type === "childList") {
          const added = Array.from(mutation.addedNodes);
          const removed = Array.from(mutation.removedNodes);
          const touchesScript = [...added, ...removed].some((node) => isScriptNode(node));
          return touchesScript;
        }
        return false;
      });

      if (shouldUpdate) {
        this.inlineScriptCache = undefined;
        this.renderObsidian();
      }
    });

    this.observer.observe(this, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  private parseInlineAttribute(): { hasValue: boolean; value?: unknown } {
    const raw = this.getAttribute("ui-data");
    if (raw == null) {
      this.inlineAttrCache = undefined;
      return { hasValue: false };
    }

    if (this.inlineAttrCache && this.inlineAttrCache.source === raw) {
      return this.inlineAttrCache.hasValue
        ? { hasValue: true, value: this.inlineAttrCache.value }
        : { hasValue: false };
    }

    try {
      const parsed = JSON.parse(raw);
      this.inlineAttrCache = { source: raw, hasValue: true, value: parsed };
      return { hasValue: true, value: parsed };
    } catch (error) {
      if (!this.inlineAttrCache?.hasValue) {
        console.error("obsidian-widget: failed to parse ui-data attribute as JSON", error);
      }
      this.inlineAttrCache = { source: raw, hasValue: false };
      return { hasValue: false };
    }
  }

  private readInlineScript(): { hasValue: boolean; value?: unknown } {
    let script: HTMLScriptElement | null = null;
    const scripts = this.querySelectorAll('script[type="application/json"]');
    scripts.forEach((candidate) => {
      if (this.container && this.container.contains(candidate)) return;
      if (!script) script = candidate;
    });

    if (!script) {
      this.inlineScriptCache = undefined;
      return { hasValue: false };
    }

    const fingerprint = `${script.textContent ?? ""}::${script.getAttribute("src") ?? ""}`;
    if (this.inlineScriptCache && this.inlineScriptCache.fingerprint === fingerprint) {
      return this.inlineScriptCache.hasValue
        ? { hasValue: true, value: this.inlineScriptCache.value }
        : { hasValue: false };
    }

    if (script.src) {
      // External script nodes are ignored here; prefer ui-data-src instead.
      console.warn(
        "obsidian-widget: script[type=application/json] with src attribute is ignored; use ui-data-src instead."
      );
      this.inlineScriptCache = { fingerprint, hasValue: false };
      return { hasValue: false };
    }

    const content = script.textContent?.trim();
    if (!content) {
      this.inlineScriptCache = { fingerprint, hasValue: false };
      return { hasValue: false };
    }

    try {
      const parsed = JSON.parse(content);
      this.inlineScriptCache = { fingerprint, hasValue: true, value: parsed };
      return { hasValue: true, value: parsed };
    } catch (error) {
      if (!this.inlineScriptCache?.hasValue) {
        console.error("obsidian-widget: failed to parse JSON script payload", error);
      }
      this.inlineScriptCache = { fingerprint, hasValue: false };
      return { hasValue: false };
    }
  }

  private async fetchUiData(src: string): Promise<void> {
    const url = src.trim();
    if (!url) {
      this.fetchedUiData = undefined;
      this.fetchedReady = false;
      this.renderObsidian();
      return;
    }

    const controller = new AbortController();
    this.fetchController = controller;
    this.fetchedReady = false;
    this.fetchErrorLogged = false;
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }
      const data = await response.json();
      if (this.fetchController !== controller) return;
      this.fetchedUiData = data;
      this.fetchedReady = true;
      this.renderObsidian();
    } catch (error) {
      if (controller.signal.aborted) return;
      if (!this.fetchErrorLogged) {
        console.error("obsidian-widget: failed to fetch ui-data-src", error);
        this.fetchErrorLogged = true;
      }
      this.fetchedUiData = undefined;
      this.fetchedReady = false;
      this.renderObsidian();
    } finally {
      if (this.fetchController === controller) {
        this.fetchController = undefined;
      }
    }
  }

  private collectProps(): ObsidianElementProps {
    const title = this.getAttribute("title") ?? "Obsidian";
    const icon = this.getAttribute("icon") ?? undefined;
    const footer = this.getAttribute("footer") ?? undefined;
    const width = parseDimension(this.getAttribute("width"));
    const height = parseDimension(this.getAttribute("height"));

    const inlineAttr = this.parseInlineAttribute();
    if (inlineAttr.hasValue) {
      return { title, icon, footer, width, height, uiData: inlineAttr.value };
    }

    const scriptData = this.readInlineScript();
    if (scriptData.hasValue) {
      return { title, icon, footer, width, height, uiData: scriptData.value };
    }

    if (this.fetchedReady) {
      return { title, icon, footer, width, height, uiData: this.fetchedUiData };
    }

    return { title, icon, footer, width, height };
  }

  private renderObsidian(): void {
    this.ensureContainer();
    if (!this.root) return;

    const props = this.collectProps();
    this.root.render(
      <React.StrictMode>
        <Obsidian
          title={props.title ?? "Obsidian"}
          icon={props.icon}
          footer={props.footer ?? ""}
          width={props.width}
          height={props.height}
          uiData={props.uiData}
        />
      </React.StrictMode>
    );
  }
}

if (!customElements.get(CUSTOM_ELEMENT_TAG)) {
  customElements.define(CUSTOM_ELEMENT_TAG, ObsidianElement);
}

type QueryableParent = ParentNode & {
  querySelectorAll?: (selectors: string) => NodeListOf<Element>;
};

function isQueryable(node: ParentNode): node is QueryableParent {
  return typeof (node as QueryableParent).querySelectorAll === "function";
}

function upgradeAliasElement(element: HTMLElement): void {
  if (element.tagName.toLowerCase() !== LEGACY_ELEMENT_TAG) return;
  const replacement = document.createElement(CUSTOM_ELEMENT_TAG);
  Array.from(element.attributes).forEach(({ name, value }) => {
    replacement.setAttribute(name, value);
  });
  while (element.firstChild) {
    replacement.appendChild(element.firstChild);
  }
  element.replaceWith(replacement);
}

function upgradeAliasTree(root: ParentNode): void {
  if (root instanceof HTMLElement && root.tagName.toLowerCase() === LEGACY_ELEMENT_TAG) {
    upgradeAliasElement(root);
    return;
  }

  if (isQueryable(root)) {
    root.querySelectorAll?.(LEGACY_ELEMENT_TAG).forEach((node) => {
      if (node instanceof HTMLElement) {
        upgradeAliasElement(node);
      }
    });
  }
}

let aliasObserver: MutationObserver | undefined;

function setupAliasUpgrade(): void {
  upgradeAliasTree(document);
  if (aliasObserver) return;

  aliasObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof HTMLElement || node instanceof DocumentFragment) {
          upgradeAliasTree(node);
        }
      });
    });
  });

  aliasObserver.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => setupAliasUpgrade(), {
      once: true,
    });
  } else {
    setupAliasUpgrade();
  }
}
