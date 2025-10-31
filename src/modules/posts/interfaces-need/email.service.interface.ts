import { Post } from "../../../entities/post.entity";

export interface IEmailServiceForPosts {
  sendPostCreatedNotificationMail(
    emailAdress: string,
    post: Post,
  ): Promise<boolean>
}