import { ConflictException, UnauthorizedException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { User } from "@quizway/prisma";
import { hash } from "bcrypt";
import { UsersService } from "../users/users.service";
import { AuthService } from "./auth.service";
import { TokenService } from "./token.service";

const EXISTING_USER: User = {
  id: "8f4bd1b3-2f2e-4f31-9a44-1f0a2f3f9b11",
  email: "demo@quizway.dev",
  passwordHash: "",
  fullName: "Demo Owner",
  role: "USER",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

function createUsersServiceMock() {
  return {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
  } satisfies Partial<Record<keyof UsersService, jest.Mock>>;
}

describe("AuthService", () => {
  let auth: AuthService;
  let users: ReturnType<typeof createUsersServiceMock>;

  beforeEach(async () => {
    users = createUsersServiceMock();

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: users },
        {
          provide: TokenService,
          useValue: {
            issuePair: jest
              .fn()
              .mockResolvedValue({ accessToken: "access", refreshToken: "refresh" }),
          },
        },
      ],
    }).compile();

    auth = moduleRef.get(AuthService);

    EXISTING_USER.passwordHash = await hash("Password123!", 4);
  });

  describe("register", () => {
    it("normalises the email and returns a token pair", async () => {
      users.findByEmail.mockResolvedValue(null);
      users.create.mockResolvedValue(EXISTING_USER);

      const result = await auth.register({
        email: "  DEMO@QuizWay.dev ",
        password: "Password123!",
        fullName: " Demo Owner ",
      });

      expect(users.findByEmail).toHaveBeenCalledWith("demo@quizway.dev");
      expect(users.create).toHaveBeenCalledWith(
        expect.objectContaining({ email: "demo@quizway.dev", fullName: "Demo Owner" }),
      );
      expect(result.accessToken).toBe("access");
      expect(result.user.email).toBe(EXISTING_USER.email);
    });

    it("rejects an email that is already registered", async () => {
      users.findByEmail.mockResolvedValue(EXISTING_USER);

      await expect(
        auth.register({
          email: "demo@quizway.dev",
          password: "Password123!",
          fullName: "Demo Owner",
        }),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(users.create).not.toHaveBeenCalled();
    });
  });

  describe("login", () => {
    it("accepts the right password", async () => {
      users.findByEmail.mockResolvedValue(EXISTING_USER);

      const result = await auth.login({
        email: "demo@quizway.dev",
        password: "Password123!",
      });

      expect(result.refreshToken).toBe("refresh");
    });

    it("rejects a wrong password with the same error as an unknown email", async () => {
      users.findByEmail.mockResolvedValue(EXISTING_USER);

      await expect(
        auth.login({ email: "demo@quizway.dev", password: "wrong-password" }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it("rejects an unknown email", async () => {
      users.findByEmail.mockResolvedValue(null);

      await expect(
        auth.login({ email: "nobody@quizway.dev", password: "Password123!" }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });
});
