import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'
import * as relations from './relations'

const createDb = () => {
  const client = postgres(process.env.DATABASE_URL!, { prepare: false })
  return drizzle(client, { schema: { ...schema, ...relations } })
}

type Db = ReturnType<typeof createDb>

let _db: Db

export const db: Db = new Proxy({} as Db, {
  get(_, prop) {
    _db ??= createDb()
    return _db[prop as keyof Db]
  },
})
