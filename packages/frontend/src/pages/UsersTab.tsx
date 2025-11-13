import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usersApi } from "../api";
import { useState } from "react";
import type { User } from "../api";
import styles from "../App.module.css";

function UsersTab() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "user">("user");

  const {
    data: usersResponse,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["users"],
    queryFn: usersApi.getAll,
  });

  const users = usersResponse?.data;

  const createMutation = useMutation({
    mutationFn: usersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setName("");
      setEmail("");
      setRole("user");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({ name, email, role });
  };

  if (isLoading)
    return (
      <div className={`${styles.tabContent} ${styles.loading}`}>Loading...</div>
    );
  if (error)
    return (
      <div className={`${styles.tabContent} ${styles.error}`}>
        Error loading users
      </div>
    );

  return (
    <div className={styles.tabContent}>
      <h2>👥 Users</h2>

      <div className={styles.dataGrid}>
        {users?.map((user: User) => (
          <div key={user.id} className={styles.card}>
            <h3>{user.name}</h3>
            <p>
              <span className="label">Email:</span> {user.email}
            </p>
            <p>
              <span className="label">Role:</span>{" "}
              <span
                className={`${styles.badge} ${
                  user.role === "admin" ? styles.success : styles.info
                }`}
              >
                {user.role || "user"}
              </span>
            </p>
          </div>
        ))}
      </div>

      <div className={styles.formSection}>
        <h3>Add New User</h3>
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label>Name:</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label>Email:</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label>Role:</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "admin" | "user")}
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <button
            type="submit"
            className={styles.btn}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? "Adding..." : "Add User"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default UsersTab;
