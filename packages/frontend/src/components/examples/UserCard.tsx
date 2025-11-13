import { User, formatDate } from "../../utils/typeExamples";

interface UserCardProps {
  user: User;
  onEdit?: (user: User) => void;
  onDelete?: (userId: string) => void;
}

export default function UserCard({ user, onEdit, onDelete }: UserCardProps) {
  return (
    <div className="user-card">
      <h4>{user.name}</h4>
      <p>Email: {user.email}</p>
      <p>Role: {user.role}</p>
      {user.metadata?.createdAt && (
        <p>Created: {formatDate(user.metadata.createdAt)}</p>
      )}
      {user.metadata?.lastLogin && (
        <p>Last Login: {formatDate(user.metadata.lastLogin, "full")}</p>
      )}
      <div className="actions">
        {onEdit && <button onClick={() => onEdit(user)}>Edit</button>}
        {onDelete && <button onClick={() => onDelete(user.id)}>Delete</button>}
      </div>
    </div>
  );
}
