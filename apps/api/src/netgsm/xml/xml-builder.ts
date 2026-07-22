import { Injectable } from '@nestjs/common';

@Injectable()
export class NetgsmXmlBuilder {
  buildWelcomeFlow(kvkkEnabled: boolean): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  ${kvkkEnabled ? `
  <Gather maxdigits="1" timeout="5" finishOnKey="#" speechTimeout="auto">
    <Play>https://storage.example.com/voice/kvkk.mp3</Play>
  </Gather>
  ` : ''}
  <Play>https://storage.example.com/voice/welcome.mp3</Play>
  <Redirect method="POST">/api/netgsm/webhook/conversation</Redirect>
</Response>`;
  }

  buildPlayAudio(audioUrl: string, nextAction?: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Play>${audioUrl}</Play>
  ${nextAction ? `<Redirect method="POST">${nextAction}</Redirect>` : ''}
</Response>`;
  }

  buildConversationGather(options: {
    audioUrl: string;
    actionUrl: string;
    speechTimeout?: number;
    maxSilence?: number;
  }): string {
    const speechTimeout = options.speechTimeout ?? 3;
    const maxSilence = options.maxSilence ?? 5;

    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather
    input="speech dtmf"
    speechTimeout="${speechTimeout}"
    maxSilence="${maxSilence}"
    timeout="${speechTimeout + maxSilence + 5}"
    action="${options.actionUrl}"
    method="POST"
    enhanced="true"
    bargeIn="true"
    partialResultCallback="/api/netgsm/webhook/partial"
  >
    <Play>${options.audioUrl}</Play>
  </Gather>
  <Redirect method="POST">${options.actionUrl}/timeout</Redirect>
</Response>`;
  }

  buildSilenceCheck(audioUrl: string, retryUrl: string, hangupUrl: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather
    input="speech"
    speechTimeout="2"
    maxSilence="3"
    timeout="5"
    action="${retryUrl}"
    method="POST"
    bargeIn="true"
  >
    <Play>${audioUrl}</Play>
  </Gather>
  <Redirect method="POST">${hangupUrl}</Redirect>
</Response>`;
  }

  buildGather(options: { audioUrl: string; maxDigits: number; timeout: number; finishOnKey: string; actionUrl: string }): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather maxdigits="${options.maxDigits}" timeout="${options.timeout}" finishOnKey="${options.finishOnKey}"
    action="${options.actionUrl}" method="POST" bargeIn="true">
    <Play>${options.audioUrl}</Play>
  </Gather>
</Response>`;
  }

  buildHangup(): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Hangup/>
</Response>`;
  }

  buildRedirect(url: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Redirect method="POST">${url}</Redirect>
</Response>`;
  }

  buildRecord(options: { actionUrl: string; timeout?: number; maxDuration?: number }): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Record action="${options.actionUrl}" method="POST"
    timeout="${options.timeout || 10}" maxDuration="${options.maxDuration || 300}" />
</Response>`;
  }
}
