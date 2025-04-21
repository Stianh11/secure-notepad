import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const STORAGE_KEY = "secure_notepad_encrypted";
const HINT_KEY = "secure_notepad_hint";
const AUTO_LOCK_MINUTES = 5;

function arrayBufferToBase64(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function getKeyFromPassword(password, salt) {
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encryptData(data, password) {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const key = await getKeyFromPassword(password, salt);
  const encoded = encoder.encode(JSON.stringify(data));
  const ciphertext = await window.crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
  return {
    salt: arrayBufferToBase64(salt),
    iv: arrayBufferToBase64(iv),
    data: arrayBufferToBase64(ciphertext),
  };
}

async function decryptData(encrypted, password) {
  try {
    const salt = base64ToArrayBuffer(encrypted.salt);
    const iv = base64ToArrayBuffer(encrypted.iv);
    const data = base64ToArrayBuffer(encrypted.data);
    const key = await getKeyFromPassword(password, salt);
    const decrypted = await window.crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
    return JSON.parse(decoder.decode(decrypted));
  } catch {
    return null;
  }
}

console.log("App loaded!");
function SecureNotepad() {
  const [notes, setNotes] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    try {
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [newNote, setNewNote] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newHint, setNewHint] = useState("");
  const [decryptId, setDecryptId] = useState(null);
  const [decryptPassword, setDecryptPassword] = useState("");
  const [decryptedText, setDecryptedText] = useState("");
  const [decryptError, setDecryptError] = useState("");
  const [darkMode, setDarkMode] = useState(true);

  // Save notes to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  }, [notes]);

  // Add a new encrypted note
  const addNote = async () => {
    if (!newNote.trim() || !newPassword.trim()) return;
    const encrypted = await encryptData({ text: newNote }, newPassword);
    setNotes([
      ...notes,
      {
        id: crypto.randomUUID(),
        encrypted,
        date: new Date().toLocaleString(),
        hint: newHint,
      },
    ]);
    setNewNote("");
    setNewPassword("");
    setNewHint("");
  };

  // Delete a note
  const deleteNote = (id) => setNotes(notes.filter(n => n.id !== id));

  // Decrypt a note for viewing
  const handleDecrypt = async (note) => {
    setDecryptError("");
    const decrypted = await decryptData(note.encrypted, decryptPassword);
    if (decrypted && decrypted.text !== undefined) {
      setDecryptedText(decrypted.text);
      setDecryptId(note.id);
    } else {
      setDecryptedText("");
      setDecryptError("Feil passord eller data korrupt.");
    }
  };

  // Hide decrypted note
  const handleHideDecrypted = () => {
    setDecryptId(null);
    setDecryptedText("");
    setDecryptPassword("");
    setDecryptError("");
  };

  console.log("Rendering, notes:", notes, Array.isArray(notes));
  return (
    <div className={`min-h-screen p-4 ${darkMode ? "bg-gray-900 text-white" : "bg-gray-100 text-black"}`}>
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">🛡️ Secure Notepad</h1>
          <button onClick={() => setDarkMode(!darkMode)} className="border px-2 py-1 rounded">
            {darkMode ? "☀️" : "🌙"}
          </button>
        </div>
        <div className="space-y-2 p-4 border rounded bg-white text-black">
          <textarea
            className="w-full p-2 rounded border"
            placeholder="Skriv nytt notat..."
            value={newNote}
            onChange={e => setNewNote(e.target.value)}
          />
          <input
            type="password"
            className="w-full p-2 rounded border"
            placeholder="Passord for dette notatet"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
          />
          <input
            type="text"
            className="w-full p-2 rounded border"
            placeholder="(Valgfritt) Hint for passord"
            value={newHint}
            onChange={e => setNewHint(e.target.value)}
          />
          <button onClick={addNote} className="w-full bg-green-600 text-white p-2 rounded mt-2">Legg til</button>
        </div>
        <ul className="space-y-2">
          {notes.map(note => (
            <li key={note.id} className="p-3 border rounded bg-white text-black">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">{note.date}</span>
                {note.hint && <span className="text-xs text-gray-400 ml-2">Hint: {note.hint}</span>}
                <button onClick={() => setNotes(notes.filter(n => n.id !== note.id))} className="text-red-500 text-sm ml-2">Slett</button>
              </div>
              {decryptId === note.id ? (
  <EditDecryptedNote
    note={note}
    decryptedText={decryptedText}
    decryptPassword={decryptPassword}
    onSave={async (newText, newPassword, newHint) => {
      const encrypted = await encryptData({ text: newText }, newPassword);
      setNotes(notes.map(n =>
        n.id === note.id ? { ...n, encrypted, date: new Date().toLocaleString(), hint: newHint } : n
      ));
      handleHideDecrypted();
    }}
    onCancel={handleHideDecrypted}
  />
) : (
  <div className="mt-2">
    <input
      type="password"
      className="w-full p-2 rounded border"
      placeholder="Passord for å vise notatet"
      value={decryptPassword}
      onChange={e => setDecryptPassword(e.target.value)}
    />
    <button onClick={() => handleDecrypt(note)} className="w-full bg-blue-600 text-white p-2 rounded mt-2">Dekrypter</button>
    {decryptError && <p className="text-red-500">{decryptError}</p>}
  </div>
)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}


// Component for editing a decrypted note
function EditDecryptedNote({ note, decryptedText, decryptPassword, onSave, onCancel }) {
  const [editText, setEditText] = useState(decryptedText);
  const [editPassword, setEditPassword] = useState(decryptPassword);
  const [editHint, setEditHint] = useState(note.hint || "");

  return (
    <div className="mt-2 space-y-2">
      <textarea
        className="w-full p-2 rounded border"
        value={editText}
        onChange={e => setEditText(e.target.value)}
      />
      <input
        type="password"
        className="w-full p-2 rounded border"
        placeholder="Nytt passord (eller behold det gamle)"
        value={editPassword}
        onChange={e => setEditPassword(e.target.value)}
      />
      <input
        type="text"
        className="w-full p-2 rounded border"
        placeholder="(Valgfritt) Hint for passord"
        value={editHint}
        onChange={e => setEditHint(e.target.value)}
      />
      <div className="flex gap-2">
        <button onClick={() => onSave(editText, editPassword, editHint)} className="bg-green-600 text-white p-2 rounded w-full">Lagre</button>
        <button onClick={onCancel} className="bg-gray-600 text-white p-2 rounded w-full">Avbryt</button>
      </div>
    </div>
  );
}

export default SecureNotepad;
