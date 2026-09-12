import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { ENV } from '../config/env.js';
import { AuthRequest } from '../middleware/auth.js';

export const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(30),
  password: z.string().min(6).max(100),
});

export const loginSchema = z.object({
  emailOrUsername: z.string().min(1),
  password: z.string().min(1),
});

function createAccessToken(payload: {
  userId: string;
  email: string;
  username: string;
  role: string;
}) {
  const options: SignOptions = {
    expiresIn: ENV.JWT_EXPIRES_IN as SignOptions['expiresIn'],
  };
  return jwt.sign(payload, ENV.JWT_SECRET, options);
}

export async function register(req: Request, res: Response) {
  const { email, username, password } = req.body;

  const existingEmail = await prisma.user.findUnique({ where: { email } });
  if (existingEmail) {
    return res.status(409).json({ success: false, error: 'Email already registered' });
  }

  const existingUsername = await prisma.user.findUnique({ where: { username } });
  if (existingUsername) {
    return res.status(409).json({ success: false, error: 'Username already taken' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email,
      username,
      passwordHash,
      profile: {
        create: {
          preferredLanguage: 'en',
          preferredTheme: 'dark',
        },
      },
    },
    include: {
      profile: true,
    },
  });

  const token = createAccessToken({
    userId: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
  });

  res.status(201).json({
    success: true,
    data: {
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        avatarUrl: user.avatarUrl,
        profile: user.profile,
      },
    },
  });
}

export async function login(req: Request, res: Response) {
  const { emailOrUsername, password } = req.body;

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: emailOrUsername }, { username: emailOrUsername }],
    },
    include: { profile: true },
  });

  if (!user) {
    return res.status(401).json({ success: false, error: 'Invalid credentials' });
  }

  const isValidPassword = await bcrypt.compare(password, user.passwordHash);
  if (!isValidPassword) {
    return res.status(401).json({ success: false, error: 'Invalid credentials' });
  }

  const token = createAccessToken({
    userId: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
  });

  res.json({
    success: true,
    data: {
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        avatarUrl: user.avatarUrl,
        profile: user.profile,
      },
    },
  });
}

export async function getMe(req: AuthRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    include: { profile: true },
  });

  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }

  res.json({
    success: true,
    data: {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        avatarUrl: user.avatarUrl,
        profile: user.profile,
      },
    },
  });
}
