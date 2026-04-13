import api from "./api";

export interface AppUser {
  id: string;
  email: string | null;
  created_at: string | null;
  last_sign_in_at: string | null;
}

export const usersApi = {
  list: async (): Promise<AppUser[]> => {
    const { data } = await api.get<AppUser[]>("/users");
    return data;
  },
  create: async (email: string, password: string): Promise<AppUser> => {
    const { data } = await api.post<AppUser>("/users", { email, password });
    return data;
  },
  remove: async (id: string): Promise<void> => {
    await api.delete(`/users/${id}`);
  },
};
