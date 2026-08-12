# StoreMex Alexa Skill

This folder is your Alexa Skills Kit (ASK) project, now living inside the
StoreMex repo so it's version-controlled alongside the app instead of sitting
in a separate export. It talks to your existing backend endpoint:

```
GET /api/alexa/pantry?user_id=<id>
```

which already exists in `backend/server.js` and returns your pantry items.

## What's in here

```
alexa-skill/
├── skill.json                        # Skill manifest (name, invocation info)
├── interactionModels/custom/*.json   # What people can say, per language/region
└── lambda/
    ├── index.js                      # The actual logic Alexa runs
    └── package.json                  # Lambda's dependencies
```

Right now the skill understands:
- **"Alexa, open store mex"** → launches the skill
- **"what's in my pantry"** / "what do I have" / "tell me what I have" → reads
  your pantry back to you (`GetPantryIntent`)
- Plus the standard Help / Cancel / Stop / Fallback intents Alexa expects
  every skill to handle

## ⚠️ Before this works: your backend needs a public URL

Alexa's servers run in Amazon's cloud — they can't reach `http://localhost:3000`
on your computer. `lambda/index.js` needs a URL it can actually hit over the
internet. You have two options:

**Option A — ngrok (quick, for testing today)**
1. Run your StoreMex backend locally as usual (`node server.js`)
2. In another terminal: `ngrok http 3000`
3. Copy the `https://xxxx.ngrok-free.dev` URL it gives you
4. Use that as `STOREMEX_API_BASE` below

Downside: that URL changes every time you restart ngrok (free tier), and it
only works while your computer + ngrok are running.

**Option B — deploy the backend properly (better long-term)**
Deploy `backend/` to something like Render (same idea as your OrganAIz
backend) so it has a permanent URL. Then that URL never changes.

## Configure the Lambda (no code editing needed)

The old version had your user ID and ngrok URL hardcoded directly in
`index.js`. That's now been changed to read from environment variables
instead, so you never have to touch the code again when either one changes:

| Variable            | Example                                   |
|----------------------|--------------------------------------------|
| `STOREMEX_API_BASE`  | `https://xxxx.ngrok-free.dev` or your Render URL |
| `STOREMEX_USER_ID`   | the user ID whose pantry Alexa should read |

Set these in **AWS Lambda Console → your function → Configuration →
Environment variables**.

## Getting this live in the Alexa Developer Console

If you already created this skill in the console before (likely, since this
export came from somewhere), you can skip straight to **"Test it without a
device"** below — it should already be there under your account.

If you're setting it up fresh:

1. Go to **[developer.amazon.com/alexa/console/ask](https://developer.amazon.com/alexa/console/ask)**
   and sign in (free account)
2. **Create Skill** → name it "StoreMex" → choose a model: **Custom** →
   choose hosting: **Provision your own** (since you're using your own
   AWS Lambda, matching the ARN already in `skill.json`)
3. In the skill's **Build** tab → **JSON Editor**, paste in the contents of
   `interactionModels/custom/en-US.json`
4. Set up the AWS Lambda function (**AWS Console → Lambda → Create function**,
   Node.js runtime), upload the `lambda/` folder's code (zip it first), and
   add an **Alexa Skills Kit trigger**
5. Copy your new Lambda's ARN into the skill's **Endpoint** tab in the
   developer console
6. Add the environment variables from the table above in the Lambda console
7. **Save** and **Build Model** in the developer console

## ✅ Testing without a physical Alexa device

You don't need an Echo or any physical device at all — the Alexa Developer
Console has a built-in simulator:

1. In the [Alexa Developer Console](https://developer.amazon.com/alexa/console/ask),
   open your StoreMex skill
2. Go to the **Test** tab
3. Set the dropdown at the top from "Off" to **"Development"** — this enables
   testing
4. Type (or click the mic and speak, if your computer has one) into the
   simulator box:
   - `open store mex`
   - then: `what's in my pantry`
5. You'll see Alexa's spoken response as text, plus the exact JSON request/
   response for debugging if something goes wrong

You can also test on the **free Alexa app** on your phone (no Echo device
needed) — sign into the same Amazon developer account, and any skill in
"Development" testing mode shows up under **More → Skills & Games → Your
Skills → Dev**.

## Known limitation worth knowing

`GetPantryIntent` currently always reads the pantry for whichever
`STOREMEX_USER_ID` you set — it isn't tied to whoever's actually talking to
Alexa. That's fine for one demo account, but if you want it to work per
real user later, that needs **account linking** (Alexa OAuth against your
StoreMex login), which is a bigger separate step — happy to help with that
when you're ready, not needed for testing right now.
