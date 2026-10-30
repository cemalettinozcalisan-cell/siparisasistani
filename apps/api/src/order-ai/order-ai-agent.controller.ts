import { Controller, Get, Post, Query, Body, Headers, Param, Res, UnauthorizedException, ForbiddenException, NotFoundException } from '@nestjs/common';
import type { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../common/supabase.client';
import { PromptEngineService } from '../ai/prompt-engine/prompt-engine.service';
import { OrderAiToolsService } from './order-ai-tools.service';

/**
 * Faz 3: LiveKit agent → order-ai köprüsü (Tool Gateway).
 * Ayrı bir servis (apps/livekit-agent) tarafından çağrılır; paylaşılan secret (x-agent-secret) ile korunur.
 *   GET  /api/order-ai/agent/prompt?tenantId=&phone=              → sistem talimatı
 *   POST /api/order-ai/agent/tool  { tenantId, sessionId, action, args } → araç çalıştır
 */
@Controller('order-ai/agent')
export class OrderAiAgentController {
  constructor(
    private readonly config: ConfigService,
    private readonly supabase: SupabaseService,
    private readonly promptEngine: PromptEngineService,
    private readonly tools: OrderAiToolsService,
  ) {}

  private guard(secret?: string) {
    const expected = this.config.get<string>('AGENT_API_SECRET');
    if (!expected) throw new ForbiddenException('AGENT_API_SECRET tanimli degil');
    if (secret !== expected) throw new UnauthorizedException('gecersiz agent secret');
  }

  private async tenantName(tenantId: string): Promise<string> {
    try {
      const { data } = await this.supabase.db.from('tenants').select('company_name').eq('id', tenantId).maybeSingle();
      return String((data as any)?.company_name || '').trim();
    } catch {
      return '';
    }
  }

  @Get('prompt')
  async prompt(
    @Headers('x-agent-secret') secret: string,
    @Query('tenantId') tenantId: string,
    @Query('phone') phone?: string,
  ) {
    this.guard(secret);
    if (!tenantId) throw new UnauthorizedException('tenantId gerekli');
    const name = await this.tenantName(tenantId);
    const systemInstruction = await this.promptEngine.buildRealtimeOrderPrompt({
      tenantId,
      tenantName: name,
      channel: 'phone',
      currentState: 'ordering',
      customerPhone: phone || '',
    });
    let ivr: { menu: string; kvkk: string; noinput: string } | null = null;
    try {
      ivr = await this.promptEngine.buildIvrTexts(tenantId, name);
    } catch { /* yoksay */ }
    let greeting: string | null = null;
    try {
      greeting = await this.promptEngine.buildGreeting(tenantId, name);
    } catch { /* yoksay */ }
    return { ok: true, systemInstruction, ivr, greeting };
  }

  @Get('draft')
  async draft(
    @Headers('x-agent-secret') secret: string,
    @Query('tenantId') tenantId: string,
    @Query('sessionId') sessionId?: string,
  ) {
    this.guard(secret);
    if (!tenantId) throw new UnauthorizedException('tenantId gerekli');
    return { ok: true, draft: this.tools.getDraftSummary(tenantId, sessionId || 'livekit') };
  }

  /** Çağrı kapanınca ajan çağırır: sipariş oluşmadıysa/onaylanmadıysa kaydeder. */
  @Post('session-end')
  async sessionEnd(
    @Headers('x-agent-secret') secret: string,
    @Body() body: { tenantId?: string; sessionId?: string },
  ) {
    this.guard(secret);
    const tenantId = String(body?.tenantId || '');
    if (!tenantId) throw new UnauthorizedException('tenantId gerekli');
    const result = await this.tools.recordSessionEnd(tenantId, String(body?.sessionId || 'livekit'));
    return result;
  }

  /** Görüşmenin gerçek transkriptini kaydet (detay sayfası için). */
  @Post('transcript')
  async transcript(
    @Headers('x-agent-secret') secret: string,
    @Body() body: { tenantId?: string; sessionId?: string; messages?: Array<{ role: string; text: string }> },
  ) {
    this.guard(secret);
    const tenantId = String(body?.tenantId || '');
    if (!tenantId) throw new UnauthorizedException('tenantId gerekli');
    return this.tools.recordTranscript(tenantId, String(body?.sessionId || 'livekit'), body?.messages || []);
  }

  /** Ses kaydını call_recordings'e yaz (ajan çağırır). */
  @Post('recording')
  async recording(
    @Headers('x-agent-secret') secret: string,
    @Body() body: { tenantId?: string; sessionId?: string; phone?: string; file?: string },
  ) {
    this.guard(secret);
    const tenantId = String(body?.tenantId || '');
    if (!tenantId) throw new UnauthorizedException('tenantId gerekli');
    return this.tools.recordRecording(tenantId, String(body?.sessionId || ''), String(body?.phone || ''), String(body?.file || ''));
  }

  /** Ses kaydı dosyasını sun (esnaf dinler). */
  @Get('recordings/:file')
  async serveRecording(@Param('file') file: string, @Res() res: Response) {
    const safe = path.basename(file);
    const full = path.join('C:\\SiparisAsistani\\apps\\api\\backups\\recordings', safe);
    if (!fs.existsSync(full)) throw new NotFoundException('kayıt bulunamadı');
    res.sendFile(full);
  }

  @Post('tool')
  async tool(
    @Headers('x-agent-secret') secret: string,
    @Body() body: { tenantId: string; sessionId?: string; action: string; args?: Record<string, unknown> },
  ) {
    this.guard(secret);
    if (!body?.tenantId) throw new UnauthorizedException('tenantId gerekli');
    return this.tools.runTool(body.tenantId, body.sessionId || 'livekit', String(body.action || ''), body.args || {});
  }
}
