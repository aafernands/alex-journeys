import { redirect } from "next/navigation";
import { UsersList } from "@/components/cms/UsersList";
import { isCmsAuthenticated } from "@/lib/cms/auth";
import { isFirebaseConfigured } from "@/lib/firebase-admin";
import { listUsersSafe, UsersUnavailableError } from "@/lib/users";

export const dynamic = "force-dynamic";

export default async function CmsUsersPage() {
  const authed = await isCmsAuthenticated();
  if (!authed) {
    redirect("/cms");
  }

  let users: Awaited<ReturnType<typeof listUsersSafe>> = [];
  let loadError: string | null = null;

  if (!isFirebaseConfigured()) {
    loadError =
      "Firestore is not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.";
  } else {
    try {
      users = await listUsersSafe();
    } catch (err) {
      if (err instanceof UsersUnavailableError) {
        loadError = "Firestore is temporarily unavailable.";
      } else {
        console.error("[cms/users] list failed:", err);
        loadError = "Could not load users.";
      }
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow text-accent">Readers</p>
        <h1 className="font-display mt-2 text-display text-heading">Users</h1>
        <p className="mt-3 max-w-2xl text-sm text-muted md:text-base">
          Google, X, and email/password reader accounts stored in Firestore.
          Disabling a user blocks credentials login and Google or X sign-in.
          X sign-in alone never grants CMS access.
        </p>
      </div>

      {loadError ? (
        <div className="panel p-6">
          <p className="text-sm text-text" role="status">
            {loadError}
          </p>
        </div>
      ) : (
        <UsersList users={users} />
      )}
    </div>
  );
}
