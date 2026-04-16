export interface User {
  id: string;
  username: string;
  shopName: string;
  ownerName: string;
  phone: string;
  isActive: boolean;
  accessExpiresAt: string;
  createdAt: string;
}

export interface LoginResponse {
  accessToken: string;
  shopName: string;
  ownerName: string;
}

export interface JwtPayload {
  sub: string;
  username: string;
  shopName: string;
  accessExpiresAt: string;
  exp: number;
}
