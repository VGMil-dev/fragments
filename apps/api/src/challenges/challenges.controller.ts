import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Req, UseGuards } from '@nestjs/common';
import { ChallengesService } from './challenges.service';
import * as Types from './challenges.types';
import { TeacherGuard } from '../teacher/teacher.guard';

@Controller('api/v1/challenges')
export class ChallengesController {
  constructor(private readonly challengesService: ChallengesService) {}

  @Get()
  async findAll(@Req() req: any) {
    // If user is a teacher, they can see their drafts + all published
    // For now, if role is teacher, we pass teacherId
    const teacherId = req.user?.role === 'teacher' ? req.user.id : undefined;
    return this.challengesService.findAll(teacherId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.challengesService.findOne(id);
  }

  @Post()
  @UseGuards(TeacherGuard)
  create(@Body() dto: Types.CreateChallengeDto, @Req() req: any) {
    return this.challengesService.create(dto, req.user.id);
  }

  @Put(':id')
  @UseGuards(TeacherGuard)
  update(@Param('id') id: string, @Body() dto: Types.UpdateChallengeDto) {
    return this.challengesService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(TeacherGuard)
  delete(@Param('id') id: string) {
    return this.challengesService.delete(id);
  }

  @Patch(':id/publish')
  @UseGuards(TeacherGuard)
  publish(@Param('id') id: string) {
    return this.challengesService.publish(id);
  }
}
