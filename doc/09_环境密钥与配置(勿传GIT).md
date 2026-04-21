# 环境密钥与配置 (SECRETS)

> ⚠️ **高危安全警告 (SECURITY WARNING)** ⚠️
> **本文件包含生产环境的核心访问凭证。**
> **绝对不要将此文件提交到任何 Git 远程仓库（如 GitHub、Gitee 等）！**
> 在进行任何 `git commit` 前，请务必确保已将本文件（`doc/09_环境密钥与配置(勿传GIT).md`）加入到项目的 `.gitignore` 文件中！

---

## 1. Vercel 部署密钥

用于通过 Vercel CLI 或自动化脚本将 API 服务部署到 Vercel Serverless 平台。

*   **Vercel Token**: `vcp_4RAyBkjnJ7piJWoSS5PhRD2dN7JdNZ6dEKv8LZ6Que2AVNqU4X3T8JO5`

*使用场景：*
在本地命令行终端执行 Vercel 部署，或在全球 CI/CD 管道（如 GitHub Actions）中配置 `VERCEL_TOKEN` 环境变量以触发自动构建发布。

---

## 2. GitHub 访问令牌 (Personal Access Token)

用于通过脚本自动化操作 GitHub 仓库（如推拉代码、操作 Action Secrets、管理代码存档等）。

*   **GitHub PAT**: `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`

*使用场景：*
后续我们将代码自动化归档、或者需要让 Vercel 读取私有仓库代码以进行自动部署时进行授权凭证。

---

## 建议行动 (Action Items)

为防止密钥泄露造成严重的损失（例如云资源被恶意盗用），请在项目根目录下执行以下操作：

1. 打开或创建 `.gitignore` 文件。
2. 增加如下规则，以忽略含有敏感配置的文档：

```text
# 忽略敏感配置文件
doc/09_环境*.md
*.env
.env.*
```