# MyReceipt 🧾

Smart receipt scanner that extracts merchant, date, and total amount using Google's AI.

## 🚀 How to Run

Follow these steps to get the application running locally:

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Run Development Server**:
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:3000`.

3. **Build for Production**:
   ```bash
   npm run build
   ```

## 🧠 AI Model Used

This application is powered by **Gemini 1.5 Flash**.

We use the `@google/genai` SDK to process receipt images and extract structured data (Merchant name, Date, Currency, Total Amount, and Category) with high speed and accuracy.

## ✨ Features

- **AI Scanning**: Instant extraction of receipt data using computer vision.
- **Secure Storage**: All receipts are saved to your personal Firebase account.
- **History Management**: Browse, filter by category, and manage your past expenses.
- **PDF Export**: Generate professional reports of your spending.
- **Privacy First**: Easy tools to clear your history or delete your account permanently.

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS
- **Backend/DB**: Firebase (Firestore & Auth)
- **AI**: Gemini 1.5 Flash
- **Animations**: Framer Motion (Motion)
- **Icons**: Lucide React
- **PDF Generation**: jsPDF
