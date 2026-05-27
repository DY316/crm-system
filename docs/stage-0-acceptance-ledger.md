# 阶段 0 验收台账

验收日期：2026-05-27

## 1. feature/backend-foundation

- 分支：`feature/backend-foundation`
- 合并 commit：`c67b32137f7f1e894f932597c2edf89450399573`
  - 说明：该分支以快进方式进入 `develop`，本地历史中未产生双亲 merge commit；以上 commit 为合入 `develop` 后的分支落点。
- 验收结论：PASS
- 验收日期：2026-05-27
- 核心通过项：
  - NestJS server foundation
  - API prefix and health endpoint
  - request context / request id
  - response envelope
  - exception filter and validation pipe
  - Prisma service shell
  - `server:typecheck`
  - `server:build`
- 已知风险：
  - 仅作为阶段 0 后端基座，不包含认证、RBAC、审计安全、可观测性闭环或 CRM 业务能力。
  - 后续功能分支必须继续保持阶段 0 边界，避免提前引入 CRM 业务模块。
- 是否允许作为阶段 0 基线：是

## 2. feature/database-foundation

- 分支：`feature/database-foundation`
- 合并 commit：`94d28b7f25b18013fd5a879c914dce29aeaa1273`
- GitHub Actions run id：`26495828603`
  - Workflow：Database Foundation
  - Run URL：https://github.com/DY316/crm-system/actions/runs/26495828603
  - 结论：success
- 验收结论：PASS
- 验收日期：2026-05-27
- 核心通过项：
  - PostgreSQL service
  - migrate
  - seed
  - verify-foundation
  - typecheck
  - build
- 已知风险：
  - 仅完成阶段 0 数据库基座，不代表 CRM 业务模型已开放实现。
  - seed 管理员密码必须在真实环境中替换，禁止沿用示例值。
  - 权限、角色、审计相关后续变更必须保持显式迁移和可验收记录。
- 是否允许作为阶段 0 基线：是

## 3. 阶段 0 当前边界

- 允许继续做 `auth-rbac`
- 允许继续做 `audit-security`
- 允许继续做 `backend-observability`
- 禁止进入 CRM 业务模块

## 4. 后续分支创建规则

- 必须从最新 `develop` 创建
- 禁止从旧 feature 分支拉新分支

## 5. merge 门禁

- 没有验收记录不得 merge
- CI 未通过不得 merge
- 越界不得 merge

## 6. 下一批 feature 分支许可

- 是否允许创建下一批 feature 分支：是
- 前置条件：
  - 当前 `develop` 必须保持最新。
  - 新分支只能从最新 `develop` 创建。
  - 分支范围仅限 `auth-rbac`、`audit-security`、`backend-observability`。
  - 不得进入 CRM 业务模块。
