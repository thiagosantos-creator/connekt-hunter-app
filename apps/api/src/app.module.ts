import { Module } from '@nestjs/common';
import { AppController } from './controllers.js';
import { AppService } from './service.js';

@Module({
  controllers: [AppController],
  providers: [AppService]
})
export class AppModule {}
