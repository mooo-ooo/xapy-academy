"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { LogIn, Loader2 } from "lucide-react";
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
import { impersonateUserAction } from "@/app/[locale]/admin/users/actions";

export function ImpersonateButton({
  userId,
  userLabel,
  disabled,
}: {
  userId: string;
  userLabel: string;
  disabled?: boolean;
}) {
  const t = useTranslations("admin.users.impersonate");
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function onConfirm() {
    startTransition(async () => {
      const res = await impersonateUserAction(userId);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      await signIn("impersonate", { token: res.token, callbackUrl: "/" });
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
        >
          <LogIn size={14} />
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
          <Button onClick={onConfirm} disabled={pending}>
            {pending && <Loader2 size={14} className="animate-spin" />}
            {t("confirm")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
