import Database from 'better-sqlite3';

const db = new Database('./data/words.sqlite', { verbose: console.log });

/* -------------------< Stage >------------------- */

export type Stage = {
	id: number;
	interval: string;
}

export function getStagesCount(): number {
	const stmt = db.prepare(`SELECT COUNT(*) as "cnt" FROM stages`);
	const data = stmt.get() as { cnt: number };
	return data.cnt;
}

export function getStages({ offset = 0, limit = 50 }): QueryResult<Stage[]> {
	const stmt = db.prepare(`
  SELECT id as "id"
       , interval as "interval"
    FROM stages LIMIT $limit OFFSET $offset`);
	const data = stmt.all({ limit, offset }) as Stage[];

	return {
		data,
		moreRows: getStagesCount() > offset + limit
	};
}


/* -------------------< /Stage >------------------- */


/* -------------------< Word >------------------- */

export type Word = {
	id: number;
	word: string;
	translation: string;
	frequency: number;
	next_review_date: number;
	stage: number;
}

export function getWordsCount(): number {
	const stmt = db.prepare(`SELECT COUNT(*) as "cnt" FROM words`);
	const data = stmt.get() as { cnt: number };
	return data.cnt;
}

export function getWords({ offset = 0, limit = 50 }): QueryResult<Word[]> {
	const stmt = db.prepare(`
  SELECT id as "id"
       , word as "word"
       , translation as "translation"
       , frequency as "frequency"
	   , next_review_date as next_review_date
	   , stage as stage
    FROM words LIMIT $limit OFFSET $offset`);
	const data = stmt.all({ limit, offset }) as Word[];

	return {
		data,
		moreRows: getWordsCount() > offset + limit
	};
}
/* -------------------< /Word >------------------- */

export type Customer = {
	id: string;
	company: string;
	contact: string;
	contactTitle: string;
	address: string;
	city: string;
	region: string;
	postalCode: string;
	country: string;
	phone: string;
	fax: string;
};

export type OrderDetail = {
	id: number;
	orderId: number;
	productId: number;
	unitPrice: number;
	quantity: number;
	discount: number;
};

type QueryWrapper = {
	moreRows: boolean;
};

export type QueryResult<T> = { data: T } & QueryWrapper;

export function getCustomerCount(): number {
	const stmt = db.prepare(`SELECT COUNT(*) as "cnt" FROM customers`);
	const data = stmt.get() as { cnt: number };
	return data.cnt;
}

export function getCustomers({ offset = 0, limit = 50 }): QueryResult<Customer[]> {
	const stmt = db.prepare(`
  SELECT CustomerID as "id"
       , CompanyName as "company"
       , ContactName as "contact"
       , ContactTitle as "contactTitle"
       , Address as "address"
       , City as "city"
       , Region as "region"
       , PostalCode as "postalCode"
       , Country  as "country"
       , Phone as "phone"
       , Fax as "fax"
    FROM customers LIMIT $limit OFFSET $offset`);
	const data = stmt.all({ limit, offset }) as Customer[];

	return {
		data,
		moreRows: getCustomerCount() > offset + limit
	};
}

export function getOrderDetailCount(): number {
	const stmt = db.prepare(`SELECT COUNT(*) as "cnt" FROM "Order Details"`);
	const data = stmt.get() as { cnt: number };
	return data.cnt;
}

export function getOrderDetails({ offset = 0, limit = 50 }): QueryResult<OrderDetail[]> {
	const stmt = db.prepare(`
  SELECT ROWID as "id"
	     , OrderId as "orderId"
       , ProductId as "productId"
       , UnitPrice as "unitPrice"
       , Quantity as "quantity"
       , Discount as "discount"
    FROM "Order Details" LIMIT $limit OFFSET $offset`);
	const data = stmt.all({ limit, offset }) as OrderDetail[];

	return {
		data,
		moreRows: getOrderDetailCount() > offset + limit
	};
}
