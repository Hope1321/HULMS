import api from "./api";
import { DashboardResponse } from "@/types/dashboard";

export const getDashboard =
  async (): Promise<DashboardResponse> => {
    const response = await api.get<DashboardResponse>(
      "/dashboard"
    );

    return response.data;
  };