"use client";

import React, { useRef } from "react";

type Props = {
  text: string;
  setText: (v: string) => void;
  selectedFiles: File[];
  setSelectedFiles: React.Dispatch<React.SetStateAction<File[]>>;
  onSend: () => Promise<void>;
  sending: boolean;
};

export default function ChatInput({ text, setText, selectedFiles, setSelectedFiles, onSend, sending }: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const arr = Array.from(files).slice(0, 5);
    setSelectedFiles(arr);
  };

  const removeSelectedFile = (idx: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== idx));
    // se removeu o último, limpa o input nativo
    if (fileInputRef.current && selectedFiles.length <= 1) fileInputRef.current.value = "";
  };

  return (
    <div className="mt-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Escreva sua mensagem para a equipe da loja..."
        className="w-full p-2 border rounded min-h-[80px] resize-none"
      />

      <div className="flex items-center justify-between mt-2 gap-3">
        <div className="flex items-center gap-2">
          <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-1 border rounded text-sm bg-white">
            <input ref={fileInputRef} type="file" multiple onChange={handleFileChange} className="hidden" />
            Anexar arquivo
          </label>

          {selectedFiles.length > 0 && (
            <div className="flex gap-2 items-center">
              {selectedFiles.map((f, i) => (
                <div key={i} className="text-xs p-1 border rounded flex items-center gap-2">
                  <div className="max-w-[160px] truncate">{f.name}</div>
                  <button onClick={() => removeSelectedFile(i)} className="text-red-500 hover:underline">Remover</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setText("");
              setSelectedFiles([]);
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
            className="px-3 py-1 rounded border text-sm"
          >
            Limpar
          </button>

          <button onClick={onSend} disabled={sending} className="px-4 py-2 rounded bg-orange-600 text-white disabled:opacity-60">
            {sending ? "Enviando…" : "Enviar"}
          </button>
        </div>
      </div>
    </div>
  );
}