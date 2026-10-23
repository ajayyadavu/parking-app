export default function EmptyState({ icon: Icon, title, text, action }) {
  return (
    <div className="card empty">
      <div className="empty-icon">
        <Icon size={26} />
      </div>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}