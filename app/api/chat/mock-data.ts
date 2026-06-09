const MOCK_ECHART_THINKING = '让我用图表来展示数据可视化...'

const MOCK_ECHART_REPLAY =
    '## EChart 数据可视化\n\n' +
    '下面是一个展示不同产品月度销售额对比的图表：\n\n' +
    '```echart\n' +
    '{\n' +
    '  "title": {\n' +
    '    "text": "产品月度销售额对比",\n' +
    '    "left": "center",\n' +
    '    "textStyle": {\n' +
    '      "fontSize": 16\n' +
    '    }\n' +
    '  },\n' +
    '  "tooltip": {\n' +
    '    "trigger": "axis",\n' +
    '    "axisPointer": {\n' +
    '      "type": "shadow"\n' +
    '    }\n' +
    '  },\n' +
    '  "legend": {\n' +
    '    "data": ["产品A", "产品B", "产品C"],\n' +
    '    "bottom": 10\n' +
    '  },\n' +
    '  "grid": {\n' +
    '    "left": "3%",\n' +
    '    "right": "4%",\n' +
    '    "bottom": "15%",\n' +
    '    "top": "15%",\n' +
    '    "containLabel": true\n' +
    '  },\n' +
    '  "xAxis": {\n' +
    '    "type": "category",\n' +
    '    "data": ["1月", "2月", "3月", "4月", "5月", "6月"]\n' +
    '  },\n' +
    '  "yAxis": {\n' +
    '    "type": "value",\n' +
    '    "name": "销售额(万元)"\n' +
    '  },\n' +
    '  "series": [\n' +
    '    {\n' +
    '      "name": "产品A",\n' +
    '      "type": "bar",\n' +
    '      "data": [120, 132, 101, 134, 190, 230],\n' +
    '      "itemStyle": {\n' +
    '        "color": "#5470c6"\n' +
    '      }\n' +
    '    },\n' +
    '    {\n' +
    '      "name": "产品B",\n' +
    '      "type": "bar",\n' +
    '      "data": [220, 182, 191, 234, 290, 330],\n' +
    '      "itemStyle": {\n' +
    '        "color": "#91cc75"\n' +
    '      }\n' +
    '    },\n' +
    '    {\n' +
    '      "name": "产品C",\n' +
    '      "type": "bar",\n' +
    '      "data": [150, 212, 161, 234, 390, 430],\n' +
    '      "itemStyle": {\n' +
    '        "color": "#fac858"\n' +
    '      }\n' +
    '    }\n' +
    '  ]\n' +
    '}\n' +
    '```\n\n' +
    '再来看一个折线图示例：\n\n' +
    '```echart\n' +
    '{\n' +
    '  "title": {\n' +
    '    "text": "用户增长趋势",\n' +
    '    "left": "center"\n' +
    '  },\n' +
    '  "tooltip": {\n' +
    '    "trigger": "axis"\n' +
    '  },\n' +
    '  "legend": {\n' +
    '    "data": ["新增用户", "活跃用户"],\n' +
    '    "bottom": 10\n' +
    '  },\n' +
    '  "grid": {\n' +
    '    "left": "3%",\n' +
    '    "right": "4%",\n' +
    '    "bottom": "15%",\n' +
    '    "containLabel": true\n' +
    '  },\n' +
    '  "xAxis": {\n' +
    '    "type": "category",\n' +
    '    "boundaryGap": false,\n' +
    '    "data": ["1月", "2月", "3月", "4月", "5月", "6月"]\n' +
    '  },\n' +
    '  "yAxis": {\n' +
    '    "type": "value",\n' +
    '    "name": "人数(人)"\n' +
    '  },\n' +
    '  "series": [\n' +
    '    {\n' +
    '      "name": "新增用户",\n' +
    '      "type": "line",\n' +
    '      "data": [1200, 1320, 1010, 1340, 1900, 2300],\n' +
    '      "smooth": true,\n' +
    '      "lineStyle": {\n' +
    '        "width": 3\n' +
    '      },\n' +
    '      "areaStyle": {\n' +
    '        "opacity": 0.1\n' +
    '      }\n' +
    '    },\n' +
    '    {\n' +
    '      "name": "活跃用户",\n' +
    '      "type": "line",\n' +
    '      "data": [2200, 2820, 2910, 3340, 3900, 4300],\n' +
    '      "smooth": true,\n' +
    '      "lineStyle": {\n' +
    '        "width": 3\n' +
    '      },\n' +
    '      "areaStyle": {\n' +
    '        "opacity": 0.1\n' +
    '      }\n' +
    '    }\n' +
    '  ]\n' +
    '}\n' +
    '```\n\n' +
    '以上图表展示了产品销售数据和用户增长趋势的可视化效果。\n\n'

const MOCK_HTML_THINKING = '让我创建一个交互式 HTML 演示页面...'

const MOCK_HTML_REPLAY =
    '## HTML 交互动画演示\n\n' +
    '下面是一个交互式动画演示：\n\n' +
    '```html\n' +
    '<!DOCTYPE html>\n' +
    '<html lang="zh-CN">\n' +
    '<head>\n' +
    '<meta charset="UTF-8">\n' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
    '<title>交互式动画演示</title>\n' +
    '<style>\n' +
    '  * { margin: 0; padding: 0; box-sizing: border-box; }\n' +
    '  body { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); font-family: Arial, sans-serif; }\n' +
    '  .container { text-align: center; }\n' +
    '  h1 { color: #fff; margin-bottom: 30px; font-size: 28px; }\n' +
    '  .box-container { display: flex; gap: 20px; flex-wrap: wrap; justify-content: center; }\n' +
    '  .box {\n' +
    '    width: 120px; height: 120px; border-radius: 12px; display: flex; align-items: center; justify-content: center;\n' +
    '    color: white; font-size: 14px; font-weight: bold; cursor: pointer;\n' +
    '    transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(0,0,0,0.3);\n' +
    '  }\n' +
    '  .box:hover { transform: translateY(-5px) scale(1.05); }\n' +
    '  .box-1 { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); animation: pulse 2s infinite; }\n' +
    '  .box-2 { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); animation: pulse 2s infinite 0.5s; }\n' +
    '  .box-3 { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); animation: pulse 2s infinite 1s; }\n' +
    '  .box-4 { background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); animation: pulse 2s infinite 1.5s; }\n' +
    '  @keyframes pulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(255,255,255,0.4); } 50% { box-shadow: 0 0 0 15px rgba(255,255,255,0); } }\n' +
    '  .counter { margin-top: 40px; color: #fff; font-size: 24px; }\n' +
    '  .btn { padding: 12px 30px; margin: 10px; border: none; border-radius: 25px; cursor: pointer; font-size: 16px; transition: all 0.3s; }\n' +
    '  .btn-primary { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }\n' +
    '  .btn-primary:hover { transform: scale(1.05); }\n' +
    '  .btn-secondary { background: transparent; border: 2px solid #fff; color: white; }\n' +
    '  .btn-secondary:hover { background: rgba(255,255,255,0.1); }\n' +
    '</style>\n' +
    '</head>\n' +
    '<body>\n' +
    '<div class="container">\n' +
    '  <h1>🎨 交互动画演示</h1>\n' +
    '  <div class="box-container">\n' +
    '    <div class="box box-1" onclick="changeColor(this)">点击变色</div>\n' +
    '    <div class="box box-2" onclick="changeColor(this)">点击变色</div>\n' +
    '    <div class="box box-3" onclick="changeColor(this)">点击变色</div>\n' +
    '    <div class="box box-4" onclick="changeColor(this)">点击变色</div>\n' +
    '  </div>\n' +
    '  <div class="counter">点击次数: <span id="count">0</span></div>\n' +
    '  <div>\n' +
    '    <button class="btn btn-primary" onclick="reset()">重置</button>\n' +
    '    <button class="btn btn-secondary" onclick="addBox()">添加方块</button>\n' +
    '  </div>\n' +
    '</div>\n' +
    '<script>\n' +
    '  let count = 0;\n' +
    '  const colors = [\n' +
    '    "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",\n' +
    '    "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",\n' +
    '    "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",\n' +
    '    "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",\n' +
    '    "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",\n' +
    '    "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)"\n' +
    '  ];\n' +
    '  function changeColor(box) {\n' +
    '    count++;\n' +
    '    document.getElementById("count").textContent = count;\n' +
    '    const randomColor = colors[Math.floor(Math.random() * colors.length)];\n' +
    '    box.style.background = randomColor;\n' +
    '    box.style.transform = "scale(1.1)";\n' +
    '    setTimeout(() => box.style.transform = "", 200);\n' +
    '  }\n' +
    '  function reset() {\n' +
    '    count = 0;\n' +
    '    document.getElementById("count").textContent = "0";\n' +
    '    const boxes = document.querySelectorAll(".box");\n' +
    '    boxes.forEach((box, i) => {\n' +
    '      box.style.background = colors[i % colors.length];\n' +
    '    });\n' +
    '  }\n' +
    '  function addBox() {\n' +
    '    const container = document.querySelector(".box-container");\n' +
    '    const newBox = document.createElement("div");\n' +
    '    newBox.className = "box";\n' +
    '    newBox.style.background = colors[Math.floor(Math.random() * colors.length)];\n' +
    '    newBox.textContent = "新方块";\n' +
    '    newBox.onclick = () => changeColor(newBox);\n' +
    '    container.appendChild(newBox);\n' +
    '  }\n' +
    '</script>\n' +
    '</body>\n' +
    '</html>\n' +
    '```\n\n' +
    '以上演示包含：\n\n' +
    '- 🎨 渐变背景和动画效果\n' +
    '- 🖱️ 点击交互（变色、缩放）\n' +
    '- 📊 计数器功能\n' +
    '- ➕ 动态添加元素\n' +
    '- 🔄 重置功能\n\n' +
    '你可以点击预览按钮查看效果，或点击全屏按钮查看完整演示。\n\n'

const MOCK_THINKING = '让我分析一下用户的问题，然后给出一个详细的回答...'

const MOCK_MERMAID_THINKING = '让我用流程图来展示这个流程...'

const MOCK_MERMAID_REPLAY =
    '## 流程图展示\n\n' +
    '下面是一个用户注册的流程图：\n\n' +
    '```mermaid\n' +
    'graph TD\n' +
    'A[用户访问注册页面] --> B{是否已有账号?}\n' +
    'B -->|是| C[跳转登录页]\n' +
    'B -->|否| D[填写注册信息]\n' +
    'D --> E[提交表单]\n' +
    'E --> F{信息校验}\n' +
    'F -->|通过| G[创建账号]\n' +
    'F -->|失败| H[显示错误提示]\n' +
    'H --> D\n' +
    'G --> I[发送验证邮件]\n' +
    'I --> J[注册完成]\n' +
    '```\n\n' +
    '再来看一个时序图的例子：\n\n' +
    '```mermaid\n' +
    'sequenceDiagram\n' +
    'participant U as 用户\n' +
    'participant F as 前端\n' +
    'participant B as 后端\n' +
    'participant D as 数据库\n' +
    'U->>F: 点击登录\n' +
    'F->>B: POST /api/login\n' +
    'B->>D: 查询用户信息\n' +
    'D-->>B: 返回用户数据\n' +
    'B-->>F: 返回 Token\n' +
    'F-->>U: 跳转首页\n' +
    '```\n\n' +
    '以上流程图展示了常见的用户注册和登录流程，如需调整请告诉我。\n\n'

const MOCK_MATH_THINKING = '让我用数学公式来推导一下...'

const MOCK_MATH_REPLAY =
    '## 数学公式推导\n\n' +
    '### 二次方程求根公式\n\n' +
    '对于一般的二次方程 $ax^2 + bx + c = 0$，其求根公式为：\n\n' +
    '$$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$\n\n' +
    '其中判别式 $\\Delta = b^2 - 4ac$ 决定了根的性质：\n\n' +
    '- 当 $\\Delta > 0$ 时，方程有两个不相等的实根\n' +
    '- 当 $\\Delta = 0$ 时，方程有两个相等的实根\n' +
    '- 当 $\\Delta < 0$ 时，方程无实根\n\n' +
    '### 欧拉公式\n\n' +
    '数学中最优美的公式之一是欧拉恒等式：\n\n' +
    '$$e^{i\\pi} + 1 = 0$$\n\n' +
    '它将五个最重要的数学常数 $e$、$i$、$\\pi$、$1$、$0$ 联系在了一起。\n\n' +
    '### 矩阵运算\n\n' +
    '矩阵乘法的定义如下：\n\n' +
    '$$\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix} \\begin{pmatrix} e \\\\ f \\end{pmatrix} = \\begin{pmatrix} ae + bf \\\\ ce + df \\end{pmatrix}$$\n\n' +
    '以上是一些常见的数学公式示例。\n\n'

const MOCK_TABLE_THINKING = '让我整理一个表格来展示...'

const MOCK_TABLE_REPLAY =
    '## 数据对比\n\n' +
    '### 主流前端框架对比\n\n' +
    '| 框架 | 语言 | 首次发布 | Star 数 | 学习曲线 | 特点 |\n' +
    '|------|------|----------|---------|----------|------|\n' +
    '| React | JavaScript/TSX | 2013 | 220k+ | 中等 | 虚拟 DOM、组件化 |\n' +
    '| Vue | JavaScript/SFC | 2014 | 210k+ | **较低** | 渐进式、双向绑定 |\n' +
    '| Angular | TypeScript | 2016 | 95k+ | 较高 | 全家桶、依赖注入 |\n' +
    '| Svelte | JavaScript | 2016 | 80k+ | 低 | 编译时、无虚拟 DOM |\n' +
    '| Solid | TypeScript/JSX | 2021 | 32k+ | 中等 | 细粒度响应式 |\n\n' +
    '### 性能基准测试（越低越好）\n\n' +
    '| 指标 | React 18 | Vue 3 | Svelte 4 | Solid |\n' +
    '|------|----------|-------|----------|-------|\n' +
    '| 创建 1000 行 | 45ms | 38ms | **22ms** | **18ms** |\n' +
    '| 更新所有行 | 52ms | 42ms | 28ms | 24ms |\n' +
    '| 部分更新 | 12ms | 10ms | 8ms | 6ms |\n' +
    '| 选中行高亮 | 4ms | 3ms | 2ms | 2ms |\n' +
    '| 包体积 (gzip) | 42KB | 33KB | **1.6KB** | 7KB |\n\n' +
    '> 以上数据仅供参考，实际性能取决于应用场景和实现方式。\n\n'

const MOCK_CODE_THINKING = '让我写一个代码示例来说明...'

const MOCK_CODE_REPLAY =
    '## 代码示例\n\n' +
    '### TypeScript - React 自定义 Hook\n\n' +
    '下面是一个常用的防抖 Hook 实现：\n\n' +
    '```typescript\n' +
    'import { useState, useEffect } from "react"\n\n' +
    'function useDebounce<T>(value: T, delayMs: number): T {\n' +
    '  const [debouncedValue, setDebouncedValue] = useState<T>(value)\n\n' +
    '  useEffect(() => {\n' +
    '    const timer = setTimeout(() => {\n' +
    '      setDebouncedValue(value)\n' +
    '    }, delayMs)\n\n' +
    '    return () => clearTimeout(timer)\n' +
    '  }, [value, delayMs])\n\n' +
    '  return debouncedValue\n' +
    '}\n' +
    '```\n\n' +
    '### Python - 装饰器模式\n\n' +
    '```python\n' +
    'import functools\n' +
    'import time\n\n' +
    'def retry(max_attempts: int = 3, delay_seconds: float = 1.0):\n' +
    '    """重试装饰器，支持配置最大重试次数和间隔"""\n' +
    '    def decorator(func):\n' +
    '        @functools.wraps(func)\n' +
    '        def wrapper(*args, **kwargs):\n' +
    '            for attempt in range(1, max_attempts + 1):\n' +
    '                try:\n' +
    '                    return func(*args, **kwargs)\n' +
    '                except Exception as error:\n' +
    '                    if attempt == max_attempts:\n' +
    '                        raise\n' +
    '                    print(f"第 {attempt} 次失败: {error}, 重试中...")\n' +
    '                    time.sleep(delay_seconds)\n' +
    '        return wrapper\n' +
    '    return decorator\n\n' +
    '@retry(max_attempts=3, delay_seconds=2.0)\n' +
    'def fetch_data(url: str) -> dict:\n' +
    '    import requests\n' +
    '    response = requests.get(url)\n' +
    '    response.raise_for_status()\n' +
    '    return response.json()\n' +
    '```\n\n' +
    '### SQL - 复杂查询\n\n' +
    '```sql\n' +
    'SELECT \n' +
    '    u.username,\n' +
    '    COUNT(o.id) AS order_count,\n' +
    '    SUM(o.total_amount) AS total_spent,\n' +
    '    RANK() OVER (ORDER BY SUM(o.total_amount) DESC) AS spending_rank\n' +
    'FROM users u\n' +
    'LEFT JOIN orders o ON u.id = o.user_id\n' +
    'WHERE o.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)\n' +
    'GROUP BY u.id, u.username\n' +
    'HAVING COUNT(o.id) >= 3\n' +
    'ORDER BY total_spent DESC\n' +
    'LIMIT 10;\n' +
    '```\n\n' +
    '以上展示了不同语言的代码高亮效果。如需其他语言的示例，请告诉我。\n\n'

const MOCK_CALORIE_THINKING = '好的，让我根据你的饮食记录来计算，然后给出一个详细的回答...'

const MOCK_CALORIE_REPLY =
    '## 摄入热量分析\n\n' +
    '根据你的饮食记录，为你生成分析报告\n\n' +
    '```card\n' +
    '{\n  "title": "摄入热量分析",\n  "badge": {\n    "text": "已超标",\n    "variant": "destructive"\n  },\n  "tabs": [\n    {\n      "label": "计算过程",\n      "value": "process",\n      "content": "根据以下逻辑，我计算得出你今日已摄入热量超标，总摄入为 2180 大卡。"\n    },\n    {\n      "label": "营养参数",\n      "value": "params",\n      "content": "基础代谢率(BMR): 1650 大卡\\n活动系数: 1.375（轻度运动）\\n目标热量: 1800 大卡/天\\n蛋白质目标: 90g | 碳水目标: 200g | 脂肪目标: 60g"\n    }\n  ],\n  "sections": [\n    {\n      "items": [\n        {\n          "label": "是否超标: 是",\n          "status": "success",\n          "detail": "实际摄入 2180 大卡 > 目标摄入 1800 大卡，超标 380 大卡"\n        },\n        {\n          "label": "建议减少量 380 大卡",\n          "status": "info",\n          "highlight": "推荐运动消耗 40分钟",\n          "detail": "慢跑 2400 大卡 - 早餐 520 大卡 - 午餐 860 大卡 - 晚餐 800 大卡 = 超标 380 大卡"\n        }\n      ]\n    },\n    {\n      "title": "总结",\n      "items": [\n        {\n          "label": "午餐摄入了高热量食物（炸鸡套餐），导致总热量偏高",\n          "status": "info"\n        },\n        {\n          "label": "按每日 1800 大卡目标，建议晚间增加 40 分钟有氧运动消耗多余热量",\n          "status": "info"\n        },\n        {\n          "label": "蛋白质摄入达标（95g/90g），但碳水超标 15%，建议减少精制碳水",\n          "status": "success"\n        }\n      ]\n    }\n  ],\n  "footer": {\n    "buttons": [\n      {\n        "text": "确认记录",\n        "variant": "default"\n      },\n      {\n        "text": "查看详情",\n        "variant": "outline"\n      }\n    ]\n  }\n}' +
    '\n```\n\n' +
    '---\n\n以上是根据你的饮食记录计算出的摄入热量分析报告，有任何问题，请随时问我。\n\n'

const MOCK_APPLE_COUNT_THINKING = '让我查看你的苹果食用记录...'

const MOCK_APPLE_COUNT_REPLY =
    '## 苹果食用记录\n\n' +
    '```card\n' +
    '{\n' +
    '  "title": "今日苹果食用记录",\n' +
    '  "badge": {\n' +
    '    "text": "待确认",\n' +
    '    "variant": "outline"\n' +
    '  },\n' +
    '  "sections": [\n' +
    '    {\n' +
    '      "title": "当前记录",\n' +
    '      "items": [\n' +
    '        {\n' +
    '          "label": "今日已食用苹果数量",\n' +
    '          "detail": "2个",\n' +
    '          "status": "default"\n' +
    '        }\n' +
    '      ]\n' +
    '    },\n' +
    '    {\n' +
    '      "title": "操作",\n' +
    '      "content": "是否将今日苹果食用数量修改为3个？"\n' +
    '    }\n' +
    '  ],\n' +
    '  "footer": {\n' +
    '    "buttons": [\n' +
    '      {\n' +
    '        "text": "确认修改",\n' +
    '        "variant": "default",\n' +
    '        "actionType": "confirm",\n' +
    '        "actionValue": "确认将今日苹果数量修改为3个"\n' +
    '      },\n' +
    '      {\n' +
    '        "text": "取消",\n' +
    '        "variant": "outline",\n' +
    '        "actionType": "cancel",\n' +
    '        "actionValue": "取消修改苹果数量"\n' +
    '      }\n' +
    '    ]\n' +
    '  }\n' +
    '}\n' +
    '```\n\n'

const MOCK_CONFIRM_SUCCESS_REPLY = '✅ 执行成功！今日苹果食用数量已更新为3个。'

const MOCK_REPLY = [
    '你好！我是一个智能助手。\n\n' +
    '我可以帮你完成以下任务：\n\n' +
    '1. **代码编写** - 支持多种编程语言\n' +
    '2. **文档编写** - 生成专业文档\n' +
    '3. **数据可视化** - 帮助分析数据\n' +
    '4. **问题解决** - 提供问题解决建议\n' +
    '5. **其他任务** - 其他类型的任务，如数据处理、文本分析等\n\n' +
    '```typescript\n' +
    'console.log("hello world")\n' +
    '``` \n\n',
    '这是一个很好的问题！让我从以下几个角度来分析\n\n' +
    '1. **问题的背景**: 这是一个关于数据处理的问题\n' +
    '2. **问题的类型**: 数据处理问题\n\n' +
    '3. **问题的解决方法**: 1. 收集数据\n' +
    '4. **问题的解决方法**: 2. 处理数据\n' +
    '5. **问题的解决方法**: 3. 分析数据\n' +
    '6. **问题的解决方法**: 4. 可视化数据\n' +
    '7. **问题的解决方法**: 5. 解决问题\n\n',
]

export {
    MOCK_THINKING,
    MOCK_REPLY,
    MOCK_CALORIE_THINKING,
    MOCK_CALORIE_REPLY,
    MOCK_CODE_THINKING,
    MOCK_CODE_REPLAY,
    MOCK_TABLE_THINKING,
    MOCK_TABLE_REPLAY,
    MOCK_MERMAID_THINKING,
    MOCK_MERMAID_REPLAY,
    MOCK_MATH_THINKING,
    MOCK_MATH_REPLAY,
    MOCK_ECHART_THINKING,
    MOCK_ECHART_REPLAY,
    MOCK_HTML_THINKING,
    MOCK_HTML_REPLAY,
    MOCK_APPLE_COUNT_THINKING,
    MOCK_APPLE_COUNT_REPLY,
    MOCK_CONFIRM_SUCCESS_REPLY,
}