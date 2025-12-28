import { ChangePackageManager } from "@/components/ChangePackageManager";

const CURRENT_USER = {
  id: "user-001",
  name: "John Engineer",
  email: "john@example.com",
  role: "quality_manager",
};

export default function ChangePackagesPage() {
  return (
    <div className="container mx-auto py-6 px-4">
      <ChangePackageManager
        currentUserId={CURRENT_USER.id}
        currentUserName={CURRENT_USER.name}
        currentUserEmail={CURRENT_USER.email}
        currentUserRole={CURRENT_USER.role}
      />
    </div>
  );
}
