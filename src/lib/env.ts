// Environment configuration and validation
interface AppConfig {
  apiBaseUrl: string
  appName: string
  appVersion: string
  environment: 'development' | 'production' | 'test'
  debug: boolean
}

// Validate required environment variables
const validateEnv = () => {
  const requiredVars = ['VITE_API_BASE_URL', 'VITE_APP_NAME', 'VITE_ENVIRONMENT']
  const missing = requiredVars.filter(varName => !import.meta.env[varName])
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }
}

// Get environment configuration
export const getAppConfig = (): AppConfig => {
  // Only validate in production to allow development flexibility
  if (import.meta.env.MODE === 'production') {
    validateEnv()
  }

  return {
    apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
    appName: import.meta.env.VITE_APP_NAME || 'MyRotaPro',
    appVersion: import.meta.env.VITE_APP_VERSION || '1.0.0',
    environment: (import.meta.env.VITE_ENVIRONMENT as AppConfig['environment']) || 'development',
    debug: import.meta.env.VITE_DEBUG === 'true' || import.meta.env.MODE === 'development'
  }
}

// Environment-specific configurations
export const isDevelopment = () => getAppConfig().environment === 'development'
export const isProduction = () => getAppConfig().environment === 'production'
export const isDebugMode = () => getAppConfig().debug

// Log environment info in development
if (isDevelopment()) {
  console.log('🔧 Development Environment')
  console.log('Config:', getAppConfig())
}
