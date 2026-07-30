# PhysioVision

PhysioVision 是一个面向康复训练场景的原型项目，包含治疗师前端、本地动作监测程序和 FastAPI 业务接口骨架。

当前目标是完成可演示、可迭代的核心闭环，不以一次性实现完整医院级平台为目标。

## 当前状态

| 模块 | 状态 | 说明 |
| --- | --- | --- |
| 前端 | 可运行原型 | 页面和交互已完成，当前使用 `lib/mockData.ts` |
| 本地动作监测 | 可独立运行 | 支持 MediaPipe 姿态识别、动作计数、错误录像和 Telegram 通知 |
| FastAPI 后端 | 接口骨架 | 路由、模型和 Schema 已建立，部分接口仍返回演示数据 |
| 系统集成 | 待完成 | 前端、后端和动作监测程序尚未形成实时数据闭环 |

## 核心范围

近期只聚焦以下功能：

1. 摄像头或视频中的人体姿态识别。
2. 弯举、深蹲、平板支撑和俯卧撑的动作分析。
3. 训练次数、状态和错误动作记录。
4. FastAPI 接收并保存训练会话结果。
5. 治疗师前端展示患者、训练会话、告警和报告。

Redis、MinIO、FHIR/HL7、LangGraph、多边缘节点和云端部署属于可选扩展，不是当前核心功能的前置条件。

## 技术栈

- 前端：Next.js 14、React 18、TypeScript、MUI、ECharts
- 后端：FastAPI、Pydantic、SQLAlchemy、SQLite
- 视觉监测：Python、OpenCV、MediaPipe
- 通知：Telegram Bot（可选）

## 项目结构

```text
PhysioVision/
├── app/                  Next.js App Router 页面
├── components/           前端布局、仪表盘和通用组件
├── lib/mockData.ts       前端演示数据
├── backend/
│   ├── main.py           FastAPI 入口
│   └── app/
│       ├── api/v1/       REST API
│       ├── models/       SQLAlchemy 模型
│       ├── schemas/      Pydantic Schema
│       ├── services/     业务服务
│       ├── agents/       规则分析和 Agent 原型
│       └── core/         配置、数据库和安全模块
├── Physio_AI_Bot/        本地动作监测程序
├── docs/                 当前架构和 API 说明
└── start.bat             前端开发服务器启动脚本
```

`Physio_AI_Bot` 作为 Git 子模块维护。首次克隆时请使用：

```powershell
git clone --recurse-submodules <repository-url>
```

已有工作副本可运行 `git submodule update --init --recursive`。

## 页面

| 路径 | 用途 |
| --- | --- |
| `/` | 产品首页 |
| `/login` | 登录 |
| `/register` | 注册 |
| `/dashboard` | 治疗师仪表盘 |
| `/patients` | 患者管理 |
| `/exercises` | 训练项目 |
| `/reports` | 报告与告警 |
| `/settings` | 系统设置 |

## 本地运行

### 前端

需要 Node.js 18 或更高版本。

```powershell
npm install --legacy-peer-deps
npm run dev
```

也可以从项目根目录运行 `.\start.bat`。访问 <http://localhost:3000>。

### 后端

需要 Python 3.10 或更高版本。

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python main.py
```

- API：<http://localhost:8000>
- Swagger：<http://localhost:8000/docs>
- 健康检查：<http://localhost:8000/health>

### 本地动作监测

具体环境配置和快捷键见 `Physio_AI_Bot/README.md`。

```powershell
cd Physio_AI_Bot
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python physio_form_monitor.py
```

也可以把视频路径作为参数传入。

## 当前 API

FastAPI 主路由位于 `/api/v1`：

- `/patients`
- `/exercises`
- `/sessions`
- `/reports`
- `/alerts`
- `/analytics`
- `/clinic`

接口契约参见 `docs/API_SPEC.md`。部分接口仍是演示实现，使用前应以代码行为为准。

## 推荐实现顺序

1. 定义动作监测程序向后端提交的最小会话数据结构。
2. 完成会话、患者和告警的 SQLite 持久化。
3. 让前端逐步从 Mock 数据切换到 FastAPI。
4. 最后按实际需要增加实时 WebSocket、外部存储或医疗系统集成。

架构现状和边界见 `docs/ARCHITECTURE.md`。
