import {config} from '@/config';
import fs from 'fs';
import path from 'path';

export function getContactUsEmailTemplate(type, refId) {
  if (type == 'waitinglist') {
    return {
      subject: `Joined waiting list.`,
      body: `Thank you for joining the waiting list.  We will reach out as soon as there is an opening.
        <br/>
        <br/>
        <br/>
        - Kindredly Support.

        `,
    };
  } else if (['suggestion'].includes(type)) {
    return {
      subject: `Suggestion Submitted`,
      body: `Thank you for your suggestion!  We really appreciate your feedback and will do our best to get back to you. 
        <br/>
        <br/>
        <br/>
        - Kindredly Support.
      
        `,
    };
  } else if (['unsolicitedContact', 'unsolicitedInvite'].includes(type)) {
    return {
      subject: `Unsolicited Reported Submitted`,
      body: `Thank you for submitting this report.  We will work to address this issue as soon as possible. 
            <br/>
            <br/>
            <br/>
            - Kindredly Support.

        `,
    };
  } else if (['contentIssue'].includes(type)) {
    return {
      subject: `Content Issue Reported`,
      body: `
      Thank you for submitting this report.  We will work to address this issue as soon as possible. 
            <br/>
            <br/>
            <br/>
            - Kindredly Support.
        `,
    };
  } else if (['support'].includes(type)) {
    return {
      subject: `Support Request`,
      body: `Thank you for contacting our support team.  We will review your request and contact you as soon as possible.  Please keep in mind, we are a small team and we may not get back to you right away.
            <br/>
            <br/>
            <br/>
            - Kindredly Support.

        `,
    };
  } else if (['bug'].includes(type)) {
    return {
      subject: `Bug Report Received`,
      body: `Thank you for reporting this bug.  We will review it and work on a fix as soon as possible.
            <br/>
            <br/>
            <br/>
            - Kindredly Support.

        `,
    };
  } else {
    return {
      subject: `${type} submission received`,
      body: `Thank you for your ${type} submission. Someone from our team will review your submission and get back to you as soon as possible. Please keep in mind, we are a small team and we may not get back to you right away.
        <br/>
        <br/>
        <br/>
        - Kindredly Support.
        `,
    };
  }
}
export const KEY_DIL = '_0-0_';

/**
 * The HTML wrapper every templated email is rendered into. `CONTENT_BODY` is the
 * substitution marker `sendEmail` replaces, so the fallback below is not a
 * disabled template - it is the message with no wrapper around it.
 *
 * RESOLVED AGAINST __dirname, NOT THE WORKING DIRECTORY. This used to read
 * `'src/templates/...'`, which only worked because the Dockerfile happens to
 * leave the CWD at the package root; it broke under any other launcher. The .html
 * is not compiled into `dist/`, so the compiled build has to reach back into
 * `src/` for it - hence two candidates rather than one.
 */
const TEMPLATE_CANDIDATES = [
  path.resolve(__dirname, 'kindred_email_template.html'), // ts-node / dev, running out of src/
  path.resolve(__dirname, '../../src/templates/kindred_email_template.html'), // dist/templates -> src/templates
  path.resolve(process.cwd(), 'src/templates/kindred_email_template.html'), // the historical path
];

export let MAIN_EMAIL_TEMPLATE = 'CONTENT_BODY';
const templatePath = TEMPLATE_CANDIDATES.find((candidate) => fs.existsSync(candidate));
if (templatePath) {
  try {
    MAIN_EMAIL_TEMPLATE = fs.readFileSync(templatePath).toString();
  } catch (error) {
    console.error(`Failed to read the email template at ${templatePath}`, error);
  }
} else {
  // Previously silenced on a self-hosted box, because the file was excluded from
  // the sync and so was guaranteed missing there. It is synced now, so a box
  // missing it is a real problem and says so.
  console.error('Failed to load email template; emails will be sent without their wrapper');
}

export const friendRequestTemplate = {
  subject(displayedInviterName: any): string {
    return `Friend Request from ${displayedInviterName} on Kindredly`;
  },

  content(displayedInviterName: any, message: any, accountUser: any): string {
    return `
      Greetings! ${displayedInviterName} sent you a friend request from on kindredly.ai, but it doesn't look like you have an account yet.              
      <a href="${config.serverHostname}/kindredapp/#/register">Click here to join</a>.
      <br/>
      <br/>
      <p>
      Kindredly is a browser extension and website that helps families safely explore the web by making it easy manage children's web access and share the content they love.
      </p>
      <br/>
      Learn more at <a href="${config.serverHostname}">kindredly.ai</a>
      <br/>
      <br/>

      ${message ? `Invite Message:<br/>${message}` : ''}

      <br/>
      <br/>
      <br/>
      ${displayedInviterName}'s email is ${accountUser.email}. 
   
      `;
  },
};
