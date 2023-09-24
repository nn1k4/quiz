// use-shared-store.ts
// implemented sveltekit store best practices
// readme: https://dev.to/jdgamble555/the-correct-way-to-use-stores-in-sveltekit-3h6i

import { getContext, hasContext, setContext } from "svelte";
import { writable, type Writable } from "svelte/store";
import type { Word } from '$lib/server/db'; // Импортируйте ваш тип Word

// Задаём тип для ArrayCursor прямо здесь, если он ещё не был определён
export class ArrayCursor {
  array: Word[];
  index: number;

  constructor(arr: Word[]) {
    this.array = arr;
    this.index = 0;
  }

  next() {
    if (this.index < this.array.length - 1) {
      this.index++;
    }
    return this.current();
  }

  prev() {
    if (this.index > 0) {
      this.index--;
    }
    return this.current();
  }

  current() {
    return this.array[this.index];
  }

  reset() {
    this.index = 0;
  }
}

// ------------------------------------Время

// Writable стор для текущего UTC времени
export const currentTime: Writable<number> = writable(Math.floor(Date.now() / 1000));

// Функция для обновления текущего UTC времени каждую секунду
// SQLITE: SELECT strftime('%s', 'now');
export function updateCurrentTime() {
  const intervalId = setInterval(() => {
    currentTime.set(Math.floor(Date.now() / 1000));
  }, 1000);
  return () => clearInterval(intervalId); // функция для остановки интервала
}

// Функция для преобразования Unix epoch в формат datetime
// SQLITE:  SELECT datetime('now', 'localtime');
export function convertToDatetime(unixepochTime: number): string {
  const datetime = new Date(unixepochTime * 1000);
  return datetime.toLocaleString('lv-LV', {   
  // day: "numeric",
  // month: "long",
  // year: "numeric",
  // weekday: "long",
  // hour: "numeric",
  // minute: "numeric",
  // second: "numeric",
  // timeZoneName: "short",
  hour12: false, timeZone: 'Europe/Riga' });
}



// ------------------------------------Время


// Функции для управления курсором
export function moveToNext(cursorStore: Writable<ArrayCursor>) {
  cursorStore.update(store => {
    if (store) {
      store.next();
    }
    return store;
  });
}

export function moveToPrev(cursorStore: Writable<ArrayCursor>) {
  cursorStore.update(store => {
    if (store) {
      store.prev();
    }
    return store;
  });
}

export function resetCursor(cursorStore: Writable<ArrayCursor>) {
  cursorStore.update(store => {
    if (store) {
      store.reset();
    }
    return store;
  });
}

// Явное указание типа для cursorStore
export const useArrayCursor = (initialArray: Word[]): Writable<ArrayCursor> => {
  const storeName = 'arrayCursor';

  if (hasContext(storeName)) {
    return getContext<Writable<ArrayCursor>>(storeName);
  }

  const cursor = new ArrayCursor(initialArray);
  const cursorStore: Writable<ArrayCursor> = writable(cursor);

  setContext(storeName, cursorStore);
  return cursorStore;
};