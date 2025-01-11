# Project Plan: Goaliphant - Daily Goals Telegram Bot

## Overview
This project is a Telegram bot called "Goaliphant" designed to help my wife Jamie and I set and track daily goals. The bot will send reminders and prompts to record goals for the next day and track completion of the previous day's goals. Data will be stored using DynamoDB.

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

### **Phase 3: Goal Tracking**
1. **Enable Goal Updates**
   - [x] Implement commands to mark goals as completed.
   - [x] Update database with changes.

### **Phase 4: Enhancements**
1. **Roll over incomplete tasks to the next day**
    - [x] Create new Lambda function (rollover)
    - [x] Logic to find incomplete tasks from the previous day and duplicate them into today's goals
    - [x] Add a new EventBridge schedule to trigger the new lambda
2. **Tickets and Rewards**
    - [ ] Add a `TicketCount` data point to Users
    - [ ] Add a `Partner` data point to Users that refers to another User in the system
    - [ ] When a user completes a goal, increment their `TicketCount`
    - [ ] New DynamoDB table called `GoaliphantRewards` that basically just tracks a list of rewards each player can earn with tickets
    - [ ] New Bot command: `/rewards` that lists those rewards
    - [ ] New Bot command: `/redeem {#}` that sends a message to the partner with the reward name, and deducts the predefined number of tickets from the user
    - [ ] New Bot command: `/wallet` that sends a message to the user with their current ticket count.
3. **Honey-Do**
   -[ ] As in #2, add a `Partner` data point to Users that refers to another User in the system
   -[ ] New Bot command: `/honey {1, 2, 3}` that operates the same as the `/add {1, 2, 3}` but adds it to the partner's honey-do list instead of their regular list.
   * Optional ideas:
		- [ ] Only apply tickets to items on the honey-do list
		- [ ] Allow the users to assign a ticket bounty to each individual item
---

## Technical Requirements
1. **Languages and Libraries**
   - Node.js
   - `node-telegram-bot-api` library
   - AWS SDK for Node.js
2. **AWS Services**
   - Lambda
   - DynamoDB
   - EventBridge

---

## Deployment Plan
1. **Version Control**
   - GitHub repository for code management.
2. **CI/CD**
   - Github Actions

---

This is the current structure:
```
├── .github
│   └── workflows
│       ├── deploy-api.yml
│       ├── deploy-bot.yml
│       ├── deploy-notifier.yml
│       └── deploy-rollover.yml
├── .gitignore
├── Project Plan.md
├── api
│   ├── api.js
│   ├── index.js
│   ├── package-lock.json
│   └── package.json
├── bot
│   ├── .env
│   ├── index.js
│   ├── package-lock.json
│   └── package.json
├── common
│   └── repository.js
├── logo.svg
├── notifier
│   ├── .env
│   ├── index.js
│   ├── package-lock.json
│   └── package.json
├── rollover
│   ├── .env
│   ├── index.js
│   └── package.json
└── ui
    ├── App.svelte
    ├── app.css
    ├── app.js
    ├── goliphant-ui
    └── index.html
```