# Votes

A small polling app: create a list of questions/statements, share a link, and
let people join with a username and vote. Built with **Next.js** + **MongoDB**,
ready to deploy on **Vercel**.

## How it works

- **You (organizer)** log into `/admin` with a password and create a **board**
  (a name + how many votes each person gets). Participants supply the questions.
- A board moves through phases — **every transition is a manual click; timers
  never auto-advance**:
  1. **Lobby** — people open the link and join with just a username (no
     approval).
  2. **Questions** — you start this phase (optionally with a countdown timer);
     participants write questions live. You close it when ready.
  3. **Review** — questions are locked; nothing happens until you start voting.
  4. **Voting** — you start it (optional timer); each person votes for up to N
     different questions (one vote each). You close it when ready.
  5. **Closed** — results are visible to everyone.
- Timers are just a **visible countdown** to keep the room on pace — reaching
  zero does not close anything; you always close manually.
- **Votes are not anonymous:** once closed, everyone sees each question's tally
  and can open its list of voters. Each question also shows who wrote it.
- Voter pages update automatically as you change phases.

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
