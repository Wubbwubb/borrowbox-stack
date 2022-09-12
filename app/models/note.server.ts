import type { Note } from "./types";
import { randomUUID } from "crypto";
import { db } from "~/db.server";
import type { User } from "~/session.server";

export type { Note } from "./types";

export function getNote({
  id,
  userId,
}: Pick<Note, "id"> & {
  userId: User["id"];
}) {
  return db.notes.find((note) => note.id === id && note.userId === userId);
}

export function getNoteListItems({ userId }: { userId: User["id"] }) {
  return db.notes
    .filter((note) => note.userId === userId)
    .sort((a, b) => b.updatedAt.getDate() - a.updatedAt.getDate());
}

export function createNote({
  body,
  title,
  userId,
}: Pick<Note, "body" | "title"> & {
  userId: User["id"];
}) {
  const newNote: Note = {
    id: randomUUID(),
    title: title,
    body: body,
    createdAt: new Date(),
    updatedAt: new Date(),
    userId: userId,
  };

  db.notes.push(newNote);

  return newNote;
}

export function deleteNote({ id, userId }: Pick<Note, "id"> & { userId: User["id"] }) {
  db.notes = db.notes.filter((note) => note.id !== id || note.userId !== userId);
}
