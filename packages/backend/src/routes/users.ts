import { Router } from 'express';
import { User, CreateUserRequest, UserSchema, CreateUserSchema } from '../schemas/user';

export const usersRouter = Router();

// In-memory database (for proof of concept)
const users: User[] = [
  { id: '1', name: 'John Doe', email: 'john@example.com', role: 'admin' },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com', role: 'user' },
];

let nextId = 3;

// GET /api/users
usersRouter.get('/', (req, res) => {
  res.json(users);
});

// GET /api/users/:id
usersRouter.get('/:id', (req, res) => {
  const user = users.find((u) => u.id === req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json(user);
});

// POST /api/users
usersRouter.post('/', (req, res) => {
  try {
    const body = CreateUserSchema.parse(req.body);
    const newUser: User = {
      id: String(nextId++),
      ...body,
      role: body.role || 'user',
    };
    users.push(newUser);
    res.status(201).json(newUser);
  } catch (error) {
    res.status(400).json({ error: 'Invalid data' });
  }
});
