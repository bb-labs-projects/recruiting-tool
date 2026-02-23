import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema'
import * as relations from './relations'

const createDb = () =>
  drizzle(process.env.DATABASE_URL!, {
    schema: { ...schema, ...relations },
  })

type Db = ReturnType<typeof createDb>

let _db: Db

export const db: Db = new Proxy({} as Db, {
  get(_, prop) {
    _db ??= createDb()
    return _db[prop as keyof Db]
  },
})
