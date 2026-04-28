"use client";

import * as React from "react";
import { DayPicker, type DayPickerProps } from "react-day-picker";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import "react-day-picker/style.css";

export function Calendar({ className, classNames, locale = es, ...props }: DayPickerProps) {
  return (
    <DayPicker
      locale={locale}
      className={cn("rdp-tour p-2", className)}
      classNames={{
        today: "font-bold",
        ...classNames,
      }}
      {...props}
    />
  );
}
