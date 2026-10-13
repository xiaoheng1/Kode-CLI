/**
 * 这里仅导入了类型，指向那个函数的、只活在类型层面的引用
 * export async funciton queryLLM(...) {...} 这个声明同时在两个空间中注册了内容：
 * 1、值空间，一个真正的函数对象
 * 2、类型空间，这个函数的签名类型
 */
import type {
  queryLLM as queryLLMImpl,
  queryQuick as queryQuickImpl,
} from '#core/ai/llm'

/**
 * 把函数 queryLLMImpl 的类型签名，起个别名叫 QueryLLM
 */
type QueryLLM = typeof queryLLMImpl
type QueryQuick = typeof queryQuickImpl

/**
 * 是完整功能的底层查询函数（传什么模型、工具、参数都有调用方决定）
 * Parameters：typescript 中原生的类型。这里表达的是 args 和调用 llm.ts 中的 queryLLM 参数类型相同
 * ReturnType：类似 Parameters.
 * @param args
 */
export async function queryLLM(
  ...args: Parameters<QueryLLM>
): ReturnType<QueryLLM> {
  // import(...) 是动态导入，返回以恶搞 Promise<模块对象>
  // #core/ai/llm 是路径别名（#core -> package/core/src）-- 来自 tsconfig.json 中的配置
  // {queryLLM: inner} -- 解构 + 重命名
  const { queryLLM: inner } = await import('#core/ai/llm')
  return inner(...args)
}

export async function queryQuick(
  ...args: Parameters<QueryQuick>
): ReturnType<QueryQuick> {
  const { queryQuick: inner } = await import('#core/ai/llm')
  return inner(...args)
}

export async function verifyApiKey(
  apiKey: string,
  baseURL?: string,
  provider?: string,
): Promise<boolean> {
  const { verifyApiKey: inner } = await import('#core/ai/llm')
  return inner(apiKey, baseURL, provider)
}

export async function fetchAnthropicModels(
  apiKey: string,
  baseURL?: string,
): Promise<any[]> {
  const { fetchAnthropicModels: inner } = await import('#core/ai/llm')
  return inner(apiKey, baseURL)
}
