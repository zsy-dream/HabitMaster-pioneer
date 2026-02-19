/**
 * 统计页面
 * NOTE: 从 Supabase 拉取真实习惯日志和专注数据，替代原来的随机模拟数据
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import { getHabitHeatmap, getStreakData, getMonthlyStats } from '../services/stats-service';
import { getFocusChartData } from '../services/focus-service';

type Period = '日' | '周' | '月' | '年';

const Statistics: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activePeriod, setActivePeriod] = useState<Period>('周');
  const [selectedCell, setSelectedCell] = useState<number | null>(null);

  // 真实数据 state
  const [heatmapData, setHeatmapData] = useState<Array<{ date: string; count: number; level: number }>>([]);
  const [streakData, setStreakData] = useState({ currentStreak: 0, maxStreak: 0 });
  const [monthlyStats, setMonthlyStats] = useState({ completed: 0, total: 0, rate: 0 });
  const [chartData, setChartData] = useState<Array<{ name: string; value: number }>>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // 加载所有统计数据
  useEffect(() => {
    if (!user) return;

    setDataLoading(true);
    Promise.all([
      getHabitHeatmap(user.id, 70),
      getStreakData(user.id),
      getMonthlyStats(user.id),
      getFocusChartData(user.id, activePeriod),
    ])
      .then(([heatmap, streak, monthly, chart]) => {
        setHeatmapData(heatmap);
        setStreakData(streak);
        setMonthlyStats(monthly);
        // NOTE: 若后端数据为空，提供一个默认示例使图表不为空
        setChartData(chart.length > 0 ? chart : getDefaultChartData(activePeriod));
      })
      .catch((e) => console.error('加载统计数据失败:', e))
      .finally(() => setDataLoading(false));
  }, [user]);

  // 切换统计周期时重新拉图表数据
  useEffect(() => {
    if (!user) return;

    getFocusChartData(user.id, activePeriod)
      .then((data) => {
        setChartData(data.length > 0 ? data : getDefaultChartData(activePeriod));
      })
      .catch((e) => console.error('加载图表数据失败:', e));
  }, [activePeriod, user]);

  /**
   * 若没有数据时提供默认图形，避免空白图表
   */
  const getDefaultChartData = (period: Period): Array<{ name: string; value: number }> => {
    switch (period) {
      case '日': return [{ name: '00:00', value: 0 }, { name: '06:00', value: 0 }, { name: '12:00', value: 0 }, { name: '18:00', value: 0 }, { name: '23:59', value: 0 }];
      case '周': return ['周一', '周二', '周三', '周四', '周五', '周六', '周日'].map((n) => ({ name: n, value: 0 }));
      case '月': return ['1周', '2周', '3周', '4周'].map((n) => ({ name: n, value: 0 }));
      case '年': return ['Q1', 'Q2', 'Q3', 'Q4'].map((n) => ({ name: n, value: 0 }));
    }
  };

  const heatmapColors = ['bg-primary/10', 'bg-primary/30', 'bg-primary/60', 'bg-primary'];

  return (
    <div className="flex-1 pb-32 overflow-y-auto animate-in fade-in duration-500">
      <header className="sticky top-0 z-50 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md px-4 py-4 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-slate-600 dark:text-slate-400 active:scale-90 transition-transform">
          <span className="material-symbols-outlined">arrow_back_ios</span>
        </button>
        <h1 className="text-lg font-bold">活动统计</h1>
        <button className="p-2 -mr-2 text-slate-600 dark:text-slate-400 active:scale-90 transition-transform">
          <span className="material-symbols-outlined">more_horiz</span>
        </button>
      </header>

      <main className="max-w-md mx-auto px-4 space-y-6 mt-2">
        {/* 周期切换 */}
        <div className="flex p-1 bg-slate-200 dark:bg-primary/10 rounded-xl relative">
          {(['日', '周', '月', '年'] as Period[]).map((period) => (
            <button
              key={period}
              onClick={() => setActivePeriod(period)}
              className={`flex-1 py-1.5 text-sm font-bold rounded-lg transition-all relative z-10 ${activePeriod === period
                  ? 'bg-white dark:bg-primary text-slate-900 dark:text-background-dark shadow-sm'
                  : 'text-slate-500 dark:text-slate-400'
                }`}
            >
              {period}
            </button>
          ))}
        </div>

        {/* 热力图 */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">习惯记录</h2>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider">少</span>
              <div className="flex gap-1">
                {heatmapColors.map((c, i) => (
                  <div key={i} className={`w-2.5 h-2.5 rounded-sm ${c}`}></div>
                ))}
              </div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider">多</span>
            </div>
          </div>
          <div className="bg-white dark:bg-primary/5 border border-slate-100 dark:border-primary/10 rounded-xl p-4 overflow-x-auto hide-scrollbar">
            {dataLoading ? (
              <div className="flex items-center justify-center h-24">
                <span className="material-symbols-outlined text-primary animate-spin">refresh</span>
              </div>
            ) : (
              <>
                <div className="flex gap-2 mb-2 text-[10px] text-slate-400">
                  <span className="w-20">十月</span>
                  <span className="w-20">十一月</span>
                  <span className="w-20">十二月</span>
                </div>
                <div className="grid grid-flow-col grid-rows-7 gap-1.5 w-max">
                  {heatmapData.map((item, index) => (
                    <div
                      key={item.date}
                      onClick={() => setSelectedCell(index)}
                      title={`${item.date}: ${item.count} 次`}
                      className={`w-4 h-4 rounded-sm cursor-pointer transition-all hover:scale-125 active:scale-90 ${heatmapColors[item.level]} ${selectedCell === index ? 'ring-2 ring-primary ring-offset-2 dark:ring-offset-background-dark' : ''}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </section>

        {/* 连续天数和完成率卡片 */}
        <section className="grid grid-cols-2 gap-4">
          <div className="bg-white dark:bg-primary/5 border border-slate-100 dark:border-primary/10 rounded-xl p-4 flex flex-col items-center text-center group cursor-pointer hover:bg-primary/10 transition-colors">
            <span className="material-symbols-outlined text-primary mb-2" style={{ fontVariationSettings: "'FILL' 1" }}>
              local_fire_department
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">当前连续</span>
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {dataLoading ? '-' : `${streakData.currentStreak} 天`}
            </span>
          </div>
          <div className="bg-white dark:bg-primary/5 border border-slate-100 dark:border-primary/10 rounded-xl p-4 flex flex-col items-center text-center group cursor-pointer hover:bg-amber-400/10 transition-colors">
            <span className="material-symbols-outlined text-amber-400 mb-2" style={{ fontVariationSettings: "'FILL' 1" }}>
              military_tech
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">最高连续</span>
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {dataLoading ? '-' : `${streakData.maxStreak} 天`}
            </span>
          </div>

          {/* 完成率 */}
          <div className="bg-white dark:bg-primary/5 border border-slate-100 dark:border-primary/10 rounded-xl p-4 flex flex-col items-center text-center col-span-2">
            <div className="flex items-center gap-4 w-full">
              <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
                <svg className="w-full h-full -rotate-90">
                  <circle className="text-primary/10" cx="32" cy="32" fill="transparent" r="28" stroke="currentColor" strokeWidth="6" />
                  <circle
                    className="text-primary rounded-full transition-all duration-1000"
                    cx="32" cy="32" fill="transparent" r="28"
                    stroke="currentColor"
                    strokeDasharray="175"
                    strokeDashoffset={175 * (1 - monthlyStats.rate / 100)}
                    strokeWidth="6"
                  />
                </svg>
                <span className="absolute text-sm font-bold">{monthlyStats.rate}%</span>
              </div>
              <div className="text-left">
                <span className="text-xs text-slate-500 dark:text-slate-400 block">完成率</span>
                <span className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-tight">
                  {monthlyStats.rate >= 80 ? '表现出色！' : monthlyStats.rate >= 60 ? '继续加油！' : '坚持不懈！'}
                </span>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  本月您已完成 {monthlyStats.completed}/{Math.max(monthlyStats.total, monthlyStats.completed)} 个任务。
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 活动趋势图 */}
        <section className="space-y-3 pb-8">
          <h2 className="text-base font-semibold">专注活动趋势</h2>
          <div className="bg-white dark:bg-primary/5 border border-slate-100 dark:border-primary/10 rounded-xl p-4 h-64 overflow-hidden relative">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#13c8ec" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#13c8ec" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis hide={true} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#101f22', border: 'none', borderRadius: '12px', color: '#fff' }}
                  itemStyle={{ color: '#13c8ec' }}
                  formatter={(value) => [`${value} 分钟`, '专注时长']}
                  cursor={{ stroke: '#13c8ec', strokeWidth: 1 }}
                />
                <Area
                  key={activePeriod}
                  type="monotone"
                  dataKey="value"
                  stroke="#13c8ec"
                  fillOpacity={1}
                  fill="url(#colorVal)"
                  strokeWidth={3}
                  animationDuration={1000}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Statistics;
