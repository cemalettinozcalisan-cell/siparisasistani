import { Module } from '@nestjs/common';
import { ConversationReviewerService } from './conversation-reviewer.service';

@Module({
  providers: [ConversationReviewerService],
  exports: [ConversationReviewerService],
})
export class ReviewerModule {}
