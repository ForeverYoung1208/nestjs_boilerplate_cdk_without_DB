import { ApiProperty, PickType } from '@nestjs/swagger';
import { Post } from '../../../entities/post.entity';
import { Exclude, Expose, plainToInstance } from 'class-transformer';

@Exclude()
export class CreatePostResponce extends Post {
  @Expose()
  id;

  @Expose()
  title;

  @Expose()
  content;

  static fromPost(
    post: Post | Post[],
  ): CreatePostResponce | CreatePostResponce[] {
    const res = plainToInstance(CreatePostResponce, post, {
      excludeExtraneousValues: true,
    });
    return res;
  }
}
