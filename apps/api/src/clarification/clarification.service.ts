import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../common/supabase.client';
import { AliasEngineService } from '../alias-engine/alias-engine.service';

export interface ClarificationCheck {
  needsClarification: boolean;
  issues: ClarificationIssue[];
}

export interface ClarificationIssue {
  type: 'ambiguous_product' | 'ambiguous_quantity' | 'ambiguous_unit' | 'missing_payment' | 'missing_address';
  field: string;
  question: string;
}

@Injectable()
export class ClarificationService {
  private readonly logger = new Logger(ClarificationService.name);

  constructor(
    private readonly alias: AliasEngineService,
    private readonly supabase: SupabaseService,
  ) {}

  async checkOrder(tenantId: string, input: {
    customer?: { name?: string; phone?: string };
    products?: { product_name: string; quantity: number; unit: string }[];
    address?: string;
    payment?: string;
  }): Promise<ClarificationCheck> {
    const issues: ClarificationIssue[] = [];

    // Check products
    for (const product of (input.products || [])) {
      const resolved = await this.alias.resolve(tenantId, product.product_name);

      // Ambiguous product
      if (!resolved.matched) {
        issues.push({
          type: 'ambiguous_product',
          field: 'product_name',
          question: `"${product.product_name}" hangi ürünümüz acaba? Dana parmak sucuk, acılı parmak veya kangal sucuk seçeneklerimiz var.`,
        });
      }

      // Ambiguous unit (müşteri "2 tane" veya "2 sap" demiş olabilir)
      if (product.unit === 'SAP') {
        const { data: productData } = await this.supabase.db
          .from('products')
          .select('sale_types, variable_weight, avg_weight_gr, min_weight_gr, max_weight_gr')
          .eq('tenant_id', tenantId)
          .eq('product_name', resolved.productName)
          .maybeSingle();

        const rawTypes = productData?.sale_types;
        const saleTypes: string[] = typeof rawTypes === 'string' ? JSON.parse(rawTypes) : (Array.isArray(rawTypes) ? rawTypes : []);
        if (saleTypes.includes('KG') && saleTypes.includes('SAP')) {
          issues.push({
            type: 'ambiguous_unit',
            field: 'unit',
            question: `Mehmet Bey, ${product.quantity} ${resolved.productName} için "sap" olarak mı not edeyim, yoksa kilogram olarak mı istemiştiniz?`,
          });
        }
      }

      // Ambiguous quantity
      if (!product.quantity || product.quantity <= 0) {
        issues.push({
          type: 'ambiguous_quantity',
          field: 'quantity',
          question: `${resolved.productName} için kaç adet veya kaç kilo almamızı istersiniz?`,
        });
      }
    }

    // Check address
    if (!input.address) {
      issues.push({
        type: 'missing_address',
        field: 'address',
        question: 'Teslimat adresinizi alabilir miyim?',
      });
    }

    // Check payment
    if (!input.payment) {
      issues.push({
        type: 'missing_payment',
        field: 'payment',
        question: 'Ödeme yönteminizi de öğrenebilirsem siparişi tamamlayacağım.',
      });
    }

    return {
      needsClarification: issues.length > 0,
      issues,
    };
  }
}
