export type AiProviderName = 'openai' | 'deepseek' | 'gemini' | 'claude';

export type ConversationState =
  | 'kvkk'
  | 'welcome'
  | 'ordering'
  | 'product_verification'
  | 'summary'
  | 'customer_confirmation'
  | 'address'
  | 'payment'
  | 'order_created'
  | 'completed'
  | 'cancelled'
  | 'human_transfer';

export interface AiProviderConfig {
  apiKey: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AiConversationMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AiCompletionRequest {
  messages: AiConversationMessage[];
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

export interface AiCompletionResult {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface AiCostEstimate {
  inputCost: number;
  outputCost: number;
  totalCost: number;
  currency: string;
}

export interface AiProvider {
  name: AiProviderName;
  complete(request: AiCompletionRequest): Promise<AiCompletionResult>;
  estimateCost?(model: string, promptTokens: number, completionTokens: number): number;
}

export interface AiFailoverResult {
  result: AiCompletionResult;
  providerUsed: string;
  attempts: number;
  fallbackTriggered: boolean;
}
