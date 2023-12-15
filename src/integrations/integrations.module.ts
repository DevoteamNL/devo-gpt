import { Module } from '@nestjs/common';
import { JoanDeskService } from './joan-desk/joan-desk.service';
import { JoanDeskHandlerService } from './joan-desk/joan-desk-handler.service';

@Module({
  providers: [JoanDeskService, JoanDeskHandlerService],
  exports: [JoanDeskService, JoanDeskHandlerService],
})
export class IntegrationsModule {}
