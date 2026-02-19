/**
 * 认证上下文
 * NOTE: 全局提供用户认证状态，子组件通过 useAuth() hook 访问，避免 prop drilling
 * 支持自动重试机制，解决国内网络环境下 Supabase 响应慢的问题
 */
import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';
import { getOrCreateProfile } from '../services/profile-service';

type ProfileRow = Database['public']['Tables']['user_profiles']['Row'];

interface AuthContextValue {
    user: User | null;
    profile: ProfileRow | null;
    loading: boolean;
    setProfile: (profile: ProfileRow) => void;
    retryLoadProfile: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
}

/** NOTE: 超时时间 15 秒，国内网络环境需要更长时间连接 Supabase */
const SESSION_TIMEOUT_MS = 15000;
/** 自动重试最大次数 */
const MAX_RETRY = 3;

/**
 * 带重试的 profile 加载
 * NOTE: 网络不稳定时自动重试，每次间隔递增（1s, 2s, 3s）
 */
async function loadProfileWithRetry(
    userId: string,
    email: string,
    maxRetry: number = MAX_RETRY
): Promise<ProfileRow | null> {
    for (let attempt = 1; attempt <= maxRetry; attempt++) {
        try {
            const p = await getOrCreateProfile(userId, email);
            return p;
        } catch (e) {
            console.warn(`加载用户资料失败（第 ${attempt}/${maxRetry} 次）:`, e);
            if (attempt < maxRetry) {
                // 递增等待时间
                await new Promise((r) => setTimeout(r, attempt * 1000));
            }
        }
    }
    console.error(`加载用户资料最终失败，已重试 ${maxRetry} 次`);
    return null;
}

/**
 * 认证上下文提供者
 * NOTE: 订阅 Supabase Auth 状态变化，自动同步 user, profile
 */
export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<ProfileRow | null>(null);
    const [loading, setLoading] = useState(true);

    /**
     * 手动重试加载 profile
     * NOTE: 供用户界面上的「重试」按钮调用
     */
    const retryLoadProfile = useCallback(async () => {
        if (!user) return;
        console.log('手动重试加载用户资料...');
        const p = await loadProfileWithRetry(user.id, user.email ?? '');
        if (p) setProfile(p);
    }, [user]);

    useEffect(() => {
        // NOTE: 15 秒超时兜底，防止 Supabase 请求失败或网络异常导致永久加载
        const timeout = setTimeout(() => {
            console.warn('Supabase 会话加载超时（15s），自动跳过');
            setLoading(false);
        }, SESSION_TIMEOUT_MS);

        // 初始加载时获取当前会话
        supabase.auth.getSession()
            .then(async ({ data: { session } }) => {
                clearTimeout(timeout);
                const currentUser = session?.user ?? null;
                setUser(currentUser);

                if (currentUser) {
                    const p = await loadProfileWithRetry(currentUser.id, currentUser.email ?? '');
                    if (p) setProfile(p);
                }
                setLoading(false);
            })
            .catch((e) => {
                // FIXME: Supabase 配置错误或网络断开时走这里，直接展示登录页
                clearTimeout(timeout);
                console.error('Supabase 会话获取失败:', e);
                setLoading(false);
            });

        // 监听认证状态变化（登录/登出/token 刷新）
        const { data: listener } = supabase.auth.onAuthStateChange(
            async (_event, session) => {
                const currentUser = session?.user ?? null;
                setUser(currentUser);

                if (currentUser) {
                    const p = await loadProfileWithRetry(currentUser.id, currentUser.email ?? '');
                    if (p) setProfile(p);
                } else {
                    setProfile(null);
                }

                setLoading(false);
            }
        );

        return () => {
            clearTimeout(timeout);
            listener.subscription.unsubscribe();
        };
    }, []);

    return (
        <AuthContext.Provider value={{ user, profile, loading, setProfile, retryLoadProfile }}>
            {children}
        </AuthContext.Provider>
    );
}

/**
 * 使用认证上下文的 Hook
 * @throws 若在 AuthProvider 外部调用则报错
 */
export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) {
        throw new Error('useAuth 必须在 AuthProvider 内部使用');
    }
    return ctx;
}
