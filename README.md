# 🛡️ Budget Guardian — Vandal Vault Hackathon

A full-featured personal finance app built with **React + Recharts + Vite**.

## ✨ Features

| Feature | Description |
|---|---|
| 📊 **Dashboard** | KPI cards, budget progress, category pie chart |
| 💸 **Expense Tracker** | Add, edit, delete expenses with filters |
| 💳 **Debt Tracker** | Loans & credit cards with Avalanche payoff calculator |
| 📈 **Analytics** | Budget vs actual, category breakdown |
| 📝 **Notes** | Daily, weekly, monthly, yearly financial notes |
| ✨ **AI Insights** | Google Gemini-powered spending analysis |
| 🔔 **Notifications** | Smart budget alerts with configurable rules |
| 🧙 **Onboarding Wizard** | 5-step guided setup on first launch |
| 📉 **Expenditure Chart** | Estimated vs actual line graph (Daily/Weekly/Monthly/Yearly) |
| ⚙️ **Settings** | Profile + per-category budget limits |

## 🚀 Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Start dev server
npm run dev

# 3. Open http://localhost:5173
```

## 🏗️ Build for production

```bash
npm run build
npm run preview
```

## 🛠️ Tech Stack

- **React 18** — UI
- **Recharts** — Charts (line, area, bar, pie)
- **Vite** — Build tool
- **localStorage** — Data persistence (no backend needed)
- **Google Gemini API** — AI insights (free key at aistudio.google.com)

## 📁 Project Structure

```
vandal-vault/
├── index.html
├── package.json
├── vite.config.js
├── README.md
└── src/
    ├── main.jsx        # React entry point
    └── App.jsx         # Entire app (1800+ lines)
```

## 🔑 AI Insights Setup (Optional)

1. Go to [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. Create a free API key (250 requests/day, no credit card)
3. In the app → AI Insights → click 🔑 Set Key → paste your key

---

Built with ❤️ for Vandal Vault Hackathon
