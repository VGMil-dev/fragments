import { All, Controller, Get, Req, Res } from "@nestjs/common";
import { auth } from "./better-auth";
import type { Request, Response } from "express";
import { toNodeHandler } from "better-auth/node";

@Controller("api/auth")
export class AuthController {
  @Get("ok")
  async ok() {
    return { ok: true };
  }

  @All("*path")
  async handler(@Req() req: Request, @Res() res: Response) {
    return toNodeHandler(auth)(req, res);
  }
}
