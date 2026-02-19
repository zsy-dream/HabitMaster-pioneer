/**
 * 认证上下文
 * NOTE: 全局提供用户认证状态，子组件通过 useAuth() hook 访问，避免 prop drilling
 */
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
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
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
}

/**
 * 认证上下文提供者
 * NOTE: 订阅 Supabase Auth 状态变化，自动同步 user, profile
 */
export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<ProfileRow | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // NOTE: 5 秒超时兜底，防止 Supabase 请求失败或网络异常导致永久加载
        const timeout = setTimeout(() => {
            console.warn('Supabase 会话加载超时，自动跳过进入登录页');
            setLoading(false);
        }, 5000);

        // 初始加载时获取当前会话
        supabase.auth.getSession()
            .then(async ({ data: { session } }) => {
                clearTimeout(timeout);
                const currentUser = session?.user ?? null;
                setUser(currentUser);

                if (currentUser) {
                    try {
                        const p = await getOrCreateProfile(currentUser.id, currentUser.email ?? '');
                        setProfile(p);
                    } catch (e) {
                        console.error('加载用户资料失败:', e);
                    }
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
                    try {
                        const p = await getOrCreateProfile(currentUser.id, currentUser.email ?? '');
                        setProfile(p);
                    } catch (e) {
                        console.error('加载用户资料失败:', e);
                    }
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
        <AuthContext.Provider value={{ user, profile, loading, setProfile }}>
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
