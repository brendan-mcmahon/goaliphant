# Project Plan: Goaliphant - Daily Goals Telegram Bot

## Overview
This project is a Telegram bot called "Goaliphant" designed to help the user's wife set and track daily goals. The bot will send reminders and prompts to record goals for the next day and track completion of the previous day's goals. Data will be stored using DynamoDB.

---

## Features
### **Core Features**
1. **Nightly Goal Prompt**
   - Prompt the user every evening to input 5 goals for the next day.
   - Ask whether the goals from the previous day were accomplished.

2. **Data Storage**
   - Store goals and completion status in DynamoDB.

3. **Morning Reminder**
   - Send a morning reminder with the day's goals.

4. **Goal Tracking**
   - Allow the user to send messages to the bot to mark goals as completed.

---

## Architecture
1. **Frontend**
   - Telegram bot using Node.js and the `node-telegram-bot-api` library.

2. **Backend**
   - AWS Lambda functions to handle bot interactions and schedule reminders.
   - Data storage:
     - DynamoDB: NoSQL database for structured storage.

3. **Notifications**
   - Use Telegram Bot API to send reminders and prompts.
   - AWS EventBridge or Lambda triggers for scheduling.

---

## Development Plan
### **Phase 1: Core Functionality**
1. **Setup Telegram Bot**
   - [x] Register bot via BotFather on Telegram.
   - [x] Retrieve bot token.
   - [x] Create a lambda function (bot) that handles communication with the user
   - [x] Create commands to:
     - [x] Start using goaliphant
     - [x] Add goals
     - [x] Delete goals
     - [x] List today's goals
     - [x] Complete goals
   - [x] Save user information in a dynamodb table (just chatid for now, eventually settings?)
2. **Implement Nightly Prompt**
   - [x] Create Lambda function to send nightly messages.
   - [x] Store goals in the database.
3. **Goal Completion Check**
   - [x] Include check-in for the previous day's goals in the nightly prompt.
   - [x] Update completion status in the database.

### **Phase 2: Reminders**
1. **Add Morning Reminder**
   - [x] Schedule reminder using AWS EventBridge or Lambda triggers.

### **Phase 3: Goal Tracking (Stretch Goal)**
1. **Enable Goal Updates**
   - [x] Implement commands to mark goals as completed.
   - [x] Update database with changes.

### **Phase 4: Enhancements**
1. **Roll over incomplete tasks to the next day**
    - [x] Create new Lambda function (rollover)
    - [x] Logic to find incomplete tasks from the previous day and duplicate them into today's goals
    - [x] Add a new EventBridge schedule to trigger the new lambda
---

## Technical Requirements
1. **Languages and Libraries**
   - Node.js
   - `node-telegram-bot-api` library
   - AWS SDK for Node.js
2. **AWS Services**
   - Lambda
   - DynamoDB
   - EventBridge for scheduling

---

## Deployment Plan
1. **Infrastructure as Code**
   - Use AWS CDK or Serverless Framework to deploy Lambda functions and DynamoDB.
2. **Version Control**
   - GitHub repository for code management.
3. **CI/CD**
   - Github Actions

---

This is the current structure:

├── .github
│   └── workflows
│       ├── deploy-api.yml
│       ├── deploy-bot.yml
│       ├── deploy-notifier.yml
│       └── deploy-rollover.yml
├── .gitignore
├── Project Plan.md
├── api
│   ├── index.js
│   ├── package-lock.json
│   ├── package.json
│   └── repository.js
├── bot
│   ├── .env
│   ├── index.js
│   ├── package-lock.json
│   ├── package.json
│   └── repository.js
├── common
│   └── constants.js
├── logo.svg
├── notifier
│   ├── .env
│   ├── deploy.ps1
│   ├── index.js
│   ├── package-lock.json
│   ├── package.json
│   └── repository.js
├── rollover
│   ├── .env
│   ├── deploy.ps1
│   ├── index.js
│   └── package.json
└── ui
    └── goliphant-ui
        ├── .gitignore
        ├── .vscode
        │   └── extensions.json
        ├── README.md
        ├── components.json
        ├── index.html
        ├── jsconfig.json
        ├── package-lock.json
        ├── package.json
        ├── postcss.config.js
        ├── public
        │   └── vite.svg
        ├── src
        │   ├── App.svelte
        │   ├── app.css
        │   ├── assets
        │   │   └── svelte.svg
        │   ├── lib
        │   │   ├── Counter.svelte
        │   │   └── utils.ts
        │   ├── main.js
        │   └── vite-env.d.ts
        ├── svelte.config.js
        ├── tailwind.config.js
        ├── tsconfig.app.json
        ├── tsconfig.json
        └── vite.config.js