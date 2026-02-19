/**
 * 用户资料服务层
 * NOTE: 封装 user_profiles 表的查询与更新，确保只有本人可修改自己的资料
 */
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type ProfileRow = Database['public']['Tables']['user_profiles']['Row'];
type ProfileUpdate = Database['public']['Tables']['user_profiles']['Update'];

/**
 * 获取用户资料，若不存在则自动创建默认资料
 * @param userId - Supabase Auth 用户 ID
 * @param email - 用户邮箱（首次创建时使用）
 * @returns 用户资料
 */
export async function getOrCreateProfile(
    userId: string,
    email: string
): Promise<ProfileRow> {
    // 先尝试查询
    const { data: existing, error: selectError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

    if (existing) return existing;

    // 若不存在（首次登录），创建默认资料
    if (selectError?.code === 'PGRST116') {
        const { data: created, error: insertError } = await supabase
            .from('user_profiles')
            .insert({
                user_id: userId,
                nickname: email.split('@')[0],
                email,
                level: 1,
                xp: 0,
                rank: '新手探索者',
                streak: 0,
                max_streak: 0,
                dark_mode: true,
            })
            .select()
            .single();

        if (insertError) throw new Error(`创建用户资料失败: ${insertError.message}`);
        return created;
    }

    throw new Error(`获取用户资料失败: ${selectError?.message}`);
}

/**
 * 更新用户资料
 * @param userId - 用户 ID
 * @param updates - 要更新的字段
 * @returns 更新后的资料
 */
export async function updateProfile(
    userId: string,
    updates: Omit<ProfileUpdate, 'user_id'>
): Promise<ProfileRow> {
    const now = new Date().toISOString();
    const { data, error } = await supabase
        .from('user_profiles')
        .update({ ...updates, updated_at: now })
        .eq('user_id', userId)
        .select()
        .single();

    if (error) throw new Error(`更新用户资料失败: ${error.message}`);
    return data;
}

/**
 * 增加用户经验值，并自动处理升级逻辑
 * NOTE: 每完成一次专注或任务都会调用此函数
 * @param userId - 用户 ID
 * @param xpGain - 获得的经验值
 */
export async function addXp(userId: string, xpGain: number): Promise<ProfileRow> {
    // 先获取当前资料
    const { data: profile, error: fetchError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

    if (fetchError || !profile) throw new Error('获取用户资料失败');

    const RANKS = ['新手探索者', '习惯学徒', '进阶实践者', '资深坚守者', '习惯大师', '传奇宗师'];
    const XP_PER_LEVEL = 1200;

    let newXp = profile.xp + xpGain;
    let newLevel = profile.level;

    // 升级判断
    while (newXp >= XP_PER_LEVEL) {
        newXp -= XP_PER_LEVEL;
        newLevel += 1;
    }

    const newRank = RANKS[Math.min(Math.floor(newLevel / 5), RANKS.length - 1)];

    return updateProfile(userId, { xp: newXp, level: newLevel, rank: newRank });
}
