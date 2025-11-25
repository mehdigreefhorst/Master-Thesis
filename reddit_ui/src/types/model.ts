export interface ModelPricing {
  prompt: number;        // Price per 1M tokens
  completion: number;    // Price per 1M tokens
  internal_reasoning?: number;    // Price per 1M tokens (optional, for reasoning models)
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;       // e.g., "OpenAI", "Anthropic", "Google"
  pricing: ModelPricing;
  max_context: number;    // Maximum context window in tokens
  supports_reasoning?: boolean;
  description?: string;
  free_available?: boolean;
}

export const AVAILABLE_MODELS: ModelInfo[] = [
  {
    id: 'gpt-5',
    name: 'GPT-5',
    provider: 'OpenAI',
    pricing: {
      prompt: 2.50,
      completion: 10.00,
      internal_reasoning: 80.00
    },
    max_context: 128000,
    supports_reasoning: true,
    description: 'Most capable GPT model with advanced reasoning'
  },
  {
    id: 'gpt-5-mini',
    name: 'GPT-5 Mini',
    provider: 'OpenAI',
    pricing: {
      prompt: 0.55,
      completion: 2.20,
      internal_reasoning: 22.00
    },
    max_context: 128000,
    supports_reasoning: true,
    description: 'Fast and cost-effective with reasoning capabilities'
  },
  {
    id: 'gpt-5-nano',
    name: 'GPT-5 Nano',
    provider: 'OpenAI',
    pricing: {
      prompt: 0.15,
      completion: 0.60,
      internal_reasoning: 6.00
    },
    max_context: 128000,
    supports_reasoning: true,
    description: 'Smallest and fastest GPT-5 model with reasoning'
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'OpenAI',
    pricing: {
      prompt: 2.50,
      completion: 10.00
    },
    max_context: 128000,
    supports_reasoning: false,
    description: 'GPT-4 optimized for speed and cost'
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'OpenAI',
    pricing: {
      prompt: 0.15,
      completion: 0.60
    },
    max_context: 128000,
    supports_reasoning: false,
    description: 'Affordable and fast GPT-4 variant'
  },
  {
    id: 'claude-3-opus',
    name: 'Claude 3 Opus',
    provider: 'Anthropic',
    pricing: {
      prompt: 15.00,
      completion: 75.00
    },
    max_context: 200000,
    supports_reasoning: false,
    description: 'Most capable Claude model for complex tasks'
  },
  {
    id: 'claude-3-sonnet',
    name: 'Claude 3 Sonnet',
    provider: 'Anthropic',
    pricing: {
      prompt: 3.00,
      completion: 15.00
    },
    max_context: 200000,
    supports_reasoning: false,
    description: 'Balanced performance and cost'
  },
  {
    id: 'claude-3-haiku',
    name: 'Claude 3 Haiku',
    provider: 'Anthropic',
    pricing: {
      prompt: 0.25,
      completion: 1.25
    },
    max_context: 200000,
    supports_reasoning: false,
    description: 'Fastest and most affordable Claude model'
  },
  {
    id: 'gemini-pro',
    name: 'Gemini Pro',
    provider: 'Google',
    pricing: {
      prompt: 0.50,
      completion: 1.50
    },
    max_context: 32000,
    supports_reasoning: false,
    description: 'Google\'s flagship multimodal model'
  },
  {
    id: 'gemini-flash',
    name: 'Gemini Flash',
    provider: 'Google',
    pricing: {
      prompt: 0.075,
      completion: 0.30
    },
    max_context: 32000,
    supports_reasoning: false,
    description: 'Fast and efficient Gemini model'
  }
];
