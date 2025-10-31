import { Inject, Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Post } from '../../entities/post.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { CreatePostDto } from './dtos/createPost.dto';
import { EmailService } from '../email/service/email.service';
import { IEmailServiceForPosts } from './interfaces-need/email.service.interface';

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post)
    private readonly postsRepositry: Repository<Post>,
    @Inject(EmailService)
    private readonly emailService: IEmailServiceForPosts,
  ) {}

  async create(createPostDto: CreatePostDto): Promise<Post> {
    const res = await this.postsRepositry.save(createPostDto);
    this.emailService.sendPostCreatedNotificationMail(
      'siafin2010@gmail.com',
      res,
    );

    console.log(res);
    return res;
  }

  async findAll(): Promise<Post[]> {
    return this.postsRepositry.find();
  }

  async delete(id: number): Promise<void> {
    await this.postsRepositry.delete(id);
  }
}
