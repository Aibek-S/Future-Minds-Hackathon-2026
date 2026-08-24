import { api, tokenStore } from "../api/client";
import type { AuthTokens, MeResponse, RegisterPayload } from "../types";

export const authService = {
  async login(email: string, password: string): Promise<AuthTokens> {
    const tokens = await api.post<AuthTokens>("/auth/login", { email, password });
    tokenStore.set(tokens.accessToken, tokens.refreshToken);
    return tokens;
  },

  async register(payload: RegisterPayload) {
    const res = await api.post<{ user: { id: string; name: string; role: string } } & AuthTokens>(
      "/auth/register",
      payload,
    );
    tokenStore.set(res.accessToken, res.refreshToken);
    return res;
  },

  me(): Promise<MeResponse> {
    return api.get<MeResponse>("/auth/me");
  },

  logout() {
    tokenStore.clear();
  },
};
