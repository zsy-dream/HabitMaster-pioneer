/**
 * 应用根组件
 * NOTE: 集成 Supabase 认证 + stale-while-revalidate 策略
 * 启动时先从 localStorage 缓存立即显示数据，再从 Supabase 静默拉取最新数据
 * 彻底消除因网络延迟导致的全屏加载等待
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Statistics from './pages/Statistics';
import NewTask from './pages/NewTask';
import Settings from './pages/Settings';
import Focus from './pages/Focus';
import AuthPage from './pages/AuthPage';
import BottomNav from './components/BottomNav';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Task, Category } from './types';
import {
  getTodayTasks,
  createTask,
  toggleTask as toggleTaskService,
  deleteTask as deleteTaskService,
} from './services/task-service';

/** 任务列表在 localStorage 中的缓存 key（与用户 ID 绑定） */
const getTaskCacheKey = (userId: string) => `habit-tasks-cache-${userId}`;

/** 将 Supabase Row 转为前端 Task 类型 */
const rowToTask = (r: Awaited<ReturnType<typeof getTodayTasks>>[0]): Task => ({
  id: r.id,
  title: r.title,
  category: r.category as Category,
  time: r.time,
  completed: r.completed,
  icon: r.icon,
  color: r.color,
});

// ---- 需要认证的主应用部分 ----
const AppContent: React.FC = () => {
  const { user, profile, loading, setProfile } = useAuth();
  const [darkMode, setDarkMode] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const hasSyncedRef = useRef(false);

  // 深色模式同步
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  // 从 profile 同步深色模式
  useEffect(() => {
    if (profile) setDarkMode(profile.dark_mode);
  }, [profile?.dark_mode]);

  /**
   * 认证完成后加载任务
   * NOTE: stale-while-revalidate 策略：
   *  1. 立即从 localStorage 缓存读取并显示（0 延迟）
   *  2. 异步从 Supabase 拉取最新数据，静默更新
   *  3. 将最新数据写回缓存供下次使用
   */
  useEffect(() => {
    if (!user || hasSyncedRef.current) return;
    hasSyncedRef.current = true;

    const cacheKey = getTaskCacheKey(user.id);

    // 步骤1：读取缓存，立即渲染（0 延迟）
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        setTasks(JSON.parse(cached));
      } catch {
        localStorage.removeItem(cacheKey);
      }
    }

    // 步骤2：后台静默拉取最新数据
    getTodayTasks(user.id)
      .then((rows) => {
        const fresh = rows.map(rowToTask);
        setTasks(fresh);
        // 步骤3：写回缓存，下次打开秒显示
        localStorage.setItem(cacheKey, JSON.stringify(fresh));
      })
      .catch((e) => console.error('后台同步任务失败（缓存数据仍可用）:', e));
  }, [user]);

  /**
   * 切换任务完成状态（乐观更新 + 缓存同步）
   */
  const toggleTask = useCallback(
    async (id: string) => {
      if (!user) return;
      const task = tasks.find((t) => t.id === id);
      if (!task) return;

      const newCompleted = !task.completed;
      const updated = tasks.map((t) => (t.id === id ? { ...t, completed: newCompleted } : t));

      setTasks(updated);
      localStorage.setItem(getTaskCacheKey(user.id), JSON.stringify(updated));

      try {
        await toggleTaskService(id, user.id, newCompleted);
      } catch (e) {
        console.error('切换任务状态失败，回滚:', e);
        setTasks(tasks);
        localStorage.setItem(getTaskCacheKey(user.id), JSON.stringify(tasks));
      }
    },
    [user, tasks]
  );

  /**
   * 新增任务（乐观插入 + 缓存同步）
   */
  const addTask = useCallback(
    async (task: Task) => {
      if (!user) return;

      const tempId = task.id;
      const withTemp = [task, ...tasks];
      setTasks(withTemp);
      localStorage.setItem(getTaskCacheKey(user.id), JSON.stringify(withTemp));

      try {
        const created = await createTask({
          user_id: user.id,
          title: task.title,
          category: task.category,
          time: task.time,
          completed: task.completed,
          icon: task.icon,
          color: task.color,
          frequency: 'daily',
          selected_days: [0, 1, 2, 3, 4],
          reminder_enabled: true,
          reminder_time: '08:30',
        });
        setTasks((prev) => {
          const next = prev.map((t) => (t.id === tempId ? { ...t, id: created.id } : t));
          localStorage.setItem(getTaskCacheKey(user.id), JSON.stringify(next));
          return next;
        });
      } catch (e) {
        console.error('创建任务失败，回滚:', e);
        const rollback = tasks.filter((t) => t.id !== tempId);
        setTasks(rollback);
        localStorage.setItem(getTaskCacheKey(user.id), JSON.stringify(rollback));
      }
    },
    [user, tasks]
  );

  /**
   * 删除任务（乐观删除 + 缓存同步）
   */
  const deleteTask = useCallback(
    async (id: string) => {
      if (!user) return;
      const taskToDelete = tasks.find((t) => t.id === id);
      const without = tasks.filter((t) => t.id !== id);
      setTasks(without);
      localStorage.setItem(getTaskCacheKey(user.id), JSON.stringify(without));

      try {
        await deleteTaskService(id, user.id);
      } catch (e) {
        console.error('删除任务失败，回滚:', e);
        if (taskToDelete) {
          const restored = [taskToDelete, ...without];
          setTasks(restored);
          localStorage.setItem(getTaskCacheKey(user.id), JSON.stringify(restored));
        }
      }
    },
    [user, tasks]
  );

  // 认证加载中（只在第一次打开时短暂出现）
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background-dark">
        <div className="size-16 rounded-2xl bg-primary/20 flex items-center justify-center mb-4 animate-pulse">
          <span className="material-symbols-outlined text-primary text-3xl">self_improvement</span>
        </div>
        <p className="text-slate-500 text-sm animate-pulse">加载中...</p>
      </div>
    );
  }

  // 未登录，显示认证页
  if (!user) {
    return <AuthPage />;
  }

  return (
    <Router>
      <div className="min-h-screen flex flex-col max-w-[430px] mx-auto bg-background-light dark:bg-background-dark transition-colors duration-300 relative overflow-hidden shadow-2xl">
        <Routes>
          {/* NOTE: 直接渲染 Home，不再有全屏 spinner，缓存数据立即可见 */}
          <Route path="/" element={
            <Home tasks={tasks} toggleTask={toggleTask} deleteTask={deleteTask} />
          } />
          <Route path="/statistics" element={<Statistics />} />
          <Route path="/new-task" element={<NewTask addTask={addTask} />} />
          <Route path="/focus" element={<Focus />} />
          <Route path="/settings" element={
            <Settings
              darkMode={darkMode}
              setDarkMode={setDarkMode}
              profile={profile}
              setProfile={setProfile}
            />
          } />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
        <BottomNav />
      </div>
    </Router>
  );
};

// ---- 应用入口，包裹 AuthProvider ----
const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
