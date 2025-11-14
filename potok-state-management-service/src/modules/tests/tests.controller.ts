import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TestsService } from './tests.service';

@ApiTags('Tests')
@Controller('api/v1/tests')
export class TestsController {
  constructor(private readonly testsService: TestsService) {}

  @Get('structure/:testType')
  @ApiOperation({ summary: 'Get test structure by type' })
  async getStructure(@Param('testType') testType: string) {
    return await this.testsService.getTestStructure(testType);
  }

  @Get('next/:userId')
  @ApiOperation({ summary: 'Get next available test for user' })
  async getNextTest(@Param('userId') userId: string) {
    return await this.testsService.getNextAvailableTest(userId);
  }

  @Post('submit/:userId')
  @ApiOperation({ summary: 'Submit test answers' })
  async submitTest(
    @Param('userId') userId: string,
    @Body() dto: { testType: string; answers: any },
  ) {
    return await this.testsService.submitTest(userId, dto);
  }
}
