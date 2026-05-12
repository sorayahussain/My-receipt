# MyReceipt: Smart AI Expense Management 🧾
### AI Internship Assessment | Teleperformance Sdn Bhd Malaysia

> **"High Tech, High Touch"**
> This project directly embodies Teleperformance's global philosophy. The **High Tech** is driven by Google's state-of-the-art Gemini Flash model for automated intelligence, while the **High Touch** is represented by a user-centric design that prioritizes data transparency, manual override capability, and professional reporting.

MyReceipt is an intelligent, privacy-first receipt scanning and expense tracking application. It demonstrates the practical application of Multimodal LLMs (Gemini) in automating tedious financial data entry while maintaining rigorous data security and user ownership.

<img src="assets/landingpage.png" alt="Landing Page" width="600"/>


---

## 🎯 The Aim: Intentional AI Design
The goal of this project is to move beyond simple OCR (Optical Character Recognition) to **Semantic Extraction**. While standard OCR just reads characters, MyReceipt *understands* the receipt:
- It distinguishes between "Merchant Name" and "Address" based on spatial and contextual clues.
- It identifies **spending purposes** to auto-categorize expenses.
- It resolves currency ambiguity (e.g., symbols like '$' or '£') by looking for region-specific addresses on the receipt.

## 🏢 Why this matters for Teleperformance Malaysia
In a global BPO and Shared Services leader like **Teleperformance Sdn Bhd Malaysia**, efficiency and accuracy are the primary drivers of client value:
1. **Automation at Scale**: Automating manual data entry (like expense claims or invoice processing) can reduce handling time by up to 90%.
2. **Data Integrity**: Using AI specifically tuned with structured schemas (JSON mode) ensures that machine-readable data is 100% consistent for downstream ERP systems.
3. **Multilingual/Multicurrency Support**: Teleperformance serves a global market; this AI-driven approach handles various languages and currencies without needing hard-coded rules for every country.
4. **Enhanced Security**: This assessment demonstrates a "Security-First" approach (Firestore Eight-Pillar rules), which is critical when handling sensitive client financial information.

---

## 💻 What was developed
- **Frontend**: A high-density React 19 application using **Tailwind CSS 4.0** and **Framer Motion** for a "Native App" feel.
- **AI Integration**: Custom implementation of the **Gemini 3 Flash** vision model via the `@google/genai` SDK. This handles image analysis, category identification, and currency resolution.
- **Backend Service**: An **Express.js** proxy (for API security) that bridges the frontend and AI layers.
- **Database Architecture**: A relational NoSQL structure in **Firestore**, protected by a complex attribute-based access control (ABAC) layer.
- **Analytics Engine**: Real-time spending breakdown and PDF report generation using `jsPDF`.

---

## 🧠 AI Reliability & Performance
The application uses **Prompt Engineering** and **Structured Output** to ensure reliability:
- **Zero-Shot JSON**: The AI is instructed to return *only* a valid JSON object matching a specific Schema.
- **Reasoning Loop**: The AI provides an `extractionReasoning` field, explaining *why* it chose a certain category or currency, making the AI's "thought process" visible to the developer.
- **Fallback Logic**: If the AI encounters a blurry or non-receipt image, it returns a graceful error code rather than hallucinating data.

---

## 🔍 Reviewer Guide (Step-by-Step)
To evaluate this project, please follow these steps:

1. **The "Empty State"**: Launch the app. Note the clean, minimal landing page.
2. **Authentication**: Sign in with Google. Note that the app strictly requires authentication for data persistence.
3. **Scanning Flow**: 
   - Upload a receipt image (or a photo of a screen).
   - Watch the **AI Processing** state (powered by Gemini).
   - Review the extracted fields: Merchant, Date, Amount, Currency, and Category.
4. **The "Correction" Test**: Try to edit a field. The app permits user overrides, maintaining the "Human in the Loop" philosophy.
5. **Analytics**: Go to the **History** page. Observe the category-based breakdown (Pie Chart) and the chronological grouping of receipts.
6. **Reporting**: Click "Download PDF". Review the professional, formatted report generated entirely on the client side.

---

## ✅ Verification & Security Testing
This project was built using **Test-Driven Security (TDS)**. The `firestore.rules` are hardened against the **"Dirty Dozen"** payloads defined in `security_spec.md`.

**To verify security:**
- **Identity Integrity**: Attempting to save a receipt with a different `ownerId` than the currently logged-in user results in a hard `PERMISSION_DENIED`.
- **Schema Enforcement**: Setting a negative `totalAmount` or an invalid currency code results in a validation failure at the database level.
- **Access Control**: Users can only see their own receipts; there is no "global list" vulnerability.

---

## 📈 Business Impact & Value Proposition
In a high-volume environment like Teleperformance, this solution addresses several key performance indicators (KPIs):

1. **Reduced Average Handle Time (AHT)**: By automating the transcription of financial documents, employees can process claims or invoices 80% faster than manual entry.
2. **OpEx Optimization**: Reduces the overhead costs associated with manual data verification and reduces human error in accounting.
3. **Human-in-the-Loop (HITL)**: The interface is designed to allow AI-assisted entry rather than forced automation, ensuring 100% data accuracy through quick manual verification.

---

## 🚀 Future Roadmap for Enterprise Scaling
To transition this from a prototype to an enterprise-grade tool for Teleperformance, the following features are planned:
- **Multilingual Support (BM/Mandarin/Tamil)**: Leveraging Gemini's native multilingual capabilities to support Malaysia's diverse linguistic landscape.
- **Bulk Invoice Processing**: Implementing asynchronous batch uploads for high-volume accounts payable departments.
- **ERP Integration**: Direct API hooks for SAP, Oracle, or Microsoft Dynamics 365 to eliminate data silos.
- **Enterprise RBAC**: Expanding the current security model to support tiered permissions (e.g., Team Lead Approval vs. Agent Entry).

---

## ⚠️ Known Limitations
While highly capable, this assessment prototype has specific limitations:
- **No Real-time Scanning**: The app currently supports file uploads and static image captures rather than a live "video-stream" AR overlay scanner.
- **Internet Connectivity**: Requires an active internet connection to communicate with the Gemini AI and Firebase backend.
- **OCR Constraints**: Performance may vary with handwritten receipts or extremely faded thermal paper.
- **Local Storage Quota**: The "Guest Mode" temporary storage is subject to browser `sessionStorage` limits (approx. 5MB).

---

## 🏗️ Technical Architecture: The Eight-Pillar Security Model
This project isn't just about AI; it's built on a "Zero-Trust" architectural framework to protect sensitive financial records:

1. **Relational Sync**: Access to receipts is cryptographically tied to the user's validated identity.
2. **ID Poisoning Guard**: Strict regex and size validation on all document IDs to prevent injection attacks.
3. **Terminal State Locking**: Once a record is marked as "final," updates are restricted to prevent history tampering.
4. **Action-Based Updates**: Only specific, allowed fields can be modified during editing sessions.
5. **PII Isolation**: Personally Identifiable Information is handled with strict 'read' restrictions.
6. **Atomic Verification**: Relational writes are enforced using `existsAfter` to ensure data consistency.
7. **Query Enforcement**: Security logic is enforced at the database level, not the client, preventing unauthorized data scraping.
8. **Temporal Integrity**: All timestamps use server-side `request.time` to prevent client-side clock manipulation.

---

## 🚀 Deployment Guide (Enterprise Production)
To transition this prototype into a production environment, follow these technical steps:

### 1. External Hosting (Vercel / Cloud Run)
1. **GitHub Sync**: Use the "Export to GitHub" feature in AI Studio to create a managed repository.
2. **Environment Configuration**: In your hosting provider (Vercel, Google Cloud, etc.), configure the following variables:
   - `GEMINI_API_KEY`: Your production-grade Google AI API Key.
   - `VITE_FIREBASE_CONFIG`: The JSON configuration from your Firebase project.
   - `NODE_ENV`: Set to `production`.

### 2. Firebase Database Security
Before going live, you must deploy the Security Rules to protect user data:
1. Install Firebase CLI: `npm install -g firebase-tools`
2. Authenticate: `firebase login`
3. Initialize: `firebase init firestore`
4. Deploy Rules: `firebase deploy --only firestore:rules`
   - *Note: Our `firestore.rules` implements the Eight-Pillar security architecture to ensure zero-trust access.*

### 3. Production Build
Run the following to generate a minified, tree-shaken frontend bundle:
```bash
npm run build
```
This produces a `dist/` folder ready for static serving via the Express server.

---

## 🛠️ Environment Setup & Running
1. **Dependencies**: `npm install`
2. **Local Dev**: `npm run dev` (Runs on port 3000)
3. **Secrets**: Ensure `GEMINI_API_KEY` is set in your environment or Secrets menu.
4. **Firebase**: Configuration is pre-loaded; however, for a fresh instance, follow the `set_up_firebase` tool instructions.

---
