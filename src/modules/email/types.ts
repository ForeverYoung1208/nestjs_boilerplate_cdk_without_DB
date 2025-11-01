export type Attachment = {
  filename: string;
  path: string;
  cid: string;
  link: string;
  url?: string;
};

export type EmailData = {
  subject: string;
  contentHtml: string;
  attachments?: Attachment[];
};
