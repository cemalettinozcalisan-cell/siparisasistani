import { Module } from '@nestjs/common';
import { PromptEngineService } from './prompt-engine.service';
import { BusinessInfoComponent } from './components/business-info.component';
import { ProductCatalogComponent } from './components/product-catalog.component';
import { PaymentMethodsComponent } from './components/payment-methods.component';
import { ConversationRulesComponent } from './components/conversation-rules.component';
import { CustomerContextComponent } from './components/customer-context.component';
import { TaskDefinitionComponent } from './components/task-definition.component';
import { CampaignsService } from '../../campaigns/campaigns.service';
import { SalesCoachComponent } from './components/sales-coach.component';
import { AiMemoryService } from '../memory/ai-memory.service';
import { SupabaseService } from '../../common/supabase.client';

@Module({
  providers: [
    PromptEngineService,
    BusinessInfoComponent,
    ProductCatalogComponent,
    PaymentMethodsComponent,
    ConversationRulesComponent,
    CustomerContextComponent,
    TaskDefinitionComponent,
    SalesCoachComponent,
    CampaignsService,
    AiMemoryService,
    SupabaseService,
  ],
  exports: [PromptEngineService, AiMemoryService],
})
export class PromptEngineModule {}
