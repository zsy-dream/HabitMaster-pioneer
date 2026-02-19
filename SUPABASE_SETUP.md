# HabitMaster 习惯大师 - Supabase 接入配置指南

## 快速开始

### 第一步：创建 Supabase 项目

1. 访问 [https://supabase.com](https://supabase.com) 注册/登录
2. 点击 **New Project** 创建新项目
3. 选择区域（推荐选 **Southeast Asia - Singapore** 延迟最低）
4. 记录下 **Project URL** 和 **anon public** key

### 第二步：初始化数据库

1. 进入 Supabase 控制台 → **SQL Editor**
2. 点击 **New query**
3. 复制 `database/schema.sql` 的全部内容粘贴进去
4. 点击 **Run** 执行

### 第三步：启用邮箱认证

1. 进入 **Authentication** → **Providers**
2. 确认 **Email** 已启用
3. 如需关闭邮箱验证（开发阶段），去 **Authentication → Settings**，关闭 **Enable email confirmations**

### 第四步：配置环境变量

编辑项目根目录的 `.env.local` 文件：

```env
VITE_SUPABASE_URL=https://你的项目ID.supabase.co
VITE_SUPABASE_ANON_KEY=你的anon_public_key
```

> 在 Supabase 控制台 → **Project Settings** → **API** 页面可以找到这两个值

### 第五步：启动开发服务器

```bash
npm run dev
```

访问 `http://localhost:3000` 即可使用完整的前后端一体应用。

---

## 数据库表结构说明

| 表名 | 用途 |
|------|------|
| `user_profiles` | 用户资料（昵称、等级、经验值、连续天数等） |
| `tasks` | 习惯任务（标题、分类、提醒时间等） |
| `focus_sessions` | 专注会话记录（番茄钟完成记录） |
| `habit_logs` | 每日习惯完成日志（热力图数据源） |

所有表均启用了 **Row Level Security (RLS)**，确保用户只能访问自己的数据。

---

## 数据流说明

```
用户操作（前端）
    ↓
Service 层（services/*.ts）    ← 封装所有 Supabase 操作
    ↓
Supabase 客户端（lib/supabase.ts）
    ↓
Supabase PostgreSQL 数据库
```

### 乐观更新策略

任务的创建、删除、状态切换均采用**乐观更新**：
- 先立即更新本地 UI state（用户感受无延迟）
- 再异步发请求到 Supabase
- 若请求失败，自动回滚 UI state

---

## 项目结构

```
to-do app/
├── lib/
│   ├── supabase.ts          # Supabase 客户端单例
│   └── database.types.ts    # 数据库类型定义
├── services/
│   ├── auth-service.ts      # 认证（登录/注册/登出）
│   ├── task-service.ts      # 任务 CRUD
│   ├── profile-service.ts   # 用户资料 + 经验值
│   ├── focus-service.ts     # 专注会话记录
│   └── stats-service.ts     # 统计数据（热力图/连续天数）
├── contexts/
│   └── AuthContext.tsx      # 全局认证状态 Context
├── pages/
│   ├── AuthPage.tsx         # 登录/注册页面（新增）
│   ├── Home.tsx             # 首页（任务列表）
│   ├── NewTask.tsx          # 新建任务
│   ├── Statistics.tsx       # 数据统计
│   ├── Focus.tsx            # 专注番茄钟
│   └── Settings.tsx         # 设置/个人中心
├── database/
│   └── schema.sql           # 数据库建表脚本
└── .env.local               # 环境变量（需配置）
```
