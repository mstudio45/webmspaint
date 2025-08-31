"use client";

import React from "react";
import type { ReactNode } from "react";

type UIState = Record<string, unknown>;

type UIStateContextType = {
	state: UIState;
	setState: (key: string, value: unknown) => void;
	resetState: (prefix?: string) => void;
	subscribe: (key: string, callback: () => void) => () => void;
	get: (key: string) => unknown;
};

const UIStateContext = React.createContext<UIStateContextType | null>(null);

export function UIStateProvider({ children }: { children: ReactNode }) {
	const [state, setStateMap] = React.useState<UIState>({});
	const stateRef = React.useRef<UIState>({});

	const listenersRef = React.useRef<Map<string, Set<() => void>>>(new Map());
	const notify = React.useCallback((key: string) => {
		const set = listenersRef.current.get(key);
		if (!set) return;
		for (const cb of Array.from(set)) {
			try { cb(); } catch {}
		}
	}, []);

	const setState = React.useCallback((key: string, value: unknown) => {
		const next = { ...stateRef.current, [key]: value };
		stateRef.current = next;
		setStateMap(next);
		notify(key);
	}, [notify]);

	const resetState = React.useCallback((prefix?: string) => {
		if (!prefix) {
			// notify all keys //
			stateRef.current = {};
			setStateMap({});
			for (const key of listenersRef.current.keys()) notify(key);
			return;
		}

		const prev = stateRef.current;
		const next: UIState = {};
		for (const [k, v] of Object.entries(prev)) {
			if (!k.startsWith(prefix)) next[k] = v;
		}

		// notify keys under the prefix //
		stateRef.current = next;
		setStateMap(next);
		for (const key of listenersRef.current.keys()) {
			if (key.startsWith(prefix)) notify(key);
		}
	}, [notify]);

	const subscribe = React.useCallback((key: string, callback: () => void) => {
		let set = listenersRef.current.get(key);
		if (!set) {
			set = new Set();
			listenersRef.current.set(key, set);
		}
		set.add(callback);
		return () => {
			set?.delete(callback);
			if (set && set.size === 0) listenersRef.current.delete(key);
		};
	}, []);

	const get = React.useCallback((key: string) => stateRef.current[key], []);

	return (
		<UIStateContext.Provider value={{ state, setState, resetState, subscribe, get }}>
			{children}
		</UIStateContext.Provider>
	);
}

export function useUIState() {
	const ctx = React.useContext(UIStateContext);
	if (!ctx) throw new Error("useUIState must be used within UIStateProvider");
	return ctx;
}

export function useResetUIState() {
	const { resetState } = useUIState();
	return resetState;
}

export function useUIValue<T = unknown>(key: string | undefined, initialValue?: T): [T | undefined, (value: T) => void] {
	const ctx = React.useContext(UIStateContext);
	if (!ctx) throw new Error("useUIValue must be used within UIStateProvider");

	const { setState, subscribe, get } = ctx;

	const getSnapshot = React.useCallback(() => {
		if (!key) return initialValue as T | undefined;
		return (get(key) as T | undefined) ?? (initialValue as T | undefined);
	}, [get, key, initialValue]);

	const getServerSnapshot = React.useCallback(() => initialValue as T | undefined, [initialValue]);

	const subscribeKey = React.useCallback((onStoreChange: () => void) => {
		if (!key) return () => {};
		return subscribe(key, onStoreChange);
	}, [subscribe, key]);

	const value = React.useSyncExternalStore(
		subscribeKey,
		getSnapshot as unknown as () => T | undefined,
		getServerSnapshot as unknown as () => T | undefined
	);

	const set = React.useCallback((v: T) => {
		if (!key) return;
		setState(key, v);
	}, [setState, key]);

	return [value, set];
}

export function useUIColor(key: string | undefined, initialColor?: { r: number; g: number; b: number }) {
	return useUIValue<{ r: number; g: number; b: number }>(key, initialColor);
}

export function useUIString(key: string | undefined, initialValue?: string) {
	return useUIValue<string>(key, initialValue);
}