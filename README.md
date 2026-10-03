# Xưởng In 3D

Website Xưởng In 3D được xây dựng với Next.js, React, Tailwind CSS và Firebase.

## Local Development

1. Install dependencies:
   `npm install`
2. Create `.env.local` from `.env.example` if you want to override Firebase config.
3. Start the dev server:
   `npm run dev`

Open `http://localhost:3000`.

Admin dashboard: `http://localhost:3000/admin`

## Production Build

Run:

`npm run build`

The project is configured for Next.js SSR/ISR. Deploy it to a Next.js server runtime such as Vercel, Firebase App Hosting, Netlify Next Runtime, or Cloud Run.

## Firebase

Firebase Authentication protects the admin dashboard. Firestore stores contact submissions and quote requests.
