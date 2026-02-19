-- ============================================================
-- HabitMaster 习惯大师 - Supabase 数据库初始化脚本
-- 在 Supabase SQL Editor 中按顺序执行以下语句
-- ============================================================

-- --------------------------------------------------------
-- 1. 用户资料表
-- NOTE: user_id 关联 auth.users，实现与 Supabase Auth 的绑定
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  nickname    TEXT NOT NULL DEFAULT '习惯探索者',
  email       TEXT NOT NULL DEFAULT '',
  avatar_url  TEXT,
  level       INTEGER NOT NULL DEFAULT 1,
  xp          INTEGER NOT NULL DEFAULT 0,
  rank        TEXT NOT NULL DEFAULT '新手探索者',
  streak      INTEGER NOT NULL DEFAULT 0,
  max_streak  INTEGER NOT NULL DEFAULT 0,
  dark_mode   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 只允许用户访问自己的资料
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_profiles_select_own" ON public.user_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_profiles_insert_own" ON public.user_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_profiles_update_own" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = user_id);


-- --------------------------------------------------------
-- 2. 任务表
-- NOTE: selected_days 存储周几的数组，0=周一，6=周日
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tasks (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  category         TEXT NOT NULL DEFAULT '健康',
  time             TEXT NOT NULL DEFAULT '全天',
  completed        BOOLEAN NOT NULL DEFAULT FALSE,
  icon             TEXT NOT NULL DEFAULT 'star',
  color            TEXT NOT NULL DEFAULT 'primary',
  frequency        TEXT NOT NULL DEFAULT 'daily' CHECK (frequency IN ('daily', 'weekly', 'custom')),
  selected_days    INTEGER[] NOT NULL DEFAULT ARRAY[0, 1, 2, 3, 4],
  reminder_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  reminder_time    TEXT NOT NULL DEFAULT '08:30',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tasks_select_own" ON public.tasks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "tasks_insert_own" ON public.tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tasks_update_own" ON public.tasks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "tasks_delete_own" ON public.tasks
  FOR DELETE USING (auth.uid() = user_id);

-- 按创建时间索引，加速首页任务列表查询
CREATE INDEX IF NOT EXISTS idx_tasks_user_id_created_at ON public.tasks(user_id, created_at DESC);


-- --------------------------------------------------------
-- 3. 专注会话表
-- NOTE: 记录每次番茄钟完成情况，用于统计页面图表
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.focus_sessions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  duration_minutes INTEGER NOT NULL,
  mode             TEXT NOT NULL DEFAULT 'work' CHECK (mode IN ('work', 'break')),
  completed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.focus_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "focus_sessions_select_own" ON public.focus_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "focus_sessions_insert_own" ON public.focus_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 按时间索引，加速日期范围查询
CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_completed ON public.focus_sessions(user_id, completed_at DESC);


-- --------------------------------------------------------
-- 4. 习惯日志表（热力图数据源）
-- NOTE: 每天每个任务最多记录一条，通过唯一约束防重复
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.habit_logs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id        UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  completed_date DATE NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, task_id, completed_date)
);

ALTER TABLE public.habit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "habit_logs_select_own" ON public.habit_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "habit_logs_insert_own" ON public.habit_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 按日期查询索引（热力图倒序查询）
CREATE INDEX IF NOT EXISTS idx_habit_logs_user_date ON public.habit_logs(user_id, completed_date DESC);


-- --------------------------------------------------------
-- 5. 自动更新 updated_at 的触发器函数
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为 tasks 表附加触发器
CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 为 user_profiles 表附加触发器
CREATE TRIGGER user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- 执行完成！请确保 Supabase 控制台中 Authentication 已启用邮箱登录
-- ============================================================
