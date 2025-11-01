import { EmailImages, getFontsURLs } from './constants';
import { Attachment } from './types';
import { ConfigService } from '@nestjs/config';
import { EmailParams } from './service/email.service';
import { Logger } from '@nestjs/common';

export interface EmailBuildResult extends EmailParams {}

interface EmailComponents {
  title: string;
  header?: string;
  body?: string;
  footer?: string;
}

export interface FontsURLs {
  gilroyRegularWoff: string;
  gilroySemiBoldWoff: string;
  gilroyExtraBoldWoff: string;
}

export abstract class BaseEmailBuilder {
  protected logger: Logger = new Logger(this.constructor.name);
  private fontsUrls: FontsURLs;

  abstract subject: () => string;
  abstract title: () => string;
  abstract header: () => string;
  abstract body: () => string;
  abstract footer: () => string;
  abstract attachedFiles: { [key: string]: Attachment };

  constructor(protected configService: ConfigService) {
    const cdnHost = configService.get('SITE_ORIGIN');
    this.fontsUrls = getFontsURLs(cdnHost);
  }

  public build(vars?: any): EmailBuildResult {
    return {
      subject: this.subject(),
      contentHtml: this.composeHtml({
        title: this.title(),
        header: this.header(),
        body: this.body(),
        footer: this.footer(),
      }),
      attachments: Object.values(this.attachedFiles),
    };
  }

  public readonly attach = (filePath: EmailImages | string): Attachment => {
    const filename = filePath.split('/').at(-1) || '';
    const now = new Date();
    return {
      filename,
      path: filePath,
      cid: filename + now.valueOf(),
      link: 'cid:' + filename + now.valueOf(),
      url: this.configService.get('HOST') + '/' + filePath,
    };
  };

  private composeHtml({
    title,
    header,
    body,
    footer,
  }: EmailComponents): string {
    return `
      <!doctype html>
      <html xmlns="http://www.w3.org/1999/xhtml">

      <head>
        <title>${title}</title>
      <!--[if !mso]><!-->
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <!--<![endif]-->
      <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
      <meta name="viewport" content="width=device-width,initial-scale=1">
      <style type="text/css">
        @font-face {
          font-family: 'Gilroy';
          src: url(${this.fontsUrls.gilroyRegularWoff}) format('woff');
          font-weight: 400;
          font-style: normal;
        }
        @font-face {
          font-family: 'Gilroy';
          src: url(${this.fontsUrls.gilroySemiBoldWoff}) format('woff');
          font-weight: 600;
          font-style: normal;
        }
        @font-face {
          font-family: 'Gilroy';
          src: url(${this.fontsUrls.gilroyExtraBoldWoff}) format('woff');
          font-weight: 800;
          font-style: normal;
        }

        #outlook a {
          padding: 0;
        }
        
        body {
          margin: 0;
          padding: 0;
          -webkit-text-size-adjust: 100%;
          -ms-text-size-adjust: 100%;
          word-spacing: normal;
          background-color: #ffffff;
        }
        
        table,
          td {
            border-collapse: collapse;
            mso-table-lspace: 0pt;
            mso-table-rspace: 0pt;
        }
        
      </style>
      </head>

      <body>
        <div class="container" style="
            background-color: #e5e5e5; 
            padding-top: 40px; 
            padding-bottom: 40px;
            font-family: Helvetica, sans-serif;
          "
        >
          <div class="container-inner" style="max-width: 673px; margin: 0 auto; border-radius: 18px; background-color: #ffffff;">
            <!-- HEADER -->
            ${header}
            <!-- BODY -->
            ${body}
            <!-- FOOTER -->
            ${footer}
          </div>  
        </div>
      </body>

      </html>
    `;
  }
}
