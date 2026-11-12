# Metron: AI-Powered Spreadsheet Platform

> **Describe it. Generate it. Use it.**

Metron is an AI-powered spreadsheet platform built with Next.js, Handsontable, SheetJS, and Supabase PostgreSQL. Users describe what they need in plain English and Metron creates fully functional, interactive spreadsheets with formulas, columns, and data ready for immediate use.

---

## Tech Stack

| Area | Technology |
| :--- | :--- |
| **Framework** | Next.js (App Router, Turbopack) |
| **Language** | TypeScript |
| **Spreadsheet Grid** | Handsontable |
| **File Parsing & Export** | SheetJS (`xlsx`) |
| **Database & Auth** | Supabase PostgreSQL |
| **AI Integration** | Google Gemini API |
| **Styling** | Tailwind CSS |

---

## Spreadsheet Import & Export

Metron provides client-side import and export for Microsoft Excel (`.xlsx`, `.xls`) and Comma-Separated Values (`.csv`) files.

### Key Capabilities

1. **Client-Side Processing & Privacy**:
   - Files are parsed entirely within the browser via SheetJS.
   - Raw file data is **never** sent to Gemini or stored in external storage buckets, ensuring strict data privacy.
2. **Worksheet Selection (`.xlsx`)**:
   - Multi-sheet Excel workbooks present a sheet picker with live row and column counts.
   - Users can select which worksheet to load into the active workbook.
   - Worksheet names are displayed dynamically in the bottom tab bar.
3. **Data Integrity & Robust Parsing**:
   - Handles quoted CSV values, commas inside text, escaped quotes, multiline cells (embedded newlines), and empty cells without truncation or misalignment.
   - Column types (numeric vs. text) are inferred automatically from cell contents.
4. **Live Handsontable Synchronization**:
   - Exports (`.xlsx` and `.csv`) always include the current live Handsontable state, capturing any unsaved cell edits made in the session.
   - Imported spreadsheets update the grid instantly and flag the document as `Unsaved edits`, preserving the database save flow until the user explicitly saves.
5. **Validation & Accessibility**:
   - Rejects unsupported extensions and empty files with actionable error messages.
   - All import/export triggers and dialogs include accessible labels (`aria-label`, `role="dialog"`, `role="menu"`).

### How to Import a Spreadsheet

1. In the **Spreadsheet Editor**, click **Import** in the top navigation bar or the **Home** / **Insert** ribbon tabs.
   *(You can also click **Import Spreadsheet** on the Metron Dashboard to import into a new workbook).*
2. Select or drag & drop any `.xlsx`, `.xls`, or `.csv` file.
3. For Excel workbooks with multiple sheets, pick the desired worksheet from the dropdown.
4. Preview the first 5 rows and verify the column headers.
5. Choose whether to update the workbook title to match the uploaded file name.
6. Click **Import Worksheet into Editor**.

### How to Export a Spreadsheet

1. In the top navigation bar, click the **Export** dropdown button (or use the **XLSX** / **CSV** quick buttons on the **Home** ribbon).
2. Choose:
   - **Excel Workbook (.xlsx)**: Generates a `.xlsx` spreadsheet matching all current columns, headers, and cell values.
   - **CSV (Comma-delimited)**: Generates a standard RFC 4180-compliant `.csv` file with a UTF-8 BOM for cross-platform compatibility.

---

## Getting Started

### Prerequisites

- Node.js 18.17+ or Node.js 20+
- npm or pnpm

### Installation

```bash
# Clone repository
git clone https://github.com/your-repo/metron.git
cd metron

# Install dependencies (including xlsx)
npm install
```

### Environment Configuration

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_api_key
```

### Development Server

Run the Next.js development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Quality Checks & Build

```bash
# Run ESLint
npm run lint

# Compile and build for production
npm run build
```
