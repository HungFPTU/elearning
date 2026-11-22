import { Module } from '@nestjs/common';
import { AdminInstructorsController, MyInstructorController } from './instructors.controller.js';
import { InstructorsService } from './instructors.service.js';

@Module({
  controllers: [MyInstructorController, AdminInstructorsController],
  providers: [InstructorsService],
})
export class InstructorsModule {}
