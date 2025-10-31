import { Body, Controller, Logger, Post } from '@nestjs/common';
import { CreatePostDto } from './dtos/createPost.dto';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreatePostResponce } from './responces/createPost.responce';
import { PostsService } from './posts.service';
import { Get } from '@nestjs/common';
import { ApiKeyAuth } from '../auth/decorators/api-key-auth.decorator';

@Controller('posts')
@ApiTags('Posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  @ApiOperation({ summary: 'create new Post' })
  @ApiKeyAuth()
  @ApiResponse({
    status: 201,
    description: 'The record has been successfully created.',
    type: CreatePostResponce,
  })
  async create(@Body() createPostDto: CreatePostDto) {
    const createdPost = await this.postsService.create(createPostDto);
    return CreatePostResponce.fromPost(createdPost);
  }

  @Get()
  @ApiOperation({ summary: 'get all Posts' })
  @ApiKeyAuth()
  @ApiResponse({
    status: 200,
    description: 'Returns all posts',
    type: [CreatePostResponce],
  })
  async findAll() {
    const posts = await this.postsService.findAll();
    return CreatePostResponce.fromPost(posts);
  }
}
