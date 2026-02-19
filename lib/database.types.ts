/**
 * Supabase 数据库类型定义
 * NOTE: 这些类型与 Supabase 中实际建表的 schema 完全对应
 * 如果修改了数据库结构，必须同步更新这里的类型
 */

export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[];

export interface Database {
    public: {
        Tables: {
            tasks: {
                Row: {
                    id: string;
                    user_id: string;
                    title: string;
                    category: string;
                    time: string;
                    completed: boolean;
                    icon: string;
                    color: string;
                    frequency: 'daily' | 'weekly' | 'custom';
                    selected_days: number[];
                    reminder_enabled: boolean;
                    reminder_time: string;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    title: string;
                    category: string;
                    time: string;
                    completed?: boolean;
                    icon: string;
                    color: string;
                    frequency?: 'daily' | 'weekly' | 'custom';
                    selected_days?: number[];
                    reminder_enabled?: boolean;
                    reminder_time?: string;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    user_id?: string;
                    title?: string;
                    category?: string;
                    time?: string;
                    completed?: boolean;
                    icon?: string;
                    color?: string;
                    frequency?: 'daily' | 'weekly' | 'custom';
                    selected_days?: number[];
                    reminder_enabled?: boolean;
                    reminder_time?: string;
                    updated_at?: string;
                };
            };
            focus_sessions: {
                Row: {
                    id: string;
                    user_id: string;
                    duration_minutes: number;
                    mode: 'work' | 'break';
                    completed_at: string;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    duration_minutes: number;
                    mode: 'work' | 'break';
                    completed_at?: string;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    user_id?: string;
                    duration_minutes?: number;
                    mode?: 'work' | 'break';
                    completed_at?: string;
                };
            };
            user_profiles: {
                Row: {
                    id: string;
                    user_id: string;
                    nickname: string;
                    email: string;
                    avatar_url: string | null;
                    level: number;
                    xp: number;
                    rank: string;
                    streak: number;
                    max_streak: number;
                    dark_mode: boolean;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    nickname: string;
                    email: string;
                    avatar_url?: string | null;
                    level?: number;
                    xp?: number;
                    rank?: string;
                    streak?: number;
                    max_streak?: number;
                    dark_mode?: boolean;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    user_id?: string;
                    nickname?: string;
                    email?: string;
                    avatar_url?: string | null;
                    level?: number;
                    xp?: number;
                    rank?: string;
                    streak?: number;
                    max_streak?: number;
                    dark_mode?: boolean;
                    updated_at?: string;
                };
            };
            habit_logs: {
                Row: {
                    id: string;
                    user_id: string;
                    task_id: string;
                    completed_date: string;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    task_id: string;
                    completed_date: string;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                };
            };
        };
        Views: Record<string, never>;
        Functions: Record<string, never>;
        Enums: Record<string, never>;
    };
}
