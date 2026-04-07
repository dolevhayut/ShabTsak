import localStorageService from "@/services/localStorageService";
import { refreshTokenInterval } from "@/context/AuthContext";
import { supabase } from "@/services/supabaseClient";

export const TOKEN_NAME = "FOODS_TOKEN";

type TokenType = {
    token_type: string,
    id_token: string,
}

export type UserInfo = {
    id: string;
    phone: string;
    name: string;
    email?: string | null;
    picture?: string | null;
    role?: string | null;
}

export type LoginReturnType = {
    token: TokenType,
    userInfo: UserInfo,
    lastLogin: number,
}

type LoginPayload = {
    id: string;
    phone: string;
}

async function login(payload: LoginPayload) {
    const id = payload.id.trim();
    const phone = payload.phone.trim();

    const { data, error } = await supabase
        .from("users")
        .select("id, phone, name, email, picture, role")
        .eq("id", id)
        .eq("phone", phone)
        .maybeSingle();

    if (error) {
        throw new Error(error.message || "Failed to login with Supabase");
    }

    if (!data) {
        throw new Error("פרטי ההתחברות לא נמצאו");
    }

    const userInfo: UserInfo = {
        id: String(data.id),
        phone: String(data.phone),
        name: data.name || "חייל",
        email: data.email || null,
        picture: data.picture || null,
        role: data.role || "member",
    };

    const token: TokenType = {
        token_type: "Bearer",
        id_token: `${userInfo.id}:${userInfo.phone}`,
    };

    const lastLogin = new Date().getTime();
    localStorageService.set<LoginReturnType>(TOKEN_NAME, { token, userInfo, lastLogin });
    return userInfo;
}

type RegisterPayload = {
    name: string;
    id: string;
    phone: string;
    campCode: string;
};

function mapRegisterRpcError(message: string | undefined): string {
    const m = message || "";
    if (m.includes("REGISTER_INVALID_CAMP_CODE")) return "קוד בסיס שגוי. בדקו עם המפקד והזינו שוב.";
    if (m.includes("REGISTER_MISSING_CAMP_CODE") || m.includes("REGISTER_MISSING_FIELDS")) {
        return "יש למלא את כל השדות, כולל קוד הבסיס";
    }
    if (m.includes("REGISTER_USER_EXISTS")) return "חייל עם תעודת זהות זו כבר קיים במערכת";
    if (m.includes("duplicate key") || m.includes("unique")) return "פרטים אלה כבר רשומים במערכת";
    return m || "ההרשמה נכשלה";
}

async function register(payload: RegisterPayload) {
    const name = payload.name.trim();
    const id = payload.id.trim();
    const phone = payload.phone.trim();
    const campCode = payload.campCode.trim();

    const { data, error } = await supabase.rpc("rpc_register_with_camp_code", {
        p_name: name,
        p_id: id,
        p_phone: phone,
        p_camp_code: campCode,
    });

    if (error) {
        throw new Error(mapRegisterRpcError(error.message));
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) {
        throw new Error("ההרשמה נכשלה");
    }

    const userInfo: UserInfo = {
        id: String(row.id),
        phone: String(row.phone),
        name: row.name || "חייל",
        email: row.email || null,
        picture: row.picture || null,
        role: row.role || "member",
    };

    const token: TokenType = {
        token_type: "Bearer",
        id_token: `${userInfo.id}:${userInfo.phone}`,
    };

    const lastLogin = new Date().getTime();
    localStorageService.set<LoginReturnType>(TOKEN_NAME, { token, userInfo, lastLogin });
    return userInfo;
}

async function logout() {
    localStorageService.remove(TOKEN_NAME);
}

let tries = 0;
async function refreshToken(): Promise<UserInfo | null> {
    try {
        const loginInfo = localStorageService.get<LoginReturnType>(TOKEN_NAME);
        if (!loginInfo?.userInfo) return null;
        return loginInfo.userInfo;
    } catch (error) {
        if (navigator.onLine) {
            console.log(error);
            localStorageService.remove(TOKEN_NAME);
            return null;
        } else {
            if (tries > 5) {
                tries = 0;
                return null;
            }
            tries++;
            return await refreshToken();
        }
    }
}

async function getUser(): Promise<UserInfo | null> {
    try {
        const loginInfo = localStorageService.get<LoginReturnType>(TOKEN_NAME);
        if (!loginInfo) {
            return null;
        }
        const { userInfo, lastLogin } = loginInfo;
        const now = new Date().getTime();
        const diff = now - lastLogin;
        if (diff > refreshTokenInterval) {
            localStorageService.set<LoginReturnType>(TOKEN_NAME, {
                ...loginInfo,
                lastLogin: now
            });
        }
        return userInfo;
    } catch (err) {
        console.error(err);
        return null;
    }
}


const UserService = {
    login,
    register,
    logout,
    getUser,
    refreshToken,
}

export default UserService;