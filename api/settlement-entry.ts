/**
 * CloudBase Timer 事件函数入口
 *
 * 由 cloudbaserc.json 中声明的 timer 触发器（每 12 小时）调用。
 * CloudBase 的 Timer 触发器只对"事件函数"（非 HTTP 函数）生效，
 * 因此本文件独立于 HTTP 服务（server.ts），仅导出 main(event, context)。
 *
 * 复用 api/shared 中的 db / redis / elo 单例，执行超时比赛自动结算。
 */
import { runTimeoutSettlement } from './shared/settlement.service';

export async function main(event: any, context: any) {
  console.log('[tennis-settlement] timer triggered', JSON.stringify(event ?? {}));
  try {
    const result = await runTimeoutSettlement();
    console.log('[tennis-settlement] done', JSON.stringify(result));
    return { success: true, data: result };
  } catch (error: any) {
    console.error('[tennis-settlement] error', error);
    return { success: false, error: error.message };
  }
}
