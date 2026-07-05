# Votes

A small polling app: create a list of questions/statements, share a link, and
let people join with a username and vote. Built with **Next.js** + **MongoDB**,
ready to deploy on **Vercel**.

## How it works

- **You (organizer)** log into `/admin` with a password and create a poll. You
  set **how many votes each person gets** and choose who supplies the options:
  either you set them up front, or **participants add their own** during the
  session.
- Each poll moves through three phases you control:
  1. **Collecting** — people join with a username and add their questions /
     options (live). Skipped if you set the options yourself.
  2. **Voting** — you hit *Start voting*; options lock and people cast up to N
     votes, **one per option** (N votes = N different options).
  3. **Closed** — you hit *Close voting* to stop it.
- **Votes are not anonymous:** results show each option's tally *and* who voted
  for it, plus who suggested each option.
- **Results stay hidden** from voters until you hit *Reveal results*. Voter
  pages update automatically as phases change.

## 1. Set up MongoDB (Atlas — free tier is fine)

1. Create a free cluster at <https://www.mongodb.com/atlas>.
2. Create a database user (username + password).
3. Under **Network Access**, allow access from anywhere (`0.0.0.0/0`) so Vercel
   can connect.
4. **Connect → Drivers** and copy the connection string. It looks like
   `mongodb+srv://user:pass@cluster.mongodb.net/?retryWrites=true&w=majority`.

## 2. Run locally

```bash
npm install
cp .env.local.example .env.local   # then edit .env.local
npm run dev
```

Fill `.env.local` with:

| Variable         | What it is                                            |
| ---------------- | ----------------------------------------------------- |
| `MONGODB_URI`    | The Atlas connection string from step 1.              |
| `MONGODB_DB`     | Database name, e.g. `voting` (created automatically). |
| `ADMIN_PASSWORD` | The password you type to log into `/admin`.           |

Open <http://localhost:3000/admin>, log in, and create a poll.

## 3. Deploy to Vercel

1. Push this folder to a GitHub repo.
2. On <https://vercel.com>, **Add New → Project** and import the repo.
3. Under **Environment Variables**, add `MONGODB_URI`, `MONGODB_DB`, and
   `ADMIN_PASSWORD` (same values as your `.env.local`).
4. Deploy. Your admin area is at `https://your-app.vercel.app/admin`.

## Notes

- Voters are identified by an httpOnly cookie set when they join, so one browser
  = one voter per poll. Usernames are unique per poll (case-insensitive).
- There are no user accounts — anyone with the link can join. Keep the admin
  password private; that's what protects poll creation and management.
