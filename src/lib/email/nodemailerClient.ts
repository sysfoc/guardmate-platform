import nodemailer from 'nodemailer';

export const createNodemailerClient = (gmailUser: string, gmailAppPassword: string) => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: gmailUser,
      pass: gmailAppPassword,
    },
  });
};
