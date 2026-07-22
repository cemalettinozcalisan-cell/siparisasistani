export type CallStatus =
  | 'RINGING' | 'ANSWERED' | 'AI_SPEAKING' | 'CUSTOMER_SPEAKING'
  | 'PROCESSING' | 'WAITING_CONFIRMATION' | 'COMPLETED'
  | 'HUMAN_TRANSFER' | 'FAILED' | 'TIMEOUT';

export interface CallRequest {
  to: string;
  from?: string;
  webhookUrl: string;
  timeout?: number;
  maxDuration?: number;
}

export interface CallResponse {
  callId: string;
  status: CallStatus;
  duration?: number;
}

export interface DtmfResult {
  digits: string;
  completed: boolean;
}

export interface TelephonyProvider {
  readonly name: string;
  initiateCall(request: CallRequest): Promise<CallResponse>;
  playAudio(callId: string, audioUrl: string): Promise<void>;
  hangup(callId: string): Promise<void>;
  collectDTMF(callId: string, options: { maxDigits: number; timeout: number; finishOnKey: string }): Promise<DtmfResult>;
  startRecording(callId: string): Promise<string>;
  stopRecording(callId: string): Promise<string>;
  getCallStatus(callId: string): Promise<CallStatus>;
  healthCheck(): Promise<{ healthy: boolean; message: string }>;
}
