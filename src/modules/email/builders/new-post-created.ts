import { Post } from '../../../entities/post.entity';
import { BaseEmailBuilder, EmailBuildResult } from '../base-email-builder';
import { getHeader } from './components/get-header';

export interface EventsForApprovalVariables {
  newPost: Post;
}

export class NewPostCreatedEmailBuilder extends BaseEmailBuilder {
  attachedFiles = {};

  private vars: EventsForApprovalVariables = {
    newPost: {
      id: 0,
      title: 'Unknown',
      content: 'Unknown',
      isActive: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };

  public build(vars: EventsForApprovalVariables): EmailBuildResult {
    this.vars = vars;
    return super.build();
  }

  subject = () => 'New post created';

  title = () => 'New post created title';

  header = () =>
    getHeader();

  body = () => `
    <div style="width: 600px; margin: 0 auto;">
      <h2>New post created</h2>
      <p>${this.vars.newPost.title}</p>
      <p>${this.vars.newPost.content}</p>
    </div>
    `;

  footer = () => '<h2>Cheers!</h2>';
}
