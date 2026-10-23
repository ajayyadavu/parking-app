export default function StatCard({ icon: Icon, label, value, tone = "" }) {
  return (
    <div className="card stat">
      <div className={`stat-icon ${tone}`}>
        <Icon size={22} />
      </div>
      <div>
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
      </div>
    </div>
  );
}