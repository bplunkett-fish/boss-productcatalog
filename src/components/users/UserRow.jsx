import React from "react";
import { Button } from "@/components/ui/button";
import { Pencil, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// One person in the team list: identity, role, and the entry point to edit them.
export default function UserRow({ member, onEdit, isSelf }) {
  const name =
    [member.first_name, member.last_name].filter(Boolean).join(" ").trim() ||
    member.full_name ||
    member.email;
  const isAdmin = member.role === "admin";

  return (
    <li className="py-3 flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-muted overflow-hidden flex items-center justify-center shrink-0">
        {member.profile_picture ? (
          <img src={member.profile_picture} alt="" className="w-full h-full object-cover" />
        ) : (
          <UserCircle className="w-5 h-5 text-muted-foreground" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-foreground truncate">{name}</p>
          {isSelf && <span className="text-xs text-muted-foreground">(you)</span>}
          <span
            className={cn(
              "text-xs px-2 py-0.5 rounded-full font-medium",
              isAdmin ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
            )}
          >
            {isAdmin ? "Admin" : "User"}
          </span>
        </div>
        <p className="text-sm text-muted-foreground truncate">{member.email}</p>
        {member.phone_number && (
          <p className="text-xs text-muted-foreground truncate">{member.phone_number}</p>
        )}
      </div>

      <Button
        size="sm"
        variant="ghost"
        onClick={() => onEdit(member)}
        className="shrink-0 text-muted-foreground hover:text-foreground"
        aria-label={`Edit ${name}`}
      >
        <Pencil className="w-4 h-4 mr-2" /> Edit
      </Button>
    </li>
  );
}