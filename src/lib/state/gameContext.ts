import { getContext, setContext } from 'svelte';
import type { GameStore } from './gameStore.svelte';

const KEY = Symbol('game-store');

export function provideGame(store: GameStore) {
	setContext(KEY, store);
}

export function useGame(): GameStore {
	const store = getContext<GameStore>(KEY);
	if (!store) throw new Error('GameStore not provided in context');
	return store;
}
