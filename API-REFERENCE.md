# 📡 QA Generator API 参考文档

QA Generator 提供完整的 RESTful API，支持通过HTTP接口集成和自动化使用。

## 🔐 API认证

所有API请求都需要包含有效的API密钥进行认证。

### 认证方式

**方式1：请求头认证 (推荐)**
```bash
curl -H "X-API-Key: your_api_key_here" \
     -H "Content-Type: application/json" \
     http://localhost:3000/api/endpoint
```

**方式2：Bearer Token认证**  
```bash
curl -H "Authorization: Bearer your_api_key_here" \
     -H "Content-Type: application/json" \
     http://localhost:3000/api/endpoint
```

### 生成API密钥

```bash
# 生成新的API密钥
node scripts/generate-api-key.js

# 生成并保存到环境变量
node scripts/generate-api-key.js --save
```

## 📝 API端点列表

| 端点 | 方法 | 描述 | 认证 |
|------|------|------|------|
| `/api/health` | GET | 系统健康检查 | ❌ |
| `/api/health` | POST | 详细健康检查 | ✅ |
| `/api/generate` | POST | 生成问答内容 | ✅ |
| `/api/generate/stop` | POST | 停止生成任务 | ✅ |
| `/api/regions` | POST | 添加新地区 | ✅ |

## 🏥 健康检查 API

### GET /api/health

基础健康检查端点，无需认证，用于监控系统状态。

**请求示例**：
```bash
curl http://localhost:3000/api/health
```

**查询参数**：
- `metrics=true` - 包含系统性能指标
- `format=text` - 返回纯文本格式

**响应示例**：
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "version": "0.0.5",
  "uptime": 3600000,
  "services": {
    "filesystem": {
      "status": "healthy",
      "message": "Filesystem accessible and writable",
      "responseTime": 5,
      "lastCheck": "2024-01-01T12:00:00.000Z"
    },
    "memory": {
      "status": "healthy", 
      "message": "Memory usage: 512MB (heap: 256MB)"
    },
    "environment": {
      "status": "healthy",
      "message": "All environment variables configured"
    },
    "workers": {
      "status": "healthy",
      "message": "Worker system ready"
    }
  }
}
```

**状态码**：
- `200` - 系统健康
- `207` - 系统部分降级
- `503` - 系统不健康

**纯文本格式示例**：
```bash
curl "http://localhost:3000/api/health?format=text"
```

响应：
```
HEALTHY
Version: 0.0.5
Uptime: 3600s
Services: filesystem=healthy, memory=healthy, environment=healthy, workers=healthy
```

### POST /api/health

详细健康检查，需要API密钥认证，返回完整的系统指标。

**请求示例**：
```bash
curl -X POST \
  -H "X-API-Key: your_api_key" \
  http://localhost:3000/api/health
```

**响应示例**：
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00.000Z", 
  "version": "0.0.5",
  "uptime": 3600000,
  "services": { /* 同基础检查 */ },
  "metrics": {
    "memoryUsage": {
      "rss": 536870912,
      "heapTotal": 268435456,
      "heapUsed": 134217728,
      "external": 16777216,
      "arrayBuffers": 8388608
    },
    "cpuUsage": {
      "user": 1000000,
      "system": 500000
    },
    "activeHandles": 15
  }
}
```

## 🤖 生成内容 API

### POST /api/generate

启动问答内容生成任务，支持流式响应监控生成进度。

**请求体**：
```json
{
  "mode": "questions",
  "region": "chibi",
  "totalCount": 100,
  "workerCount": 5,
  "maxAttempts": 3,
  "batchSize": 50,
  "delay": 1000,
  "provider": "qianfan"
}
```

**参数说明**：

| 参数 | 类型 | 必需 | 描述 | 默认值 | 范围 |
|------|------|------|------|--------|------|
| `mode` | string | ✅ | 生成模式 | - | `questions`\|`answers`\|`all` |
| `region` | string | ✅ | 地区拼音名 | - | 见地区列表 |
| `totalCount` | number | ❌ | 总问题数量 | 1000 | 1-10000 |
| `workerCount` | number | ❌ | Worker数量 | 5 | 1-50 |
| `maxAttempts` | number | ❌ | 最大重试次数 | 3 | 1-10 |
| `batchSize` | number | ❌ | 批处理大小 | 50 | 1-200 |
| `delay` | number | ❌ | 批次间延迟(ms) | 1000 | 0-10000 |
| `provider` | string | ❌ | AI提供商 | qianfan | `qianfan`\|`groq`\|`openai` |

**请求示例**：
```bash
curl -X POST \
  -H "X-API-Key: your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "questions",
    "region": "chibi",
    "totalCount": 50,
    "workerCount": 3,
    "provider": "qianfan"
  }' \
  http://localhost:3000/api/generate
```

**流式响应**：

API返回Server-Sent Events (SSE) 格式的流式响应：

```
data: {"type": "log", "message": "开始生成赤壁地区问题..."}

data: {"type": "progress", "current": 25, "total": 50}

data: {"type": "log", "message": "批次1完成: 新增25个问题"}

data: {"type": "progress", "current": 50, "total": 50}

data: {"type": "success", "message": "生成任务完成"}

data: {"type": "end", "code": 0}
```

**事件类型**：

| 类型 | 描述 | 数据字段 |
|------|------|----------|
| `log` | 日志信息 | `message` |
| `progress` | 进度更新 | `current`, `total` |
| `success` | 成功消息 | `message` |
| `error` | 错误信息 | `message` |
| `end` | 任务结束 | `code` (0=成功, 非0=失败) |

**JavaScript客户端示例**：
```javascript
const eventSource = new EventSource('/api/generate', {
  headers: {
    'X-API-Key': 'your_api_key'
  }
});

eventSource.onmessage = function(event) {
  const data = JSON.parse(event.data);
  
  switch(data.type) {
    case 'log':
      console.log('日志:', data.message);
      break;
    case 'progress':
      console.log(`进度: ${data.current}/${data.total}`);
      break;
    case 'success':
      console.log('成功:', data.message);
      break;
    case 'error':
      console.error('错误:', data.message);
      break;
    case 'end':
      console.log('任务结束, 代码:', data.code);
      eventSource.close();
      break;
  }
};
```

### POST /api/generate/stop

停止当前正在运行的生成任务。

**请求示例**：
```bash
curl -X POST \
  -H "X-API-Key: your_api_key" \
  http://localhost:3000/api/generate/stop
```

**响应示例**：
```json
{
  "success": true,
  "message": "Generation process stopped successfully"
}
```

**状态码**：
- `200` - 停止成功
- `404` - 没有运行中的任务
- `500` - 停止失败

## 🌍 地区管理 API

### POST /api/regions

添加新的地区配置到系统中。

**请求体**：
```json
{
  "name": "北京",
  "pinyin": "beijing", 
  "description": "中华人民共和国首都，政治、文化中心"
}
```

**参数说明**：

| 参数 | 类型 | 必需 | 描述 | 限制 |
|------|------|------|------|------|
| `name` | string | ✅ | 地区中文名称 | 1-100字符 |
| `pinyin` | string | ✅ | 地区拼音 | 小写字母、数字、下划线 |
| `description` | string | ✅ | 地区描述 | 1-500字符 |

**请求示例**：
```bash
curl -X POST \
  -H "X-API-Key: your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "杭州",
    "pinyin": "hangzhou",
    "description": "浙江省省会，著名旅游城市，西湖风景区所在地"
  }' \
  http://localhost:3000/api/regions
```

**响应示例**：
```json
{
  "success": true
}
```

## 🚨 错误处理

### 错误响应格式

所有API错误都遵循统一的响应格式：

```json
{
  "error": "错误描述消息",
  "code": "ERROR_CODE", 
  "timestamp": "2024-01-01T12:00:00.000Z",
  "details": "详细错误信息 (可选)"
}
```

### 常见错误代码

| HTTP状态码 | 错误代码 | 描述 | 解决方法 |
|------------|----------|------|----------|
| 400 | `INVALID_REQUEST` | 请求参数无效 | 检查请求体格式和参数 |
| 401 | `UNAUTHORIZED` | API密钥无效或缺失 | 提供有效的API密钥 |
| 429 | `RATE_LIMIT_EXCEEDED` | 请求频率超过限制 | 降低请求频率 |
| 500 | `INTERNAL_ERROR` | 内部服务器错误 | 检查服务器日志 |
| 503 | `SERVICE_UNAVAILABLE` | 服务不可用 | 检查系统健康状态 |

### 错误处理示例

**JavaScript示例**：
```javascript
async function generateQuestions(data) {
  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: {
        'X-API-Key': 'your_api_key',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`API错误: ${error.error}`);
    }
    
    return response.body; // 流式响应
  } catch (error) {
    console.error('生成失败:', error.message);
    throw error;
  }
}
```

## 🔄 速率限制

API实施速率限制以保护系统资源：

- **默认限制**: 每个IP每分钟30次请求
- **配置方式**: 通过环境变量 `RATE_LIMIT_PER_MINUTE`
- **响应头**: 
  - `X-RateLimit-Limit`: 速率限制值
  - `X-RateLimit-Remaining`: 剩余请求数
  - `X-RateLimit-Reset`: 限制重置时间

**超过限制时的响应**：
```json
{
  "error": "Rate limit exceeded",
  "code": "RATE_LIMIT_EXCEEDED",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## 📊 监控和指标

### 健康检查集成

**Prometheus监控**：
```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'qa-generator'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/api/health'
    scrape_interval: 30s
```

**监控脚本**：
```bash
#!/bin/bash
# health-monitor.sh

HEALTH_URL="http://localhost:3000/api/health"
STATUS=$(curl -s "$HEALTH_URL" | jq -r '.status')

if [ "$STATUS" != "healthy" ]; then
  echo "系统状态异常: $STATUS"
  # 发送告警
fi
```

## 🔗 SDK和客户端库

### Node.js SDK示例

```javascript
class QAGeneratorClient {
  constructor(baseUrl, apiKey) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }
  
  async generateQuestions(region, count = 100) {
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        mode: 'questions',
        region,
        totalCount: count
      })
    });
    
    return response.body;
  }
  
  async getHealth() {
    const response = await fetch(`${this.baseUrl}/api/health`);
    return response.json();
  }
}

// 使用示例
const client = new QAGeneratorClient('http://localhost:3000', 'your_api_key');
const health = await client.getHealth();
console.log('系统状态:', health.status);
```

### Python SDK示例

```python
import requests
import json

class QAGeneratorClient:
    def __init__(self, base_url, api_key):
        self.base_url = base_url
        self.api_key = api_key
        self.headers = {
            'X-API-Key': api_key,
            'Content-Type': 'application/json'
        }
    
    def generate_questions(self, region, count=100):
        data = {
            'mode': 'questions',
            'region': region,
            'totalCount': count
        }
        response = requests.post(
            f'{self.base_url}/api/generate',
            headers=self.headers,
            json=data,
            stream=True
        )
        return response
    
    def get_health(self):
        response = requests.get(f'{self.base_url}/api/health')
        return response.json()

# 使用示例
client = QAGeneratorClient('http://localhost:3000', 'your_api_key')
health = client.get_health()
print(f'系统状态: {health["status"]}')
```

## 🧪 API测试

### 使用Postman

1. **导入集合**: 创建Postman集合
2. **设置环境变量**:
   - `baseUrl`: http://localhost:3000
   - `apiKey`: your_api_key_here
3. **创建请求**: 使用上述API端点和示例

### 使用cURL脚本

```bash
#!/bin/bash
# api-test.sh

BASE_URL="http://localhost:3000"
API_KEY="your_api_key_here"

echo "测试健康检查..."
curl -s "$BASE_URL/api/health" | jq

echo -e "\n测试生成API..."
curl -X POST \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "questions",
    "region": "chibi", 
    "totalCount": 10
  }' \
  "$BASE_URL/api/generate"

echo -e "\n测试完成"
```

---

**版本**: v0.0.5  
**最后更新**: 2024年12月  
**维护团队**: QA Generator Team

> 💡 **提示**: 完整的API使用示例和最佳实践请参考 [USER-GUIDE.md](USER-GUIDE.md)。