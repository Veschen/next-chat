/**
 * 全局常量配置
 */
import type { CRequestOptions } from "./request"
import type { QuestionItem, ShortcutItem, SuggestionItem } from "./types"

/**
 * 请求选项
 */
export const REQUEST_OPTIONS: CRequestOptions = {
    baseURL: "/api/chat",
    timeout: 30_000,
    streamTimeout: 15_000
}

/**
 * 提供商选项
 */
export const PROVIDER_OPTIONS = [
    {
        value: "mock",
        label: "Mock"
    },
    {
        value: "openai",
        label: "通义千问"
    }
] as const

/**
 * Mock模式下的快捷指令，对应route.ts 中的 handleMock 函数
 */
export const MOCK_SHORTCUTS: ShortcutItem[] = [
    {
        label: "热量分析",
        description: "分析饮食摄入热量",
        prompt: "帮我分析今天饮食摄入热量是多少"
    },
    {
        label: "代码编写",
        description: "编写或优化代码",
        prompt: "给我几个经典的函数代码示例"
    },
    {
        label: "数据表格",
        description: "生成对比表格",
        prompt: "帮我生成一个编程语言对比表格，包含性能、生态、适用场景"
    },
    {
        label: "图表可视化",
        description: "画流程图",
        prompt: "帮我画一个流程图"
    },
    {
        label: "公式推导",
        description: "推导数学公式",
        prompt: "帮我推导几个数学公式，比如二次方程求根公式等"
    },
    {
        label: "EChart图表",
        description: "生成数据可视化图表",
        prompt: "帮我生成一个EChart图表示例，展示不同产品的月度销售额对比"
    },
    {
        label: "HTML演示",
        description: "生成交互式HTML演示页面",
        prompt: "帮我生成一个HTML交互动画演示示例"
    }
]

/**
 * 欢迎页常见问题
 */
export const WELCOME_QUESTIONS: QuestionItem[] = [
    {
        label: "帮我分析饮食热量",
        icon: "🍽️",
        prompt: "帮我分析今天饮食摄入热量是多少"
    },
    {
        label: "帮我写一个编程函数",
        icon: "📝",
        prompt: "给我几个经典的函数代码示例"
    },
    {
        label: "帮我画一个流程图",
        icon: "📖",
        prompt: "帮我画个流程图"
    },
    {
        label: "帮我推导一个数学公式",
        icon: "🧮",
        prompt: "帮我推导几个数学公式，比如二次方程求根公式等"
    }
]

/**
 * 建议回复列表
 */
export const DEFAULT_SUGGESTIONS: SuggestionItem[] = [
    {
        label: "继续深入分析",
        prompt: "请继续深入分析，提供更详细的建议"
    },
    {
        label: "换个角度解释",
        prompt: "请换个角度解释问题，提供不同的视角"
    },
    {
        label: "给个实际案例",
        prompt: "请给出一个实际案例，展示问题的应用场景"
    }
]
