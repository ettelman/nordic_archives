# ![Nordic Archives logo](public/images/nordic_logo.png)

# Nordic Archives CTF

First appeared for IT-säkerhetstestare 2025

A CTF web challenge built around a fictional document archiving portal.
Designed for beginner to intermediate web security training and can be run
locally with minimal setup. Focus is on OSINT and web

## Quick start (Docker Compose)

Clone repo

```bash
git clone https://github.com/ettelman/nordic_archives.git
cd nordic_archives
docker compose up --build
```

Open `http://localhost:3000` in your browser.

To use a different host port:

```bash
HOST_PORT=4000 docker compose up --build
```

## Intended use

This project is for educational and training purposes only. Run it in a local,
controlled environment. Do not deploy, or do so at your own risk.

## Local development

```bash
npm install
npm start
```
