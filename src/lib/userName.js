// The name shown for a person anywhere in the app: their profile first and last
// name when they have entered them, otherwise the account name, and the email as
// a last resort.
export function userDisplayName(user) {
  if (!user) return "";
  return (
    [user.first_name, user.last_name].filter(Boolean).join(" ").trim() ||
    user.full_name ||
    user.email ||
    ""
  );
}