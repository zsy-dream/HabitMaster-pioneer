/**
 * 认证服务层
 * NOTE: 封装 Supabase Auth 相关操作，统一处理登录/注册/登出
 */
import { supabase } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

export interface AuthResult {
    user: User | null;
    session: Session | null;
    error: string | null;
}

/**
 * 邮箱密码注册
 * @param email - 邮箱
 * @param password - 密码（需包含大小写字母和数字，最少8位）
 * @returns 注册结果
 */
export async function signUp(email: string, password: string): Promise<AuthResult> {
    const { data, error } = await supabase.auth.signUp({ email, password });

    return {
        user: data.user,
        session: data.session,
        error: error?.message ?? null,
    };
}

/**
 * 邮箱密码登录
 * @param email - 邮箱
 * @param password - 密码
 * @returns 登录结果
 */
export async function signIn(email: string, password: string): Promise<AuthResult> {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    return {
        user: data.user,
        session: data.session,
        error: error?.message ?? null,
    };
}

/**
 * 登出当前用户
 */
export async function signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(`登出失败: ${error.message}`);
}

/**
 * 获取当前登录用户
 * @returns 当前用户或 null
 */
export async function getCurrentUser(): Promise<User | null> {
    const { data } = await supabase.auth.getUser();
    return data.user;
}
