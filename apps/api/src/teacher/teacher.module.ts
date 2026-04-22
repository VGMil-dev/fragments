import { Module } from '@nestjs/common';
import { TeacherGuard } from './teacher.guard';

@Module({
  providers: [TeacherGuard],
  exports: [TeacherGuard],
})
export class TeacherModule {}
