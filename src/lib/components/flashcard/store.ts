import { writable } from 'svelte/store';
import type { Word } from '$lib/server/db';

export const words = writable<Word[]>([]);
