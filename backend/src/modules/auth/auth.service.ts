import bcrypt from "bcryptjs";
import jwt, { SignOptions } from "jsonwebtoken";
import { LoginRequest, LoginResponse } from "@rmbs/shared";
import { prisma } from "../../config/prisma";
import { config } from "../../config/env";
import { AppError } from "../../middleware/errorHandler";

export async function login({ email, password }: LoginRequest): Promise<LoginResponse> {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !user.isActive) {
    throw AppError.unauthorized("Invalid email or password");
  }

  const passwordValid = await bcrypt.compare(password, user.passwordHash);
  if (!passwordValid) {
    throw AppError.unauthorized("Invalid email or password");
  }

  const signOptions: SignOptions = {
    expiresIn: config.jwtExpiresIn as SignOptions["expiresIn"],
  };

  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
      ownerId: user.ownerId ?? undefined,
      tenantId: user.tenantId ?? undefined,
    },
    config.jwtSecret,
    signOptions
  );

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      companyId: user.companyId,
    },
  };
}

export async function hashPassword(plain: string): Promise<string> {
  const SALT_ROUNDS = 10;
  return bcrypt.hash(plain, SALT_ROUNDS);
}
