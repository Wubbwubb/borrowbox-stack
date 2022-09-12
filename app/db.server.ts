import type { Note } from "~/models/types";

type DBType = { notes: Array<Note> };

let db: DBType;

declare global {
  var __db__: DBType;
}

// this is needed because in development we don't want to restart
// the server with every change, but we want to make sure we don't
// create a new connection to the DB with every change either.
// in production we'll have a single connection to the DB.
if (process.env.NODE_ENV === "production") {
  db = createDB();
} else {
  if (!global.__db__) {
    global.__db__ = createDB();
  }
  db = global.__db__;
}

function createDB(): DBType {
  return { notes: [] };
}

export { db };
