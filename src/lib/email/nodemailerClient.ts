import nodemailer from 'nodemailer';

export const createNodemailerClient = (gmailUser: string, gmailAppPassword: string) => {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: gmailUser,
      pass: gmailAppPassword,
    },
    tls: {
      rejectUnauthorized: true,
    },
  });
};
