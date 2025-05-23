import { api } from "@/app/api/client";
import { isAxiosError } from "axios";

export const getAllUserRuns = async (
  userId: string,
  token: string,
  sessionId: string
) => {
  try {
    const response = await api.get("/api/v1/run", {
      headers: {
        "clerk-user-id": userId,
        Authorization: `Bearer ${token}`,
        "clerk-session-id": sessionId,
      },
    });
    const data = response.data;
    if (!data.status) {
      throw new Error("Error fetching templates");
    }
    return data;
  } catch (error: any) {
    if (error instanceof Error) {
      console.error("Error fetching templates: ", error);
    } else {
      console.error("An unexpected error occurred: ", error);
    }

    if (isAxiosError(error)) {
      const errorResponse = error.response?.data;
      return {
        status: false,
        message: errorResponse?.message || "Server communication error",
      };
    }

    return {
      status: false,
      message:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
};
