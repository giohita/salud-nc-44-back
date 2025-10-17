import { Controller, Get } from '@nestjs/common';

@Controller('/')
export class HomeController {
  @Get('/')
  index() {
    return 'Home Page';
  }
}
