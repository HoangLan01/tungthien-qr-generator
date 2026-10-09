export const config = {
  "$schema": "https://openapi.vercel.sh/vercel.json",
  framework: null,
  buildCommand: "npm run build:vercel",
  outputDirectory: "dist-vercel",
  cleanUrls: true,
  headers: [
    {
      source: "/:path*",
      headers: [
        {
          key: "Content-Security-Policy",
          value: "default-src 'self'; base-uri 'self'; connect-src 'self' blob:; form-action 'self'; frame-ancestors 'self'; img-src 'self' blob:; object-src 'none'; script-src 'self'; style-src 'self'",
        },
        { key: "Referrer-Policy", value: "no-referrer" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "SAMEORIGIN" },
        { key: "Permissions-Policy", value: "camera=(), clipboard-write=(self), geolocation=(), microphone=()" },
      ],
    },
  ],
};
