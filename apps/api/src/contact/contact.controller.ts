import { Controller, Post, Body } from '@nestjs/common';
import { ContactService } from './contact.service';

@Controller('contact')
export class ContactController {
  constructor(private readonly contact: ContactService) {}

  @Post()
  async submit(@Body() body: { name: string; email: string; phone: string; message: string }) {
    return this.contact.sendContact(body);
  }
}
