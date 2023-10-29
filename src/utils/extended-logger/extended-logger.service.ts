import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ExtendedLoggerService extends Logger {
  log(message: any, context?: string) {
    super.log(message, this.getCallerDetails(context));
  }

  error(message: any, trace?: string, context?: string) {
    super.error(message, trace, this.getCallerDetails(context));
  }

  warn(message: any, context?: string) {
    super.warn(message, this.getCallerDetails(context));
  }

  private getCallerDetails(context?: string): string {
    const caller = new Error().stack.split('\n')[3];
    const match = caller.match(/\(([^)]+)\)/);
    const details = match && match[1] ? match[1] : 'unknown:0';
    return context ? `${context} ${details}` : details;
  }
}
