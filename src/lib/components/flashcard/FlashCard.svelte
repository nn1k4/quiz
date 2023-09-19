<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { words } from './store';
    import type { Word, Stage } from '$lib/server/db';
    import { runQuery } from '$lib/sqlite/dataApi';
    import { waitTillStroageReady } from '$lib/sqlite/initStorages';

    let storageReady = false;
    let  loadedWords: Word[] = [];
    let currentWord: Word | null = null;
    let showTranslation = false;
    let stages: Stage[] = [];


    words.subscribe(value => {
        console.log("Current state:", value); // вывожу в консоль состояние стора
        // value.forEach((item, index) => {
        // console.log(`Item ${index}:`, item);
        // });
    });


    onMount(async () => {

        await waitTillStroageReady('words_v1'); // ждем когда хранилище будет готово
	    await waitTillStroageReady('stages_v1'); // ждем когда хранилище будет готово
		storageReady = true; // хранилище готово

      

        // Загрузка данных (эмуляция)
        loadedWords  = (await runQuery(`		
                SELECT *
                FROM words_v1 
                WHERE next_review_date <= unixepoch(datetime('now', 'localtime')) 
                OR next_review_date IS NULL
                ORDER BY frequency DESC, next_review_date ASC
                LIMIT 10;
            `)) as Word[];
        words.set(loadedWords);
  
      // Установить первое слово
      if (loadedWords.length > 0) {
        currentWord = loadedWords[0];
      }
    });

    onDestroy(() => {
         words.set([]); 
    });
  
    function nextWord() {
        showTranslation = false;

        // Достать следующее слово
        const loadedWords = $words;
        const next = loadedWords.shift();
        if (next !== undefined) {
            currentWord = next;
        } else {
            currentWord = null;  // или какое-то другое начальное значение
        }
        words.set(loadedWords);
    }

    function handleKeyPress(event: KeyboardEvent) {
      if (event.key === ' ') {
        if (showTranslation) {
          nextWord();
        } else {
          showTranslation = true;
        }
      }
    }
  </script>
  
  <svelte:window on:keydown={handleKeyPress} />

  <div>
	Storage Ready: {storageReady ? 'true' : 'false'}
  </div>
  
  {#if storageReady}
    {#if currentWord}
        <div>
        <p>{showTranslation ? currentWord.translation : currentWord.word}</p>
        </div>
    {:else}
        <div>
        <p>Нет слов для отображения</p>
        </div>
    {/if}
  {/if}
  