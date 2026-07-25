"use client";

import { useState } from "react";

export interface FaqItem {
  _id: string;
  question: string;
  answer: string;
}

export default function FaqAccordion({ faqs }: { faqs: FaqItem[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (!faqs || faqs.length === 0) return null;

  return (
    <div className="faq-accordion">
      {faqs.map((faq) => {
        const isOpen = openId === faq._id;
        return (
          <div
            key={faq._id}
            style={{ borderBottom: "1px solid #e5e5e5", padding: "12px 0" }}
          >
            <button
              onClick={() => setOpenId(isOpen ? null : faq._id)}
              style={{
                width: "100%",
                textAlign: "left",
                background: "none",
                border: "none",
                fontWeight: 600,
                fontSize: 16,
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
              }}
              aria-expanded={isOpen}
            >
              <span>{faq.question}</span>
              <span>{isOpen ? "−" : "+"}</span>
            </button>
            {isOpen && <p style={{ marginTop: 8, color: "#555" }}>{faq.answer}</p>}
          </div>
        );
      })}
    </div>
  );
}
