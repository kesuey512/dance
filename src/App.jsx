import React, { useEffect, useMemo, useState } from "react";
import { DANCE_USER_ID, isSupabaseEnabled, supabase } from "./supabaseClient";

const STUDIOS = ["欲非", "Simple", "Newhope", "Trexdance", "Gsteps", "学校"];
const DURATION_PRESETS = [90, 120, 140];
const LOCAL_CACHE_KEY = "dance_pwa_records_v3";

function todayISO() {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 10);
}

function getWeekKey(dateStr) {
  const date = new Date(dateStr + "T00:00:00");
  const day = date.getDay() || 7;
  date.setDate(date.getDate() + 4 - day);
  const yearStart = new Date(date.getFullYear(), 0, 1);
  const week = Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
  return `${date.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

function getMonthKey(dateStr) {
  return dateStr.slice(0, 7);
}

function shiftDate(dateStr, diff) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + diff);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 10);
}

function getLastNDays(n) {
  const today = todayISO();
  return Array.from({ length: n }, (_, i) => shiftDate(today, i - n + 1));
}

function getHeatLevel(minutes) {
  if (!minutes) return 0;
  if (minutes < 60) return 1;
  if (minutes < 90) return 2;
  if (minutes < 120) return 3;
  if (minutes < 140) return 4;
  return 5;
}

function heatClass(level) {
  const classes = [
    "bg-neutral-100 border-neutral-200 text-neutral-400",
    "bg-sky-100 border-sky-200 text-sky-900",
    "bg-violet-100 border-violet-200 text-violet-900",
    "bg-amber-100 border-amber-200 text-amber-900",
    "bg-orange-300 border-orange-300 text-orange-950",
    "bg-rose-500 border-rose-500 text-white",
  ];
  return classes[level] || classes[0];
}

function barClass(index) {
  const classes = [
    "bg-sky-500",
    "bg-violet-500",
    "bg-amber-500",
    "bg-rose-500",
    "bg-teal-500",
    "bg-orange-500",
  ];
  return classes[index % classes.length];
}

function formatMinutes(mins) {
  if (!mins) return "0 min";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

function makeId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function toAppRecord(row) {
  return {
    id: row.id,
    date: row.date,
    studio: row.studio,
    duration: Number(row.duration),
    note: row.note || "",
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
  };
}

function readLocalCache() {
  try {
    const saved = localStorage.getItem(LOCAL_CACHE_KEY) || localStorage.getItem("dance_pwa_records_v2");
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function writeLocalCache(records) {
  try {
    localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(records));
  } catch {
    // Ignore storage errors.
  }
}

function Card({ children, className = "" }) {
  return <div className={`rounded-3xl border border-neutral-200 bg-white shadow-sm ${className}`}>{children}</div>;
}

function PrimaryButton({ children, className = "", ...props }) {
  return (
    <button
      className={`rounded-2xl bg-gradient-to-r from-violet-500 to-rose-500 px-4 py-3 text-sm font-medium text-white shadow-sm active:scale-[0.99] disabled:opacity-40 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

function SecondaryButton({ children, selected = false, className = "", ...props }) {
  return (
    <button
      className={`rounded-2xl border px-4 py-3 text-sm font-medium active:scale-[0.99] ${
        selected ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200 bg-white text-neutral-800"
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

function FieldLabel({ children }) {
  return <label className="text-sm font-medium text-neutral-700">{children}</label>;
}

export default function DanceTrackerPWA() {
  const [records, setRecords] = useState([]);
  const [date, setDate] = useState(todayISO());
  const [studio, setStudio] = useState("学校");
  const [duration, setDuration] = useState(140);
  const [customDuration, setCustomDuration] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState(isSupabaseEnabled ? "正在同步云端数据..." : "未配置 Supabase，当前为本地缓存模式");

  useEffect(() => {
    const cached = readLocalCache();
    if (cached.length) setRecords(cached.map(toAppRecord));

    async function loadFromSupabase() {
      if (!isSupabaseEnabled || !supabase) {
        setLoading(false);
        return;
      }

      setLoading(true);
      const { data, error } = await supabase
        .from("dance_records")
        .select("id,date,studio,duration,note,created_at,user_id")
        .eq("user_id", DANCE_USER_ID)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) {
        console.error(error);
        setSyncStatus(`云端读取失败：${error.message}。暂时使用本地缓存。`);
      } else {
        const next = (data || []).map(toAppRecord);
        setRecords(next);
        writeLocalCache(next);
        setSyncStatus("云端同步正常");
      }
      setLoading(false);
    }

    loadFromSupabase();
  }, []);

  useEffect(() => {
    writeLocalCache(records);
  }, [records]);

  const sortedRecords = useMemo(() => {
    return [...records].sort((a, b) => `${b.date} ${b.createdAt}`.localeCompare(`${a.date} ${a.createdAt}`));
  }, [records]);

  const stats = useMemo(() => {
    const now = todayISO();
    const currentWeek = getWeekKey(now);
    const currentMonth = getMonthKey(now);
    let today = 0;
    let week = 0;
    let month = 0;
    let total = 0;

    records.forEach((r) => {
      total += r.duration;
      if (r.date === now) today += r.duration;
      if (getWeekKey(r.date) === currentWeek) week += r.duration;
      if (getMonthKey(r.date) === currentMonth) month += r.duration;
    });

    return { today, week, month, total, count: records.length };
  }, [records]);

  const weeklyData = useMemo(() => {
    const map = new Map();
    records.forEach((r) => {
      const key = getWeekKey(r.date);
      map.set(key, (map.get(key) || 0) + r.duration);
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-8)
      .map(([week, minutes]) => ({ week, minutes }));
  }, [records]);

  const studioData = useMemo(() => {
    const map = new Map();
    records.forEach((r) => map.set(r.studio, (map.get(r.studio) || 0) + r.duration));
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));
  }, [records]);

  const heatmapData = useMemo(() => {
    const map = new Map();
    records.forEach((r) => map.set(r.date, (map.get(r.date) || 0) + r.duration));
    return getLastNDays(35).map((dateStr) => {
      const minutes = map.get(dateStr) || 0;
      return { date: dateStr, minutes, level: getHeatLevel(minutes) };
    });
  }, [records]);

  const addRecord = async () => {
    const finalDuration = Number(customDuration) > 0 ? Number(customDuration) : Number(duration);
    if (!date || !studio || !finalDuration || finalDuration <= 0) return;

    const optimisticRecord = {
      id: makeId(),
      date,
      studio,
      duration: finalDuration,
      note: note.trim(),
      createdAt: new Date().toISOString(),
    };

    setRecords((prev) => [optimisticRecord, ...prev]);
    setCustomDuration("");
    setNote("");

    if (!isSupabaseEnabled || !supabase) {
      setSyncStatus("已保存到本地缓存；Supabase 未配置，无法云同步");
      return;
    }

    const { data, error } = await supabase
      .from("dance_records")
      .insert({
        date: optimisticRecord.date,
        studio: optimisticRecord.studio,
        duration: optimisticRecord.duration,
        note: optimisticRecord.note,
        user_id: DANCE_USER_ID,
      })
      .select("id,date,studio,duration,note,created_at,user_id")
      .single();

    if (error) {
      console.error(error);
      setSyncStatus(`云端保存失败：${error.message}。该条已暂存在本地。`);
      return;
    }

    const saved = toAppRecord(data);
    setRecords((prev) => [saved, ...prev.filter((r) => r.id !== optimisticRecord.id)]);
    setSyncStatus("云端保存成功");
  };

  const removeRecord = async (id) => {
    const previous = records;
    setRecords((prev) => prev.filter((r) => r.id !== id));

    if (!isSupabaseEnabled || !supabase) {
      setSyncStatus("已从本地删除；Supabase 未配置");
      return;
    }

    const { error } = await supabase
      .from("dance_records")
      .delete()
      .eq("id", id)
      .eq("user_id", DANCE_USER_ID);

    if (error) {
      console.error(error);
      setRecords(previous);
      setSyncStatus(`云端删除失败：${error.message}`);
    } else {
      setSyncStatus("云端删除成功");
    }
  };

  const exportCSV = () => {
    const header = ["date", "studio", "duration_min", "note", "created_at"];
    const rows = sortedRecords.map((r) => [r.date, r.studio, r.duration, r.note || "", r.createdAt]);
    const csvRows = [header, ...rows].map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
    );
    const csv = csvRows.join(String.fromCharCode(10));
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "dance-records.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const monthlyTarget = 1200;
  const progress = Math.min(100, Math.round((stats.month / monthlyTarget) * 100));
  const maxWeekly = Math.max(1, ...weeklyData.map((d) => d.minutes));
  const maxStudio = Math.max(1, ...studioData.map((d) => d.value));

  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-5 text-neutral-900 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-5">
        <section className="space-y-2">
          <div className="text-sm text-neutral-500">Dance Tracker · Supabase Sync</div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">跳舞记录</h1>
          <p className="text-sm leading-6 text-neutral-600 sm:text-base">手机快速补记舞室与时长，数据优先同步到 Supabase 云端。</p>
        </section>

        <Card className="border-violet-100 bg-gradient-to-r from-violet-50 to-rose-50">
          <div className="flex items-center justify-between gap-3 p-4 text-sm text-neutral-700 sm:p-5">
            <span>{loading ? "正在加载..." : syncStatus}</span>
            <span className="shrink-0 rounded-full bg-white/80 px-3 py-1 text-xs text-neutral-600">
              {isSupabaseEnabled ? "Cloud" : "Local"}
            </span>
          </div>
        </Card>

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="今日" value={formatMinutes(stats.today)} />
          <StatCard label="本周" value={formatMinutes(stats.week)} />
          <StatCard label="本月" value={formatMinutes(stats.month)} />
          <StatCard label="记录数" value={`${stats.count} 次`} />
        </section>

        <Card>
          <div className="space-y-4 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">新增记录</h2>
                <p className="mt-1 text-sm text-neutral-500">优先点 90 / 120 / 140，自定义用于迟到、排练或临时练习。</p>
              </div>
              <button onClick={exportCSV} className="rounded-2xl border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700">
                导出 CSV
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <FieldLabel>日期</FieldLabel>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:border-neutral-900"
                />
              </div>

              <div className="space-y-2">
                <FieldLabel>舞室</FieldLabel>
                <select
                  value={studio}
                  onChange={(e) => setStudio(e.target.value)}
                  className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:border-neutral-900"
                >
                  {STUDIOS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <FieldLabel>跳舞时长</FieldLabel>
              <div className="grid grid-cols-3 gap-2">
                {DURATION_PRESETS.map((m) => (
                  <SecondaryButton
                    key={m}
                    selected={duration === m && !customDuration}
                    onClick={() => {
                      setDuration(m);
                      setCustomDuration("");
                    }}
                  >
                    {m} min
                  </SecondaryButton>
                ))}
              </div>
              <input
                inputMode="numeric"
                type="number"
                min="1"
                placeholder="自定义分钟数，例如 160"
                value={customDuration}
                onChange={(e) => setCustomDuration(e.target.value)}
                className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:border-neutral-900"
              />
              <div className="text-xs text-neutral-500">当前将保存：{customDuration ? customDuration : duration} min</div>
            </div>

            <div className="space-y-2">
              <FieldLabel>备注，可不填</FieldLabel>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="例如：两节课连上 / 下次复习副歌 / 状态一般"
                className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:border-neutral-900"
              />
            </div>

            <PrimaryButton onClick={addRecord} className="w-full text-base" disabled={loading}>
              保存记录
            </PrimaryButton>
          </div>
        </Card>

        <Card>
          <div className="space-y-3 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">本月目标</h2>
                <p className="mt-1 text-sm text-neutral-500">默认目标：1200 min，后续可改成可编辑。</p>
              </div>
              <div className="text-2xl font-semibold">{progress}%</div>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-neutral-200">
              <div className="h-full rounded-full bg-gradient-to-r from-sky-400 via-violet-400 to-rose-400" style={{ width: `${progress}%` }} />
            </div>
            <div className="text-sm text-neutral-600">{formatMinutes(stats.month)} / {formatMinutes(monthlyTarget)}</div>
          </div>
        </Card>

        <Card>
          <div className="space-y-4 p-4 sm:p-5">
            <div>
              <h2 className="text-xl font-semibold">最近 35 天热力图</h2>
              <p className="mt-1 text-sm text-neutral-500">颜色越深表示当天跳舞时长越长。</p>
            </div>
            <div className="grid grid-cols-7 gap-2">
              {heatmapData.map((d) => (
                <div
                  key={d.date}
                  title={`${d.date} · ${d.minutes} min`}
                  className={`flex aspect-square items-center justify-center rounded-xl border text-[11px] font-medium ${heatClass(d.level)}`}
                >
                  {Number(d.date.slice(-2))}
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between text-xs text-neutral-500">
              <span>少</span>
              <div className="flex items-center gap-1">
                {[0, 1, 2, 3, 4, 5].map((level) => (
                  <span key={level} className={`h-4 w-4 rounded border ${heatClass(level)}`} />
                ))}
              </div>
              <span>多</span>
            </div>
          </div>
        </Card>

        <section className="grid gap-4 lg:grid-cols-2">
          <Card>
            <div className="space-y-4 p-4 sm:p-5">
              <h2 className="text-xl font-semibold">近 8 周训练量</h2>
              {weeklyData.length === 0 ? (
                <EmptyText>保存记录后显示周统计。</EmptyText>
              ) : (
                <div className="space-y-3">
                  {weeklyData.map((d, index) => (
                    <div key={d.week} className="space-y-1">
                      <div className="flex justify-between text-xs text-neutral-500">
                        <span>{d.week}</span>
                        <span>{d.minutes} min</span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-neutral-100">
                        <div className={`h-full rounded-full ${barClass(index)}`} style={{ width: `${Math.max(6, (d.minutes / maxWeekly) * 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          <Card>
            <div className="space-y-4 p-4 sm:p-5">
              <h2 className="text-xl font-semibold">舞室时长占比</h2>
              {studioData.length === 0 ? (
                <EmptyText>保存记录后显示舞室占比。</EmptyText>
              ) : (
                <div className="space-y-3">
                  {studioData.map((d, index) => (
                    <div key={d.name} className="space-y-1">
                      <div className="flex justify-between text-xs text-neutral-500">
                        <span>{d.name}</span>
                        <span>{d.value} min</span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-neutral-100">
                        <div className={`h-full rounded-full ${barClass(index)}`} style={{ width: `${Math.max(6, (d.value / maxStudio) * 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </section>

        <Card>
          <div className="space-y-3 p-4 sm:p-5">
            <h2 className="text-xl font-semibold">最近记录</h2>
            {sortedRecords.length === 0 ? (
              <EmptyText>暂无记录。先保存一条跳舞时长。</EmptyText>
            ) : (
              <div className="space-y-2">
                {sortedRecords.slice(0, 20).map((r) => (
                  <div key={r.id} className="flex items-center justify-between gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-3">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{r.date} · {r.studio} · {formatMinutes(r.duration)}</div>
                      {r.note && <div className="truncate text-sm text-neutral-500">{r.note}</div>}
                    </div>
                    <button className="shrink-0 rounded-xl px-3 py-2 text-sm text-neutral-500" onClick={() => removeRecord(r.id)}>
                      删除
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </main>
  );
}

function StatCard({ label, value }) {
  return (
    <Card>
      <div className="space-y-2 p-4">
        <div className="text-sm text-neutral-500">{label}</div>
        <div className="text-2xl font-semibold tracking-tight">{value}</div>
      </div>
    </Card>
  );
}

function EmptyText({ children }) {
  return <div className="rounded-2xl bg-neutral-50 px-4 py-6 text-sm text-neutral-500">{children}</div>;
}
