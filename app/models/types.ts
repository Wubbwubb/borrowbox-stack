/**
 * Model User
 *
 */
export type User = {
  id: string;
  email: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Model Note
 *
 */
export type Note = {
  id: string;
  title: string;
  body: string;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
};
