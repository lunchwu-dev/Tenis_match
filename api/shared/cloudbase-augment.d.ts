// CloudBase Node SDK v3.18 的 .d.ts 未声明 rdb / mysql（运行时存在，指向 postgREST 客户端）。
// 这里做模块增强，使 app.rdb() / app.mysql() 能通过类型检查。
// postgREST 链式 API 与 Supabase JS 完全一致，因此调用点只需把 supabase 替换为 db。
declare module '@cloudbase/node-sdk' {
  interface CloudBase {
    rdb: any;
    mysql: any;
  }
}

export {};
