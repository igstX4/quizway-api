import { Injectable } from "@nestjs/common";
import { PrismaService, type Prisma, type User } from "@quizway/prisma";

/**
 * Data access for accounts. Deliberately thin: business rules live in
 * `AuthService`, this service only knows how to talk to Postgres.
 */
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  create(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({ data });
  }
}
