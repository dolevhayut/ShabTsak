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
};

async function register(payload: RegisterPayload) {
    const name = payload.name.trim();
    const id = payload.id.trim();
    const phone = payload.phone.trim();

    const { data: existing } = await supabase
        .from("users")
        .select("id")
        .eq("id", id)
        .maybeSingle();

    if (existing) {
        throw new Error("חייל עם תעודת זהות זו כבר קיים במערכת");
    }

    const { data, error } = await supabase
        .from("users")
        .insert({ id, phone, name })
        .select("id, phone, name, email, picture, role")
        .single();

    if (error) {
        throw new Error(error.message || "ההרשמה נכשלה");
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