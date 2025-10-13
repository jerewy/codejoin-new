# AI Model Selector System

A comprehensive AI model management system for the CodeJoin platform that provides intelligent model selection, automatic fallback, health monitoring, and seamless integration with existing chat components.

## Features

### 🧠 Intelligent Model Selection
- **Local AI**: DeepSeek Coder 6.7B for privacy-focused, offline coding assistance
- **Cloud AI**: Google Gemini Pro for advanced reasoning and multimodal capabilities
- **Hybrid Mode**: Smart automatic selection based on request type and availability

### 🔄 Automatic Fallback
- Seamless switching between models when errors occur
- Configurable fallback preferences
- Response time-based switching
- Health-aware model selection

### 📊 Real-time Health Monitoring
- Continuous health checks with configurable intervals
- Response time tracking and averaging
- Success rate monitoring
- Detailed performance metrics

### ⚙️ Advanced Configuration
- Persistent user preferences
- Response time thresholds
- Auto-switch settings
- Model-specific capabilities

## Quick Start

### Basic Usage

```tsx
import AIModelSelector from '@/components/ai-model-selector';

function App() {
  const [currentModel, setCurrentModel] = useState('hybrid-smart');

  return (
    <AIModelSelector
      currentModel={currentModel}
      onModelChange={setCurrentModel}
      compact={false}
      showStatus={true}
    />
  );
}
```

### With Enhanced Chat

```tsx
import EnhancedAIChatWithModelSelector from '@/components/enhanced-ai-chat-with-model-selector';

function ChatApp() {
  return (
    <EnhancedAIChatWithModelSelector
      projectId="your-project-id"
      userId="user-id"
      showModelSelector={true}
      showHealthSummary={true}
      onModelChange={(modelId) => console.log('Model changed:', modelId)}
    />
  );
}
```

### Using the Hook

```tsx
import { useAIModels } from '@/hooks/use-ai-models';

function ModelManager() {
  const {
    currentModel,
    modelStatuses,
    settings,
    switchModel,
    refreshModelStatus,
    testModel,
  } = useAIModels({
    autoStartMonitoring: true,
    healthCheckInterval: 30000,
  });

  return (
    <div>
      <p>Current model: {currentModel}</p>
      <button onClick={() => switchModel('gemini-pro')}>
        Switch to Gemini
      </button>
      <button onClick={() => testModel('deepseek-coder-6.7b')}>
        Test Local Model
      </button>
    </div>
  );
}
```

## Components

### AIModelSelector
Main component for model selection with two display modes:

**Props:**
- `currentModel?: string` - Currently selected model ID
- `onModelChange?: (modelId: string) => void` - Callback when model changes
- `models?: AIModelConfig[]` - Available models (defaults to built-in models)
- `compact?: boolean` - Compact mode for headers/panels
- `showStatus?: boolean` - Show model status indicators
- `showAdvanced?: boolean` - Show advanced settings
- `className?: string` - Additional CSS classes

**Examples:**

```tsx
// Compact mode for header
<AIModelSelector
  currentModel={model}
  onModelChange={setModel}
  compact
  showStatus
/>

// Full mode for settings page
<AIModelSelector
  currentModel={model}
  onModelChange={setModel}
  showAdvanced
/>
```

### AIModelStatusIndicator
Status indicator component for individual models:

**Props:**
- `model: AIModelConfig` - Model configuration
- `status?: AIModelStatus` - Current status
- `showDetails?: boolean` - Show detailed status button
- `compact?: boolean` - Compact display mode
- `className?: string` - Additional CSS classes

**Examples:**

```tsx
// Simple status badge
<AIModelStatusIndicator
  model={modelConfig}
  status={modelStatus}
  compact
/>

// Detailed status with dialog
<AIModelStatusIndicator
  model={modelConfig}
  status={modelStatus}
  showDetails
/>
```

### EnhancedAIChatWithModelSelector
Complete chat interface with integrated model selection:

**Props:**
- `projectId?: string` - Current project ID
- `userId?: string` - Current user ID
- `initialModel?: string` - Initial model selection
- `onModelChange?: (modelId: string) => void` - Model change callback
- `onStatusChange?: (status) => void` - Status change callback
- `showModelSelector?: boolean` - Show model selector
- `showHealthSummary?: boolean` - Show health summary
- `className?: string` - Additional CSS classes

## Configuration

### Model Types

The system supports three model providers:

#### Local AI (DeepSeek Coder 6.7B)
- **Endpoint**: `/api/local-ai/chat`
- **Strengths**: Privacy, offline capability, coding specialization
- **Use Cases**: Code generation, debugging, technical explanations
- **Limitations**: Smaller context window, requires local resources

#### Cloud AI (Gemini Pro)
- **Endpoint**: `/api/ai/chat`
- **Strengths**: Advanced reasoning, large context, multimodal
- **Use Cases**: Complex problem-solving, general knowledge, analysis
- **Limitations**: Requires internet, potential costs

#### Hybrid Mode (Smart Selection)
- **Endpoint**: Routes to best available model
- **Strengths**: Automatic optimization, reliability
- **Use Cases**: General purpose, automatic load balancing
- **Features**: Request type analysis, health-aware routing

### Settings

User preferences are automatically persisted and include:

```typescript
interface AIModelSettings {
  preferredModel: string;           // Default model selection
  fallbackEnabled: boolean;         // Enable automatic fallback
  fallbackModel?: string;           // Fallback model preference
  autoSwitchOnError: boolean;       // Auto-switch on errors
  responseTimeThreshold: number;    // Response time threshold (ms)
  showModelInfo: boolean;           // Show model info in chat
  enableHybridMode: boolean;        // Enable intelligent selection
}
```

### Default Settings

```typescript
const DEFAULT_SETTINGS = {
  preferredModel: 'hybrid-smart',
  fallbackEnabled: true,
  fallbackModel: 'deepseek-coder-6.7b',
  autoSwitchOnError: true,
  responseTimeThreshold: 10000,     // 10 seconds
  showModelInfo: true,
  enableHybridMode: true,
};
```

## API Integration

### Local AI Endpoint

```typescript
POST /api/local-ai/chat
Content-Type: application/json

{
  "message": "string",
  "context": {
    "projectId": "string",
    "conversationId": "string",
    "timestamp": "string",
    // ... additional context
  }
}
```

**Response:**
```typescript
{
  "response": "string",
  "metadata": {
    "model": "deepseek-coder:6.7b-base",
    "provider": "local",
    "responseTime": 1250,
    "tokensUsed": 150
  }
}
```

### Cloud AI Endpoint

```typescript
POST /api/ai/chat
Content-Type: application/json

{
  "message": "string",
  "context": {
    "projectId": "string",
    "conversationId": "string",
    "timestamp": "string"
  }
}
```

**Response:**
```typescript
{
  "response": "string",
  "metadata": {
    "model": "gemini-pro",
    "provider": "cloud",
    "responseTime": 2100,
    "tokensUsed": 280
  }
}
```

## Health Monitoring

The system automatically monitors model health with:

- **Status Checks**: Regular connectivity tests
- **Response Time Tracking**: Average response time calculation
- **Success Rate Monitoring**: Request success/failure tracking
- **Performance Metrics**: Tokens used, request counts

### Health Status Types

- `online`: Model is responding normally
- `offline`: Model is unreachable
- `error`: Model is returning errors
- `loading`: Model status is being checked
- `unknown`: Status cannot be determined

### Manual Health Checks

```typescript
// Check all models
await aiModelStatusService.checkModelHealth(model);

// Check specific model
const status = await aiModelStatusService.checkModelHealth(modelConfig);
console.log(status.status, status.responseTime);
```

## Advanced Features

### Intelligent Fallback

The system automatically handles fallback scenarios:

1. **Primary Model Failure**: Switches to fallback if enabled
2. **Response Time Threshold**: Switches if response exceeds threshold
3. **Health-based Selection**: Chooses best available model
4. **Request Type Optimization**: Selects optimal model for request type

### Performance Optimization

- **Request Caching**: Caches model status to reduce API calls
- **Lazy Loading**: Only checks models when needed
- **Batch Operations**: Can check multiple models simultaneously
- **Background Monitoring**: Non-blocking health checks

### Error Handling

- **Graceful Degradation**: Falls back to available models
- **User Notifications**: Clear error messages and status updates
- **Retry Logic**: Automatic retry with exponential backoff
- **Circuit Breaker**: Prevents repeated failed requests

## Best Practices

### Model Selection

1. **Use Hybrid Mode** for general applications
2. **Choose Local AI** for privacy-sensitive coding tasks
3. **Use Cloud AI** for complex reasoning requirements
4. **Enable Fallback** for production reliability

### Performance Optimization

1. **Set appropriate response time thresholds**
2. **Monitor health metrics regularly**
3. **Use compact mode in headers/panels**
4. **Cache model status when possible**

### User Experience

1. **Show model status** to users
2. **Provide clear error messages**
3. **Enable smooth transitions** between models
4. **Persist user preferences**

## Troubleshooting

### Common Issues

**Models showing as offline:**
- Check endpoint connectivity
- Verify API keys and authentication
- Ensure backend services are running

**Slow response times:**
- Check network connectivity
- Monitor system resources
- Consider adjusting response time thresholds

**Fallback not working:**
- Verify fallback model is configured
- Check that fallback model is online
- Ensure auto-switch is enabled

### Debug Information

Enable debug logging by checking browser console for:
- Model status updates
- Health check results
- API request/response details
- Error messages and stack traces

## Demo

Visit `/demo/ai-model-selector` to see the complete system in action with:
- Interactive model selection
- Real-time health monitoring
- Live chat with model switching
- Performance metrics and testing

## File Structure

```
components/
├── ai-model-selector.tsx              # Main selector component
├── ai-model-status-indicator.tsx      # Status indicator component
├── enhanced-ai-chat-with-model-selector.tsx  # Chat with model selection

hooks/
└── use-ai-models.ts                   # Unified model management hook

lib/
├── ai-model-status-service.ts         # Health monitoring service
└── ai-model-settings-service.ts       # Settings persistence service

types/
└── ai-model.ts                        # TypeScript type definitions
```

## Contributing

When adding new models or features:

1. Update type definitions in `types/ai-model.ts`
2. Add model configuration to `DEFAULT_MODELS`
3. Update status monitoring logic if needed
4. Test with all existing components
5. Update documentation

## License

This AI model selector system is part of the CodeJoin platform and follows the same licensing terms.