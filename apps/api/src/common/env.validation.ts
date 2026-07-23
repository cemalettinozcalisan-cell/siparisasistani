import { Logger } from '@nestjs/common';

export function validateEnvironment() {
  const logger = new Logger('Environment');

  const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY'];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    logger.warn(`Missing env vars: ${missing.join(', ')}`);
  }

  const optional = {
    DEEPSEEK_API_KEY: 'AI (DeepSeek)',
    OPENAI_API_KEY: 'AI (OpenAI)',
    ELEVENLABS_API_KEY: 'Voice (ElevenLabs)',
    NETGSM_USERNAME: 'Telephony (NetGSM)',
    NETGSM_PASSWORD: 'Telephony (NetGSM)',
  };

  for (const [key, service] of Object.entries(optional)) {
    if (!process.env[key]) {
      logger.log(`${service} not configured - will use mock mode`);
    }
  }

  logger.log('Environment validation completed');
}
