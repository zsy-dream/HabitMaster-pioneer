/**
 * 统计数据服务层
 * NOTE: 聚合 habit_logs 表数据，提供热力图和连续天数统计功能
 */
import { supabase } from '../lib/supabase';

/**
 * 获取指定时间范围的习惯热力图数据
 * @param userId - 用户 ID
 * @param days - 往前推多少天（默认 70 天）
 * @returns 热力图数据（每天完成数量）
 */
export async function getHabitHeatmap(
    userId: string,
    days: number = 70
): Promise<Array<{ date: string; count: number; level: number }>> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
        .from('habit_logs')
        .select('completed_date')
        .eq('user_id', userId)
        .gte('completed_date', startDate.toISOString().split('T')[0]);

    if (error) throw new Error(`获取热力图数据失败: ${error.message}`);

    // 统计每天的完成数量
    const countMap = new Map<string, number>();
    (data ?? []).forEach((log) => {
        countMap.set(log.completed_date, (countMap.get(log.completed_date) ?? 0) + 1);
    });

    // 生成完整的日期序列
    const result: Array<{ date: string; count: number; level: number }> = [];
    for (let i = days; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const count = countMap.get(dateStr) ?? 0;

        // 将完成数量映射到 0-3 级别（用于热力图颜色深度）
        let level = 0;
        if (count >= 1) level = 1;
        if (count >= 3) level = 2;
        if (count >= 5) level = 3;

        result.push({ date: dateStr, count, level });
    }

    return result;
}

/**
 * 计算用户的连续打卡天数
 * @param userId - 用户 ID
 * @returns 当前连续天数和历史最高连续天数
 */
export async function getStreakData(
    userId: string
): Promise<{ currentStreak: number; maxStreak: number }> {
    const { data, error } = await supabase
        .from('habit_logs')
        .select('completed_date')
        .eq('user_id', userId)
        .order('completed_date', { ascending: false });

    if (error) throw new Error(`获取连续天数失败: ${error.message}`);

    if (!data || data.length === 0) return { currentStreak: 0, maxStreak: 0 };

    // 去重日期并排序
    const uniqueDates = [...new Set(data.map((d) => d.completed_date))].sort(
        (a, b) => new Date(b).getTime() - new Date(a).getTime()
    );

    let currentStreak = 0;
    let maxStreak = 0;
    let tempStreak = 1;
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    // 当前连续：从今天或昨天开始算
    if (uniqueDates[0] === today || uniqueDates[0] === yesterday) {
        currentStreak = 1;
        for (let i = 1; i < uniqueDates.length; i++) {
            const prev = new Date(uniqueDates[i - 1]);
            const curr = new Date(uniqueDates[i]);
            const diff = (prev.getTime() - curr.getTime()) / 86400000;
            if (diff === 1) {
                currentStreak++;
            } else {
                break;
            }
        }
    }

    // 历史最高连续
    for (let i = 1; i < uniqueDates.length; i++) {
        const prev = new Date(uniqueDates[i - 1]);
        const curr = new Date(uniqueDates[i]);
        const diff = (prev.getTime() - curr.getTime()) / 86400000;
        if (diff === 1) {
            tempStreak++;
            maxStreak = Math.max(maxStreak, tempStreak);
        } else {
            tempStreak = 1;
        }
    }

    return { currentStreak, maxStreak: Math.max(maxStreak, currentStreak) };
}

/**
 * 获取月度完成率统计
 * @param userId - 用户 ID
 * @returns 本月完成任务数和总任务数
 */
export async function getMonthlyStats(
    userId: string
): Promise<{ completed: number; total: number; rate: number }> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .split('T')[0];

    const { data, error } = await supabase
        .from('habit_logs')
        .select('id')
        .eq('user_id', userId)
        .gte('completed_date', monthStart);

    if (error) throw new Error(`获取月度统计失败: ${error.message}`);

    const completed = data?.length ?? 0;
    // NOTE: 用总任务数 × 已过天数 作为期望完成总数
    const daysElapsed = now.getDate();
    const { data: tasks } = await supabase
        .from('tasks')
        .select('id')
        .eq('user_id', userId);

    const taskCount = tasks?.length ?? 0;
    const total = taskCount * daysElapsed;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { completed, total, rate };
}
