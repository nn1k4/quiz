// план действий: 

// 1. Скачать данные с сервера и записать их во временную таблицу: words_v1_temp
// 1.1. создать временную таблицу words_v1_temp 
// 1.2. заполнить ее данными с сервера
// 2. Выполнить запрос обновления

// -- Добавление новых записей
// INSERT OR IGNORE INTO words_v1 (id, word, translation, frequency)
// SELECT id, word, translation, frequency
// FROM words_v1_temp
// WHERE id NOT IN (SELECT id FROM words_v1);

// -- Обновление существующих записей
// UPDATE words_v1
// SET word = (SELECT word FROM words_v1_temp WHERE words_v1_temp.id = words_v1.id),
//     translation = (SELECT translation FROM words_v1_temp WHERE words_v1_temp.id = words_v1.id),
//     frequency = (SELECT frequency FROM words_v1_temp WHERE words_v1_temp.id = words_v1.id)
// WHERE id IN (SELECT id FROM words_v1_temp);

// 3. удалить временную таблицу
// DROP TABLE words_v1_temp; 

import { getStructure, getData, createStorage } from '$lib/sqlite/initStorages';
import type { TableStructure } from '$src/routes/api/data/types';
import { sendMsgToWorker } from '$lib/sqlite/messageBus';
import { runQuery } from '$lib/sqlite/dataApi';
import {
	WorkerMessageTypes,
	type WorkerMessage,
	type FillStorageRequestData,
	type FillStorageResponseData
} from '$lib/sqlite/types';


const TEMP_STORAGE_SUFFIX = "_temp";

export async function updateWordsFromServer(cntRows: number, storageId: string) {


	try {	// проверяем доступность сервера
		const response = await fetch(`/api/data/${storageId}/structure`);
		if (response.ok) { // если связь с сервером есть, то


			const tempStorageId = `${storageId}${TEMP_STORAGE_SUFFIX}`;
			const structure = await getStructure(storageId);
			await createStorage(tempStorageId, structure); //создаем временную таблицу
			await fillTempStorage(storageId, tempStorageId, structure); // наполняем ее данными из таблицы с сервера
			// выполняем запрос на  Добавление новых записей, если есть
			await runQuery(`		
			INSERT OR IGNORE INTO ${storageId} (id, word, translation, frequency)
			SELECT id, word, translation, frequency
			FROM ${tempStorageId}
			WHERE id NOT IN (SELECT id FROM ${storageId});
        `)
			// выполняем запрос на Обновление существующих записей
			await runQuery(`		
			UPDATE ${storageId}
			SET word = (SELECT word FROM ${tempStorageId} WHERE ${tempStorageId}.id = ${storageId}.id),
				translation = (SELECT translation FROM ${tempStorageId} WHERE ${tempStorageId}.id = ${storageId}.id),
				frequency = (SELECT frequency FROM ${tempStorageId} WHERE ${tempStorageId}.id = ${storageId}.id)
			WHERE id IN (SELECT id FROM ${tempStorageId});
		`)
			// удаляем временную таблицу

			await runQuery(`		
			DROP TABLE ${tempStorageId}; 
		`)

			// Пауза на 5 секунд (5000 миллисекунд)
			// await new Promise(resolve => setTimeout(resolve, 5000));
			// storageIsReady(storageId); // сообщаем о готовности хранилища

		} else {

			console.log('Ошибка подключения к серверу:', response.statusText);

		}
	} catch (error) {

		console.error('Не удалось установить подключение к серверу:', error);
	}

}

async function fillTempStorage(storage: string, tempStorage: string, structure: TableStructure) {
	console.time(`fillTempStorage-${tempStorage}`);

	const PAGE_SIZE = 100;
	let currOffset = 0;
	let fetchMore = false;

	do {
		const { data, moreRows } = await getData(storage, currOffset, PAGE_SIZE);
		console.log(`Fetched ${data.length} rows from ${storage} at offset ${currOffset}`, data);

		const res = (await sendMsgToWorker({
			storageId: tempStorage, // заливаем данные во временную таблицу
			type: WorkerMessageTypes.FILL_STORAGE,
			expectedType: WorkerMessageTypes.FILL_STORAGE_RESPONSE,
			data: { rows: data, structure: structure } as FillStorageRequestData
		})) as WorkerMessage<FillStorageResponseData>;

		if (res.data.errorMsg) {
			console.error(`Error filling storage ${tempStorage} at offset ${currOffset}`, res.data.errorMsg);
			throw new Error(res.data.errorMsg);
		}

		currOffset += PAGE_SIZE;
		fetchMore = moreRows;
	} while (fetchMore);

	console.timeEnd(`fillTempStorage-${tempStorage}`);
}