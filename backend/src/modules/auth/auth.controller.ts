import { Request, Response } from "express";
import { ApiResponse, LoginResponse } from "@rmbs/shared";
import * as authService from "./auth.service";

export async function loginHandler(
  req: Request,
  res: Response<ApiResponse<LoginResponse>>
) {
  const result = await authService.login(req.body);
  res.json({ success: true, data: result });
}
