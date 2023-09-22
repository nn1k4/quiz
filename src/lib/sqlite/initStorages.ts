import type { TableStructure } from '../../routes/api/data/types';
import { sendMsgToWorker } from './messageBus';
import {
	WorkerMessageTypes,
	type WorkerMessage,
	type TableExistsResponseData,
	type CreateTableRequestData,
	type DataRow,
	type FillStorageRequestData,
	type FillStorageResponseData
} from './types';

const storages = ['words_v1','stages_v1']; // в этом массиве указываем подключаемые таблицы

export async function getStructure(storage: string): Promise<TableStructure> {
	const res = await fetch(`/api/data/${storage}/structure`);
	const data = (await res.json()) as TableStructure;
	return data;
}

export async function getData(storage: string, offset: number, limit: number) {
	const res = await fetch(`/api/data/${storage}/data?offset=${offset}&limit=${limit}`);
	const data = (await res.json()) as { data: DataRow[]; moreRows: boolean };
	return data;
}

export async function createStorage(storage: string, structure: TableStructure) {
	const res = (await sendMsgToWorker({
		storageId: storage,
		type: WorkerMessageTypes.CREATE_TABLE,
		expectedType: WorkerMessageTypes.CREATE_TABLE_RESPONSE,
		data: { structure } as CreateTableRequestData
	})) as WorkerMessage<TableExistsResponseData>;

	if (res.data.errorMsg) throw new Error(res.data.errorMsg);
}

async function fillStorage(storage: string, structure: TableStructure) {
	console.time(`fillStorage-${storage}`);

	const PAGE_SIZE = 100;
	let currOffset = 0;
	let fetchMore = false;

	do {
		const { data, moreRows } = await getData(storage, currOffset, PAGE_SIZE);
		console.log(`Fetched ${data.length} rows from ${storage} at offset ${currOffset}`, data);

		const res = (await sendMsgToWorker({
			storageId: storage,
			type: WorkerMessageTypes.FILL_STORAGE,
			expectedType: WorkerMessageTypes.FILL_STORAGE_RESPONSE,
			data: { rows: data, structure: structure } as FillStorageRequestData
		})) as WorkerMessage<FillStorageResponseData>;

		if (res.data.errorMsg) {
			console.error(`Error filling storage ${storage} at offset ${currOffset}`, res.data.errorMsg);
			throw new Error(res.data.errorMsg);
		}

		currOffset += PAGE_SIZE;
		fetchMore = moreRows;
	} while (fetchMore);

	console.timeEnd(`fillStorage-${storage}`);
}

const readyStorages = new Set<string>(); // готовые хранилища
const storageCbs = new Map<string, (() => void)[]>(); // карта хранилищь с  обратного вызовами  (callbacks)

export function storageIsReady(storageId: string) {
	// помечает хранилище как "готовое" и выполняет все сохранённые
	// обратные вызовы для этого хранилища. Эти вызовы удаляются после выполнения.
	readyStorages.add(storageId);
	// и если у него есть невыполненные обещания, то выполняем их 
		const cbs = storageCbs.get(storageId);
	// вызывая обратные вызовы
	if (storageCbs.has(storageId)) {	
		cbs?.forEach((cb) => cb());
		storageCbs.delete(storageId);
	}
}

export function waitTillStroageReady(storageId: string) {
	// ожидание готовности хранилища
	// возвращает Promise, который разрешается, когда хранилище становится "готовым". 
	return new Promise<void>((resolve) => {
		if (readyStorages.has(storageId)) {
			// Если хранилище уже "готово", промис немедленно разрешается.
			resolve();
		} else {
			// в противном случае, обратный вызов для разрешения промиса добавляется в массив обратных вызовов для данного хранилища.
			if (!storageCbs.has(storageId)) {
				//  если для данного storageId ещё не существует массива обратных вызовов (callbacks) в Map storageCbs.
				//  то создаем новый массив с одной функцией resolve
				storageCbs.set(storageId, [resolve]);
			} else {
				// если для данного storageId уже существует массив обратных вызовов в Map.
				// новая функция resolve просто добавляется в существующий массив 
				storageCbs.get(storageId)?.push(resolve);
			}
		}
	});
}

export default async function initStorages() {
	for (const storageId of storages) {
		const res = (await sendMsgToWorker({
			storageId,
			type: WorkerMessageTypes.TABLE_EXISTS,
			expectedType: WorkerMessageTypes.TABLE_EXISTS_RESPONSE,
			data: undefined
		})) as WorkerMessage<TableExistsResponseData>;

		if (res.data.errorMsg) throw new Error(res.data.errorMsg);

// <!-- laimi7
// пропускаем проверку наличия таблиц и их заполнения в случае если нет связи с сервером
// try {
// 	const response = await fetch(`/api/data/${storageId}/structure`); 

// 	if (response.ok) {
		// ------------
		console.log('Laimi7: ------> Связь с сервером присутствует');
		if (res.data.tableExists) {
			console.log(`Table ${storageId} exists. Has data: ${res.data.hasData}`);

			if (!res.data.hasData) {
				const structure = await getStructure(storageId);
				await fillStorage(storageId, structure);
			}
		} else {
			const structure = await getStructure(storageId);
			console.log(`Table ${storageId} does not exist. Creating...`, structure);
			await createStorage(storageId, structure);
			await fillStorage(storageId, structure);
		}
		// ------
// 	} else {

//         console.log('Laimi7: ------> Ошибка подключения к серверу:', response.statusText);
//     }

// } catch (error) {
	
// 	console.error('Laimi7: ------> Не удалось установить подключение к серверу:', error);

// }

// laimi7 -->
		storageIsReady(storageId); // сообщаем о готовности хранилища
	}
}
