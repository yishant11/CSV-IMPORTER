"use client";

/**
 * Displays stats cards for import results.
 *
 * @param {{ totalImported: number, totalSkipped: number }} props
 */
export default function StatsCards({ totalImported, totalSkipped }) {
  const total = totalImported + totalSkipped;

  return (
    <div className="stats-grid fade-in">
      <div className="stat-card">
        <div className="stat-card__value stat-card__value--total">{total}</div>
        <div className="stat-card__label">Total Records</div>
      </div>
      <div className="stat-card">
        <div className="stat-card__value stat-card__value--imported">
          {totalImported}
        </div>
        <div className="stat-card__label">Imported</div>
      </div>
      <div className="stat-card">
        <div className="stat-card__value stat-card__value--skipped">
          {totalSkipped}
        </div>
        <div className="stat-card__label">Skipped</div>
      </div>
    </div>
  );
}
