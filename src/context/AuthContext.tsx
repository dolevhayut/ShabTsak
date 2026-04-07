import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import UserService, { UserInfo } from "@/services/userService";

type AuthContextType = {
    user: UserInfo | undefined | null;
    // eslint-disable-next-line no-unused-vars
    login: (_payload: { id: string; phone: string }) => Promise<void>;
    // eslint-disable-next-line no-unused-vars
    register: (_payload: { name: string; id: string; phone: string }) => Promise<void>;
    logout: () => void;
    init: () => void;
}

const AuthContext = createContext<AuthContextType>({
    user: undefined,
    login: async () => {},
    register: async () => {},
    logout: () => {},
    init: () => {},
});

export const refreshTokenInterval = 1000 * 60; // 15 minutes
export default function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<UserInfo | null | undefined>();
    const refreshTokenTimeout = useRef<ReturnType<typeof setTimeout>>();
    const _refreshToken = async () => {
        const userInfo = await UserService.refreshToken();
        if (userInfo) {
            setUser(userInfo);
            clearTimeout(refreshTokenTimeout.current);
            refreshTokenTimeout.current = setTimeout(_refreshToken, refreshTokenInterval);
        } else {
            setUser(null);
        }
    }

    async function init() {
        const userInfo = await UserService.getUser();
        if (userInfo) {
            setUser(userInfo);
            clearTimeout(refreshTokenTimeout.current);
            refreshTokenTimeout.current = setTimeout(_refreshToken, refreshTokenInterval);
        } else {
            setUser(null);
        }
    }

    async function login(payload: { id: string; phone: string }) {
        const userInfo = await UserService.login(payload);
        setUser(userInfo);
        clearTimeout(refreshTokenTimeout.current);
        refreshTokenTimeout.current = setTimeout(_refreshToken, refreshTokenInterval);
    }

    async function register(payload: { name: string; id: string; phone: string }) {
        const userInfo = await UserService.register(payload);
        setUser(userInfo);
        clearTimeout(refreshTokenTimeout.current);
        refreshTokenTimeout.current = setTimeout(_refreshToken, refreshTokenInterval);
    }

    async function logout() {
        await UserService.logout();
        setUser(null);
    }

    useEffect(() => {
        init();

        return () => {
            clearTimeout(refreshTokenTimeout.current);
        }
    }, []);


    return <AuthContext.Provider value={{ user, init, login, register, logout }}>{children}</AuthContext.Provider>;
}

export const useAuthContext = () => {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error("useAuthContext must be used within an AuthProvider");
    }

    return context;
}

