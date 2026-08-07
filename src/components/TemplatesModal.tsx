import { useEffect } from "react";
import { TEMPLATES } from "../data/templates";
import type { Template } from "../data/templates";
import TemplatePreview from "./TemplatePreview";

interface TemplatesModalProps {
  onUseTemplate: (template: Template) => void;
  onClose: () => void;
}

export default function TemplatesModal({ onUseTemplate, onClose }: TemplatesModalProps) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal templates-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Start from a template"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>Start from a Template</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="templates-modal-grid">
          {TEMPLATES.map((t) => (
            <button key={t.id} className="template-card" onClick={() => onUseTemplate(t)}>
              <TemplatePreview template={t} />
              <span className="template-card-name">{t.name}</span>
              <span className="template-card-desc">{t.description}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
