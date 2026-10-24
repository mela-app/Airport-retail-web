# Demo script (15 minutes)

For a live demo to airport-operator and advertiser leadership on the playground. Use a 1920 px screen if
possible, and have a phone ready to scan a QR code.

## 0. Before you start (1 minute before)

- Open the app on the **Admin** view and press **Reset** on the simulation bar.
- Keep the **Demo** guide (top bar) closed until you need it.

## 1. The airport, live (2 min) · Admin

- The control room: 180 screens online on the network map; zones shaded by the passengers present right now.
- Press **Play** and **60x**: the airport time runs, the plays, impressions and revenue tick.
- Hover a screen dot: its crowd. Click it: what that screen shows.

## 2. Why this ad? (3 min) · Demo guide, step 1–2

- **Demo → Load and open split screen.** Gate 42 at 14:10, paused. Left: Halcyon Airways. Right: the Gate 42
  screen.
- On the right: the perfume offer plays. Open **Why this ad?**: 420 passengers at gates 42–43, 58% holiday,
  57% international, XH501 to Zarhan already 45 minutes late. Perfume scores **0.86**, toys **0.52**, the lounge
  **0.21** is held back by the relevance floor. The AI ranking passed six checks; every number on the panel is in
  the evidence trail (Admin → Decision log).

## 3. Cause and effect (3 min) · step 3

- **Inject the delay** (XH501 +30 minutes). It travels as an AIDX message through the flight adapter.
- The Gate 42 screen changes in a fraction of a second (the guide shows the measured time) to Halcyon's goodwill
  meal voucher, co-funded by Brewline Coffee: at 75 minutes late the airline's goodwill rule fires.
- On the left (airline): the timeline shows the new delay; **Offers & goodwill** lists the activation.

## 4. A real phone (3 min) · step 4

- **Show the screen's QR code** and scan it with a phone. The claim page: the offer, valid until XH501's gate
  closes (countdown), where to redeem it, **Claim my code**, then **Share with family** for a second code.
- **Open Brewline's dashboard**: the claimed sale appears in Recent sales (marked "Phone").

## 5. Advertisers and the media manager (3 min)

- **Retailer → Campaigns**: select a campaign: 30-day ROI, who redeems (e.g. groups at 2.8× their share of
  passengers) with suggested weights; **Best 3 slots tomorrow** with one-click booking.
- **Retailer → Creatives → New creative**: the **creative assistant** writes three variants in English and
  Arabic from a one-line brief, each with brand-safety checks.
- **Media Manager**: occupancy and delivery per advertiser; the inventory calendar with premium hours and prices;
  **Approvals** with the brand-safety checklist; **Audience & conflicts**: why A beat B, and a manual pin.

## 6. Operations and close (1 min) · step 5

- **Screen offline** (Gate 42): the map turns red; at 60x an incident opens after 5 simulated minutes, with an
  owner to assign.
- Switch the language to **العربية**: the whole app turns right to left. Mention the white label (`brand.json`).
- Close on the API docs (`/api/docs`) and the adapter switch: mock or live, one setting per source.
