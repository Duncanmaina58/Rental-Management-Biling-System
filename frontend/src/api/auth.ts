import { ApiResponse, LoginRequest, LoginResponse } from "@rmbs/shared";
import { apiClient } from "./client";

export async function loginRequest(payload: LoginRequest): Promise<LoginResponse> {
  const { data } = await apiClient.post<ApiResponse<LoginResponse>>("/auth/login", payload);
  if (!data.success) {
    throw new Error(data.error.message);
  }
  return data.data;
}
