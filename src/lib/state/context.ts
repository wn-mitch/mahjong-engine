import { getContext, setContext } from 'svelte';
import type { PositionStore } from './positionStore.svelte';

const KEY = Symbol('position-store');

export function provideStore(store: PositionStore) {
	setContext(KEY, store);
}

export function useStore(): PositionStore {
	const store = getContext<PositionStore>(KEY);
	if (!store) throw new Error('PositionStore not provided in context');
	return store;
}
