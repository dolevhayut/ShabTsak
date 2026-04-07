import localStorageService from "@/services/localStorageService";
import { TOKEN_NAME } from "@/services/userService";

export function getCredentials() {
  const loginInfo = localStorageService.get(TOKEN_NAME);
  if (!loginInfo?.userInfo) {
    throw new Error("NOT_LOGGED_IN");
  }
  return {
    p_user_id: loginInfo.userInfo.id,
    p_phone: loginInfo.userInfo.phone,
  };
}
