import { TEMPLATES } from "../data/templates";
import type { Template } from "../data/templates";

interface TemplatesPanelProps {
  onUseTemplate: (template: Template) => void;
}

export default function TemplatesPanel({ onUseTemplate }: TemplatesPanelProps) {
  return (
    <div className="templates-panel">
      <h2>Start from a Template</h2>
      <div className="templates-list">
        {TEMPLATES.map((t) => (
          <button key={t.id} className="template-card" onClick={() => onUseTemplate(t)}>
            <span className="template-card-name">{t.name}</span>
            <span className="template-card-desc">{t.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
