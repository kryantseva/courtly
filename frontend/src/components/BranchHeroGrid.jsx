import { BuildingIcon } from "./BranchIllustration";
const SLOT_COUNT = 3;
export default function BranchHeroGrid({ branches, onSelectBranch, onEmptySlotClick }) {
  const slots = Array.from({ length: SLOT_COUNT }, (_, i) => branches[i] ?? null);
  return (
    <div className="branchHeroGrid">
      <div className="branchHeroGridDecor" aria-hidden />
      <div className="branchHeroGridSlots" role="list">
        {slots.map((branch, index) =>
          branch ? (
            <button
              key={branch.id}
              type="button"
              className={`branchHeroSlot branchHeroSlot--filled branchHeroSlot--${branch.tone}`}
              onClick={() => onSelectBranch(branch)}
              role="listitem"
            >
              <span className="branchHeroSlotIcon" aria-hidden>
                <BuildingIcon />
              </span>
              <span className="branchHeroSlotName">{branch.name}</span>
              <span className="branchHeroSlotHint">{branch.hint}</span>
              <span className="branchHeroSlotCta">Открыть</span>
            </button>
          ) : (
            <button
              key={`empty-${index}`}
              type="button"
              className="branchHeroSlot branchHeroSlot--empty"
              onClick={onEmptySlotClick}
              role="listitem"
            >
              <span className="branchHeroSlotIcon branchHeroSlotIcon--muted" aria-hidden>
                <BuildingIcon />
              </span>
              <span className="branchHeroSlotName">Новый филиал</span>
              <span className="branchHeroSlotHint">Подключение по коду ниже</span>
              <span className="branchHeroSlotCta branchHeroSlotCta--ghost">Выбрать</span>
            </button>
          )
        )}
      </div>
      <div className="branchHeroGridDash" aria-hidden />
    </div>
  );
}
