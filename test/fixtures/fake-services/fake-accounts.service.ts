/* eslint-disable @typescript-eslint/no-unused-vars */
import { PostsService } from '../../../src/modules/posts/posts.service';
import { Post } from '../../../src/entities/post.entity';
import { CreatePostDto } from '../../../src/modules/posts/dtos/createPost.dto';

export class FakePostsService implements Partial<PostsService> {

  async create(createPostDto: CreatePostDto): Promise<Post> {
    return {} as any; 
  }
  
  async findAll(): Promise<Post[]> {
    return [{}] as any;
  }
}
