# 📝 NotePulse – Real-Time Collaborative Notes (Task 3)

NotePulse is a real-time collaborative note-taking application that allows multiple users to edit documents simultaneously.
This project was developed as **Task 3** during a **Full Stack Web Development Internship** to demonstrate real-time systems, collaborative editing, authentication, database design, and modern UI/UX practices.

---

## 📌 Internship Details

- **Company**: CODTECH IT SOLUTIONS  
- **Intern Name**: Mrudul Bokade  
- **Intern ID**: CTIS2677  
- **Domain**: Full Stack Web Development  
- **Duration**: 4 Weeks  
- **Mentor**: Neela Santosh  

---

## 🚀 Project Overview

NotePulse is inspired by modern collaborative editors like Google Docs and Notion.
It enables **real-time multi-user editing**, **auto-saving**, **document history**, and **live presence tracking** using CRDTs.

The application focuses on:
- Real-time collaboration
- Data consistency
- Secure authentication
- Scalable architecture
- Polished user experience

---

## ✨ Features

### Core Features
- 📝 Create and manage rich-text documents
- ⚡ Real-time collaborative editing (multi-user)
- 👥 Live user presence indicator
- 💾 Auto-save with visual save status
- 🕘 Document history & version tracking
- 🔐 Secure authentication using Supabase

### UI / UX Features
- 🌗 Dark mode & Light mode
- 🎨 Modern animated interface
- 🖱️ Smooth transitions and micro-interactions
- 📱 Fully responsive design

### Quality-of-Life Enhancements
- ⏱️ Save / Saved indicators
- 🔄 Real-time sync without refresh
- 🧠 Intelligent conflict resolution (CRDT-based)
- 🚀 Optimized performance for large documents

---

## 🏗️ Project Architecture

```bash
task3-notepulse/
├── frontend/ # React + Vite frontend
│ ├── src/
│ │ ├── components/
│ │ ├── hooks/
│ │ ├── pages/
│ │ └── styles/
│ ├── package.json
│ └── vite.config.js
│
├── backend/ # Express + Yjs WebSocket server
│ ├── server.js
│ ├── y-websocket/
│ └── package.json
│
├── .env.example # Environment variables template
├── README.md

```


---

## 🧰 Tech Stack

### Frontend
- React (Vite)
- TipTap Editor
- Yjs (CRDT)
- Plain JavaScript
- HTML5, CSS3

### Backend
- Node.js
- Express.js
- y-websocket (WebSocket server)

### Database & Authentication
- Supabase (PostgreSQL + Auth)
- Row Level Security (RLS)

### Real-Time Collaboration
- Yjs
- WebSockets

### Deployment
- Frontend: **Vercel**
- Backend: **Render**

---

## 📈 Learning Outcomes

- Real-time collaborative system design
- CRDT-based conflict-free editing
- WebSocket communication
- Supabase authentication & database modeling
- Full-stack deployment (Vercel + Render)
- UI/UX animation and theme design
- Advanced Git & GitHub workflows
- Debugging distributed systems

---

## 📸 Output

<img width="900" height="808" alt="Image" src="https://github.com/user-attachments/assets/88edab3b-a3a3-4c34-905e-32ad8b330c42" />
<img width="1024" height="899" alt="Image" src="https://github.com/user-attachments/assets/91359ffd-e8cc-4619-9ef2-6e6f979bc9f5" />
<img width="899" height="800" alt="Image" src="https://github.com/user-attachments/assets/9dca337e-1b5a-4096-bb4d-80ed5cd05b46" />

---

## 📄 License

MIT
