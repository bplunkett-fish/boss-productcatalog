import React from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Pencil, Power, PowerOff, Trash2, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { userDisplayName } from "@/lib/userName";

// One person in the team list: identity, role, status, and their row actions
// (edit, deactivate/reactivate, remove). Your own row cannot be deactivated
// or removed, so an admin can never lock themselves out.
export default function UserRow({ member, onEdit, onToggleActive, onRequestRemove, isSelf, busy }) {
  const name = userDisplayName(member);
  const isAdmin = member.role === "admin";
  const isActive = member.is_active !== false;

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
          <p
            className={cn(
              "text-sm font-medium truncate",
              isActive ? "text-foreground" : "text-muted-foreground"
            )}
          >
            {name}
          </p>
          {isSelf && <span className="text-xs text-muted-foreground">(you)</span>}
          <span
            className={cn(
              "text-xs px-2 py-0.5 rounded-full font-medium",
              isAdmin ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
            )}
          >
            {isAdmin ? "Admin" : "User"}
          </span>
          {!isActive && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-destructive/10 text-destructive">
              Deactivated
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground truncate">{member.email}</p>
        {member.phone_number && (
          <p className="text-xs text-muted-foreground truncate">{member.phone_number}</p>
        )}
      </div>

      <div className="flex items-center shrink-0">
        {busy ? (
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground mx-2" />
        ) : (
          <>
            <Button
              size="icon"
              variant="ghost"
              className="h-9 w-9 text-muted-foreground hover:text-foreground"
              onClick={() => onEdit(member)}
              aria-label={`Edit ${name}`}
              title="Edit user"
            >
              <Pencil className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-9 w-9 text-muted-foreground hover:text-foreground"
              onClick={() => onToggleActive(member)}
              disabled={isSelf}
              aria-label={isActive ? `Deactivate ${name}` : `Reactivate ${name}`}
              title={
                isSelf
                  ? "You cannot deactivate your own account"
                  : isActive
                    ? "Deactivate user"
                    : "Reactivate user"
              }
            >
              {isActive ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-9 w-9 text-muted-foreground hover:text-destructive"
              onClick={() => onRequestRemove(member)}
              disabled={isSelf}
              aria-label={`Remove ${name}`}
              title={isSelf ? "You cannot remove your own account" : "Remove user"}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </>
        )}
      </div>
    </li>
  );
}