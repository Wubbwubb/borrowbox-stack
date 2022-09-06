import type { User } from "./types";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { db } from "~/db.server";

export type { User } from "./types";

export async function getUserById(id: User["id"]) {
  return db.users.find((user) => user.id === id);
}

export async function getUserByEmail(email: User["email"]) {
  return db.users.find((user) => user.email === email);
}

export async function createUser(email: User["email"], password: string) {
  const hashedPassword = await bcrypt.hash(password, 10);

  const newUser: User = {
    id: randomUUID(),
    email: email,
    password: hashedPassword,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  db.users.push(newUser);

  return newUser;
}

export async function deleteUserByEmail(email: User["email"]) {
  db.users = db.users.filter((user) => user.email !== email);
}

export async function verifyLogin(
  email: User["email"],
  password: User["password"]
) {
  const userWithPassword = await db.users.find((user) => user.email === email);
  console.log("userWithPassword", userWithPassword);

  if (!userWithPassword || !userWithPassword.password) {
    return null;
  }

  const isValid = await bcrypt.compare(password, userWithPassword.password);

  if (!isValid) {
    return null;
  }

  const { password: _password, ...userWithoutPassword } = userWithPassword;

  return userWithoutPassword;
}
