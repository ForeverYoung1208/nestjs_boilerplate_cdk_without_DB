# How to build and send emails

## How to create new email - define your CustomEmailBuilder

Email composition must be done by implementing the necessary Email builder.

Email builder is a class that must be extended from the class `BaseEmailBuilder` and _must_ implement some mandatory methods, and can implement some possible properties
example
```typescript
export class UserRegistrationInvitationEmailBuilder extends BaseEmailBuilder {
  ...implementation...
}
```

### Mandatory methods to implement
- subject: () => string;
- title: () => string;
- head: () => string;
- body: () => string;
- footer: () => string;

You can implement these method in any necessary way to represent desirable content. But they must return html valid string.

These methods are used by standard email build method (provided by BaseEmailBuilder) that composes email, i.e. adds necessary headers, and applies default fonts and styles. 

### Possiblity: attach files, images

To compose email with attached files, define property:

- attachedFiles: { [key: string]: Attachment }

Contains a key-value map of attachments. To make an attachment from file use service method  `attach(filePath: string): Attachment` provided by BaseEmailBuilder

Then use this.attachedFiles.[key].link as reference to your attachment (example `<img src="${this.attachedFiles.footDriverSign.link}" alt="footer driver circle"/>`)

Note that if you want to dynamically attach image or other file, you have to describe them like example below:
```typescript
  attachedFiles: {
    footDriverSign?: Attachment;
    logoBase?: Attachment;
    congratsBackground?: Attachment;
  } = {};
```
and assingn values in build() method using `attach()` method. Example:
```typescript
  build(): EmailBuildResult {
    this.attachedfiles = {
      footDriverSign: this.attach(FOOT_DRIVER_SIGN_PATH),
      logoBase: this.attach(LOGO_BASE_PATH),
      congratsBackground: this.attach(CONGRATS_BACKGROUND_PATH),  
    }
    ...
    return super.build();
  }
```
In case of dynamic attaching don't forget to check if respected attachedFiles.[key] exists before trying to access its properties.

### Possibility: use external variables to pass data to your email

To include some variable data into your email:

1. define private property `vars` and its type to include all necessary data. Also define default values. Example:
```typescript
  private vars: DailyEventsDigestVariables = {
    addresseeName: '',
    linkToCalendar: '',
    eventCardsData: [],
  };
```
2. Override default build method to accept external vars, process them if you need to, and assign them to `this.vars`. Example:
```typescript
  build(vars: DailyEventsDigestVariables): EmailBuildResult {
    this.vars = vars;
    return super.build();
  }
```
3. Use variables anywhere in the builder refering to them like `this.vars.[variable]` example:
```typescript
  body = () => `
  <span>
    If you’re having trouble clicking the "${this.vars.buttonText}" button, copy and paste the URL below into your web browser: <a href="${this.vars.buttonLink}"> Link </a>
  </span>
  `
```

### Possiblity: define any private property to use it thoughout all email builder

Sometimes it is necessary to define some constant that must be accessible in different sections of the builder. You just can declare any private property and use it.
example:
```typescript
  private buttonText = 'Create an Account';
```

```typescript
  body = () => ` 
    <div>
      <p style="text-align: center; padding-top: 17px; color: #ffffff; font-size: 15px; font-weight: 600; margin: 0px">${this.buttonText}</p>
    </div>
  `
```

### Note the possibility to use exiting service components, as well as to create new ones in folder /components.

These components are just functions that return strings to re-use them over different builders.

existing components:
- [getHeader](./builders/components/header.ts)
- [getHeaderVacation](./builders/components/header-vacation.ts)
- [getHeaderHappy](./builders/components/header-happy.ts))
- [getFooter](./builders/components/footer.ts)
- [emailButton](./builders/components/email-botton.ts)
- [emailRegards](./builders/components/email-regards.ts)


## Using Builder and sending emails

### The implemented builder must be registered in the email service
To make your builder accessible in the application you must assign instance of this builder to some (arbitrary) property in the email service (pass configService as parameter while instantiating)
example:
```typescript email.service.ts
  userVacationBalanceRemindEmailBuilder =
    new UserVacationBalanceRemindEmailBuilder(this.configService);
```

### Build and Send 

Builder returns object of type `EmailBuildResult` which is consumed by emailService.sendEmail as second parameter

```typescript
    const emailParams: EmailBuildResult =
      this.emailService.userRegistrationInvitationEmailBuilder.build({
        registerLink: `${this.registerUrl}?token=${registerToken}`,
      });

    await this.emailService.sendEmail(
      emailAddress, emailParams
    );
```

## Testing 

### Idea

The builder returns an object that implements the following interface
```typescript
  export interface EmailBuildResult {
    subject: string;
    contentHtml: string;
    attachments: Attachment[];
  }
```
Unit tests should create and check snapshots of this object.
`subject` and `attachments` are stored in the single file for all test cases: `src/email/service/__snapshots__/email.service.spec.ts.snap`

Instead, `contentHtml` is stored as a separate file *.html for each test case with intention to be able to check layout with browser.
Note that images won't be displayed.

### Testing

To create proper test for new custom Email builder, see examples at `src/email/service/email.service.spec.ts` 

Note that you must use pass builder result through normalizeAttachmentsTimestamp() before checking snapshot matching, otherwise they will always fail.

If you intentionally changed email content, and test fails due to shapshot matching failure, 
run unit tests with parameter -u to update snapshots:
```bash
npm run test:unit -- -u
```
Or just delete all files in the folder `src/email/service/__snapshots__`, they will be re-generated by tests.


