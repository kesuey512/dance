# Dance Tracker PWA - Supabase Sync Version

这是跳舞记录 PWA 的 Supabase 云端同步版。记录会优先写入 Supabase；如果 Supabase 未配置或网络失败，会使用浏览器本地缓存兜底。

## 1. Supabase 建表

1. 打开 Supabase，创建一个新项目。
2. 进入左侧 SQL Editor。
3. 新建 Query。
4. 复制 `supabase-schema.sql` 里的全部内容并运行。

建好的表名是：`dance_records`。

## 2. 获取 Supabase 环境变量

在 Supabase 项目中：

Settings → API

复制：

- Project URL
- anon public key

## 3. 本地运行

复制 `.env.example` 为 `.env.local`，填入：

```bash
VITE_SUPABASE_URL=https://你的项目id.supabase.co
VITE_SUPABASE_ANON_KEY=你的-anon-public-key
VITE_DANCE_USER_ID=yan
```

然后运行：

```bash
npm install
npm run dev
```

## 4. Vercel 部署

在 Vercel 项目中进入：

Settings → Environment Variables

添加：

```bash
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_DANCE_USER_ID
```

添加后必须重新部署：

Deployments → 选择最新部署 → Redeploy

## 5. 重要说明

这个版本使用 Supabase anon key 和宽松 RLS policy，适合个人轻量记录，不适合存储敏感隐私。舞蹈记录通常问题不大。若后续需要真正私密账号系统，应升级为 Supabase Auth 版本。

