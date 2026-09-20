export type KitSummary = {
  id: string; company: string; role: string; days: number; researched_at: string;
  requirements: number; must_haves: number; questions: number; flashcards: number; summary: string;
};

// Reusable card for a saved kit; a real <button> so it is keyboard-operable and announced correctly.
export default function KitCard({ kit, onOpen, disabled }: { kit: KitSummary; onOpen: () => void; disabled?: boolean }) {
  return (
    <button type="button" className="kit-card" onClick={onOpen} disabled={disabled} aria-label={`Open ${kit.role} at ${kit.company}`}>
      <strong>{kit.company}</strong>
      <span className="kit-card-role">{kit.role}</span>
      {kit.summary && <p>{kit.summary}</p>}
      <span className="kit-card-meta">
        {kit.questions} questions · {kit.flashcards} flashcards · {kit.days}-day plan
        <br />{kit.must_haves} must-have of {kit.requirements} requirements · {new Date(kit.researched_at).toLocaleDateString()}
      </span>
    </button>
  );
}
