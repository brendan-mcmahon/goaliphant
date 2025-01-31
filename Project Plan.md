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
    - [x] Add a `TicketCount` data point to Users
    - [x] Add a `Partner` data point to Users that refers to another User in the system
    - [x] When a user completes a goal, increment their `TicketCount`
    - [x] When a user uncompletes a goal, decrement their `TicketCount`
    - [x] New DynamoDB table called `GoaliphantRewards` that basically just tracks a list of rewards each player can earn with tickets
    - [x] New Bot command: `/rewards` that lists those rewards
    - [x] New Bot command: `/redeem {#}` that sends a message to the partner with the reward name, and deducts the predefined number of tickets from the user
    - [x] New Bot command: `/wallet` that sends a message to the user with their current ticket count.
    - [x] New Bot command: `/add-reward` that kicks off a short process to create a new reward for your partner.
3. **Honey-Do** 🐝
   - [x] As in #2, add a `Partner` data point to Users that refers to another User in the system
   - [x] New Bot command: `/honey {1, 2, 3}` that operates the same as the `/add {1, 2, 3}` but adds it to the partner's honey-do list instead of their regular list.
   - [ ] Notify partner when one of these items is completed
4. **Dashboard** 
   - [ ] Create a dashboard page that pulls data from the API
5. **Scheduled Goals**
   - [ ] New Bot command: `/schedule {#} {mm dd}`
   - [ ] New table: `GoaliphantScheduledGoals` with the text, date, and chat id
   - [ ] In the rollover func, look for scheduled goals for that day, add them to the day and remove from schedule
6. **Request Reward**
   - [ ] New Bot command: `/requestreward` should trigger a similar flow to the create reward command, but don't ask for tickets
   - [ ] Send notification to partner and go into "pricing" mode. The next input from the user should be a number, set that value on the reward table.
   - [ ] Make sure to hide rewards from the user that don't have ticket values on them. That way we can go ahead and make the new record without having to worry about it. Or maybe we show them but just say *"pending ticket price"* or something?
7. **Rearrange Goals**
   - [ ] New Bot command: `/swap {#} {#}` which just does a simple swap of two goals in the order
8. **Edit Goal**
   - [ ] New Bot command `/edit {#} {new text}` which swaps the text of a goal for new text the user enters
9. **Telegram Buttons**
   - [ ] Research how to do this. I think it's custom keyboards, but I'm not sure?
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