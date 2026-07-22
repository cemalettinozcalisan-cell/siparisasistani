import { Controller, Post, Get, Body, Param, Res } from '@nestjs/common';
import { Response } from 'express';
import { IncomingCallWebhook } from './webhook/incoming-call';
import { CallEventsWebhook } from './webhook/call-events';
import { DtmfWebhook } from './webhook/dtmf';
import { RecordingsWebhook } from './webhook/recordings';
import { CallFlowService } from './call-flow.service';
import { TelephonyProviderFactory } from './providers/provider.factory';
import { VoiceService } from '../voice/voice.service';

@Controller('netgsm')
export class NetgsmController {
  constructor(
    private readonly incomingCall: IncomingCallWebhook,
    private readonly callEvents: CallEventsWebhook,
    private readonly dtmf: DtmfWebhook,
    private readonly recordings: RecordingsWebhook,
    private readonly callFlow: CallFlowService,
    private readonly telephony: TelephonyProviderFactory,
    private readonly voice: VoiceService,
  ) {}

  @Post('webhook/incoming')
  async incoming(@Body() body: Record<string, unknown>, @Res() res: Response) {
    const xml = await this.incomingCall.handle(body);
    res.set('Content-Type', 'application/xml');
    res.send(xml);
  }

  @Post('webhook/events')
  async events(@Body() body: Record<string, unknown>) {
    await this.callEvents.handle(body);
    return { status: 'ok' };
  }

  @Post('webhook/dtmf/:sessionId')
  async dtmfHandler(@Param('sessionId') sessionId: string, @Body() body: Record<string, unknown>, @Res() res: Response) {
    const xml = await this.dtmf.handle(sessionId, body);
    res.set('Content-Type', 'application/xml');
    res.send(xml);
  }

  @Post('webhook/recordings')
  async recordingHandler(@Body() body: Record<string, unknown>) {
    await this.recordings.handle(body);
    return { status: 'ok' };
  }

  @Post('webhook/conversation/:sessionId')
  async conversation(@Param('sessionId') sessionId: string, @Body() body: Record<string, unknown>, @Res() res: Response) {
    const speechResult = (body.SpeechResult as string) || (body.speech_result as string) || '';
    const digits = (body.Digits as string) || (body.digits as string) || '';
    const userInput = speechResult || digits || '';

    if (!userInput) {
      const session = await this.callFlow.getSession(sessionId);
      const tenantId = session?.tenant_id;
      const retryAudio = await this.voice.generateSpeech('Efendim sesinizi alamadım. Tekrar eder misiniz?', tenantId);
      const audioUrl = await this.callFlow.storeAudio(tenantId || 'system', retryAudio.audio);
      const xml = this.callFlow['xml'].buildConversationGather({
        audioUrl, speechTimeout: 2, maxSilence: 3,
        actionUrl: `${process.env.API_URL}/api/netgsm/webhook/conversation/${sessionId}`,
      });
      res.set('Content-Type', 'application/xml');
      return res.send(xml);
    }

    const xml = await this.callFlow.processUserInput(sessionId, userInput);
    res.set('Content-Type', 'application/xml');
    res.send(xml);
  }

  @Post('webhook/conversation/:sessionId/timeout')
  async conversationTimeout(@Param('sessionId') sessionId: string, @Res() res: Response) {
    const session = await this.callFlow.getSession(sessionId);
    const tenantId = session?.tenant_id;
    const goodbyeAudio = await this.voice.generateSpeech(
      'Görüşmeyi sonlandırıyorum. Tekrar aramanız halinde yardımcı olmaktan mutluluk duyarız.', tenantId,
    );
    await this.callFlow.updateCallStatus(sessionId, 'TIMEOUT');
    const audioUrl = await this.callFlow.storeAudio(tenantId || 'system', goodbyeAudio.audio);
    const xml = this.callFlow['xml'].buildPlayAudio(audioUrl);
    res.set('Content-Type', 'application/xml');
    res.send(xml);
  }

  @Post('outbound')
  async outboundCall(@Body() body: { tenantId: string; phone: string; message?: string }) {
    const provider = this.telephony.getProvider('netgsm');
    const response = await provider.initiateCall({
      to: body.phone,
      webhookUrl: `${process.env.API_URL}/api/netgsm/webhook/incoming`,
    });
    return response;
  }

  @Get('health')
  async health() {
    return this.telephony.getProvider('netgsm').healthCheck();
  }
}
