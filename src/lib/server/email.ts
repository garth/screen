import nodemailer from 'nodemailer'
import { env } from '$env/dynamic/private'

const secure = env.SMTP_PORT === '465'

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST ?? 'localhost',
  port: Number(env.SMTP_PORT ?? 1025),
  secure,
  auth:
    !secure ? undefined : (
      {
        user: env.SMTP_USER,
        pass: env.SMTP_PASSWORD,
      }
    ),
})

export async function sendVerificationEmail(email: string, token: string) {
  const appUrl = env.APP_URL ?? 'http://localhost:5173'
  const verifyUrl = `${appUrl}/verify-email?token=${token}`

  await transporter.sendMail({
    from: env.SMTP_FROM ?? 'noreply@elastictime.com',
    to: email,
    subject: 'Verify your email - Elastic Time',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1e40af;">Verify your email</h1>
        <p>Thanks for registering with Elastic Time. Click the link below to verify your email address:</p>
        <p>
          <a href="${verifyUrl}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px;">
            Verify Email
          </a>
        </p>
        <p style="color: #6b7280; font-size: 14px;">
          Or copy this link: <a href="${verifyUrl}">${verifyUrl}</a>
        </p>
        <p style="color: #6b7280; font-size: 14px;">
          This link expires in 24 hours.
        </p>
      </div>
    `,
  })
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const appUrl = env.APP_URL ?? 'http://localhost:5173'
  const resetUrl = `${appUrl}/reset-password?token=${token}`

  await transporter.sendMail({
    from: env.SMTP_FROM ?? 'noreply@elastictime.com',
    to: email,
    subject: 'Reset your password - Elastic Time',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1e40af;">Reset your password</h1>
        <p>We received a request to reset your password. Click the link below to set a new password:</p>
        <p>
          <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px;">
            Reset Password
          </a>
        </p>
        <p style="color: #6b7280; font-size: 14px;">
          Or copy this link: <a href="${resetUrl}">${resetUrl}</a>
        </p>
        <p style="color: #6b7280; font-size: 14px;">
          This link expires in 1 hour. If you didn't request this, you can safely ignore this email.
        </p>
      </div>
    `,
  })
}
