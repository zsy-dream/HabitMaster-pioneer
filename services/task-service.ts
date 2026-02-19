/**
 * 任务服务层
 * NOTE: 封装所有与 tasks 表相关的数据库操作，前端不直接操作 supabase 客户端
 */
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type TaskRow = Database['public']['Tables']['tasks']['Row'];
type TaskInsert = Database['public']['Tables']['tasks']['Insert'];
type TaskUpdate = Database['public']['Tables']['tasks']['Update'];

export interface TaskService {
    getTodayTasks(userId: string): Promise<TaskRow[]>;
    createTask(task: TaskInsert): Promise<TaskRow>;
    updateTask(id: string, userId: string, updates: TaskUpdate): Promise<TaskRow>;
    deleteTask(id: string, userId: string): Promise<void>;
    toggleTask(id: string, userId: string, completed: boolean): Promise<TaskRow>;
}

/**
 * 获取用户今日任务列表
 * @param userId - 用户 ID
 * @returns 任务列表
 */
export async function getTodayTasks(userId: string): Promise<TaskRow[]> {
    const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) throw new Error(`获取任务失败: ${error.message}`);
    return data ?? [];
}

/**
 * 创建新任务
 * @param task - 任务数据
 * @returns 创建的任务
 */
export async function createTask(task: TaskInsert): Promise<TaskRow> {
    const { data, error } = await supabase
        .from('tasks')
        .insert(task)
        .select()
        .single();

    if (error) throw new Error(`创建任务失败: ${error.message}`);
    return data;
}

/**
 * 切换任务的完成状态
 * @param id - 任务 ID
 * @param userId - 用户 ID（用于 RLS 校验）
 * @param completed - 目标完成状态
 * @returns 更新后的任务
 */
export async function toggleTask(
    id: string,
    userId: string,
    completed: boolean
): Promise<TaskRow> {
    const now = new Date().toISOString();
    const { data, error } = await supabase
        .from('tasks')
        .update({ completed, updated_at: now })
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

    if (error) throw new Error(`更新任务状态失败: ${error.message}`);

    // NOTE: 当任务完成时，记录到 habit_logs 表用于统计
    if (completed) {
        const today = new Date().toISOString().split('T')[0];
        await supabase.from('habit_logs').upsert(
            { user_id: userId, task_id: id, completed_date: today },
            { onConflict: 'user_id,task_id,completed_date' }
        );
    }

    return data;
}

/**
 * 删除任务
 * @param id - 任务 ID
 * @param userId - 用户 ID（RLS 双重校验）
 */
export async function deleteTask(id: string, userId: string): Promise<void> {
    const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

    if (error) throw new Error(`删除任务失败: ${error.message}`);
}
