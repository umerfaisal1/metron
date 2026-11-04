<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may
all differ from your training data. Read the relevant guide in
`node_modules/next/dist/docs/` (resolved from this file's directory; in
monorepos the `next` package may not be visible from the repo root) before
writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at
`node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a
diff only re-creates the uncommitted change; committing it with your work keeps
the tree clean.

<!-- END:nextjs-agent-rules -->

# Project Overview: Metron

I am building a web application called **Metron**. It is an AI-powered
spreadsheet generator, conceptually similar to how Gamma uses AI to generate
presentations from natural-language prompts.

## 1. What is Metron?

Metron allows users to describe a spreadsheet they want in plain English, and AI
generates that spreadsheet for them.

Instead of manually creating rows, columns, formulas, formatting, and charts in
Excel or Google Sheets, users simply tell Metron what they need. The AI
understands their requirements and creates a functional, interactive
spreadsheet.

**The core idea: Describe it. Generate it. Use it.**

Metron is not just an AI chatbot that tells users how to create spreadsheets. It
actually creates the spreadsheet inside the application.

## 2. Example Use Case

Imagine a user enters this prompt:

"Make me a custom monthly expense calculator. It should have a calendar for the
month where I can turn each date on and off for mess food. Each selected day
should add Rs. 500 to my total expenses. I should also be able to add other
expenses into different categories, such as transportation, shopping,
entertainment, etc. Show me the total expenses and a breakdown of where my money
is going."

Metron should:

- Generate a spreadsheet with a monthly calendar.
- Allow users to toggle individual dates on and off for mess food.
- Automatically calculate mess expenses at Rs. 500 per selected day.
- Provide a way to add expenses under different categories.
- Automatically calculate category-wise totals.
- Display the overall monthly expenditure.
- Generate relevant charts and graphs, such as a pie chart showing expense
  distribution.

The result should be a working spreadsheet that the user can interact with, not
a static table or an image.

This is just one example. Users should be able to generate many different kinds
of spreadsheets depending on their requirements.

## 3. MVP Scope

The MVP has one primary purpose:

**Generate functional spreadsheets using AI, including charts and graphs.**

The application should support:

- Natural-language spreadsheet generation.
- Dynamic rows and columns.
- Spreadsheet formulas and calculations.
- Appropriate cell formatting.
- Interactive spreadsheet editing.
- Charts and graphs generated from spreadsheet data.
- Automatic recalculation when users modify data.

Do not build presentation generation, document generation, or other unrelated
features. Presentation functionality is explicitly outside the MVP scope.

## 4. Technology Stack

Use the following technologies:

| Area               | Technology               |
| ------------------ | ------------------------ |
| Framework          | Next.js                  |
| Language           | TypeScript               |
| UI                 | Tailwind CSS + shadcn/ui |
| Spreadsheet        | Handsontable             |
| State Management   | Zustand                  |
| AI                 | Gemini API               |
| AI Integration     | Function/Tool Calling    |
| Database           | Supabase PostgreSQL      |
| Charts             | Apache ECharts           |
| XLSX Import/Export | SheetJS                  |
| Formula Engine     | HyperFormula             |
| Version Control    | GitHub                   |
| Deployment         | Vercel                   |

Use these technologies rather than introducing alternative libraries without a
good reason.

## 5. How AI Should Work

The AI is the central feature of Metron.

The user provides a natural-language description of the spreadsheet they want.

Gemini should interpret the request and use function/tool calling to produce a
structured spreadsheet definition that the application can understand.

The application should then use that definition to:

- Create the spreadsheet structure.
- Populate initial data where appropriate.
- Define formulas and calculations.
- Configure formatting.
- Define charts and their data sources.
- Configure interactive elements where required.

The AI should not directly generate arbitrary frontend code and execute it.
Instead, use a structured, predictable schema that the application interprets
and renders.

The spreadsheet must remain editable after generation, and formulas should
recalculate when the user changes values.

## 6. Product Philosophy

Metron should make spreadsheet creation accessible to people who do not know
Excel formulas or spreadsheet software.

A user should not need to understand VLOOKUP, SUMIF, pivot tables, cell
references, or chart configuration to create a useful spreadsheet.

They should simply describe the outcome they want, and Metron should handle the
implementation.

The generated result should feel like a real spreadsheet application, not a
chatbot response.

## 7. Development Guidelines

- Use TypeScript throughout the project.
- Keep the code modular and maintainable.
- Separate AI integration, spreadsheet generation, formula calculations, chart
  rendering, and UI components.
- Use Zustand for application and spreadsheet state.
- Use HyperFormula for formula calculations.
- Use Handsontable as the spreadsheet interface.
- Use ECharts for visualizations.
- Use Supabase for persistence.
- Keep the AI-generated spreadsheet definition structured and validated.
- Avoid unnecessary complexity in the MVP.

**Important:** Before implementing features, understand the overall architecture
and how all these technologies will work together. Build Metron as a coherent
product rather than a collection of disconnected components.
