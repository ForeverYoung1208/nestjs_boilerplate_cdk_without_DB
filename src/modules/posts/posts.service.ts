import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Post } from '../../entities/post.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { CreatePostDto } from './dtos/createPost.dto';
import { EmailService } from '../email/service/email.service';

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post)
    private readonly postsRepositry: Repository<Post>,
    private readonly emailService: EmailService,
  ) {}

  async create(createPostDto: CreatePostDto): Promise<Post> {
    const newPost = await this.postsRepositry.save(createPostDto);
    const email = this.emailService.newPostCreatedEmailBuilder.build({
      newPost,
    });

    this.emailService.sendEmail('siafin2010@gmail.com', email);

    console.log(newPost);
    return newPost;
  }

  async findAll(): Promise<Post[]> {
    return this.postsRepositry.find();
  }

  async delete(id: number): Promise<void> {
    await this.postsRepositry.delete(id);
  }
}
