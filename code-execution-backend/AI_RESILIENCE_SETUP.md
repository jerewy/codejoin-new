# AI Resilience Setup Guide

This document outlines the comprehensive AI engineering solution implemented to handle external AI service outages with multi-provider redundancy, intelligent retry logic, and graceful degradation.

## Overview

The AI resilience system provides:

- **Multi-Provider Support**: Google Gemini, OpenAI GPT, Anthropic Claude with automatic failover
- **Circuit Breaker Pattern**: Prevents cascading failures during service outages
- **Intelligent Retry Logic**: Exponential backoff with jitter for optimal performance
- **Response Caching**: Intelligent caching with similarity matching
- **Health Monitoring**: Real-time provider health tracking and performance metrics
- **Graceful Degradation**: Context-aware fallback responses when all providers fail
- **Comprehensive Error Handling**: User-friendly error messages and automatic recovery

## Environment Configuration

### Required Environment Variables

```bash
# Google Gemini API (Primary Provider)
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-pro

# OpenAI API (Secondary Provider)
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-3.5-turbo
OPENAI_ORGANIZATION=your_openai_org_id

# Anthropic Claude API (Tertiary Provider)
ANTHROPIC_API_KEY=your_anthropic_api_key_here
ANTHROPIC_MODEL=claude-3-sonnet-20240229
```

### Optional Configuration

```bash
# AI Service Configuration
AI_SELECTION_STRATEGY=priority  # priority, round_robin, weighted, least_latency
AI_HEALTH_CHECK_INTERVAL=60000  # milliseconds
AI_CACHE_SIZE=1000             # number of cached responses
AI_ENABLE_HEALTH_MONITORING=true
AI_ENABLE_RESPONSE_CACHE=true
AI_ENABLE_FALLBACK_PROVIDER=true

# Logging
LOG_LEVEL=info
NODE_ENV=production
```

## Provider Priority Configuration

The system automatically configures providers in the following priority order:

1. **Google Gemini** (Priority: 1) - Primary provider
   - Cost-effective with good performance
   - Best for general coding questions

2. **OpenAI GPT** (Priority: 2) - Secondary provider
   - High-quality responses
   - Good fallback when Gemini is unavailable

3. **Anthropic Claude** (Priority: 3) - Tertiary provider
   - Highest quality responses
   - Used as final fallback before degraded mode

4. **Fallback Provider** (Priority: 10) - Last resort
   - Template-based responses
   - Always available for graceful degradation

## API Endpoints

### Chat Endpoint
```
POST /api/ai/chat
Content-Type: application/json

{
  "message": "Your question here",
  "context": "Optional context or additional information"
}
```

### Health Check
```
GET /api/ai/health
```

Returns comprehensive health status including:
- Overall system health
- Individual provider status
- Performance metrics
- Cache statistics

### Metrics
```
GET /api/ai/metrics
```

Returns detailed metrics for monitoring:
- Request statistics
- Provider performance
- Success rates
- Response times

### Service Status
```
GET /api/ai/status
```

Returns service configuration and capabilities.

## Response Format

### Successful Response
```json
{
  "success": true,
  "response": "AI-generated response here",
  "metadata": {
    "provider": "gemini",
    "model": "gemini-pro",
    "tokensUsed": 150,
    "cost": 0.0000375,
    "latency": 1250,
    "requestId": "req_1234567890_abc123",
    "timestamp": "2024-01-01T12:00:00.000Z",
    "isCached": false,
    "isFallback": false
  }
}
```

### Fallback Response
```json
{
  "success": true,
  "response": "Template-based response when AI services are unavailable",
  "metadata": {
    "provider": "fallback",
    "model": "fallback-v1.0",
    "isFallback": true,
    "fallbackType": "template"
  }
}
```

### Error Response
```json
{
  "success": false,
  "response": "User-friendly error message",
  "fallback": true,
  "error": {
    "code": "GEMINI_OVERLOADED",
    "message": "Original technical error message",
    "retryable": true,
    "timestamp": "2024-01-01T12:00:00.000Z"
  }
}
```

## Monitoring and Observability

### Health Monitoring
- Automatic health checks every 60 seconds
- Provider-specific performance tracking
- Alert generation for service degradation
- Circuit breaker status monitoring

### Performance Metrics
- Request latency tracking
- Success/error rates by provider
- Cost tracking and optimization
- Cache hit rates

### Logging
- Structured logging with correlation IDs
- Request/response logging
- Error tracking with stack traces
- Performance metrics logging

## Deployment Considerations

### Production Deployment
1. Set `NODE_ENV=production`
2. Configure proper API keys for all providers
3. Enable health monitoring
4. Set appropriate cache sizes
5. Configure log levels

### High Availability
- Deploy multiple instances behind load balancer
- Configure health checks for load balancer
- Use external cache (Redis) for response caching
- Configure proper monitoring and alerting

### Security
- Secure API keys using environment variables
- Implement rate limiting
- Add request validation
- Monitor for abuse and unusual patterns

## Troubleshooting

### Common Issues

**Provider Overloaded (503 Errors)**
- System automatically retries with exponential backoff
- Falls back to next available provider
- Returns cached responses if available
- Eventually degrades to template responses

**API Key Issues**
- Verify environment variables are set correctly
- Check API key permissions and quotas
- Monitor billing status for each provider

**Performance Issues**
- Check provider health status
- Monitor response times
- Review cache hit rates
- Consider adjusting provider priorities

**Circuit Breaker Issues**
- Circuit opens after consecutive failures
- Automatically closes after timeout period
- Can be manually reset via admin endpoints
- Monitor circuit breaker metrics

### Admin Endpoints

**Reset Metrics**
```bash
POST /api/ai/reset-metrics
Headers: x-admin-key: your_admin_key
```

**Force Health Check**
```bash
POST /api/ai/force-health-check
Headers: x-admin-key: your_admin_key
```

## Cost Optimization

### Provider Selection
- System prioritizes lower-cost providers
- Automatic failover maintains service quality
- Performance-based provider selection
- Cost tracking and reporting

### Caching Strategy
- Intelligent caching reduces API calls
- Similarity matching for cache hits
- Configurable cache TTL
- Cache size limits to control memory usage

### Usage Monitoring
- Real-time cost tracking
- Provider-specific cost analysis
- Usage quota monitoring
- Cost optimization recommendations

## Future Enhancements

### Planned Features
- Local model integration
- Advanced semantic caching
- Custom provider implementations
- Advanced load balancing algorithms
- Real-time cost optimization
- Enhanced monitoring dashboards

### Scalability
- Horizontal scaling support
- Distributed caching
- Load-aware provider selection
- Auto-scaling based on demand

## Support and Maintenance

### Regular Maintenance
- Monitor provider performance
- Review cost optimization
- Update provider configurations
- Check security configurations

### Emergency Procedures
- Manual provider failover
- Circuit breaker reset
- Cache clearing
- Service restart procedures

This comprehensive AI resilience system ensures high availability and excellent user experience even during external service outages.