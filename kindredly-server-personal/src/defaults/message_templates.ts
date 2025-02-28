import Verification from "../schemas/public/Verification";


export const WELCOME_TITLE_MESSAGE = `Welcome to Kindredly (Kindredly.ai)!`

export function THANK_YOU_FOR_JOINING_MSG(config: {serverHostname: string}) {
  return (
    `Thanks for signing up! We are thrilled to have you. <br/> <br/> If you haven't already, your next step is to install our ` +
    `<a href="${config.serverHostname}/download">browser extension</a>. Please <a href="${config.serverHostname}/contactUs">reach out</a> ` +
    `if you have any questions or concerns. Learn more about Kindredly at <a href="${config.serverHostname}/">Kindredly.ai</a>`
  );
}


export const ERROR_MESSAGE: Record<string, string> = {
    USERNAME_TAKEN: 'User already exists',
    EMAIL_TAKEN: 'User with this email already registered.',
}


export function RESET_PASSWORD_MSG(user, verification:Verification, config: {serverHostname: string}){
   return `
    Password Reset requested for ${user.username}.
    <br/>
    <br/>
    To reset password, enter the verification code below or click <a href="${config.serverHostname}/kindredapp/#/forgotPassword?verificationCode=${verification._id}">here</a>
    <br/>
    <br/>
    Your Verification Code is: ${verification._id}
    <br/>
    <br/>
    This verification email will expire in 10 minutes.
    <br/>
    <br/>
    If you did NOT request to reset your password, please click the following like to <a href="${config.serverHostname}/contactUs">Support</a>
    
    `
}


export function ACCOUNT_INVITE_MSG(accountUser, config, inviteLink: string, inviteCode:string, inviterName: string, message:string){
  return   `
  Greetings! You have been invited to join ${inviterName}'s Kindredly family!
  <br/>
  <br/>

  ` +
  (message || message == 'null' ? `<br/>Invite Message:<br/>${message}` : '') +
  `
  <br/>
  <br/>
  Click <a href="${inviteLink}">here</a> to join ${inviterName}'s family.
  <br/>
  <br/>
  This invitation will expire within 48 hours.
  <br/>
  <br/>
  ${inviterName}'s email is ${accountUser.email}. Only join this user's family if you know who they are.
  <br/>
  <br/>
  Invite Code: ${inviteCode}
  <br/>
  <br/>
  Learn more about Kindredly at <a href='${config.serverHostname}'>kindredly.ai</a>
  `
}




export function INVITATION_TO_ACCOUNT( config, inviteCode: string, invitedEmail: string){
  return   `
  You invited ${invitedEmail} to join your Kindredly family!
  <br/>
  <br/>
  ${invitedEmail} should receive an email with a link to join your family shortly.  The link will expire in 48 hours.
  <br/>
  <br/>
  <br/>
  Learn more about Kindredly at <a href='${config.serverHostname}'>kindredly.ai</a>
  `
}