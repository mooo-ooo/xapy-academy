"use client";

import { useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Check, Loader2 } from "lucide-react";
import { toast } from "@/components/ui/toast";
import { toggleUserActiveAction } from "@/app/[locale]/admin/users/actions";

/** One-click approve for an inactive (typically self-registered) user.
 *  Reuses the existing toggleUserActiveAction → audit USER_ACTIVATE. */
export function ApproveUserButton({ userId }: { userId: string }) {
  const t = useTranslations("admin.users.approve");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onApprove() {
    startTransition(async () => {
      const res = await toggleUserActiveAction({ userId, isActive: true });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(t("done"));
      router.refresh();
    });
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onApprove}
      disabled={pending}
      title={t("trigger")}
      className="text-emerald-300 hover:text-emerald-200"
    >
      {pending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
      {t("trigger")}
    </Button>
  );
}
