"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CompanyFormDialog, type CompanyFormValues } from "./company-form";

export function AddCompanyButton({ label = "Добавить компанию", variant = "default" }: { label?: string; variant?: "default" | "outline" }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant={variant} onClick={() => setOpen(true)}>
        <Plus /> {label}
      </Button>
      {open ? <CompanyFormDialog open={open} onOpenChange={setOpen} /> : null}
    </>
  );
}

export function EditCompanyButton({ initial }: { initial: CompanyFormValues }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Редактировать
      </Button>
      {open ? <CompanyFormDialog open={open} onOpenChange={setOpen} initial={initial} /> : null}
    </>
  );
}
