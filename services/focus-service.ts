/**
 * 专注会话服务层
 * NOTE: 记录每次专注计时完成的数据，用于统计页面展示
 */
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type FocusSessionRow = Database['public']['Tables']['focus_sessions']['Row'];
type FocusSessionInsert = Database['public']['Tables']['focus_sessions']['Insert'];

/**
 * 记录一次完成的专注会话
 * @param userId - 用户 ID
 * @param durationMinutes - 专注时长（分钟）
 * @param mode - 工作 or 休息模式
 * @returns 创建的会话记录
 */
export async function recordFocusSession(
    userId: string,
    durationMinutes: number,
    mode: 'work' | 'break'
): Promise<FocusSessionRow> {
    const session: FocusSessionInsert = {
        user_id: userId,
        duration_minutes: durationMinutes,
        mode,
        completed_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
        .from('focus_sessions')
        .insert(session)
        .select()
        .single();

    if (error) throw new Error(`记录专注会话失败: ${error.message}`);
    return data;
}

/**
 * 获取今日专注统计数据
 * @param userId - 用户 ID
 * @returns 今日完成次数、累计分钟数
 */
export async function getTodayFocusStats(
    userId: string
): Promise<{ completedCount: number; totalMinutes: number }> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
        .from('focus_sessions')
        .select('duration_minutes, mode')
        .eq('user_id', userId)
        .eq('mode', 'work')
        .gte('completed_at', todayStart.toISOString());

    if (error) throw new Error(`获取专注统计失败: ${error.message}`);

    const sessions = data ?? [];
    return {
        completedCount: sessions.length,
        totalMinutes: sessions.reduce((sum, s) => sum + s.duration_minutes, 0),
    };
}

/**
 * 获取指定时间范围的专注数据（用于统计图表）
 * @param userId - 用户 ID
 * @param period - 统计维度：日/周/月/年
 * @returns 图表数据点
 */
export async function getFocusChartData(
    userId: string,
    period: '日' | '周' | '月' | '年'
): Promise<Array<{ name: string; value: number }>> {
    const now = new Date();
    let startDate: Date;

    switch (period) {
        case '日':
            startDate = new Date(now);
            startDate.setHours(0, 0, 0, 0);
            break;
        case '周':
            startDate = new Date(now);
            startDate.setDate(now.getDate() - 6);
            startDate.setHours(0, 0, 0, 0);
            break;
        case '月':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
        case '年':
            startDate = new Date(now.getFullYear(), 0, 1);
            break;
    }

    const { data, error } = await supabase
        .from('focus_sessions')
        .select('duration_minutes, completed_at')
        .eq('user_id', userId)
        .eq('mode', 'work')
        .gte('completed_at', startDate.toISOString());

    if (error) throw new Error(`获取图表数据失败: ${error.message}`);

    // 按时间段聚合数据
    const sessions = data ?? [];
    const aggregated = new Map<string, number>();

    sessions.forEach((session) => {
        const date = new Date(session.completed_at);
        let key: string;

        switch (period) {
            case '日':
                key = `${date.getHours().toString().padStart(2, '0')}:00`;
                break;
            case '周': {
                const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
                key = days[date.getDay()];
                break;
            }
            case '月':
                key = `${Math.ceil(date.getDate() / 7)}周`;
                break;
            case '年': {
                const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
                key = quarters[Math.floor(date.getMonth() / 3)];
                break;
            }
        }

        aggregated.set(key, (aggregated.get(key) ?? 0) + session.duration_minutes);
    });

    return Array.from(aggregated.entries()).map(([name, value]) => ({ name, value }));
}
