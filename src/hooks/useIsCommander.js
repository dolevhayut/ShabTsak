import { useAuthContext } from "@/context/AuthContext";

export function useIsCommander() {
  const { user } = useAuthContext();
  return user?.role === "commander";
}
