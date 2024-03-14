export class CreateUserDto {
  providerId: string;
  username: string;
  google_token: string;
  refresh_token: string;
  name?: string;
  is_active?: boolean;
}
