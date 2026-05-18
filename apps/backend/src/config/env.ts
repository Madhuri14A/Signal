type AppEnv = {
  PORT: number;
  DATABASE_URL: string;
  OPENAI_API_KEY?: string;
  GEMINI_API_KEY?: string;
  UPSTASH_REDIS_URL: string;
  JWT_SECRET: string;
};

export function loadEnvOrExit(): AppEnv {
  const requiredVars = ['PORT', 'DATABASE_URL', 'UPSTASH_REDIS_URL', 'JWT_SECRET'] as const;
  const missing: string[] = [];

  for (const name of requiredVars) {
    if (!process.env[name] || !process.env[name]?.trim()) {
      missing.push(name);
    }
  }

  const hasOpenAi = Boolean(process.env.OPENAI_API_KEY?.trim());
  const hasGemini = Boolean(process.env.GEMINI_API_KEY?.trim());
  if (!hasOpenAi && !hasGemini) {
    missing.push('OPENAI_API_KEY or GEMINI_API_KEY');
  }

  const rawPort = process.env.PORT;
  const parsedPort = Number(rawPort);
  if (!rawPort || !Number.isFinite(parsedPort) || parsedPort <= 0) {
    if (!missing.includes('PORT')) {
      missing.push('PORT');
    }
  }

  if (missing.length > 0) {
    console.error('Missing required environment variables:');
    for (const variable of missing) {
      console.error(`- ${variable}`);
    }
    process.exit(1);
  }

  return {
    PORT: parsedPort,
    DATABASE_URL: process.env.DATABASE_URL as string,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    UPSTASH_REDIS_URL: process.env.UPSTASH_REDIS_URL as string,
    JWT_SECRET: process.env.JWT_SECRET as string,
  };
}
