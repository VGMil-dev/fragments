import { All, Body, Controller, Get, Post, Req, Res, Inject, HttpException, HttpStatus } from "@nestjs/common";
import { auth } from "./better-auth";
import type { Request, Response } from "express";
import { toNodeHandler } from "better-auth/node";
import { Pool } from "pg";

@Controller("api/auth")
export class AuthController {
  constructor(@Inject("DB_POOL") private pool: Pool) {}

  @Get("ok")
  async ok() {
    return { ok: true };
  }

  @Post("sign-up/teacher")
  async signUpTeacher(@Body() body: any, @Res() res: Response) {
    const { email, password, name, ticket } = body;
    
    const goldenTicket = process.env.TEACHER_GOLDEN_TICKET;
    if (!goldenTicket || ticket !== goldenTicket) {
      throw new HttpException("Invalid golden ticket", HttpStatus.FORBIDDEN);
    }

    let createdUser: any = null;
    try {
      // 1. Create user via Better Auth
      createdUser = await auth.api.signUpEmail({
        body: {
          email,
          password,
          name,
        },
      });

      if (!createdUser) {
        throw new HttpException("Failed to create user", HttpStatus.INTERNAL_SERVER_ERROR);
      }

      // 2. Update role to teacher
      const updateResult = await this.pool.query(
        'UPDATE "user" SET role = $1 WHERE email = $2',
        ['teacher', email]
      );

      if (updateResult.rowCount === 0) {
        throw new Error("Failed to assign teacher role");
      }

      // Return the user/session as Better Auth would
      return res.json(createdUser);
    } catch (error: any) {
      // Cleanup: if user was created but role failed, try to delete or flag
      if (createdUser && error.message === "Failed to assign teacher role") {
        await this.pool.query('DELETE FROM "user" WHERE email = $1', [email]);
      }
      throw new HttpException(error.message || "Signup failed", HttpStatus.BAD_REQUEST);
    }
  }

  @All("*path")
  async handler(@Req() req: Request, @Res() res: Response) {
    return toNodeHandler(auth)(req, res);
  }
}
