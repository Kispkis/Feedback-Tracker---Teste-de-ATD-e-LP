# Feedback Kiosk System

## Overview

This is a customer satisfaction feedback collection system built with Flask and SQLite. The application provides a kiosk-style public interface where users can submit their satisfaction level (Very Satisfied, Satisfied, or Dissatisfied), and an administrative dashboard for viewing and analyzing collected feedback data.

The system stores feedback in three formats simultaneously: SQLite database, CSV file, and TXT file for redundancy and easy data export.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Public Kiosk Interface**: Simple three-button interface with emoji-based satisfaction options (green/yellow/red color coding)
- **Admin Dashboard**: Data visualization with Chart.js for bar and pie charts, tabular data display with pagination
- **Templates**: Jinja2 templates in `/templates` directory
- **Styling**: Single CSS file handling both kiosk and admin views with class-based switching

### Backend Architecture
- **Framework**: Flask (Python web framework)
- **Entry Point**: `app.py` - contains all routes and business logic
- **Session Management**: Flask sessions with hardcoded secret key for admin authentication
- **Pagination**: Server-side pagination with 20 records per page

### Data Storage
- **Primary Database**: SQLite (`database.db`)
  - Single `feedback` table with columns: id, satisfacao (satisfaction level), data (date), hora (time), dia_semana (day of week)
- **Backup Storage**: 
  - CSV file (`data/feedback.csv`) with semicolon delimiter
  - TXT file (`data/feedback.txt`) for human-readable logs
- **Rationale**: Triple storage provides data redundancy and multiple export formats without additional processing

### Authentication
- Simple password-based admin login using Flask sessions
- No user registration or role system - single admin password

### Key Routes (Expected)
- `/` - Public kiosk interface
- `/submit` - POST endpoint for feedback submission
- `/admin` - Admin login and dashboard
- `/export/csv` - CSV download
- `/export/txt` - TXT download

## External Dependencies

### Python Packages
- **Flask**: Web framework (specified in requirements.txt)

### Frontend Libraries
- **Chart.js**: Used for bar and pie chart visualizations (loaded externally in admin dashboard)

### Database
- **SQLite**: File-based database, no external database server required

### File System
- `/data` directory for CSV and TXT file storage
- Created automatically on application startup if not present