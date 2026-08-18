import { Injectable } from '@nestjs/common';
import { CargoFirmAdapter } from './cargo-provider.interface';
import { YurticiProvider } from './providers/yurtici.provider';
import { ArasProvider } from './providers/aras.provider';
import { MngProvider } from './providers/mng.provider';
import { DhlProvider } from './providers/dhl.provider';
import { SuratProvider } from './providers/surat.provider';
import { PttProvider } from './providers/ptt.provider';

@Injectable()
export class CargoFirmFactory {
  constructor(
    private readonly yurtici: YurticiProvider,
    private readonly aras: ArasProvider,
    private readonly mng: MngProvider,
    private readonly dhl: DhlProvider,
    private readonly surat: SuratProvider,
    private readonly ptt: PttProvider,
  ) {}

  private readonly registry: Record<string, CargoFirmAdapter> = {};

  private buildRegistry(): Record<string, CargoFirmAdapter> {
    if (Object.keys(this.registry).length) return this.registry;
    this.registry.yurtici = this.yurtici;
    this.registry.aras = this.aras;
    this.registry.mng = this.mng;
    this.registry.dhl = this.dhl;
    this.registry.surat = this.surat;
    this.registry.ptt = this.ptt;
    return this.registry;
  }

  getAdapter(company: string): CargoFirmAdapter | null {
    return this.buildRegistry()[String(company || '').toLowerCase()] || null;
  }

  listAdapters(): CargoFirmAdapter[] {
    return Object.values(this.buildRegistry());
  }
}