import { config } from '@/config';
import fs from 'fs';


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
  } else if (type in ['suggestion']) {
    return {
      subject: `Suggestion Submitted`,
      body: `Thank you for your suggestion!  We really appreciate your feedback and will do our best to get back to you. 
        <br/>
        <br/>
        <br/>
        - Kindredly Support.
      
        `,
    };
  } else if (type in ['unsolicitedContact', 'unsolicitedInvite']) {
    return {
      subject: `Unsolicited Reported Submitted`,
      body: `Thank you for submitting this report.  We will work to address this issue as soon as possible. 
            <br/>
            <br/>
            <br/>
            - Kindredly Support.

        `,
    };
  } else if (type in ['contentIssue']) {
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
  } else if (type in ['support']) {
    return {
      subject: `Support Request`,
      body: `Thank you for contacting our support team.  We will review your request and contact you as soon as possible.  Please keep in mind, we are a small team and we may not get back to you right away.
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

export let MAIN_EMAIL_TEMPLATE = 'CONTENT_BODY';
try {
  MAIN_EMAIL_TEMPLATE = fs.readFileSync('src/templates/kindred_email_template.html').toString();
} catch (error) {
  if (!config.privateServer)
  console.error('Failed to load email template');
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
  }
}

