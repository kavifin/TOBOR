// Records for photo requests, orders, enquiries and WhatsApp notifications.
// With DATABASE_URL set (Vercel + Neon Postgres) they live in Postgres; without it, in a JSON file on
// this computer, so local development needs no database. Both backends share one async interface.
import fs from 'node:fs'
import path from 'node:path'

const BASE = { request: 1000, order: 5000 }
const prefix = (kind) => (kind === 'request' ? 'TB-R' : 'TB-O')
const stamp = (record, patch) => Object.assign(record, patch, { updatedAt: new Date().toISOString() })

// ---------- JSON file (local) ----------
function fileStore() {
  if (process.env.VERCEL) throw Object.assign(new Error('No database: connect a Neon Postgres database to this Vercel project (it sets DATABASE_URL).'), { status: 503 })
  const file = path.resolve('server/data/db.json')
  fs.mkdirSync(path.dirname(file), { recursive: true })
  const empty = { requests: [], orders: [], enquiries: [], notifications: [], counters: { ...BASE } }
  const db = fs.existsSync(file) ? { ...empty, ...JSON.parse(fs.readFileSync(file, 'utf8')) } : structuredClone(empty)
  let writing = Promise.resolve()
  const persist = () => {
    const snapshot = JSON.stringify(db, null, 2)
    writing = writing.then(() => fs.promises.writeFile(file + '.tmp', snapshot).then(() => fs.promises.rename(file + '.tmp', file)))
    return writing
  }
  const find = (collection, id) => db[collection].find((r) => r.id === id) ?? null
  return {
    async nextId(kind) {
      db.counters[kind] += 1
      await persist()
      return prefix(kind) + db.counters[kind]
    },
    async insert(collection, record) {
      db[collection].unshift(record)
      await persist()
      return record
    },
    async find(collection, id) {
      return find(collection, id)
    },
    async findAny(id) {
      return find('requests', id) ?? find('orders', id)
    },
    async update(record, patch) {
      stamp(record, patch)
      await persist()
      return record
    },
    async all() {
      const { counters, ...rest } = db
      return rest
    },
  }
}

// ---------- Postgres (Vercel) ----------
async function pgStore(url) {
  const { default: postgres } = await import('postgres')
  // prepare: false and one connection suit Neon's pooled URL and short-lived serverless functions
  const sql = postgres(url, { max: 1, prepare: false, idle_timeout: 20, connect_timeout: 10 })
  await sql`create table if not exists tobor_records (
    id text primary key,
    collection text not null,
    data jsonb not null,
    created_at timestamptz not null default now()
  )`
  await sql`create index if not exists tobor_records_by_collection on tobor_records (collection, created_at desc)`
  await sql`create table if not exists tobor_counters (kind text primary key, value integer not null)`
  const one = (rows) => rows[0]?.data ?? null
  return {
    async nextId(kind) {
      const [row] = await sql`
        insert into tobor_counters (kind, value) values (${kind}, ${BASE[kind] + 1})
        on conflict (kind) do update set value = tobor_counters.value + 1
        returning value`
      return prefix(kind) + row.value
    },
    async insert(collection, record) {
      await sql`insert into tobor_records (id, collection, data) values (${record.id}, ${collection}, ${sql.json(record)})`
      return record
    },
    async find(collection, id) {
      return one(await sql`select data from tobor_records where collection = ${collection} and id = ${id}`)
    },
    async findAny(id) {
      return one(await sql`select data from tobor_records where collection in ('requests', 'orders') and id = ${id}`)
    },
    async update(record, patch) {
      stamp(record, patch)
      await sql`update tobor_records set data = ${sql.json(record)} where id = ${record.id}`
      return record
    },
    async all() {
      const out = { requests: [], orders: [], enquiries: [], notifications: [] }
      for (const row of await sql`select collection, data from tobor_records order by created_at desc`) out[row.collection]?.push(row.data)
      return out
    },
  }
}

export const storeKind = process.env.DATABASE_URL ? 'postgres' : 'file'

let ready = null
// a failed connection is retried on the next request instead of being cached
const backend = () =>
  (ready ??= (storeKind === 'postgres' ? pgStore(process.env.DATABASE_URL) : Promise.resolve(fileStore())).catch((err) => {
    ready = null
    throw err
  }))

export const store = {
  nextId: async (kind) => (await backend()).nextId(kind),
  insert: async (collection, record) => (await backend()).insert(collection, record),
  find: async (collection, id) => (await backend()).find(collection, id),
  findAny: async (id) => (await backend()).findAny(id),
  update: async (record, patch) => (await backend()).update(record, patch),
  all: async () => (await backend()).all(),
}
