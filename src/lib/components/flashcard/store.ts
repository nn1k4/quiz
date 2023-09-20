import { writable, type Writable } from 'svelte/store';
import type { Word } from '$lib/server/db';

class ArrayCursor {
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

  let cursor: ArrayCursor | null = null;

  export const cursorStore: Writable<ArrayCursor | null> = writable<ArrayCursor | null>(null);
  
  export function setInitialArray(initialArray: Word[]) {
    cursor = new ArrayCursor(initialArray);
    cursorStore.set(cursor);
  }

// Для изменения состояния курсора из компонентов
export function moveToNext() {
    cursorStore.update(store => {
      if (store) {
        store.next();
      }
      return store;
    });
  }
  
  export function moveToPrev() {
    cursorStore.update(store => {
      if (store) {
        store.prev();
      }
      return store;
    });
  }
  
  export function resetCursor() {
    cursorStore.update(store => {
      if (store) {
        store.reset();
      }
      return store;
    });
  }
// -- 
export const words = writable<Word[]>([]);
