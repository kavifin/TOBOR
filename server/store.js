// Tiny JSON-file database. Good for a single-server shop; swap for Postgres/Mongo when traffic grows.
import fs from 'node:fs'
import path from 'node:path'

const file = path.resolve('server/data/db.json')
fs.mkdirSync(path.dirname(file), { recursive: true })

const empty = { requests: [], orders: [], enquiries: [], notifications: [], counters: { request: 1000, order: 5000 } }
let db = fs.existsSync(file) ? { ...empty, ...JSON.parse(fs.readFileSync(file, 'utf8')) } : structuredClone(empty)

let writing = Promise.resolve()
function persist() {
  const snapshot = JSON.stringify(db, null, 2)
  writing = writing.then(() => fs.promises.writeFile(file + '.tmp', snapshot).then(() => fs.promises.rename(file + '.tmp', file)))
  return writing
}

export const store = {
  get data() {
    return db
  },
  nextId(kind) {
    db.counters[kind] += 1
    return (kind === 'request' ? 'TB-R' : 'TB-O') + db.counters[kind]
  },
  async insert(collection, record) {
    db[collection].unshift(record)
    await persist()
    return record
  },
  find(collection, id) {
    return db[collection].find((r) => r.id === id)
  },
  findAny(id) {
    return this.find('requests', id) || this.find('orders', id)
  },
  async update(record, patch) {
    Object.assign(record, patch, { updatedAt: new Date().toISOString() })
    await persist()
    return record
  },
}
