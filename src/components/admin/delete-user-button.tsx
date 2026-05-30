"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "@/components/ui/toast";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deleteUserAction } from "@/app/[locale]/admin/users/actions";

export function DeleteUserButton({
  userId,
  userLabel,
  disabled,
}: {
  userId: string;
  userLabel: string;
  disabled?: boolean;
}) {
  const t = useTranslations("admin.users.delete");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function onConfirm() {
    startTransition(async () => {
      const res = await deleteUserAction({ userId });
      if (!res.ok) {
        toast.error(
          res.error === "USER_HAS_REFERENCES"
            ? t("errorHasReferences")
            : res.error,
        );
        return;
      }
      toast.success(t("success"));
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={disabled}
          title={t("trigger")}
          className="text-red-300 hover:text-red-200"
        >
          <Trash2 size={14} />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("dialogTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("dialogDesc", { user: userLabel })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button variant="outline" disabled={pending}>
              {t("cancel")}
            </Button>
          </AlertDialogCancel>
          <Button
            onClick={onConfirm}
            disabled={pending}
            className="bg-red-500/90 hover:bg-red-500"
          >
            {pending && <Loader2 size={14} className="animate-spin" />}
            {t("confirm")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
