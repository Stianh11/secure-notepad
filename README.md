# Secure Notepad

A secure, offline-first notepad app built with Electron and React. Each note is encrypted individually with its own password and optional password hint. No data ever leaves your device.

## Features

- **Per-note encryption:** Each note is encrypted with a password you choose.
- **Password hints:** Add a hint to help remember each note's password.
- **Edit encrypted notes:** Decrypt, update, and re-encrypt notes with new content or passwords.
- **Offline & standalone:** No internet required. Runs as a desktop app.
- **No command line needed for users:** Distributable as a Windows executable.
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
