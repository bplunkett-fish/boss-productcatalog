import React, { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Loader2, Search, Users as UsersIcon } from "lucide-react";
import UserRow from "@/components/users/UserRow";

// Searchable list of everyone with access to the app.
export default function UserList({ users, loading, currentUserId, onEdit }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all = users || [];
    if (!q) return all;
    return all.filter((u) =>
      [u.email, u.full_name, u.first_name, u.last_name, u.phone_number]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [users, query]);

  return (
    <section className="rounded-2xl bg-card border border-border p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <UsersIcon className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">Users</h2>
        </div>
        {!loading && (
          <span className="text-sm text-muted-foreground">
            {(users || []).length} {(users || []).length === 1 ? "person" : "people"}
          </span>
        )}
      </div>

      <div className="relative mb-2">
        <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, email, or phone"
          className="pl-9"
          maxLength={100}
          aria-label="Search users"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
          <UsersIcon className="w-8 h-8" />
          <p className="text-sm">{query ? "No users match that search." : "No users yet."}</p>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {filtered.map((member) => (
            <UserRow
              key={member.id}
              member={member}
              onEdit={onEdit}
              isSelf={member.id === currentUserId}
            />
          ))}
        </ul>
      )}
    </section>
  );
}