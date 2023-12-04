import { Module } from '@nestjs/common';
import { JoanDeskService } from './joan-desk/joan-desk.service';

@Module({
  providers: [JoanDeskService],
  exports: [JoanDeskService],
})
export class IntegrationsModule {
}
