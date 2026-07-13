"use client";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="text-sm rounded-full border border-rule px-4 py-1.5 hover:bg-paper-2 print:hidden"
    >
      Print / export
    </button>
  );
}
