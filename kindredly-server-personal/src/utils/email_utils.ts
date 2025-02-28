import {config} from '@/config';
import fs from 'fs';

function sendEmail(
  ToAddresses,
  subject:string,
  HTMLContent:string,
  template:string = null,
  BccAddresses = [],
  sourceEmail = 'Kindredly @ kindredly.ai <support-noreply@kindredly.ai>',
) {
  let data = template != null ? template.replace('CONTENT_BODY', HTMLContent) : HTMLContent;
  
  // replace all instance of "SERVER_HOSTNAME" with the actual server hostname
  data = data.replace(/SERVER_HOSTNAME/g, config.serverHostname);
  const params = {
    Destination: {
      ToAddresses: ToAddresses,
      BccAddresses: BccAddresses,
    },
    Message: {
      Body: {
        Html: {
          Charset: 'UTF-8',
          Data: data,
        },
      },
      Subject: {
        Charset: 'UTF-8',
        Data: subject,
      },
    },
    Source: sourceEmail,
  };

  if (!config.enableEmailMessaging) {
    console.debug('enableEmailMessaging==false, not sending email', ToAddresses, subject);
    // save to file
    fs.writeFileSync('testemail_output.html', data);
    return;
  }

}

export {sendEmail};

