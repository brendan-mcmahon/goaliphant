# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
Goaliphant is a Telegram bot application for daily goal tracking and management, built with a microservices architecture using AWS Lambda functions. The system includes goal management, partner system with rewards/tickets, AI integration, and a React dashboard.

## Architecture

### Core Services
- **API** (`api/`) - Express-style REST API with route-based handlers for external integration
- **Bot** (`bot/`) - Main Telegram bot interface with command handling and AI integration
- **Notifier** (`notifier/`) - Scheduled messaging service for daily prompts
- **Rollover** (`rollover/`) - Service for rolling over incomplete goals and handling recurring goals
- **Common** (`common/`) - Shared repository layer and utilities
- **UI** (`goaliphant-ui/`) - React dashboard using Vite

### Key Components
- **Routes** (`api/routes/`) - API endpoint handlers (goals, rewards, users, system)
- **Services** (`api/services/`) - Business logic layer
- **Handlers** (`bot/handlers/`) - Bot command handlers for each feature
- **Repository** (`common/repository.js`) - DynamoDB abstraction layer

### Data Architecture
- DynamoDB tables: Goals, Users, Rewards, ScheduledGoals, Notifications
- Partner system linking users for shared rewards/honey-do lists
- Chat history storage for AI context (max 10 messages)
- Ticket system for goal completion rewards

## Development Commands

### Testing
- **API tests**: `cd api && npm test` (Jest with 30s timeout)
- **API test watch**: `cd api && npm run test:watch`
- **API test coverage**: `cd api && npm run test:coverage`
- **Rollover tests**: `cd rollover && npm test --runInBand`

### Frontend Development
- **Start dev server**: `cd goaliphant-ui && npm run dev` (Vite)
- **Build**: `cd goaliphant-ui && npm run build`
- **Lint**: `cd goaliphant-ui && npm run lint` (ESLint)
- **Preview**: `cd goaliphant-ui && npm run preview`

### Bot Development
No specific dev commands - Lambda function deployed via GitHub Actions

## Deployment

### GitHub Actions
All services auto-deploy on push to main when their respective folders change:
- `deploy-api.yml` - Deploys when `api/` or `common/` changes
- `deploy-bot.yml` - Deploys when `bot/` or `common/` changes
- `deploy-notifier.yml` - Deploys when `notifier/` or `common/` changes
- `deploy-rollover.yml` - Deploys when `rollover/` or `common/` changes

### AWS Lambda Functions
- `goaliphant-api` - API service
- `goaliphant-bot` - Telegram bot
- `goaliphant-notifier` - Daily notifications
- `goaliphant-rollover` - Goal rollover service

## Key Features

### Bot Commands
Core commands include `/add`, `/list`, `/complete`, `/delete`, `/edit`, `/swap`, `/move`, `/note`, `/details`, `/wallet`, `/rewards`, `/redeem`, `/honey`, `/partner`, `/schedule`, `/recurring`, `/help`, and AI chat integration.

### AI Integration
- OpenAI GPT integration for natural language interaction
- Function calling capability for bot operations
- Chat history maintained per user (10 message limit)
- AI context includes available bot functions

### Partner & Reward System
- Users can link as partners
- Ticket system for completed goals (default 1 ticket per goal)
- Rewards can be created and redeemed with tickets
- Honey-do lists for partner goal assignment
- Bonus tickets for completing 3+ goals per day

### Scheduling & Recurrence
- Goal scheduling with MM DD format
- Recurring goals with cron expressions
- Automated rollover of incomplete goals

## File Structure Notes
- `common/` folder is copied into each service during deployment
- Jest configuration includes module mapping for common imports
- API uses route-based architecture with service layer separation
- Bot uses command pattern with dedicated handler files
- Environment variables stored in `.env` files (not committed)

## Development Tips
- Services share DynamoDB repository patterns via `common/`
- API responses use standardized format via `routes/utils.js`
- Bot maintains chat state for multi-step flows
- Test files located in `api/tests/` and use integration test patterns
- Frontend uses React + Vite with Sass styling